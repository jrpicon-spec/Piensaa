import { Module, forwardRef } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PatientsModule } from '../patients/patients.module';
import { MeasurementsModule } from '../measurements/measurements.module';

@Module({
  imports: [
    SupabaseModule,
    PatientsModule,
    forwardRef(() => MeasurementsModule),
  ],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
