// workers/file-processing-worker/retryUtils.ts
// Utilidades para manejo de reintentos, backoff exponencial y circuit breaker

/**
 * Circuit Breaker para evitar saturar el servidor durante problemas
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 60000, // 1 minuto
    private readonly halfOpenMaxAttempts: number = 3
  ) {}

  /**
   * Verifica si el circuito permite la operación
   */
  canAttempt(): boolean {
    const now = Date.now();

    if (this.state === 'open') {
      // Si ha pasado el timeout, intentar half-open
      if (now - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'half-open';
        this.failures = 0;
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Registra un éxito
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      // Si tenemos suficientes éxitos en half-open, cerrar el circuito
      this.failures = 0;
      this.state = 'closed';
    } else {
      this.failures = 0;
    }
  }

  /**
   * Registra un fallo
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Si falla en half-open, volver a abrir
      this.state = 'open';
    } else if (this.failures >= this.failureThreshold) {
      // Si superamos el umbral, abrir el circuito
      this.state = 'open';
    }
  }

  /**
   * Obtiene el estado actual del circuito
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  /**
   * Resetea el circuito manualmente
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

/**
 * Ejecuta una función con backoff exponencial y reintentos
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryableErrors = (error: any) => {
      // Errores retryables: 522, 503, 504, timeouts, errores de red
      if (error?.status === 522 || error?.status === 503 || error?.status === 504) {
        return true;
      }
      if (error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')) {
        return true;
      }
      if (error?.message?.includes('ERR_FAILED') || error?.message?.includes('Failed to fetch')) {
        return true;
      }
      return false;
    },
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Si no es el último intento y el error es retryable, reintentar
      if (attempt < maxRetries && retryableErrors(error)) {
        const waitTime = Math.min(delay, maxDelay);
        console.warn(
          `[Retry] Intento ${attempt + 1}/${maxRetries + 1} falló. Reintentando en ${waitTime}ms...`,
          error.message || error
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        delay *= backoffMultiplier;
        continue;
      }

      // Si no es retryable o es el último intento, lanzar el error
      throw error;
    }
  }

  throw lastError;
}

/**
 * Ejecuta una función con timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage || `Operación excedió el timeout de ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Detecta si un error es un error 522 o similar del servidor
 */
export function isServerError(error: any): boolean {
  if (error?.status === 522 || error?.status === 503 || error?.status === 504) {
    return true;
  }
  if (error?.message?.includes('ERR_FAILED 522')) {
    return true;
  }
  if (error?.message?.includes('Connection timed out')) {
    return true;
  }
  return false;
}

/**
 * Detecta si un error es un error de red
 */
export function isNetworkError(error: any): boolean {
  if (error?.message?.includes('Failed to fetch')) {
    return true;
  }
  if (error?.message?.includes('network') || error?.message?.includes('ECONNREFUSED')) {
    return true;
  }
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET') {
    return true;
  }
  return false;
}
