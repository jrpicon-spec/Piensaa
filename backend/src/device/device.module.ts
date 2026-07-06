import { Module, forwardRef } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PatientsModule } from '../patients/patients.module';
import { MeasurementsModule } from '../measurements/measurements.module';
import { DeviceGateway } from './device.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SupabaseModule,
    PatientsModule,
    AuthModule,
    forwardRef(() => MeasurementsModule),
  ],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceGateway],
  exports: [DeviceService, DeviceGateway],
})
export class DeviceModule {}
