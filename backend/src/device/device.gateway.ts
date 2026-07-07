import {
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { DeviceService } from './device.service';
import {
  StartTestSocketDto,
  TestFinishedSocketDto,
} from './dto/device.dto';
import { DeviceStatus } from '../common/enums/clinical.enum';

type SocketRole = 'frontend' | 'esp32';

interface SocketUserData {
  role: SocketRole;
  userId?: string;
  deviceId?: string;
}

interface DeviceStatusPayload {
  status: DeviceStatus;
  connected: boolean;
  patientId: string | null;
  updatedAt: string;
}

interface TestFinishedPayload {
  measurement: {
    id: string;
    patientId: string;
    reactionMs: number;
    status?: string;
    date: string;
  };
  deviceStatus: DeviceStatusPayload;
}

@WebSocketGateway({
  namespace: '/device',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class DeviceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeviceGateway.name);

  constructor(
    private readonly deviceService: DeviceService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const role = this.resolveSocketRole(client);
      client.data = {
        ...(client.data as SocketUserData),
        role,
      } satisfies SocketUserData;

      if (role === 'frontend') {
        const payload = await this.authenticateFrontend(client);
        client.data = {
          ...(client.data as SocketUserData),
          userId: payload.sub,
        };
      }

      client.join(role);
      this.logger.log(`Socket conectado: ${client.id} (${role})`);

      if (role === 'esp32') {
        await this.deviceService.connect();
        this.emitDeviceStatus();
      }
    } catch (error) {
      this.logger.warn(
        `Conexión rechazada (${client.id}): ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const role = (client.data as SocketUserData | undefined)?.role;
    if (role === 'esp32') {
      this.deviceService.disconnect().catch((error) => {
        this.logger.error(
          `No se pudo desconectar el dispositivo: ${String(error)}`,
        );
      });
      this.emitDeviceStatus();
      this.server.to('frontend').emit('deviceDisconnected', {
        status: DeviceStatus.DESCONECTADO,
        connected: false,
        timestamp: new Date().toISOString(),
      });
    }
    this.logger.log(`Socket desconectado: ${client.id} (${role ?? 'unknown'})`);
  }

  @SubscribeMessage('deviceConnected')
  handleDeviceConnected(@ConnectedSocket() client: Socket): void {
    client.data = {
      ...(client.data as SocketUserData),
      role: 'esp32',
    };
    this.deviceService.connect().catch((error) => {
      this.logger.error(
        `No se pudo marcar el dispositivo como conectado: ${String(error)}`,
      );
    });
    this.emitDeviceStatus();
    this.server.to('frontend').emit('deviceConnected', {
      status: DeviceStatus.CONECTADO,
      connected: true,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('deviceDisconnected')
  handleDeviceDisconnected(@ConnectedSocket() client: Socket): void {
    client.data = {
      ...(client.data as SocketUserData),
      role: 'esp32',
    };
    this.deviceService.disconnect().catch((error) => {
      this.logger.error(
        `No se pudo marcar el dispositivo como desconectado: ${String(error)}`,
      );
    });
    this.emitDeviceStatus();
    this.server.to('frontend').emit('deviceDisconnected', {
      status: DeviceStatus.DESCONECTADO,
      connected: false,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('startTest')
  async handleStartTest(
    @MessageBody() body: StartTestSocketDto,
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    if (!body?.patientId) {
      throw new BadRequestException('patientId es obligatorio');
    }

    const result = await this.deviceService.startSocketTest(body);
    client.join('frontend');

    this.server.to('esp32').emit('startTest', body);
    this.server.to('frontend').emit('startTest', {
      ...body,
      serverTime: result.startedAt,
    });
    this.emitDeviceStatus();

    return { ok: true };
  }

  @SubscribeMessage('testFinished')
  async handleTestFinished(
    @MessageBody() body: TestFinishedSocketDto,
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    const reactionTime = this.resolveReactionTime(body);
    const patientId = body.patientId;

    if (!patientId) {
      throw new BadRequestException('patientId es obligatorio');
    }

    if (typeof reactionTime !== 'number' || Number.isNaN(reactionTime)) {
      throw new BadRequestException('reactionTime debe ser numérico');
    }

    client.join('esp32');
    const measurement = await this.deviceService.receiveSocketResult(
      reactionTime,
      patientId,
    );

    const payload: TestFinishedPayload = {
      measurement: {
        id: measurement.id,
        patientId: measurement.paciente_id,
        reactionMs: measurement.tiempo_reaccion,
        status: measurement.estado,
        date: measurement.fecha,
      },
      deviceStatus: this.buildDeviceStatusPayload(),
    };

    this.server.to('frontend').emit('testFinished', payload);
    this.server.to('frontend').emit('deviceStatus', payload.deviceStatus);
    this.emitDeviceStatus();

    return { ok: true };
  }

  private resolveSocketRole(client: Socket): SocketRole {
    const rawRole = String(client.handshake.auth?.clientType ?? '').toLowerCase();
    const token = client.handshake.auth?.token;

    if (rawRole === 'esp32') {
      return 'esp32';
    }

    // Frontend must authenticate with JWT. If no token exists, treat the socket
    // as device traffic so the ESP32 can connect without inventing extra auth.
    if (typeof token !== 'string' || token.length === 0) {
      return 'esp32';
    }

    return 'frontend';
  }

  private async authenticateFrontend(client: Socket): Promise<{ sub: string }> {
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new BadRequestException('JWT requerido para el frontend');
    }

    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
    return payload;
  }

  private resolveReactionTime(body: TestFinishedSocketDto): number | undefined {
    return body.reactionTime ?? body.tiempo_reaccion;
  }

  private buildDeviceStatusPayload(): DeviceStatusPayload {
    const connected = this.deviceService.isDeviceConnected();
    return {
      status: connected ? DeviceStatus.CONECTADO : DeviceStatus.DESCONECTADO,
      connected,
      patientId: this.deviceService.getCurrentPatient(),
      updatedAt: new Date().toISOString(),
    };
  }

  private emitDeviceStatus(): void {
    this.server.to('frontend').emit('deviceStatus', this.buildDeviceStatusPayload());
  }
}
