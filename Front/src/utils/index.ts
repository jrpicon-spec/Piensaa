import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const PERSON_NAME_PATTERN =
  /^\p{L}+(?:(?:[ '-]|\u2019)\p{L}+)*(?: +\p{L}+(?:(?:[ '-]|\u2019)\p{L}+)*)*$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^\+?[0-9](?:[0-9 -]{5,18}[0-9])?$/;
export const STRONG_PASSWORD_PATTERN =
  /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,128}$/;

export function normalizeText(value: string): string {
  return value.trim().replace(/ +/g, ' ');
}

export function sanitizePersonName(value: string): string {
  return value.replace(/[^\p{L} ]/gu, '');
}

export function sanitizePhone(value: string): string {
  const sanitized = value.replace(/[^0-9+ -]/g, '');
  return sanitized.startsWith('+')
    ? `+${sanitized.slice(1).replace(/\+/g, '')}`
    : sanitized.replace(/\+/g, '');
}

export function validatePersonName(
  value: string,
  label = 'nombre',
  maximumLength = 120,
): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) return 'No puede dejar este campo vacío.';
  if (normalized.length < 2) return `El ${label} debe tener al menos 2 caracteres.`;
  if (normalized.length > maximumLength) {
    return `El ${label} no puede superar ${maximumLength} caracteres.`;
  }
  if (!PERSON_NAME_PATTERN.test(normalized)) return 'Solo se permiten letras.';
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) return 'No puede dejar este campo vacío.';
  if (!EMAIL_PATTERN.test(normalized)) return 'Debe ingresar un correo válido.';
  return undefined;
}

export function validatePhone(value: string, required = true): string | undefined {
  const normalized = value.trim();
  if (!normalized) return required ? 'No puede dejar este campo vacío.' : undefined;
  if (normalized.length > 32 || !PHONE_PATTERN.test(normalized)) {
    return 'Debe ingresar un teléfono válido.';
  }
  return undefined;
}

export function validateBirthDate(value: string): string | undefined {
  if (!value) return 'No puede dejar este campo vacío.';
  const birth = parseDateOnly(value);
  if (!birth) return 'Debe ingresar una fecha de nacimiento válida.';
  const today = startOfLocalDay(new Date());
  if (birth.getTime() > today.getTime()) {
    return 'La fecha de nacimiento no puede ser futura.';
  }
  const age = calculateAge(value);
  if (age < 60) return 'El paciente debe tener al menos 60 años.';
  if (age > 120) return 'La edad máxima permitida es de 120 años.';
  return undefined;
}

export function getBirthDateLimits(today = new Date()): {
  min: string;
  max: string;
} {
  const currentDay = startOfLocalDay(today);
  const maxBirthDate = subtractCalendarYears(currentDay, 60);
  const oldestBirthday = subtractCalendarYears(currentDay, 121);
  const minBirthDate = new Date(
    oldestBirthday.getFullYear(),
    oldestBirthday.getMonth(),
    oldestBirthday.getDate() + 1,
  );
  return {
    min: formatDateOnly(minBirthDate),
    max: formatDateOnly(maxBirthDate),
  };
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, withTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  if (!withTime) return `${day}/${month}/${year}`;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  return `hace ${years} año${years > 1 ? 's' : ''}`;
}

export function calculateAge(birthDate: string): number {
  const birth = parseDateOnly(birthDate);
  if (!birth) return Number.NaN;
  const today = startOfLocalDay(new Date());
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : null;
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function subtractCalendarYears(value: Date, years: number): Date {
  const targetYear = value.getFullYear() - years;
  const result = new Date(targetYear, value.getMonth(), value.getDate());
  if (result.getMonth() !== value.getMonth()) {
    return new Date(targetYear, value.getMonth() + 1, 0);
  }
  return result;
}

function formatDateOnly(value: Date): string {
  return [
    value.getFullYear().toString().padStart(4, '0'),
    (value.getMonth() + 1).toString().padStart(2, '0'),
    value.getDate().toString().padStart(2, '0'),
  ].join('-');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function getStatusColor(status: 'normal' | 'atencion' | 'riesgo'): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
} {
  switch (status) {
    case 'normal':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Normal',
      };
    case 'atencion':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        label: 'Atención',
      };
    case 'riesgo':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        label: 'Riesgo',
      };
  }
}

export function classifyReaction(reactionMs: number): 'normal' | 'atencion' | 'riesgo' {
  if (reactionMs < 350) return 'normal';
  if (reactionMs < 500) return 'atencion';
  return 'riesgo';
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function generateRandomReaction(): number {
  // Distribución realista para adultos mayores: 250ms a 800ms
  const min = 250;
  const max = 750;
  return Math.floor(min + Math.random() * (max - min));
}

export function generateAvatarUrl(seed: string): string {
  const initials = getInitials(seed) || 'U';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${seed}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e0f2fe" />
          <stop offset="100%" stop-color="#c7f9cc" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="32" fill="url(#g)" />
      <circle cx="60" cy="54" r="22" fill="#0f172a" fill-opacity="0.08" />
      <text x="60" y="67" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0c4a6e">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
