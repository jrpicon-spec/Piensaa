import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MeasurementsService } from './measurements.service';
import {
  CreateMeasurementDto,
  UpdateMeasurementDto,
} from './dto/measurement.dto';
import { FilterMeasurementDto } from './dto/filter-measurement.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../common/types/user.types';

@Controller('measurements')
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CUIDADOR)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateMeasurementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.measurementsService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() filter: FilterMeasurementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.measurementsService.findAll(filter, user);
  }

  @Get('patient/:pacienteId/stats')
  statsByPatient(
    @Param('pacienteId', new ParseUUIDPipe({ version: '4' })) pacienteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.measurementsService.statsByPatient(pacienteId, user);
  }

  @Get('patient/:pacienteId/last')
  async lastMeasurement(
    @Param('pacienteId', new ParseUUIDPipe({ version: '4' })) pacienteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.measurementsService.getLastMeasurementByPatient(
      pacienteId,
      user,
    );
    return { data: result };
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.measurementsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.CUIDADOR)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMeasurementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.measurementsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.measurementsService.remove(id, user);
  }
}
