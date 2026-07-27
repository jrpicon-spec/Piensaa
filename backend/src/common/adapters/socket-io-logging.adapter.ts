import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { Socket as EngineSocket, Transport } from 'engine.io';
import type { Server, ServerOptions } from 'socket.io';

type EngineConnectionError = Error & {
  code?: string | number;
  context?: unknown;
  req?: { url?: string; headers?: Record<string, unknown> };
};

export class SocketIoLoggingAdapter extends IoAdapter {
  private readonly logger = new Logger('Socket.IO');
  private readonly instrumentedServers = new WeakSet<Server>();

  constructor(app: INestApplicationContext) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const io = super.createIOServer(port, options) as Server;
    if (io.engine && !this.instrumentedServers.has(io)) {
      this.instrumentedServers.add(io);
      this.attachDiagnostics(io);
    }
    return io;
  }

  private attachDiagnostics(io: Server): void {
    this.logger.log(
      `Engine.IO activo: path=${io.path()} transports=polling,websocket protocolo=EIO4`,
    );

    io.engine.on('connection_error', (error: EngineConnectionError) => {
      this.logger.error(
        `Engine.IO connection_error code=${String(error.code ?? 'unknown')} message=${error.message} url=${error.req?.url ?? 'unknown'} context=${this.serialize(error.context)}`,
      );
    });

    io.engine.on('connection', (connection: EngineSocket) => {
      this.logger.log(
        `Engine.IO conectado: transport=${connection.transport.name} ip=${connection.request.socket.remoteAddress ?? 'unknown'}`,
      );
      connection.on('upgrade', (transport: Transport) => {
        this.logger.log(
          `Engine.IO upgrade completado: transport=${transport.name}`,
        );
      });
      connection.on('close', (reason) => {
        this.logger.warn(
          `Engine.IO cerrado: ip=${connection.request.socket.remoteAddress ?? 'unknown'} reason=${reason}`,
        );
      });
    });

    io.on('connection', (socket) => {
      this.logger.log(`Socket.IO namespace raíz conectado: id=${socket.id}`);
      socket.on('disconnect', (reason) => {
        this.logger.warn(
          `Socket.IO namespace raíz desconectado: id=${socket.id} reason=${reason}`,
        );
      });
    });
  }

  private serialize(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
