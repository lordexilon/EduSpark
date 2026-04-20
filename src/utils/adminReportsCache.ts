/**
 * Caché local de reportes admin (reduce tráfico repetido).
 * Política: datos válidos hasta el próximo "cierre diario" 21:00 hora Paraguay (America/Asuncion),
 * salvo que el usuario fuerce actualización o cambien filtros de fecha.
 */

const STORAGE_PREFIX = 'eduspark_admin_reports_v1';

export interface AdminReportsCachePayload {
  institutionsJson: string;
  globalMetricsJson: string;
  /** ISO: instante en que se generó la caché */
  generatedAt: string;
  /** ms epoch: no usar caché después de este instante */
  validUntilMs: number;
  dateFrom: string;
  dateTo: string;
}

function cacheKey(dateFrom: string, dateTo: string, userId: string): string {
  return `${STORAGE_PREFIX}:${userId}:${dateFrom || 'all'}:${dateTo || 'all'}`;
}

/**
 * Próximo cierre: siguiente 21:00 (punto en el minuto) en America/Asuncion.
 */
export function getNextAsuncionDailyCloseMs(fromMs: number = Date.now()): number {
  const tz = 'America/Asuncion';
  const partsAt = (ms: number) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(new Date(ms));

  for (let addMin = 1; addMin <= 48 * 60; addMin++) {
    const ms = fromMs + addMin * 60_000;
    const parts = partsAt(ms);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    if (hour === 21 && minute === 0) {
      return ms;
    }
  }
  return fromMs + 24 * 60 * 60 * 1000;
}

export function loadAdminReportsCache(
  dateFrom: string,
  dateTo: string,
  userId: string
): AdminReportsCachePayload | null {
  try {
    const raw = localStorage.getItem(cacheKey(dateFrom, dateTo, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminReportsCachePayload;
    if (Date.now() > parsed.validUntilMs) {
      localStorage.removeItem(cacheKey(dateFrom, dateTo, userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAdminReportsCache(
  payload: Omit<AdminReportsCachePayload, 'validUntilMs' | 'generatedAt'> & {
    validUntilMs?: number;
    generatedAt?: string;
  },
  userId: string
): void {
  const full: AdminReportsCachePayload = {
    ...payload,
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    validUntilMs: payload.validUntilMs ?? getNextAsuncionDailyCloseMs(),
  };
  try {
    localStorage.setItem(cacheKey(payload.dateFrom, payload.dateTo, userId), JSON.stringify(full));
  } catch {
    // quota / privado
  }
}

export function clearAdminReportsCache(userId: string): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${STORAGE_PREFIX}:${userId}:`)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}
