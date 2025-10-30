const PLACEHOLDER_VALUES = new Set(['', 'PLACEHOLDER_API_KEY', 'undefined', 'null']);

const FALLBACKS = ['VITE_GEMINI_API_KEY', 'GEMINI_API_KEY', 'API_KEY'] as const;
const HARDCODED_KEY = 'AIzaSyDmbEdVTtQSaYInAsuCbplkSs_PFZSo2sc';

type EnvRecord = Record<string, string | undefined> | undefined;

const getImportMetaEnv = (): EnvRecord => {
  try {
    return (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  } catch {
    return undefined;
  }
};

const getProcessEnv = (): EnvRecord => {
  try {
    return (typeof process !== 'undefined' ? process.env : undefined) as EnvRecord;
  } catch {
    return undefined;
  }
};

const sanitizeValue = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (PLACEHOLDER_VALUES.has(trimmed)) {
    return null;
  }

  return trimmed;
};

const pickFirstValid = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    const sanitized = sanitizeValue(value);
    if (sanitized) {
      return sanitized;
    }
  }
  
  // Fallback final: API key hardcodeada para desarrollo
  return HARDCODED_KEY;
};

/**
 * Obtiene la API Key de Gemini desde distintos orígenes permitidos.
 * Prioriza `import.meta.env`, luego `process.env`.
 */
export const resolveGeminiApiKey = () => {
  const browserEnv = getImportMetaEnv();
  const nodeEnv = getProcessEnv();

  const rawKey = pickFirstValid(
    browserEnv?.[FALLBACKS[0]],
    browserEnv?.[FALLBACKS[1]],
    browserEnv?.[FALLBACKS[2]],
    nodeEnv?.[FALLBACKS[0]],
    nodeEnv?.[FALLBACKS[1]],
    nodeEnv?.[FALLBACKS[2]]
  );

  return {
    key: rawKey,
    missing: !rawKey,
  } as const;
};

export const getGeminiApiKey = (): string | null => resolveGeminiApiKey().key;

export const isGeminiApiConfigured = (): boolean => !resolveGeminiApiKey().missing;

