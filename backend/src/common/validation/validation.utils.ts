import type { TransformFnParams } from 'class-transformer';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export const PERSON_NAME_PATTERN =
  /^\p{L}+(?:(?:[ '-]|\u2019)\p{L}+)*(?: +\p{L}+(?:(?:[ '-]|\u2019)\p{L}+)*)*$/u;
export const PHONE_PATTERN = /^\+?[0-9](?:[0-9 -]{5,18}[0-9])?$/;
export const STRONG_PASSWORD_PATTERN =
  /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,128}$/;

export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function trimOptionalString({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function escapePostgrestSearch(value: string): string {
  return value
    .replace(/[(),"]/g, ' ')
    .replace(/[\\%_]/g, (character) => `\\${character}`)
    .replace(/\s+/g, ' ')
    .trim();
}

export function IsAgeBetween(
  minimum: number,
  maximum: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isAgeBetween',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [minimum, maximum],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const birthDate = new Date(`${value}T00:00:00Z`);
          if (Number.isNaN(birthDate.getTime())) return false;
          const today = new Date();
          let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
          const birthdayPending =
            today.getUTCMonth() < birthDate.getUTCMonth() ||
            (today.getUTCMonth() === birthDate.getUTCMonth() &&
              today.getUTCDate() < birthDate.getUTCDate());
          if (birthdayPending) age -= 1;
          return age >= minimum && age <= maximum;
        },
        defaultMessage(args: ValidationArguments): string {
          const [min, max] = args.constraints as [number, number];
          if (typeof args.value === 'string') {
            const birthDate = new Date(`${args.value}T00:00:00Z`);
            const today = new Date();
            const todayUtc = Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate(),
            );
            if (
              !Number.isNaN(birthDate.getTime()) &&
              birthDate.getTime() > todayUtc
            ) {
              return 'La fecha de nacimiento no puede ser futura.';
            }

            let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
            const birthdayPending =
              today.getUTCMonth() < birthDate.getUTCMonth() ||
              (today.getUTCMonth() === birthDate.getUTCMonth() &&
                today.getUTCDate() < birthDate.getUTCDate());
            if (birthdayPending) age -= 1;
            if (age < min) {
              return `El paciente debe tener al menos ${min} años.`;
            }
            if (age > max) {
              return `La edad máxima permitida es de ${max} años.`;
            }
          }
          return `La edad debe estar entre ${min} y ${max} años`;
        },
      },
    });
  };
}
