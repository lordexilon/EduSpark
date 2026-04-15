// functions/confirmUserEmail/index.ts
// Cloud Function para confirmar/activar email de usuarios (requiere admin)

import { onRequest } from 'firebase-functions/v2/https';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './auth';

// Valores por defecto para Supabase (se pueden sobrescribir con variables de entorno)
const DEFAULT_SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const DEFAULT_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

// Inicializar Supabase con service role key (lazy initialization)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_SERVICE_KEY;
    
    if (!url || !key) {
      console.error('[confirmUserEmail] Variables de entorno faltantes:', {
        hasUrl: !!url,
        hasKey: !!key,
      });
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar configurados');
    }
    
    try {
      supabaseAdmin = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      console.log('[confirmUserEmail] Cliente de Supabase Admin inicializado correctamente');
    } catch (error) {
      console.error('[confirmUserEmail] Error inicializando Supabase Admin:', error);
      throw error;
    }
  }
  return supabaseAdmin;
}

interface ConfirmEmailRequest {
  userId: string;
}

/**
 * Cloud Function para confirmar/activar email de usuarios
 * Requiere autenticación y permisos de administrador
 */
export const confirmUserEmail = onRequest(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Función helper para establecer headers CORS
    const setCorsHeaders = () => {
      const origin = req.headers.origin || '*';
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Max-Age', '3600');
    };

    // Manejar CORS preflight
    if (req.method === 'OPTIONS') {
      setCorsHeaders();
      res.status(204).send('');
      return;
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
      setCorsHeaders();
      res.status(405).json({
        success: false,
        error: 'Método no permitido. Use POST.',
      });
      return;
    }

    try {
      // Verificar autenticación
      const user = await requireAuth(req, res);
      if (!user) {
        return; // requireAuth ya envió la respuesta de error
      }

      // Obtener datos del request
      const { userId }: ConfirmEmailRequest = req.body;

      // Validar datos
      if (!userId) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: 'Falta el dato requerido: userId es obligatorio',
        });
        return;
      }

      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        setCorsHeaders();
        res.status(400).json({
          success: false,
          error: 'El ID de usuario no tiene un formato válido (UUID)',
        });
        return;
      }

      // Verificar que el usuario autenticado tenga permisos de administrador
      const supabase = getSupabaseAdmin();

      // Confirmar el email del usuario usando la API de administración de Supabase
      const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true, // Confirmar el email
      });

      if (error) {
        console.error('[confirmUserEmail] Error confirmando email:', error);
        setCorsHeaders();
        
        // Mensajes de error más descriptivos
        let errorMessage = 'Error al confirmar el email del usuario';
        const errorMsg = error.message?.toLowerCase() || '';
        
        if (errorMsg.includes('user not found') || errorMsg.includes('user_id') || errorMsg.includes('does not exist')) {
          errorMessage = 'El usuario especificado no existe en el sistema de autenticación.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }

      if (!updatedUser) {
        console.error('[confirmUserEmail] Usuario no encontrado después de actualizar');
        setCorsHeaders();
        res.status(404).json({
          success: false,
          error: 'El usuario especificado no existe en el sistema.',
        });
        return;
      }

      console.log(`[confirmUserEmail] ✅ Email confirmado exitosamente para usuario: ${userId} por admin: ${user.email}`);

      setCorsHeaders();
      res.status(200).json({
        success: true,
        message: 'Email confirmado y usuario activado correctamente',
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          email_confirmed_at: updatedUser.user.email_confirmed_at,
        },
      });
    } catch (error: any) {
      console.error('[confirmUserEmail] Error inesperado:', error);
      setCorsHeaders();
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
      });
    }
  }
);

