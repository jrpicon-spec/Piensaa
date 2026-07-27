import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class DeviceApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configuredKey = this.configService.get<string>('DEVICE_API_KEY');
    if (!configuredKey) {
      throw new ServiceUnavailableException(
        'DEVICE_API_KEY no está configurada en el servidor',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.header('x-device-api-key');
    if (!providedKey || !this.matches(providedKey, configuredKey)) {
      throw new UnauthorizedException('Credencial de dispositivo inválida');
    }
    return true;
  }

  private matches(candidate: string, expected: string): boolean {
    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(expected);
    return (
      candidateBuffer.length === expectedBuffer.length &&
      timingSafeEqual(candidateBuffer, expectedBuffer)
    );
  }
}
