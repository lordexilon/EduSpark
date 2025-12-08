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

// Cliente de Supabase para operaciones de usuario (con RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
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
