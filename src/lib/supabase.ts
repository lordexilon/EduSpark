/**
 * Configuración de Supabase para EduSpark
 * Cliente de Supabase para el frontend unificado
 */

import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase - usar las mismas variables del sistema de admin
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mckfscukxcqwntpjagar.supabase.co'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8'

console.log('🔌 Inicializando Supabase:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  keyPrefix: supabaseAnonKey?.substring(0, 10) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

/**
 * Wrapper de fetch con timeout opcional y mejor manejo de errores de red.
 * Si VITE_SUPABASE_USE_TIMEOUT=false, usa fetch nativo sin timeout personalizado.
 */
const fetchWithTimeout: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  // Si el timeout está deshabilitado, usar fetch nativo
  if (import.meta.env.VITE_SUPABASE_USE_TIMEOUT === 'false') {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    console.log('🌐 Fetch nativo (sin timeout):', url.substring(0, 100));
    try {
      return await fetch(input, init);
    } catch (error: any) {
      console.error('❌ Error en fetch nativo:', {
        url: url.substring(0, 100),
        error: error.message,
        name: error.name
      });
      throw error;
    }
  }

  // Detectar si es una operación de autenticación por la URL
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isAuthOperation = url.includes('/auth/v1/');
  
  // Timeout más largo para autenticación (45s), más corto para otras operaciones (30s)
  const timeoutMs = isAuthOperation 
    ? Number(import.meta.env.VITE_SUPABASE_AUTH_TIMEOUT_MS || 45000)
    : Number(import.meta.env.VITE_SUPABASE_FETCH_TIMEOUT_MS || 30000);
  
  // Si ya hay un signal en init, no agregar otro timeout para evitar conflictos
  if (init?.signal && init.signal instanceof AbortSignal) {
    return await fetch(input, init);
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    
    // Si la respuesta indica un error de servidor (522, 503, etc.), lanzar un error más descriptivo
    if (!response.ok && (response.status === 522 || response.status === 503 || response.status === 504)) {
      throw new Error(`El servidor de Supabase no está respondiendo (código: ${response.status}). Por favor, intenta nuevamente en unos momentos.`);
    }
    
    return response;
  } catch (error: any) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Log detallado del error para diagnóstico
    console.error('❌ Error en fetchWithTimeout:', {
      url: url.substring(0, 100),
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 200)
    });
    
    // Manejar errores de red de forma más específica
    if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      const networkError = new Error('Error de conexión con Supabase. Verifica tu conexión a internet o si el servidor está disponible.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    
    // Manejar errores de CORS (incluyendo cuando el servidor no responde)
    if (error.message?.includes('CORS') || 
        error.message?.includes('Access-Control-Allow-Origin') ||
        error.message?.includes('ERR_FAILED 522') ||
        error.message?.includes('net::ERR_FAILED')) {
      const corsError = new Error('El servidor de Supabase no está respondiendo correctamente. Esto puede ser un problema temporal del servidor. Por favor, verifica el estado de Supabase o intenta nuevamente en unos momentos.');
      corsError.name = 'CORSError';
      throw corsError;
    }
    
    // Manejar errores de timeout
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      const abortError = new Error(`La solicitud tardó demasiado tiempo (timeout: ${timeoutMs}ms). Esto puede deberse a una conexión lenta o problemas temporales del servidor.`);
      abortError.name = 'TimeoutError';
      throw abortError;
    }
    
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Verificar si el timeout personalizado está habilitado
// Si la variable no está definida o es 'false', usar fetch nativo
const timeoutEnvValue = import.meta.env.VITE_SUPABASE_USE_TIMEOUT;
// Por defecto, si no está definido, usar fetch nativo (más confiable)
const useCustomFetch = timeoutEnvValue === 'true' || timeoutEnvValue === true;

console.log('🔧 Configuración de Supabase:', {
  useCustomFetch,
  timeoutEnv: timeoutEnvValue,
  mode: import.meta.env.MODE,
  allSupabaseEnvKeys: Object.keys(import.meta.env).filter(k => k.includes('SUPABASE'))
});

// Cliente de Supabase para operaciones de usuario (con RLS)
// Por defecto usa fetch con timeout, pero puede deshabilitarse con VITE_SUPABASE_USE_TIMEOUT=false
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  ...(useCustomFetch && {
    global: {
      fetch: fetchWithTimeout,
    }
  }),
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Tipos de usuario para el sistema unificado
export type IdentityDocumentType = 'DNI' | 'CEDULA' | 'PASAPORTE' | 'LICENCIA' | 'OTRO' | null;

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  identity_document?: string | null
  identity_document_type?: IdentityDocumentType
  avatar_url?: string | null
  is_active?: boolean | null
  role: {
    id: number
    name: string
  }
  created_at: string
  updated_at: string
}

// Tipos para autenticación
export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    first_name?: string
    last_name?: string
  }
}

// Tipos para roles
export interface Role {
  id: number
  name: string
  description?: string
  permissions?: string[]
}
