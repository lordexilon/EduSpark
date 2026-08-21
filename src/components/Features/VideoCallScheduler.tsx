// components/VideoCallScheduler.tsx
// Componente para programar videollamadas con Google Meet

import React, { useState, useEffect } from 'react';
import { videoCallService, VideoCallConfig } from '@/services/videoCallService';
import Button from '@/components/Common/Button';
import {
  IconVideoCamera,
  IconCalendar,
  IconClock,
  IconUsers,
  IconCheckCircle,
  IconX,
} from '@/components/Common/Icons';

interface VideoCallSchedulerProps {
  sessionId?: string;
  sessionTitle: string;
  sessionDescription?: string | null;
  startsAt: Date | string | null;
  endsAt?: Date | string | null;
  defaultDurationMinutes?: number;
  teacherId: string;
  studentEmails?: string[];
  existingMeetLink?: string | null;
  existingCalendarEventId?: string | null;
  onVideoCallCreated?: (result: {
    meetLink: string;
    calendarEventId: string;
    calendarEventUrl: string;
  }) => void;
  onVideoCallUpdated?: (result: {
    meetLink: string;
    calendarEventId: string;
    calendarEventUrl: string;
  }) => void;
  onVideoCallDeleted?: () => void;
}

const VideoCallScheduler: React.FC<VideoCallSchedulerProps> = ({
  sessionTitle,
  sessionDescription,
  startsAt,
  endsAt,
  defaultDurationMinutes = 120,
  teacherId,
  studentEmails = [],
  existingMeetLink,
  existingCalendarEventId,
  onVideoCallCreated,
  onVideoCallUpdated,
  onVideoCallDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasVideoCall, setHasVideoCall] = useState(!!existingMeetLink);

  // Estados para editar la videollamada
  const [editMode, setEditMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(defaultDurationMinutes);

  // Inicializar fechas
  useEffect(() => {
    if (startsAt) {
      const start = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      const hours = String(start.getHours()).padStart(2, '0');
      const minutes = String(start.getMinutes()).padStart(2, '0');

      setStartDate(`${year}-${month}-${day}`);
      setStartTime(`${hours}:${minutes}`);

      // Calcular duración si hay endsAt
      if (endsAt) {
        const end = typeof endsAt === 'string' ? new Date(endsAt) : endsAt;
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes > 0) {
          setDuration(diffMinutes);
        }
      }
    } else {
      // Valores por defecto: ahora + 1 día
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
      setStartTime('10:00');
    }
  }, [startsAt, endsAt, defaultDurationMinutes]);

  const handleCreateVideoCall = async () => {
    if (!startDate || !startTime) {
      setError('Por favor completa la fecha y hora de inicio');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Crear fechas
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDateTime = new Date(startDate);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + duration);

      // Crear configuración
      const config = videoCallService.createConfigFromSession(
        sessionTitle,
        sessionDescription || '',
        startDateTime,
        endDateTime,
        duration,
        studentEmails
      );

      // Crear videollamada
      const result = await videoCallService.createVideoCall(teacherId, config);

      setHasVideoCall(true);
      setSuccess(true);
      setEditMode(false);

      if (onVideoCallCreated) {
        onVideoCallCreated(result);
      }

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error creando videollamada:', err);
      setError(
        err.message ||
          'Error al crear la videollamada. Verifica que tengas Google Calendar conectado.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideoCall = async () => {
    if (!existingCalendarEventId) return;

    if (!confirm('¿Estás seguro de que quieres eliminar esta videollamada?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await videoCallService.deleteVideoCall(teacherId, existingCalendarEventId);

      setHasVideoCall(false);
      if (onVideoCallDeleted) {
        onVideoCallDeleted();
      }
    } catch (err: any) {
      console.error('Error eliminando videollamada:', err);
      setError(err.message || 'Error al eliminar la videollamada');
    } finally {
      setLoading(false);
    }
  };

  if (hasVideoCall && existingMeetLink && !editMode) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <IconVideoCamera className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Videollamada Programada</h3>
              <IconCheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm text-green-700 mb-3">
              La videollamada está programada y lista para la sesión.
            </p>
            <div className="space-y-2">
              <a
                href={existingMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
              >
                <IconVideoCamera className="w-4 h-4" />
                Abrir en Google Meet
              </a>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditMode(true)}
              disabled={loading}
            >
              Editar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDeleteVideoCall}
              disabled={loading}
            >
              <IconX className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-4">
        <IconVideoCamera className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-800 mb-1">
            {hasVideoCall ? 'Editar Videollamada' : 'Programar Videollamada'}
          </h3>
          <p className="text-sm text-blue-700">
            Crea una videollamada en Google Meet para esta sesión. Los estudiantes recibirán la
            invitación automáticamente.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ¡Videollamada creada exitosamente! El enlace se ha guardado en la sesión.
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <IconCalendar className="w-4 h-4 inline mr-1" />
              Fecha
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <IconClock className="w-4 h-4 inline mr-1" />
              Hora de Inicio
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <IconClock className="w-4 h-4 inline mr-1" />
            Duración (minutos)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
            min="15"
            max="480"
            step="15"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Duración sugerida: 60-180 minutos para sesiones de clase
          </p>
        </div>

        {studentEmails.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <IconUsers className="w-4 h-4 inline mr-1" />
              Participantes ({studentEmails.length} estudiantes)
            </label>
            <div className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200 max-h-32 overflow-y-auto">
              {studentEmails.map((email, idx) => (
                <div key={idx} className="py-1">
                  {email}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Todos los estudiantes inscritos recibirán una invitación automática
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleCreateVideoCall}
            disabled={loading || !startDate || !startTime}
            className="flex items-center gap-2"
          >
            <IconVideoCamera className="w-4 h-4" />
            {loading
              ? 'Creando...'
              : hasVideoCall
                ? 'Actualizar Videollamada'
                : 'Crear Videollamada'}
          </Button>
          {editMode && (
            <Button
              variant="secondary"
              onClick={() => {
                setEditMode(false);
                setError(null);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          <strong>Nota:</strong> Asegúrate de tener Google Calendar conectado en tu cuenta. La
          videollamada se creará automáticamente y los estudiantes recibirán la invitación por
          email.
        </p>
      </div>
    </div>
  );
};

export default VideoCallScheduler;
