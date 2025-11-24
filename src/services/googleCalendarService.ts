// services/googleCalendarService.ts
// Servicio para integración con Google Calendar API y Google Meet

/**
 * Interfaz para configurar una videollamada
 */
export interface CreateMeetingParams {
  title: string;
  description?: string;
  startTime: Date; // Fecha y hora de inicio
  endTime: Date; // Fecha y hora de fin
  timezone?: string; // Zona horaria (ej: 'America/Lima')
  attendees?: string[]; // Lista de emails de participantes
  teacherEmail: string; // Email del profesor (organizador)
}

/**
 * Respuesta al crear un evento en Google Calendar
 */
export interface CalendarEventResponse {
  eventId: string;
  meetLink: string;
  htmlLink?: string; // Enlace para ver el evento en Calendar
}

/**
 * Configuración de credenciales de Google (debe configurarse en variables de entorno)
 */
interface GoogleConfig {
  clientId: string;
  apiKey: string;
  scope: string;
}

/**
 * Servicio para interactuar con Google Calendar API
 * 
 * NOTA: Para usar este servicio necesitas:
 * 1. Configurar Google Cloud Project
 * 2. Habilitar Google Calendar API y Google Meet API
 * 3. Configurar OAuth 2.0 credentials
 * 4. Almacenar tokens de acceso de los profesores
 */
export const googleCalendarService = {
  /**
   * Crea un evento en Google Calendar con Google Meet
   * 
   * @param accessToken Token de acceso OAuth del profesor
   * @param params Parámetros del evento
   * @returns Información del evento creado con el enlace de Meet
   */
  async createMeeting(
    accessToken: string,
    params: CreateMeetingParams
  ): Promise<CalendarEventResponse> {
    try {
      const event = {
        summary: params.title,
        description: params.description || '',
        start: {
          dateTime: params.startTime.toISOString(),
          timeZone: params.timezone || 'America/Lima',
        },
        end: {
          dateTime: params.endTime.toISOString(),
          timeZone: params.timezone || 'America/Lima',
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet', // Usar Google Meet
            },
          },
        },
        attendees: [
          { email: params.teacherEmail, organizer: true },
          ...(params.attendees || []).map(email => ({ email })),
        ],
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Error al crear evento en Google Calendar: ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();

      // Extraer el enlace de Meet
      const meetLink =
        data.conferenceData?.entryPoints?.find(
          (entry: any) => entry.entryPointType === 'video'
        )?.uri || '';

      if (!meetLink) {
        throw new Error('No se pudo obtener el enlace de Google Meet');
      }

      return {
        eventId: data.id,
        meetLink,
        htmlLink: data.htmlLink,
      };
    } catch (error) {
      console.error('Error creando evento en Google Calendar:', error);
      throw error;
    }
  },

  /**
   * Actualiza un evento existente en Google Calendar
   */
  async updateMeeting(
    accessToken: string,
    eventId: string,
    params: Partial<CreateMeetingParams>
  ): Promise<CalendarEventResponse> {
    try {
      // Primero obtener el evento actual
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!getResponse.ok) {
        throw new Error('No se pudo obtener el evento existente');
      }

      const existingEvent = await getResponse.json();

      // Actualizar campos
      const updatedEvent = {
        ...existingEvent,
        summary: params.title || existingEvent.summary,
        description: params.description !== undefined ? params.description : existingEvent.description,
        start: params.startTime
          ? {
              dateTime: params.startTime.toISOString(),
              timeZone: params.timezone || 'America/Lima',
            }
          : existingEvent.start,
        end: params.endTime
          ? {
              dateTime: params.endTime.toISOString(),
              timeZone: params.timezone || 'America/Lima',
            }
          : existingEvent.end,
        attendees: params.attendees
          ? [
              { email: params.teacherEmail || existingEvent.organizer.email, organizer: true },
              ...params.attendees.map(email => ({ email })),
            ]
          : existingEvent.attendees,
      };

      // Actualizar el evento
      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedEvent),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(
          `Error al actualizar evento: ${error.error?.message || updateResponse.statusText}`
        );
      }

      const data = await updateResponse.json();

      const meetLink =
        data.conferenceData?.entryPoints?.find(
          (entry: any) => entry.entryPointType === 'video'
        )?.uri || existingEvent.conferenceData?.entryPoints?.find(
          (entry: any) => entry.entryPointType === 'video'
        )?.uri || '';

      return {
        eventId: data.id,
        meetLink,
        htmlLink: data.htmlLink,
      };
    } catch (error) {
      console.error('Error actualizando evento en Google Calendar:', error);
      throw error;
    }
  },

  /**
   * Elimina un evento de Google Calendar
   */
  async deleteMeeting(accessToken: string, eventId: string): Promise<void> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.json();
        throw new Error(
          `Error al eliminar evento: ${error.error?.message || response.statusText}`
        );
      }
    } catch (error) {
      console.error('Error eliminando evento en Google Calendar:', error);
      throw error;
    }
  },

  /**
   * Obtiene información de un evento (útil para obtener el meet link si se perdió)
   */
  async getMeetingInfo(
    accessToken: string,
    eventId: string
  ): Promise<CalendarEventResponse | null> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Error al obtener información del evento');
      }

      const data = await response.json();

      const meetLink =
        data.conferenceData?.entryPoints?.find(
          (entry: any) => entry.entryPointType === 'video'
        )?.uri || '';

      return {
        eventId: data.id,
        meetLink,
        htmlLink: data.htmlLink,
      };
    } catch (error) {
      console.error('Error obteniendo información del evento:', error);
      throw error;
    }
  },

  /**
   * Obtiene la URL de autorización OAuth 2.0 para Google Calendar
   * 
   * NOTA: Esto debe implementarse en el backend por seguridad
   */
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    const encodedScope = encodeURIComponent(scope);
    const encodedState = state ? `&state=${encodeURIComponent(state)}` : '';

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodedScope}${encodedState}&access_type=offline&prompt=consent`;
  },
};

/**
 * Funciones helper para trabajar con tokens y autenticación
 * @deprecated Usar googleOAuthService en su lugar
 */
export const googleAuthHelper = {
  /**
   * Almacena el token de acceso del usuario (debe almacenarse de forma segura)
   * @deprecated Usar googleOAuthService.saveTokens
   */
  async storeAccessToken(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    console.warn('googleAuthHelper.storeAccessToken está deprecado. Usa googleOAuthService.saveTokens');
    // Delegar al nuevo servicio
    const { googleOAuthService } = await import('./googleOAuthService');
    await googleOAuthService.saveTokens(
      userId,
      accessToken,
      refreshToken || null,
      3600, // Asumir 1 hora si no se proporciona
      'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
    );
  },

  /**
   * Obtiene el token de acceso del usuario
   * @deprecated Usar googleOAuthService.getAccessToken
   */
  async getAccessToken(userId: string): Promise<string | null> {
    console.warn('googleAuthHelper.getAccessToken está deprecado. Usa googleOAuthService.getAccessToken');
    const { googleOAuthService } = await import('./googleOAuthService');
    return await googleOAuthService.getAccessToken(userId);
  },

  /**
   * Refresca el token de acceso usando el refresh token
   * @deprecated Usar googleOAuthService.refreshAccessToken
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    console.warn('googleAuthHelper.refreshAccessToken está deprecado. Usa googleOAuthService.refreshAccessToken');
    const { googleOAuthService } = await import('./googleOAuthService');
    const result = await googleOAuthService.refreshAccessToken(refreshToken);
    return result.access_token;
  },
};
