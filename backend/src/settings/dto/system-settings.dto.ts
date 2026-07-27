import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUrl,
  Matches,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'thresholdOrder', async: false })
class ThresholdOrderConstraint implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments): boolean {
    const dto = args.object as UpdateSystemSettingsDto;
    return (
      dto.thresholdNormal === undefined ||
      value === undefined ||
      dto.thresholdNormal < value
    );
  }

  defaultMessage(): string {
    return 'thresholdAtencion debe ser mayor que thresholdNormal';
  }
}

export class UpdateSystemSettingsDto {
  @IsBoolean()
  notifications!: boolean;

  @IsBoolean()
  emailAlerts!: boolean;

  @IsBoolean()
  soundAlerts!: boolean;

  @IsBoolean()
  autoRefresh!: boolean;

  @IsIn(['es', 'en'])
  language!: 'es' | 'en';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(59_999)
  thresholdNormal!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(60_000)
  @Validate(ThresholdOrderConstraint)
  thresholdAtencion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays!: number;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  apiBaseUrl!: string;

  @Matches(/^wss?:\/\/[^\s]+$/i, {
    message: 'websocketUrl debe usar ws:// o wss://',
  })
  websocketUrl!: string;

  @IsOptional()
  @Matches(/^(mqtts?|wss?):\/\/[^\s]+$/i, {
    message: 'mqttUrl debe usar mqtt://, mqtts://, ws:// o wss://',
  })
  mqttUrl?: string;
}
