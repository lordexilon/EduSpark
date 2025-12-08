// functions/changeUserPassword/index.ts
// Cloud Function para cambiar contraseñas de usuarios (requiere admin)

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
      console.error('[changeUserPassword] Variables de entorno faltantes:', {
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
      console.log('[changeUserPassword] Cliente de Supabase Admin inicializado correctamente');
    } catch (error) {
      console.error('[changeUserPassword] Error inicializando Supabase Admin:', error);
      throw error;
    }
  }
  return supabaseAdmin;
}

interface ChangePasswordRequest {
  userId: string;
  newPassword: string;
}

/**
 * Cloud Function para cambiar contraseñas de usuarios
 * Requiere autenticación y permisos de administrador
 */
export const changeUserPassword = onRequest(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Manejar CORS preflight
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin || '*';
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
      const origin = req.headers.origin || '*';
      res.set('Access-Control-Allow-Origin', origin);
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
      const { userId, newPassword }: ChangePasswordRequest = req.body;

      // Validar datos
      if (!userId || !newPassword) {
        const origin = req.headers.origin || '*';
        res.set('Access-Control-Allow-Origin', origin);
        res.status(400).json({
          success: false,
          error: 'Faltan datos requeridos: userId y newPassword son obligatorios',
        });
        return;
      }

      if (newPassword.length < 6) {
        const origin = req.headers.origin || '*';
        res.set('Access-Control-Allow-Origin', origin);
        res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres',
        });
        return;
      }

      // Verificar que el usuario autenticado tenga permisos de administrador
      // (Aquí podrías agregar lógica adicional para verificar roles)
      const supabase = getSupabaseAdmin();

      // Cambiar la contraseña y confirmar el email si no está confirmado
      // Esto permite activar usuarios directamente sin necesidad de confirmar email
      const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true, // Confirmar el email automáticamente al cambiar la contraseña
      });

      if (error) {
        console.error('[changeUserPassword] Error cambiando contraseña:', error);
        const origin = req.headers.origin || '*';
        res.set('Access-Control-Allow-Origin', origin);
        
        // Mensajes de error más descriptivos
        let errorMessage = 'Error al cambiar la contraseña';
        const errorMsg = error.message?.toLowerCase() || '';
        
        if (errorMsg.includes('user not found') || errorMsg.includes('user_id') || errorMsg.includes('does not exist')) {
          errorMessage = 'El usuario especificado no existe en el sistema.';
        } else if (errorMsg.includes('password') && errorMsg.includes('weak')) {
          errorMessage = 'La contraseña no cumple con los requisitos de seguridad. Debe tener al menos 6 caracteres.';
        } else if (errorMsg.includes('invalid') && errorMsg.includes('user')) {
          errorMessage = 'El ID de usuario proporcionado no es válido.';
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
        console.error('[changeUserPassword] Usuario no encontrado después de actualizar');
        const origin = req.headers.origin || '*';
        res.set('Access-Control-Allow-Origin', origin);
        res.status(404).json({
          success: false,
          error: 'El usuario especificado no existe en el sistema.',
        });
        return;
      }

      console.log(`[changeUserPassword] ✅ Contraseña cambiada exitosamente para usuario: ${userId} por admin: ${user.email}`);

      const origin = req.headers.origin || '*';
      res.set('Access-Control-Allow-Origin', origin);
      res.status(200).json({
        success: true,
        message: 'Contraseña actualizada correctamente',
      });
    } catch (error: any) {
      console.error('[changeUserPassword] Error inesperado:', error);
      const origin = req.headers.origin || '*';
      res.set('Access-Control-Allow-Origin', origin);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
      });
    }
  }
);

