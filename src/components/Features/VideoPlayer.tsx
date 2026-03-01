// components/VideoPlayer.tsx
// Componente para reproducir videos de YouTube, Vimeo y otros con tracking de progreso

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { VideoProgressService, ProgressUpdate } from '@/services/videoProgressService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface VideoPlayerProps {
  materialId: string;
  url: string;
  platform: 'youtube' | 'vimeo' | 'other';
  videoId?: string;
  title: string;
  autoPlay?: boolean;
  showProgress?: boolean;
  transcription?: string;
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  materialId,
  url,
  platform,
  videoId,
  title,
  autoPlay = false,
  showProgress = true,
  transcription,
  transcriptionStatus,
}) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const progressService = new VideoProgressService();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Solo estudiantes pueden marcar videos como completados
  const isStudent = user?.role?.name === 'student';
  
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    // Cargar progreso guardado
    loadProgress();
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [user?.id, materialId]);
  
  const loadProgress = async () => {
    if (!user?.id) return;
    
    try {
      const savedProgress = await progressService.getProgress(user.id, materialId);
      if (savedProgress) {
        setProgress(savedProgress);
      }
    } catch (error) {
      console.error('Error cargando progreso:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTimeUpdate = async (currentTime: number, duration: number) => {
    if (!user?.id || duration <= 0) return;
    
    // Actualizar solo cada 5 segundos para no saturar la BD
    const now = Date.now();
    if (now - lastUpdateRef.current < 5000) return;
    lastUpdateRef.current = now;
    
    // Limpiar intervalo anterior si existe
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Programar actualización
    progressIntervalRef.current = setTimeout(async () => {
      try {
        const update: ProgressUpdate = {
          watchedSeconds: currentTime,
          totalSeconds: duration,
          lastPosition: currentTime,
        };
        
        const updated = await progressService.updateProgress(
          user.id,
          materialId,
          update
        );
        setProgress(updated);
      } catch (error) {
        console.error('Error actualizando progreso:', error);
      }
    }, 100);
  };
  
  const renderVideoPlayer = () => {
    if (platform === 'youtube' && videoId) {
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}${autoPlay ? '&autoplay=1' : ''}${progress?.last_position ? `&start=${Math.floor(progress.last_position)}` : ''}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      );
    }
    
    if (platform === 'vimeo' && videoId) {
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0${autoPlay ? '&autoplay=1' : ''}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      );
    }
    
    // Para otros tipos de video, usar reproductor HTML5
    return (
      <video
        className="w-full rounded-lg"
        controls
        autoPlay={autoPlay}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          handleTimeUpdate(video.currentTime, video.duration);
        }}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          if (progress?.last_position && progress.last_position > 0) {
            video.currentTime = progress.last_position;
          }
          setIsLoading(false);
        }}
        onLoadedData={() => setIsLoading(false)}
      >
        <source src={url} />
        Tu navegador no soporta el elemento de video.
      </video>
    );
  };

  const handleMarkAsCompleted = async () => {
    if (!user?.id || markingCompleted) return;
    
    try {
      setMarkingCompleted(true);
      const updatedProgress = await progressService.markAsCompleted(user.id, materialId);
      setProgress(updatedProgress);
      
      // Mensaje más informativo
      const message = updatedProgress.total_seconds > 0
        ? `✅ Video marcado como completado.\n\nTiempo de estudio agregado: ${Math.ceil(updatedProgress.total_seconds / 60)} minutos`
        : '✅ Video marcado como completado.\n\nNota: No se pudo calcular el tiempo de estudio porque no hay información de duración del video.';
      
      alert(message);
    } catch (error: any) {
      console.error('Error marcando video como completado:', error);
      alert('Error al marcar el video como completado: ' + (error.message || 'Error desconocido'));
    } finally {
      setMarkingCompleted(false);
    }
  };

  const renderTranscript = () => {
    if (transcriptionStatus === 'completed' && transcription) {
      return (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Transcripción del Video</h3>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showTranscript ? 'Ocultar' : 'Mostrar'} Transcripción
            </button>
          </div>
          {showTranscript && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {transcription}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (transcriptionStatus === 'processing') {
      return (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span>Extrayendo transcripción...</span>
          </div>
        </div>
      );
    }
    
    if (transcriptionStatus === 'failed') {
      return (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="text-sm text-red-600">Transcripción no disponible</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="w-full">
      {renderVideoPlayer()}
      
      {showProgress && user?.id && isStudent && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          {progress && (
            <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>Progreso: {Math.round(progress.completion_percentage)}% completado</span>
                {progress.is_completed && (
                  <span className="text-green-600 dark:text-green-400 font-medium">✓ Completado</span>
                )}
              </div>
              {progress.last_position > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Última posición: {formatTime(progress.last_position)}
                </div>
              )}
            </div>
          )}
          
          {/* Botón "He visto el video" */}
          {(!progress || !progress.is_completed) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    ¿Ya viste todo el video?
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Marca como completado para actualizar tu tiempo de estudio
                  </p>
                </div>
                <button
                  onClick={handleMarkAsCompleted}
                  disabled={markingCompleted}
                  className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                >
                  {markingCompleted ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Marcando...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>He visto el video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {progress?.is_completed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">✓</span>
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Video completado
                  </p>
                  {progress.completed_at && (
                    <p className="text-xs text-green-700 mt-1">
                      Completado el {new Date(progress.completed_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {renderTranscript()}
    </div>
  );
  
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

