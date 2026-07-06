import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { JwtStrategy } from './strategies/jwt.strategy';

const DEFAULT_EXPIRES_IN: StringValue = '7d' as StringValue;

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not defined');
        }
        const raw = config.get<string>('JWT_EXPIRES_IN');
        const expiresIn: number | StringValue =
          typeof raw === 'string' && /^\d+$/.test(raw)
            ? Number(raw)
            : (raw as StringValue) ?? DEFAULT_EXPIRES_IN;

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
    SupabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
