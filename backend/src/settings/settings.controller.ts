import { Body, Controller, Get, Put } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UpdateSystemSettingsDto } from './dto/system-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@Roles(UserRole.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findOne() {
    return this.settingsService.findOne();
  }

  @Put()
  update(@Body() dto: UpdateSystemSettingsDto) {
    return this.settingsService.update(dto);
  }
}
