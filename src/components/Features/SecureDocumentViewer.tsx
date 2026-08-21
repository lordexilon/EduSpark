import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fileStorageService } from '@/services/fileStorageService';
import { supabase } from '@/lib/supabase';
import {
  Loader2,
  AlertTriangle,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configurar worker de PDF.js (necesario para react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Estilos necesarios para react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const SERVE_PDF_READONLY_URL =
  import.meta.env.VITE_SERVE_PDF_READONLY_URL || 'https://servepdfreadonly-mcc5aevj6a-uc.a.run.app';

interface SecureDocumentViewerProps {
  documentId: string;
  title: string;
  storagePath?: string;
  fileUrl?: string; // Fallback para URLs antiguas (Drive)
  totalChunks?: number; // Información adicional del documento
  description?: string; // Descripción del documento
  onClose: () => void;
}

interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const SecureDocumentViewer: React.FC<SecureDocumentViewerProps> = ({
  documentId,
  title,
  storagePath,
  fileUrl,
  totalChunks,
  description,
  onClose,
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDriveUrl, setIsDriveUrl] = useState(false);
  const [isPDF, setIsPDF] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Función para descargar archivo con progreso
  const downloadFileWithProgress = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Cancelar descarga anterior si existe
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }

      // Limpiar blob URL anterior si existe
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      setIsDownloading(true);
      setDownloadProgress({ loaded: 0, total: 0, percentage: 0 });

      // Evento de progreso
      xhr.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          setDownloadProgress({
            loaded: e.loaded,
            total: e.total,
            percentage,
          });
        }
      });

      // Evento de carga completa
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const contentType = xhr.getResponseHeader('Content-Type');
          const isPdfType = contentType?.includes('pdf') || url.toLowerCase().includes('.pdf');
          setIsPDF(!!isPdfType);

          const blob = new Blob([xhr.response], { type: contentType || 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          setIsDownloading(false);
          setDownloadProgress(null);
          xhrRef.current = null;
          resolve(blobUrl);
        } else {
          setIsDownloading(false);
          setDownloadProgress(null);
          xhrRef.current = null;
          reject(new Error(`Error al descargar: ${xhr.statusText}`));
        }
      });

      // Evento de error
      xhr.addEventListener('error', () => {
        setIsDownloading(false);
        setDownloadProgress(null);
        xhrRef.current = null;
        reject(new Error('Error de red al descargar el archivo'));
      });

      // Evento de abort
      xhr.addEventListener('abort', () => {
        setIsDownloading(false);
        setDownloadProgress(null);
        xhrRef.current = null;
        reject(new Error('Descarga cancelada'));
      });

      // Configurar y enviar la petición
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  // Función auxiliar para formatear bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        setDownloadProgress(null);

        if (storagePath) {
          // Si es un archivo en Supabase Storage, obtener URL firmada y descargar con progreso
          const signedUrl = await fileStorageService.getSecureUrl(storagePath);
          if (!signedUrl) {
            throw new Error(
              'No se pudo obtener la URL segura del archivo. El archivo puede no estar disponible en el almacenamiento.'
            );
          }

          // Descargar el archivo con seguimiento de progreso
          try {
            const blobUrl = await downloadFileWithProgress(signedUrl);
            setUrl(blobUrl);
            setIsDriveUrl(false);
          } catch (downloadError: any) {
            console.error('Error descargando archivo:', downloadError);
            // Fallback: usar la URL directamente si falla la descarga
            setUrl(signedUrl);
            setIsDriveUrl(false);
            setIsPDF(signedUrl.toLowerCase().includes('.pdf'));
          }
        } else if (fileUrl) {
          // Fallback para archivos antiguos (Google Drive o directos)
          if (fileUrl.includes('drive.google.com')) {
            console.log('[SecureDocumentViewer] 🛡️ Usando proxy para archivo de Drive');
            // Obtener sesión actual para el token
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session?.access_token) {
              // Construir URL del proxy
              const proxyUrl = `${SERVE_PDF_READONLY_URL}?materialId=${documentId}&token=${session.access_token}`;

              // Intentar descargar vía proxy con progreso
              try {
                const blobUrl = await downloadFileWithProgress(proxyUrl);
                setUrl(blobUrl);
                setIsDriveUrl(false); // Ya no es URL directa de Drive
              } catch (proxyError) {
                console.warn(
                  '[SecureDocumentViewer] Proxy falló o bloqueó descarga directa, usando proxy como URL de red:',
                  proxyError
                );
                setUrl(proxyUrl);
                setIsDriveUrl(false);
              }
              setIsPDF(true);
            } else {
              // Fallback si no hay sesión
              setIsDriveUrl(true);
              setIsPDF(true);
              const embedUrl = fileUrl.replace('/view', '/preview');
              setUrl(embedUrl);
            }
          } else {
            // Para URLs directas, intentar descargar con progreso si es posible
            try {
              const blobUrl = await downloadFileWithProgress(fileUrl);
              setUrl(blobUrl);
            } catch (downloadError: any) {
              console.warn('No se pudo descargar con progreso, usando URL directa:', downloadError);
              setUrl(fileUrl);
              setIsPDF(fileUrl.toLowerCase().includes('.pdf'));
            }
          }
        } else {
          setError('Este documento no tiene un archivo asociado.');
        }
      } catch (err: any) {
        console.error('Error loading document:', err);
        setError(err.message || 'Error al cargar el documento.');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (xhrRef.current) xhrRef.current.abort();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [storagePath, fileUrl]);

  // Bloquear interacciones
  useEffect(() => {
    if (!url) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        e.preventDefault();
        alert('Acción deshabilitada por seguridad.');
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [url, onClose]);

  // Manejadores react-pdf
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (err: any) => {
    console.error('Error al cargar PDF con react-pdf:', err);
    // Si falla react-pdf, forzamos iframe como fallback si es posible
    if (isPDF) {
      console.log('Cambiando a modo fallback de visualización...');
      // No cambiamos el estado, react-pdf mostrará el error o podemos manejarlo aquí
    }
  };

  const changePage = (offset: number) => {
    setPageNumber((prev) => Math.min(Math.max(1, prev + offset), numPages || 1));
  };

  const changeScale = (delta: number) => {
    setScale((prev) => Math.min(Math.max(0.5, prev + delta), 3.0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      <div className="w-full h-full max-w-7xl max-h-[98vh] flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl m-2 border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight truncate max-w-xl">{title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 font-medium">
                  SOLO LECTURA 🔒
                </span>
                {numPages && (
                  <span className="text-xs text-gray-400">
                    Página {pageNumber} de {numPages}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isPDF && !loading && !error && (
              <div className="flex items-center bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <button
                  onClick={() => changeScale(-0.25)}
                  className="p-2 hover:bg-gray-700 transition-colors"
                  title="Reducir"
                >
                  <ZoomOut size={20} />
                </button>
                <span className="px-2 text-sm font-bold w-14 text-center border-x border-gray-700">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => changeScale(0.25)}
                  className="p-2 hover:bg-gray-700 transition-colors"
                  title="Aumentar"
                >
                  <ZoomIn size={20} />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-all"
              aria-label="Cerrar"
            >
              <span className="text-2xl font-light">✕</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className="flex-1 relative bg-gray-100 flex items-center justify-center overflow-auto select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading && (
            <div className="flex flex-col items-center gap-6 text-gray-500 w-full max-w-md p-8 animate-in fade-in duration-500">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600/50" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">Cargando documento seguro</p>
                <p className="text-sm text-gray-500 mt-1">Implementando medidas de protección...</p>
              </div>

              {isDownloading && downloadProgress && (
                <div className="w-full space-y-3 mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-blue-600">
                      <Download className="w-4 h-4" />
                      Descargando bits...
                    </span>
                    <span className="font-bold">{downloadProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                      style={{ width: `${downloadProgress.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>{formatBytes(downloadProgress.loaded)}</span>
                    <span>{formatBytes(downloadProgress.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-6 text-gray-700 p-12 text-center max-w-xl bg-white rounded-2xl shadow-xl border border-red-50">
              <div className="bg-red-50 p-4 rounded-full">
                <AlertTriangle className="w-16 h-16 text-red-500" />
              </div>
              <div>
                <h4 className="font-bold text-2xl text-gray-900 mb-2">Visualización Denegada</h4>
                <p className="text-gray-600 leading-relaxed mb-6">{error}</p>

                <div className="p-4 bg-gray-50 rounded-xl text-left border border-gray-100">
                  <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">
                    Sugerencias:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Verifica tu conexión a internet.</li>
                    <li>• El archivo puede haber sido movido o eliminado.</li>
                    <li>• El administrador puede haber revocado el acceso.</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg shadow-gray-200"
              >
                Volver a la Biblioteca
              </button>
            </div>
          )}

          {!loading && !error && url && (
            <div className="w-full h-full flex flex-col items-center p-8">
              {isDriveUrl && !blobUrlRef.current && (
                <div className="absolute top-0 inset-x-0 bg-amber-500 text-white px-4 py-2 text-xs font-bold text-center z-20 shadow-lg flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> ADVERTENCIA: Google Drive puede permitir descargas. Se
                  recomienda migrar a Supabase Storage.
                </div>
              )}

              {isPDF ? (
                <div className="flex-1 w-full flex justify-center overflow-auto pb-10">
                  <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="shadow-2xl"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="bg-white"
                    />
                  </Document>
                </div>
              ) : (
                <iframe
                  src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-0 rounded-lg shadow-inner bg-white"
                  title="Protocol Viewer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              )}

              {/* Watermark */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none overflow-hidden rotate-[-30deg]">
                <p className="text-[8vw] font-black text-black whitespace-nowrap uppercase">
                  EDUSPARK SECURE • NO DISTRIBUIR • {documentId.substring(0, 8)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer (Paginación PDF) */}
        {isPDF && numPages && !loading && !error && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
                className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-sm font-bold text-gray-900">
                Página {pageNumber} de {numPages}
              </div>
              <div className="w-32 h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(pageNumber / numPages) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
