// services/videoCallService.ts
// Servicio para gestionar videollamadas con Google Calendar y Google Meet

/**
 * Interfaces para videollamadas
 */
export interface VideoCallConfig {
  title: string;
  description?: string;
  startTime: Date; // Fecha y hora de inicio
  endTime: Date; // Fecha y hora de fin
  attendees?: string[]; // Lista de emails de participantes
  timezone?: string; // Zona horaria (default: America/Lima)
}

export interface VideoCallResult {
  meetLink: string; // Enlace de Google Meet
  calendarEventId: string; // ID del evento en Google Calendar
  calendarEventUrl: string; // URL del evento en Google Calendar
  hangoutLink?: string; // Enlace alternativo (deprecated pero puede estar presente)
}

export interface VideoCallMetadata {
  recordingUrl?: string;
  participantCount?: number;
  duration?: number; // en minutos
  attendance?: Array<{
    email: string;
    joinTime?: Date;
    leaveTime?: Date;
    duration?: number; // en minutos
  }>;
}

/**
 * Servicio para gestionar videollamadas
 *
 * NOTA: Este servicio requiere:
 * 1. Configurar OAuth 2.0 con Google en el backend
 * 2. Almacenar tokens de acceso del profesor
 * 3. Implementar el backend endpoint que llame a Google Calendar API
 *
 * Por ahora, este servicio proporciona la estructura y funciones helper
 * que se comunicarán con el backend.
 */
export const videoCallService = {
  /**
   * Crea una videollamada programada usando Google Calendar API
   *
   * @param teacherId ID del profesor que crea la videollamada
   * @param config Configuración de la videollamada
   * @returns Información de la videollamada creada
   */
  async createVideoCall(teacherId: string, config: VideoCallConfig): Promise<VideoCallResult> {
    try {
      // Llamar al backend que creará el evento en Google Calendar
      // El backend debe:
      // 1. Obtener el token de acceso de Google del profesor
      // 2. Crear evento en Google Calendar con conferencia de video
      // 3. Retornar los datos del evento

      const response = await fetch('/api/video-calls/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          config: {
            ...config,
            startTime: config.startTime.toISOString(),
            endTime: config.endTime.toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear la videollamada');
      }

      const result: VideoCallResult = await response.json();
      return result;
    } catch (error: any) {
      console.error('Error creando videollamada:', error);
      throw error;
    }
  },

  /**
   * Actualiza una videollamada existente
   *
   * @param teacherId ID del profesor
   * @param calendarEventId ID del evento en Google Calendar
   * @param updates Campos a actualizar
   */
  async updateVideoCall(
    teacherId: string,
    calendarEventId: string,
    updates: Partial<VideoCallConfig>
  ): Promise<VideoCallResult> {
    try {
      const response = await fetch(`/api/video-calls/${calendarEventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          updates: {
            ...updates,
            startTime: updates.startTime?.toISOString(),
            endTime: updates.endTime?.toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar la videollamada');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error actualizando videollamada:', error);
      throw error;
    }
  },

  /**
   * Elimina una videollamada
   *
   * @param teacherId ID del profesor
   * @param calendarEventId ID del evento en Google Calendar
   */
  async deleteVideoCall(teacherId: string, calendarEventId: string): Promise<void> {
    try {
      const response = await fetch(`/api/video-calls/${calendarEventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la videollamada');
      }
    } catch (error: any) {
      console.error('Error eliminando videollamada:', error);
      throw error;
    }
  },

  /**
   * Obtiene la información de asistencia de una videollamada
   *
   * @param teacherId ID del profesor
   * @param calendarEventId ID del evento en Google Calendar
   * @returns Metadatos de la videollamada incluyendo asistencia
   */
  async getVideoCallAttendance(
    teacherId: string,
    calendarEventId: string
  ): Promise<VideoCallMetadata> {
    try {
      const response = await fetch(`/api/video-calls/${calendarEventId}/attendance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al obtener la asistencia');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error obteniendo asistencia:', error);
      throw error;
    }
  },

  /**
   * Obtiene la URL de grabación de una videollamada (si está disponible)
   *
   * @param teacherId ID del profesor
   * @param calendarEventId ID del evento en Google Calendar
   * @returns URL de la grabación o null si no está disponible
   */
  async getRecordingUrl(teacherId: string, calendarEventId: string): Promise<string | null> {
    try {
      const metadata = await this.getVideoCallAttendance(teacherId, calendarEventId);
      return metadata.recordingUrl || null;
    } catch (error: any) {
      console.error('Error obteniendo grabación:', error);
      return null;
    }
  },

  /**
   * Helper para crear una configuración de videollamada desde una sesión
   *
   * @param sessionTitle Título de la sesión
   * @param sessionDescription Descripción de la sesión
   * @param startsAt Fecha/hora de inicio (desde sessions.starts_at)
   * @param endsAt Fecha/hora de fin (desde sessions.ends_at o calcular duración)
   * @param durationMinutes Duración en minutos si endsAt no está disponible
   * @param studentEmails Lista de emails de estudiantes inscritos
   * @returns Configuración lista para crear la videollamada
   */
  createConfigFromSession(
    sessionTitle: string,
    sessionDescription: string | null | undefined,
    startsAt: Date | string | null,
    endsAt: Date | string | null | undefined,
    durationMinutes: number = 120, // Default: 2 horas
    studentEmails: string[] = []
  ): VideoCallConfig {
    if (!startsAt) {
      throw new Error('La fecha de inicio es requerida para crear una videollamada');
    }

    const startTime = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
    const endTime = endsAt
      ? typeof endsAt === 'string'
        ? new Date(endsAt)
        : endsAt
      : new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    return {
      title: sessionTitle,
      description: sessionDescription || undefined,
      startTime,
      endTime,
      attendees: studentEmails,
      timezone: 'America/Lima', // Ajustar según necesidad
    };
  },
};

/**
 * NOTAS DE IMPLEMENTACIÓN BACKEND:
 *
 * 1. ENDPOINT: POST /api/video-calls/create
 *    - Autenticar profesor
 *    - Obtener token de Google OAuth del profesor
 *    - Crear evento en Google Calendar con conferencia de video:
 *      {
 *        summary: config.title,
 *        description: config.description,
 *        start: { dateTime: config.startTime, timeZone: config.timezone },
 *        end: { dateTime: config.endTime, timeZone: config.timezone },
 *        conferenceData: {
 *          createRequest: {
 *            requestId: uuid(),
 *            conferenceSolutionKey: { type: 'hangoutsMeet' }
 *          }
 *        },
 *        attendees: config.attendees.map(email => ({ email }))
 *      }
 *    - Retornar: { meetLink, calendarEventId, calendarEventUrl }
 *
 * 2. ENDPOINT: GET /api/video-calls/:eventId/attendance
 *    - Autenticar profesor
 *    - Obtener token de Google OAuth
 *    - Llamar a Google Meet API (si está disponible) o Google Calendar API
 *    - Retornar metadatos de asistencia
 *
 * 3. ALMACENAR TOKENS:
 *    - Crear tabla user_oauth_tokens con:
 *      - user_id
 *      - provider (google, microsoft, etc.)
 *      - access_token
 *      - refresh_token
 *      - expires_at
 *    - Implementar refresh automático de tokens
 */
