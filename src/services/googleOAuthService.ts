// services/googleOAuthService.ts
// Servicio para manejar autenticación OAuth con Google Calendar

import { supabase } from '@/lib/supabase';

export interface GoogleToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  token_type: string;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Servicio para manejar OAuth de Google Calendar
 */
export const googleOAuthService = {
  /**
   * Obtiene la URL de redirección para OAuth
   * Permite usar una URL configurada o usar la URL dinámica del navegador
   */
  getRedirectUri(): string {
    // Si hay una URL de redirección configurada explícitamente, usarla
    const configuredRedirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
    if (configuredRedirectUri) {
      return configuredRedirectUri;
    }
    // Si no, usar la URL dinámica del navegador
    return `${window.location.origin}/auth/google/callback`;
  },

  /**
   * Obtiene la URL de autorización OAuth 2.0
   * @param services - Array de servicios a autorizar: 'calendar', 'drive', o ambos
   */
  getAuthorizationUrl(state?: string, services: ('calendar' | 'drive')[] = ['calendar']): string {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const redirectUri = this.getRedirectUri();
    
    // Construir scopes según los servicios solicitados
    const scopes: string[] = [];
    if (services.includes('calendar')) {
      scopes.push('https://www.googleapis.com/auth/calendar');
      scopes.push('https://www.googleapis.com/auth/calendar.events');
    }
    if (services.includes('drive')) {
      // Usar solo 'drive' completo, no 'drive.file' que solo permite archivos creados por la app
      // 'drive' permite leer y escribir todos los archivos del Drive del usuario
      scopes.push('https://www.googleapis.com/auth/drive');
    }
    
    const scope = scopes.join(' ');
    
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID no está configurado en las variables de entorno');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline', // Necesario para obtener refresh_token
      prompt: 'consent', // Forzar consentimiento para obtener refresh_token
      ...(state ? { state } : {})
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /**
   * Intercambia el código de autorización por tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
    const redirectUri = this.getRedirectUri();

    if (!clientId || !clientSecret) {
      throw new Error('Las credenciales de Google OAuth no están configuradas');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error al intercambiar código: ${error.error_description || error.error}`);
    }

    return await response.json();
  },

  /**
   * Guarda los tokens en la base de datos
   * @param serviceType - Tipo de servicio: 'calendar', 'drive', o 'both'
   */
  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string | null,
    expiresIn: number,
    scope: string,
    serviceType: 'calendar' | 'drive' | 'both' = 'calendar'
  ): Promise<GoogleToken> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Determinar el tipo de servicio basado en los scopes
    const hasCalendar = scope.includes('calendar');
    const hasDrive = scope.includes('drive');
    let finalServiceType = serviceType;
    
    if (hasCalendar && hasDrive) {
      finalServiceType = 'both';
    } else if (hasDrive) {
      finalServiceType = 'drive';
    } else if (hasCalendar) {
      finalServiceType = 'calendar';
    }

    const { data, error } = await supabase
      .from('user_google_tokens')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        token_type: 'Bearer',
        scope: scope,
        service_type: finalServiceType,
      }, {
        onConflict: 'user_id,service_type'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Obtiene el token de acceso del usuario (y lo refresca si es necesario)
   * @param serviceType - Tipo de servicio: 'calendar' o 'drive' (opcional, busca cualquier token si no se especifica)
   */
  async getAccessToken(userId: string, serviceType?: 'calendar' | 'drive'): Promise<string | null> {
    try {
      // Obtener token de la base de datos
      let query = supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', userId);
      
      if (serviceType) {
        // Buscar token específico del servicio o 'both'
        query = query.in('service_type', [serviceType, 'both']);
      }
      
      const { data: token, error } = await query.maybeSingle();

      if (error || !token) {
        return null;
      }

      // Verificar si el token está expirado
      const now = new Date();
      const expiresAt = token.expires_at ? new Date(token.expires_at) : null;

      if (expiresAt && expiresAt <= now) {
        // Token expirado, intentar refrescar
        if (token.refresh_token) {
          try {
            const refreshed = await this.refreshAccessToken(token.refresh_token);
            return refreshed.access_token;
          } catch (refreshError) {
            console.error('Error al refrescar token:', refreshError);
            return null;
          }
        } else {
          // No hay refresh token, el usuario necesita re-autenticarse
          return null;
        }
      }

      return token.access_token;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  },

  /**
   * Refresca un token de acceso usando el refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      throw new Error('Las credenciales de Google OAuth no están configuradas');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error al refrescar token: ${error.error_description || error.error}`);
    }

    const data = await response.json();

          // Actualizar el token en la base de datos
      const { data: tokenData } = await supabase
        .from('user_google_tokens')
        .select('user_id')
        .eq('refresh_token', refreshToken)
        .maybeSingle();

    if (tokenData) {
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      await supabase
        .from('user_google_tokens')
        .update({
          access_token: data.access_token,
          expires_at: expiresAt,
        })
        .eq('user_id', tokenData.user_id);
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  },

  /**
   * Verifica si el usuario tiene un token válido
   * @param serviceType - Tipo de servicio: 'calendar' o 'drive' (opcional)
   */
  async hasValidToken(userId: string, serviceType?: 'calendar' | 'drive'): Promise<boolean> {
    const token = await this.getAccessToken(userId, serviceType);
    return token !== null;
  },

  /**
   * Elimina los tokens del usuario (desconectar cuenta)
   * @param serviceType - Tipo de servicio: 'calendar' o 'drive' (opcional, elimina todos si no se especifica)
   */
  async disconnectAccount(userId: string, serviceType?: 'calendar' | 'drive'): Promise<void> {
    let query = supabase
      .from('user_google_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (serviceType) {
      query = query.in('service_type', [serviceType, 'both']);
    }
    
    const { error } = await query;

    if (error) throw error;
  },

  /**
   * Obtiene información del token del usuario
   * @param serviceType - Tipo de servicio: 'calendar' o 'drive' (opcional)
   */
  async getTokenInfo(userId: string, serviceType?: 'calendar' | 'drive'): Promise<GoogleToken | null> {
    let query = supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', userId);
    
    if (serviceType) {
      query = query.in('service_type', [serviceType, 'both']);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;
    return data;
  },
};
