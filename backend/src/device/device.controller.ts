import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import {
  DeviceResultDto,
  StartTestDto,
  UpdateDeviceDto,
} from './dto/device.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { Public } from '../common/decorators/public.decorator';

@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  findOne() {
    return this.deviceService.findOne();
  }

  @Put()
  @Roles(UserRole.ADMIN)
  update(@Body() dto: UpdateDeviceDto) {
    return this.deviceService.update(dto);
  }

  @Post('connect')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  connect() {
    return this.deviceService.connect();
  }

  @Post('disconnect')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  disconnect() {
    return this.deviceService.disconnect();
  }

  @Post('start-test')
  @Roles(UserRole.ADMIN, UserRole.CUIDADOR)
  @HttpCode(HttpStatus.OK)
  startTest(@Body() dto: StartTestDto) {
    return this.deviceService.startTest(dto);
  }

  /**
   * Endpoint público consumido por el firmware ESP32.
   * Envía el tiempo medido y el backend lo asocia al paciente seleccionado.
   */
  @Public()
  @Post('result')
  @HttpCode(HttpStatus.CREATED)
  receiveResult(@Body() body: DeviceResultDto) {
    const value = body.reactionTime ?? body.tiempo_reaccion;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error('Se requiere reactionTime (número) en el cuerpo');
    }
    return this.deviceService.receiveResult(value);
  }
}
