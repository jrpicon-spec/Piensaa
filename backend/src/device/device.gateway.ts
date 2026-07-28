import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { ValidationError } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { DeviceStatus } from '../common/enums/clinical.enum';
import { DeviceService } from './device.service';
import {
  DeviceConnectedSocketDto,
  StartTestSocketDto,
  TestFinishedSocketDto,
} from './dto/device.dto';

type SocketRole = 'frontend' | 'esp32' | 'pending';

interface SocketUserData {
  role: SocketRole;
  userId?: string;
  deviceId?: string;
}

interface DeviceStatusPayload {
  status: DeviceStatus;
  connected: boolean;
  patientId: string | null;
  deviceId: string;
  updatedAt: string;
}

const socketValidationLogger = new Logger('DeviceSocketValidation');

function validationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...validationMessages(error.children ?? []),
  ]);
}

@WebSocketGateway({
  namespace: '/device',
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  cors: { origin: true, credentials: true },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors: ValidationError[]) => {
      const messages = validationMessages(errors);
      const message =
        messages.length > 0
          ? `Payload Socket.IO inválido: ${messages.join('; ')}`
          : 'Payload Socket.IO inválido';
      const dtoName = errors[0]?.target?.constructor?.name ?? 'DTO desconocido';
      socketValidationLogger.error(`${dtoName}: ${message}`);
      return new WsException({ status: 'error', message });
    },
  }),
)
export class DeviceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeviceGateway.name);
  private readonly socketDeviceIds = new Map<string, string>();
  private readonly deviceSocketIds = new Map<string, Set<string>>();

  constructor(
    private readonly deviceService: DeviceService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(): void {
    this.logger.log(
      'Gateway /device iniciado: path=/socket.io transports=websocket,polling',
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      this.attachSocketDiagnostics(client);
      const role = this.resolveSocketRole(client);

      if (role === 'frontend') {
        const payload = await this.authenticateFrontend(client);
        client.data = { role, userId: payload.sub } satisfies SocketUserData;
        await client.join('frontend');
        this.logger.log(`Frontend conectado: ${client.id}`);
        client.emit('deviceStatus', this.buildDeviceStatusPayload());
        return;
      }

      if (role === 'esp32') {
        const deviceId = this.resolveHandshakeDeviceId(client);
        this.registerDeviceSocket(client, deviceId);
        await client.join('esp32');
        client.data = { role: 'esp32', deviceId } satisfies SocketUserData;
        this.logger.log(
          `ESP32 identificado provisionalmente por handshake: deviceId=${deviceId} socket=${client.id}`,
        );
        const persistence = this.deviceService.connect({
          deviceId,
          ipAddress: this.resolveRemoteIp(client),
        });
        this.emitDeviceStatus();
        try {
          await persistence;
        } catch (error) {
          this.logger.error(
            `ESP32 online en memoria, pero no se pudo persistir: ${this.errorMessage(error)}`,
          );
        }
        this.emitDeviceStatus();
        return;
      }

      // Un cliente sin JWT puede identificarse como ESP32 mediante el evento
      // deviceConnected. El handshake solo se usa como pista provisional.
      client.data = { role: 'pending' } satisfies SocketUserData;
      this.logger.log(
        `Socket esperando identificación deviceConnected: ${client.id}`,
      );
    } catch (error) {
      this.removeDeviceSocket(client.id);
      this.logger.warn(
        `Conexión rechazada (${client.id}): ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const role = (client.data as SocketUserData | undefined)?.role;
    if (role === 'frontend') {
      this.logger.log(
        `Frontend desconectado, sin afectar ESP32: socket=${client.id}`,
      );
      return;
    }
    if (role !== 'esp32') {
      this.logger.log(`Socket no identificado desconectado: ${client.id}`);
      return;
    }

    const deviceId = this.socketDeviceIds.get(client.id);
    if (!deviceId) return;
    const remainingSockets = this.removeDeviceSocket(client.id);
    this.logger.log(
      `ESP32 desconectado: deviceId=${deviceId} socket=${client.id}`,
    );

    // Una reconexión puede solaparse brevemente con el socket anterior.
    if (remainingSockets > 0) return;

    try {
      await this.deviceService.disconnect(deviceId);
    } catch (error) {
      this.logger.error(
        `No se pudo desconectar el dispositivo: ${String(error)}`,
      );
    }
    this.emitDeviceStatus();
    this.server.to('frontend').emit('deviceDisconnected', {
      status: DeviceStatus.DESCONECTADO,
      connected: false,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('deviceConnected')
  async handleDeviceConnected(
    @MessageBody() body: DeviceConnectedSocketDto,
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean; deviceId: string }> {
    const currentRole = (client.data as SocketUserData | undefined)?.role;
    if (currentRole === 'frontend') {
      throw new WsException(
        'Un socket frontend no puede identificarse como ESP32',
      );
    }
    if (
      !body?.deviceId ||
      this.normalizeClientType(body.deviceType) !== 'esp32'
    ) {
      throw new WsException('deviceId y deviceType=esp32 son obligatorios');
    }

    const deviceId = body.deviceId.trim().toLowerCase();
    this.registerDeviceSocket(client, deviceId);
    await client.join('esp32');
    client.data = { role: 'esp32', deviceId } satisfies SocketUserData;
    this.logger.log(
      `ESP32 identificado: deviceId=${deviceId} socket=${client.id}`,
    );

    // connect() cambia primero el estado en memoria. Así el frontend recibe el
    // estado online incluso si Supabase está temporalmente indisponible.
    const persistence = this.deviceService.connect({
      deviceId,
      ipAddress: body.ipAddress,
      rssi: body.rssi,
    });
    this.emitDeviceStatus();
    try {
      await persistence;
    } catch (error) {
      this.logger.error(
        `ESP32 online en memoria, pero no se pudo persistir: ${this.errorMessage(error)}`,
      );
    }
    this.emitDeviceStatus();
    return { ok: true, deviceId };
  }

  @SubscribeMessage('deviceDisconnected')
  handleDeviceDisconnected(@ConnectedSocket() client: Socket): void {
    this.requireRole(client, 'esp32');
    client.disconnect(true);
  }

  @SubscribeMessage('startTest')
  async handleStartTest(
    @MessageBody() body: StartTestSocketDto,
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    this.requireRole(client, 'frontend');
    if (!body?.patientId) throw new WsException('patientId es obligatorio');

    const result = await this.deviceService.startSocketTest(body);
    this.logger.log(
      `Iniciando prueba para paciente ${body.patientId}; enviando a ${this.socketDeviceIds.size} ESP32`,
    );
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
  ): Promise<{ ok: true; measurementId: string }> {
    try {
      this.requireRole(client, 'esp32');
      if (!body?.patientId) throw new Error('patientId es obligatorio');

      const saved = await this.deviceService.receiveSocketResult(body);
      const payload = {
        measurement: {
          id: saved.measurement.id,
          patientId: saved.measurement.paciente_id,
          reactionMs: saved.measurement.tiempo_reaccion,
          status: saved.measurement.estado,
          date: saved.measurement.fecha,
        },
        result: saved.result,
        deviceStatus: this.buildDeviceStatusPayload(),
      };

      this.logger.log(
        `Prueba finalizada: medición ${saved.measurement.id}, paciente ${saved.result.patientId}, ${saved.result.reactionTime} ms, timeout=${saved.result.timeout}`,
      );
      client.emit('testResultSaved', payload);
      this.server.to('frontend').emit('testFinished', payload);
      this.emitDeviceStatus();
      return { ok: true, measurementId: saved.measurement.id };
    } catch (error) {
      this.logger.error(
        `Error procesando testFinished: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new WsException({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Error procesando resultado',
      });
    }
  }

  private resolveSocketRole(client: Socket): SocketRole {
    const auth = client.handshake.auth as Record<string, unknown>;
    const candidates = [
      auth['clientType'],
      client.handshake.query?.clientType,
      client.handshake.headers['x-device-type'],
    ];
    if (
      candidates.some((value) => this.normalizeClientType(value) === 'esp32')
    ) {
      return 'esp32';
    }
    if (
      candidates.some((value) => this.normalizeClientType(value) === 'frontend')
    ) {
      return 'frontend';
    }
    return typeof auth['token'] === 'string' && auth['token'].length > 0
      ? 'frontend'
      : 'pending';
  }

  private normalizeClientType(value: unknown): string {
    const scalar: unknown = Array.isArray(value)
      ? (value as unknown[])[0]
      : value;
    return typeof scalar === 'string' ? scalar.trim().toLowerCase() : '';
  }

  private resolveHandshakeDeviceId(client: Socket): string {
    const auth = client.handshake.auth as Record<string, unknown>;
    const candidate = auth['deviceId'] ?? client.handshake.query?.deviceId;
    return typeof candidate === 'string' && candidate.trim()
      ? candidate.trim().toLowerCase()
      : this.deviceService.getActiveDeviceId();
  }

  private resolveRemoteIp(client: Socket): string | undefined {
    const address = client.handshake.address;
    if (!address) return undefined;
    const normalized = address.replace(/^::ffff:/, '');
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)
      ? normalized
      : undefined;
  }

  private async authenticateFrontend(client: Socket): Promise<{ sub: string }> {
    const auth = client.handshake.auth as Record<string, unknown>;
    const token = auth['token'];
    if (typeof token !== 'string' || token.length === 0) {
      throw new WsException('JWT requerido para el frontend');
    }
    const payload = await this.jwtService.verifyAsync<{ sub?: string }>(token);
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new WsException('JWT sin identificador de usuario');
    }
    return { sub: payload.sub };
  }

  private buildDeviceStatusPayload(): DeviceStatusPayload {
    const connected = this.deviceService.isDeviceConnected();
    return {
      status: connected ? DeviceStatus.CONECTADO : DeviceStatus.DESCONECTADO,
      connected,
      patientId: this.deviceService.getCurrentPatient(),
      deviceId: this.deviceService.getActiveDeviceId(),
      updatedAt: new Date().toISOString(),
    };
  }

  private emitDeviceStatus(): void {
    const payload = this.buildDeviceStatusPayload();
    const frontend = this.server.to('frontend');
    frontend.emit('deviceStatus', payload);
    frontend.emit('deviceStatusChanged', payload);
    this.logger.log(
      `Estado enviado al frontend: deviceId=${payload.deviceId} status=${payload.status}`,
    );
  }

  private registerDeviceSocket(client: Socket, deviceId: string): void {
    const previousDeviceId = this.socketDeviceIds.get(client.id);
    if (previousDeviceId && previousDeviceId !== deviceId) {
      this.removeDeviceSocket(client.id);
    }
    this.socketDeviceIds.set(client.id, deviceId);
    const sockets = this.deviceSocketIds.get(deviceId) ?? new Set<string>();
    sockets.add(client.id);
    this.deviceSocketIds.set(deviceId, sockets);
  }

  private removeDeviceSocket(socketId: string): number {
    const deviceId = this.socketDeviceIds.get(socketId);
    if (!deviceId) return 0;
    this.socketDeviceIds.delete(socketId);
    const sockets = this.deviceSocketIds.get(deviceId);
    if (!sockets) return 0;
    sockets.delete(socketId);
    if (sockets.size === 0) this.deviceSocketIds.delete(deviceId);
    return sockets.size;
  }

  private requireRole(client: Socket, expected: SocketRole): void {
    const role = (client.data as SocketUserData | undefined)?.role;
    if (role !== expected) {
      throw new WsException('Evento no autorizado para este tipo de cliente');
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private attachSocketDiagnostics(client: Socket): void {
    if (typeof client.on !== 'function') return;

    client.on('disconnect', (reason) => {
      this.logger.warn(
        `Socket.IO /device desconectado: id=${client.id} reason=${reason}`,
      );
    });
    const engineConnection = client.conn;
    if (!engineConnection?.on) return;

    engineConnection.on('close', (reason) => {
      this.logger.warn(
        `Transporte /device cerrado: socket=${client.id} reason=${reason}`,
      );
    });
    engineConnection.on('error', (error) => {
      this.logger.error(
        `Error de transporte /device: socket=${client.id} error=${this.errorMessage(error)}`,
      );
    });
  }
}
