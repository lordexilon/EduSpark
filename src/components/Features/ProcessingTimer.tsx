// components/ProcessingTimer.tsx
// Componente para mostrar tiempo transcurrido y estimado

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ProcessingTimerProps {
  startTime: Date | string | null;
  isProcessing: boolean;
  estimatedMinutes?: number;
  chunksProcessed?: number;
  chunksTotal?: number;
  jobStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}

export const ProcessingTimer: React.FC<ProcessingTimerProps> = ({
  startTime,
  isProcessing,
  estimatedMinutes,
  chunksProcessed,
  chunksTotal,
  jobStatus,
}) => {
  const [elapsed, setElapsed] = useState<string>('00:00');
  const [estimatedRemaining, setEstimatedRemaining] = useState<string | null>(null);
  const [estimatedTotal, setEstimatedTotal] = useState<string | null>(null);

  useEffect(() => {
    // Mostrar tiempo pronosticado siempre si está disponible, incluso si no está procesando
    if (estimatedMinutes) {
      const hours = Math.floor(estimatedMinutes / 60);
      const mins = Math.floor(estimatedMinutes % 60);

      if (hours > 0) {
        setEstimatedTotal(`${hours}h ${mins}m`);
      } else {
        setEstimatedTotal(`${mins}m`);
      }
    } else {
      setEstimatedTotal(null);
    }

    if (!startTime || !isProcessing) {
      setElapsed('00:00');
      setEstimatedRemaining(null);
      return;
    }

    const updateTimer = () => {
      // Manejar diferentes formatos de fecha (Firestore Timestamp, string, Date)
      let start: Date;
      if (startTime instanceof Date) {
        start = startTime;
      } else if (typeof startTime === 'string') {
        start = new Date(startTime);
      } else if (startTime && typeof startTime === 'object' && 'toDate' in startTime) {
        // Firestore Timestamp
        start = (startTime as any).toDate();
      } else if (startTime && typeof startTime === 'object' && 'seconds' in startTime) {
        // Firestore Timestamp en formato {seconds, nanoseconds}
        start = new Date((startTime as any).seconds * 1000);
      } else {
        start = new Date(startTime as any);
      }

      // Validar que la fecha sea válida
      if (isNaN(start.getTime())) {
        console.warn('ProcessingTimer: Fecha inválida', startTime);
        return;
      }

      const now = new Date();
      const diff = now.getTime() - start.getTime();

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

      // Mostrar tiempo pronosticado total siempre (si está disponible)
      if (estimatedMinutes) {
        const hours = Math.floor(estimatedMinutes / 60);
        const mins = Math.floor(estimatedMinutes % 60);

        if (hours > 0) {
          setEstimatedTotal(`${hours}h ${mins}m`);
        } else {
          setEstimatedTotal(`${mins}m`);
        }
      }

      // Si el job está en "pending", no calcular tiempo restante (aún no ha comenzado a procesarse)
      if (jobStatus === 'pending') {
        // Si está en cola, mostrar el tiempo estimado total pero no el restante
        setEstimatedRemaining(null);
      } else if (
        chunksProcessed !== undefined &&
        chunksTotal !== undefined &&
        chunksTotal > 0 &&
        chunksProcessed > 0
      ) {
        // Calcular tiempo estimado restante basado en progreso de chunks
        const progress = chunksProcessed / chunksTotal;
        const elapsedMinutes = diff / 60000;

        // Solo calcular si hay progreso real (más de 1 chunk procesado y progreso > 0.01)
        if (progress > 0.01 && chunksProcessed > 1) {
          // Calcular velocidad promedio (chunks por minuto)
          const chunksPerMinute = chunksProcessed / elapsedMinutes;

          // Solo si la velocidad es razonable (> 0.1 chunks/minuto)
          if (chunksPerMinute > 0.1) {
            const remainingChunks = chunksTotal - chunksProcessed;
            const remainingMinutes = remainingChunks / chunksPerMinute;

            // Limitar el tiempo restante a un máximo razonable (24 horas)
            const maxRemainingMinutes = 24 * 60;
            const finalRemainingMinutes = Math.min(remainingMinutes, maxRemainingMinutes);

            if (finalRemainingMinutes > 0) {
              const hours = Math.floor(finalRemainingMinutes / 60);
              const mins = Math.floor(finalRemainingMinutes % 60);

              if (hours > 0) {
                setEstimatedRemaining(`${hours}h ${mins}m`);
              } else {
                setEstimatedRemaining(`${mins}m`);
              }
            } else {
              setEstimatedRemaining('Finalizando...');
            }
          } else {
            // Si la velocidad es muy baja, no mostrar estimación (probablemente hay errores)
            setEstimatedRemaining(null);
          }
        }
      } else if (estimatedMinutes && jobStatus === 'processing') {
        // Usar estimación inicial solo si el job está realmente procesando (no en cola)
        const elapsedMinutes = diff / 60000;
        const remaining = estimatedMinutes - elapsedMinutes;

        if (remaining > 1) {
          // Si queda más de 1 minuto, mostrar tiempo restante
          const hours = Math.floor(remaining / 60);
          const mins = Math.floor(remaining % 60);

          if (hours > 0) {
            setEstimatedRemaining(`${hours}h ${mins}m`);
          } else {
            setEstimatedRemaining(`${mins}m`);
          }
        } else if (remaining > 0) {
          // Si queda menos de 1 minuto pero aún positivo, mostrar "Finalizando..."
          setEstimatedRemaining('Finalizando...');
        } else {
          // Si ya pasó el tiempo estimado, no mostrar tiempo restante
          setEstimatedRemaining(null);
        }
      } else {
        // Si no hay información suficiente, no mostrar tiempo restante
        setEstimatedRemaining(null);
      }
    };

    updateTimer(); // Actualizar inmediatamente
    const interval = setInterval(updateTimer, 1000); // Actualizar cada segundo

    return () => clearInterval(interval);
  }, [startTime, isProcessing, estimatedMinutes, chunksProcessed, chunksTotal, jobStatus]);

  // Mostrar siempre el tiempo pronosticado si está disponible, incluso si no está procesando
  if (estimatedTotal && !isProcessing) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock size={16} className="text-gray-500" />
        <span className="font-medium">Tiempo pronosticado: {estimatedTotal}</span>
      </div>
    );
  }

  if (!startTime || !isProcessing) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock size={16} className="text-blue-600" />
      <div className="flex flex-col">
        <span className="text-xs text-blue-600">Transcurrido</span>
        <span className="font-semibold text-blue-800">{elapsed}</span>
      </div>
    </div>
  );
};
