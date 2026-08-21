/**
 * utils/dateFormat.ts
 * S2-T04 — Trazabilidad horaria estricta (HU-T04)
 *
 * Todas las fechas visibles al estudiante deben renderizarse en la
 * zona horaria institucional (America/Asuncion) para cumplir con los
 * requerimientos CONES/ANEAES de Paraguay.
 *
 * USO: importar estas funciones en lugar de llamar a toLocaleDateString
 * directamente sobre un Date.
 */

import { DEFAULT_TIMEZONE_PARAGUAY } from '@/constants/regional';

const LOCALE_ES_PY = 'es-PY';
const TZ = DEFAULT_TIMEZONE_PARAGUAY; // 'America/Asuncion'

// ─── Formateo de Fecha ────────────────────────────────────────────────────────

/** "19 de abr. de 2026" */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleDateString(LOCALE_ES_PY, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  });
}

/** "19 abr." — versión corta para listas y badges */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE_ES_PY, {
    day: '2-digit',
    month: 'short',
    timeZone: TZ,
  });
}

/** "19 de abril de 2026" — versión extendida para encabezados */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleDateString(LOCALE_ES_PY, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  });
}

// ─── Formateo de Hora ─────────────────────────────────────────────────────────

/** "14:30" */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(LOCALE_ES_PY, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

/** "19 abr. 14:30" — fecha y hora compacta para logs y banners */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(LOCALE_ES_PY, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

// ─── Comparadores de Fecha (timezone-aware) ───────────────────────────────────

/**
 * Devuelve la fecha actual en la zona horaria de Paraguay.
 * Usar en lugar de `new Date()` para comparaciones de disponibilidad.
 */
export function nowInParaguay(): Date {
  // Obtener el offset actual de America/Asuncion
  const now = new Date();
  const tzOffset = getParaguayOffsetMs(now);
  return new Date(now.getTime() + tzOffset);
}

/**
 * Normaliza una fecha a medianoche en America/Asuncion.
 * Usar en comparaciones de rangos de disponibilidad de cursos/unidades.
 */
export function toParaguayMidnight(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tzStr = d.toLocaleDateString('en-CA', { timeZone: TZ }); // "YYYY-MM-DD"
  return new Date(`${tzStr}T00:00:00`);
}

/**
 * Verifica si la fecha actual (en PY) está dentro del rango [from, until].
 * Maneja correctamente el DST de Paraguay (UTC-4 verano / UTC-3 invierno).
 */
export function isNowInRange(
  from: string | null | undefined,
  until: string | null | undefined
): boolean {
  const now = new Date();
  if (from && until) {
    return now >= new Date(from) && now <= new Date(until);
  }
  if (from) return now >= new Date(from);
  if (until) return now <= new Date(until);
  return true;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Obtiene el offset en ms de America/Asuncion para una fecha dada (maneja DST). */
function getParaguayOffsetMs(date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const pyStr = date.toLocaleString('en-US', { timeZone: TZ });
  return new Date(pyStr).getTime() - new Date(utcStr).getTime();
}
