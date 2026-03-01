// components/VideoCallDisplay.tsx
// Componente para mostrar el enlace de videollamada en la vista de sesión

import React from 'react';
import { IconVideoCamera, IconExternalLink } from "@/components/Common/Icons";
import Card from "@/components/Common/Card";

interface VideoCallDisplayProps {
  meetLink: string;
  startsAt?: Date | string | null;
  calendarEventUrl?: string | null;
}

const VideoCallDisplay: React.FC<VideoCallDisplayProps> = ({
  meetLink,
  startsAt,
  calendarEventUrl,
}) => {
  // Verificar si la clase ya comenzó o está próxima
  const isUpcoming = startsAt ? new Date(startsAt) > new Date() : false;
  const isLive = startsAt
    ? new Date(startsAt) <= new Date() &&
      new Date(new Date(startsAt).getTime() + 3 * 60 * 60 * 1000) > new Date()
    : false;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <IconVideoCamera className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              Videollamada Sincrónica
            </h3>
            {isLive && (
              <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                EN VIVO
              </span>
            )}
            {isUpcoming && !isLive && (
              <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                Próximamente
              </span>
            )}
          </div>
          
          <p className="text-sm text-blue-700 mb-4">
            Únete a la videollamada de esta sesión usando Google Meet.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              <IconVideoCamera className="w-5 h-5" />
              {isLive ? 'Unirse a la Videollamada' : 'Ver Enlace de Meet'}
              <IconExternalLink className="w-4 h-4" />
            </a>

            {calendarEventUrl && (
              <a
                href={calendarEventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                <IconExternalLink className="w-4 h-4" />
                Ver en Google Calendar
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VideoCallDisplay;
