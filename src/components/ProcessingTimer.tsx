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
}

export const ProcessingTimer: React.FC<ProcessingTimerProps> = ({ 
  startTime, 
  isProcessing,
  estimatedMinutes,
  chunksProcessed,
  chunksTotal
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
      
      // Calcular tiempo estimado restante basado en progreso
      if (chunksProcessed !== undefined && chunksTotal !== undefined && chunksTotal > 0 && chunksProcessed > 0) {
        const progress = chunksProcessed / chunksTotal;
        const elapsedMinutes = diff / 60000;
        
        if (progress > 0) {
          const estimatedTotalMinutes = elapsedMinutes / progress;
          const remainingMinutes = estimatedTotalMinutes - elapsedMinutes;
          
          if (remainingMinutes > 0) {
            const hours = Math.floor(remainingMinutes / 60);
            const mins = Math.floor(remainingMinutes % 60);
            
            if (hours > 0) {
              setEstimatedRemaining(`${hours}h ${mins}m`);
            } else {
              setEstimatedRemaining(`${mins}m`);
            }
          } else {
            setEstimatedRemaining('Finalizando...');
          }
        }
      } else if (estimatedMinutes) {
        // Usar estimación inicial si no hay progreso aún
        const elapsedMinutes = diff / 60000;
        const remaining = estimatedMinutes - elapsedMinutes;
        
        if (remaining > 0) {
          const hours = Math.floor(remaining / 60);
          const mins = Math.floor(remaining % 60);
          
          if (hours > 0) {
            setEstimatedRemaining(`${hours}h ${mins}m`);
          } else {
            setEstimatedRemaining(`${mins}m`);
          }
        } else {
          setEstimatedRemaining('Finalizando...');
        }
      }
    };

    updateTimer(); // Actualizar inmediatamente
    const interval = setInterval(updateTimer, 1000); // Actualizar cada segundo

    return () => clearInterval(interval);
  }, [startTime, isProcessing, estimatedMinutes, chunksProcessed, chunksTotal]);

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
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock size={16} className="text-blue-500" />
          <span className="font-medium">Tiempo transcurrido: {elapsed}</span>
        </div>
        {estimatedTotal && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">Tiempo pronosticado: {estimatedTotal}</span>
          </div>
        )}
        {estimatedRemaining && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">Tiempo estimado restante: {estimatedRemaining}</span>
          </div>
        )}
      </div>
    </div>
  );
};

