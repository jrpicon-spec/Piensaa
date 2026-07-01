import { Module, forwardRef } from '@nestjs/common';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PatientsModule } from '../patients/patients.module';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [
    SupabaseModule,
    PatientsModule,
    forwardRef(() => DeviceModule),
  ],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
