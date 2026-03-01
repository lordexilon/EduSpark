// components/MaterialDisplay.tsx
// Componente para mostrar materiales, incluyendo videos con reproductor integrado

import React, { useState, useCallback, useMemo } from 'react';
import { Material } from '@/services/teacherCourses';
import { VideoPlayer } from './VideoPlayer';
import { VideoTranscriptService } from '@/services/videoTranscriptService';
import { DocumentViewer } from './DocumentViewer';
import SecurePDFViewer from './SecurePDFViewer'; // Visor seguro de PDF
import { IconBookOpen, IconEye, IconVideoCamera } from "@/components/Common/Icons";
import { supabase } from '@/lib/supabase';

// URL de la Cloud Function para servir PDFs con restricciones
const SERVE_PDF_READONLY_URL = import.meta.env.VITE_SERVE_PDF_READONLY_URL || 'https://servepdfreadonly-mcc5aevj6a-uc.a.run.app';

interface MaterialDisplayProps {
  material: Material;
  showFullPlayer?: boolean; // Si es true, muestra el reproductor completo. Si es false, muestra preview con modal
}

export const MaterialDisplay: React.FC<MaterialDisplayProps> = ({
  material,
  showFullPlayer = false
}) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showSecurePDFViewer, setShowSecurePDFViewer] = useState(false); // Nuevo: Visor seguro de PDF
  const transcriptService = useMemo(() => new VideoTranscriptService(), []);

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
          onClick={useCallback((e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setShowVideoModal(true);
          }, [])}
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

  // Para otros tipos de materiales
  const sourceFileId = material.metadata?.sourceFileId;
  const viewLink = material.metadata?.viewLink;
  const driveUrl = viewLink || (sourceFileId ? `https://drive.google.com/file/d/${sourceFileId}/view` : null);
  const originalUrl = material.url && material.url.trim() !== '' && material.url.trim() !== '#' ? material.url : null;

  // Para archivos en Supabase Storage
  const isSupabaseStorage = originalUrl?.includes('supabase.co/storage');

  // Es un PDF si el kind lo dice o si la URL termina en .pdf
  const isPDF = material.kind === 'pdf' || originalUrl?.toLowerCase().endsWith('.pdf');

  // Si es un link de Drive, se considera seguro si tiene viewLink o si fuerza el visor
  const isDriveFallback = !originalUrl && !!driveUrl;
  const isReadOnly = !!viewLink || material.allow_download === false;

  const [secureUrl, setSecureUrl] = useState<string | null>(null);

  // Generar URL segura (signed URL directo para Supabase, proxy para Drive)
  const getSecureUrl = async () => {
    // Si ya tenemos una URL segura, retornarla
    if (secureUrl) return secureUrl;

    try {
      // Para archivos en Supabase Storage: generar signed URL directamente
      // SecurePDFViewer ya tiene esta lógica, así que le pasamos la URL original
      // y él se encarga de generar la signed URL con createSignedUrl()
      if (isSupabaseStorage && originalUrl) {
        console.log('[MaterialDisplay] 🛡️ Usando URL directa de Supabase Storage (signed URL será generada por el visor):', material.title);
        setSecureUrl(originalUrl);
        return originalUrl;
      }

      // Para archivos de Google Drive: usar el visor de previsualización oficial de Google
      // Esto es mucho más estable que el proxy y ya previene descargas e impresiones
      if (driveUrl || (originalUrl && originalUrl.includes('drive.google.com'))) {
        const rawUrl = driveUrl || originalUrl || '';
        let googlePreviewUrl = rawUrl;

        // Transformar /view o /edit en /preview para el visor
        if (rawUrl.includes('/file/d/')) {
          googlePreviewUrl = rawUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
        } else if (rawUrl.includes('id=')) {
          // Manejar formato id=...
          googlePreviewUrl = rawUrl.replace('view', 'preview').replace('edit', 'preview');
        }

        console.log('[MaterialDisplay] 🛡️ Generando URL de previsualización de Google Drive:', material.title);
        setSecureUrl(googlePreviewUrl);
        return googlePreviewUrl;
      }

      // Fallback: usar la URL original directamente
      console.log('[MaterialDisplay] 🛡️ Usando URL original como fallback:', material.title);
      setSecureUrl(originalUrl || driveUrl || '');
      return originalUrl || driveUrl;
    } catch (error) {
      console.error('[MaterialDisplay] ❌ Error generando URL segura:', error);
      return originalUrl || driveUrl;
    }
  };

  const hasUrl = !!originalUrl || !!driveUrl;
  const shouldOpenInViewer = hasUrl && (isPDF || isReadOnly || material.kind === 'link');

  // Si no tiene URL o debe abrirse en visor, usar botón
  if (!hasUrl || shouldOpenInViewer) {
    return (
      <>
        <button
          type="button"
          onClick={useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();

            if (!hasUrl) {
              console.warn('Material sin URL válida:', material);
              alert('Este material no tiene una URL disponible para visualizar.');
              return;
            }

            // Si es un PDF de Supabase, usamos el Visor Seguro (Canvas)
            // Si es un PDF de Drive, usamos el Visor de Documentos (Iframe) porque es más estable con Drive
            if (isPDF && !isDriveFallback) {
              console.log('[MaterialDisplay] 🔒 Abriendo Visor Seguro (Canvas) para PDF de Supabase:', material.title);
              await getSecureUrl();
              setShowSecurePDFViewer(true);
            } else {
              console.log('[MaterialDisplay] 🔒 Abriendo Visor de Documentos (Iframe) para:', material.title);
              if (isPDF && isDriveFallback) {
                console.log('[MaterialDisplay] 🛡️ PDF de Drive detectado, usando preview directo de Google para mayor estabilidad.');
              }
              if (isReadOnly || isDriveFallback) {
                await getSecureUrl();
              }
              setShowDocumentViewer(true);
            }
          }, [hasUrl, isPDF, isReadOnly, isDriveFallback, material.title, getSecureUrl])}
          className={`block w-full p-3 bg-white border rounded-lg transition-all group text-left ${hasUrl ? 'hover:border-primary hover:bg-primary/5 cursor-pointer' : 'opacity-75 cursor-not-allowed'
            } ${isReadOnly ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}
          disabled={!hasUrl}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <IconBookOpen className={`w-5 h-5 flex-shrink-0 ${isReadOnly ? 'text-amber-600' : 'text-primary'}`} />
                <h4 className="text-base font-semibold text-gray-900 group-hover:text-primary">
                  {material.title}
                </h4>
                <span className={`text-xs px-2 py-0.5 rounded ${isReadOnly ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                  {isPDF ? 'PDF' : (material.kind || 'Documento')}
                </span>
                {isReadOnly && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                    SOLO LECTURA 🔒
                  </span>
                )}
              </div>

              {material.metadata?.description && (
                <p className="text-xs text-gray-500 line-clamp-1">{material.metadata.description}</p>
              )}

              {isDriveFallback && (
                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1 font-medium">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  Documento en Google Drive
                </p>
              )}
            </div>
            <IconEye className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" />
          </div>
        </button >

        {/* Visor de documentos estándar (Iframe) */}
        {
          showDocumentViewer && hasUrl && (
            <DocumentViewer
              material={{
                ...material,
                url: secureUrl || viewLink || material.url,
                allow_download: false,
                allow_print: false,
                allow_view: true,
                metadata: {
                  ...material.metadata,
                  isReadOnly: true
                }
              }}
              isOpen={showDocumentViewer}
              onClose={() => {
                setShowDocumentViewer(false);
              }}
            />
          )
        }

        {/* Visor Seguro de PDF (Canvas) */}
        {
          showSecurePDFViewer && hasUrl && (
            <SecurePDFViewer
              pdfUrl={secureUrl || originalUrl || driveUrl || ''}
              title={material.title}
              isOpen={showSecurePDFViewer}
              onClose={() => setShowSecurePDFViewer(false)}
              bucket="materials"
            />
          )
        }
      </>
    );
  }

  // Fallback final
  return (
    <div className="block p-3 bg-white border border-gray-200 rounded-lg opacity-75 cursor-not-allowed">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <IconBookOpen className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <h4 className="text-base font-semibold text-gray-500">{material.title}</h4>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
              {material.kind || material.mime_type || 'material'}
            </span>
          </div>
          <p className="text-xs text-yellow-600 mt-1">⚠️ Sin URL disponible</p>
        </div>
        <IconEye className="w-5 h-5 text-gray-300 flex-shrink-0 ml-3" />
      </div>
    </div>
  );
};
