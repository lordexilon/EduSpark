// components/MaterialDisplay.tsx
// Componente para mostrar materiales, incluyendo videos con reproductor integrado

import React, { useState } from 'react';
import { Material } from '../services/teacherCourses';
import { VideoPlayer } from './VideoPlayer';
import { VideoTranscriptService } from '../services/videoTranscriptService';
import { IconBookOpen, IconEye, IconVideoCamera } from './Icons';

interface MaterialDisplayProps {
  material: Material;
  showFullPlayer?: boolean; // Si es true, muestra el reproductor completo. Si es false, muestra preview con modal
}

export const MaterialDisplay: React.FC<MaterialDisplayProps> = ({ 
  material, 
  showFullPlayer = false 
}) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const transcriptService = new VideoTranscriptService();
  
  // Detectar plataforma de video
  const detectVideoPlatform = (url?: string): 'youtube' | 'vimeo' | 'other' | null => {
    if (!url) return null;
    const platform = transcriptService.detectPlatform(url);
    return platform ? platform.name : null;
  };
  
  // Extraer video ID
  const getVideoId = (url?: string, platform?: string): string | undefined => {
    if (!url || !platform) return undefined;
    const platformObj = transcriptService.detectPlatform(url);
    if (platformObj) {
      return platformObj.extractId(url) || undefined;
    }
    return undefined;
  };
  
  // Detectar si es video por kind o por URL
  const isVideoByKind = material.kind === 'video';
  const detectedPlatform = material.url ? detectVideoPlatform(material.url) : null;
  const isVideoByUrl = detectedPlatform !== null;
  const isVideoByTitle = material.title?.toLowerCase().includes('video') || 
                         material.title?.toLowerCase().includes('youtube') ||
                         material.title?.toLowerCase().includes('vimeo');
  const isVideo = isVideoByKind || isVideoByUrl || (isVideoByTitle && material.url);
  
  const platform = isVideo ? (material.video_platform || detectedPlatform) : null;
  const videoId = isVideo && material.url ? (material.video_id || getVideoId(material.url, platform || undefined)) : undefined;
  
  // Si showFullPlayer es true y tenemos una URL que parece ser de video, mostrar reproductor completo
  // Esto asegura que incluso si kind no es 'video', pero la URL es de YouTube/Vimeo, se muestre el reproductor
  if (showFullPlayer && material.url && (isVideoByKind || isVideoByUrl)) {
    return (
      <div className="w-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{material.title}</h3>
          {material.metadata?.description && (
            <p className="text-sm text-gray-600 mb-3">{material.metadata.description}</p>
          )}
        </div>
        <VideoPlayer
          materialId={material.id}
          url={material.url}
          platform={platform || 'other'}
          videoId={videoId}
          title={material.title}
          showProgress={true}
          transcription={material.transcription}
          transcriptionStatus={material.transcription_status}
        />
        {material.transcription_status === 'completed' && (
          <div className="mt-2 text-xs text-green-600">
            ✓ Transcripción disponible - Puedes hacer preguntas al tutor IA sobre este video
          </div>
        )}
      </div>
    );
  }
  
  // Si es video pero no showFullPlayer, mostrar preview con modal
  if (isVideo && material.url) {
    return (
      <>
        <div 
          className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer"
          onClick={() => setShowVideoModal(true)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <IconVideoCamera className="w-5 h-5 text-red-600 flex-shrink-0" />
                <h4 className="text-base font-semibold text-gray-900 group-hover:text-primary">
                  {material.title}
                </h4>
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                  Video
                </span>
                {material.transcription_status === 'completed' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                    ✓ Transcripción
                  </span>
                )}
              </div>
              {material.metadata?.description && (
                <p className="text-xs text-gray-600 mt-1">{material.metadata.description}</p>
              )}
              <p className="text-xs text-blue-600 mt-2 font-medium">
                📺 Haz clic para reproducir video →
              </p>
            </div>
            <IconEye className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" />
          </div>
        </div>
        
        {/* Modal para reproducir video */}
        {showVideoModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVideoModal(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{material.title}</h2>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <VideoPlayer
                  materialId={material.id}
                  url={material.url}
                  platform={platform || 'other'}
                  videoId={videoId}
                  title={material.title}
                  showProgress={true}
                  transcription={material.transcription}
                  transcriptionStatus={material.transcription_status}
                />
                {material.transcription_status === 'completed' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>✓ Transcripción disponible:</strong> Puedes hacer preguntas al tutor IA sobre el contenido de este video.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  
  // Para otros tipos de materiales, mostrar como enlace normal
  return (
    <a
      href={material.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <IconBookOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <h4 className="text-base font-semibold text-gray-900 group-hover:text-primary">
              {material.title}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
              {material.kind || material.mime_type || 'material'}
            </span>
          </div>
          {material.metadata?.optimized && (
            <p className="text-xs text-gray-500">
              {material.metadata.optimized}
            </p>
          )}
        </div>
        <IconEye className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" />
      </div>
    </a>
  );
};

