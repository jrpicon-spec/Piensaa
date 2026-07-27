import { Module } from '@nestjs/common';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [SupabaseModule, PatientsModule],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
