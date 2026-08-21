// =====================================================
// Visor de Documentos con Control de Impresión
// Permite visualizar documentos con restricción de impresión
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Printer, Eye, FileText, Loader2, AlertCircle } from 'lucide-react';

interface DocumentViewerProps {
  material: {
    id: string;
    title: string;
    url?: string;
    kind: 'markdown' | 'pdf' | 'link' | 'video' | 'other';
    allow_download?: boolean;
    allow_view?: boolean;
    allow_print?: boolean;
    metadata?: {
      isReadOnly?: boolean;
      viewLink?: string;
      [key: string]: any;
    };
  };
  isOpen: boolean;
  onClose: () => void;
}

interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ material, isOpen, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  // Inicializar viewMode basado en el tipo de URL
  // Para Supabase Storage, usar Google Viewer directamente (más confiable)
  const initialViewMode = (() => {
    if (material.url?.includes('supabase.co/storage')) {
      return 'google-viewer' as const;
    }
    return 'iframe' as const;
  })();

  const [viewMode, setViewMode] = useState<'iframe' | 'embed' | 'object' | 'google-viewer'>(
    initialViewMode
  );

  // Función para obtener URL procesada (maneja URLs de Supabase Storage y Firebase Storage)
  const getProcessedUrl = (url?: string): string | null => {
    if (!url) {
      console.warn('⚠️ DocumentViewer - No hay URL proporcionada');
      return null;
    }

    console.log('🔍 DocumentViewer - URL original:', url);
    console.log('🔍 DocumentViewer - Tipo de URL:', {
      isSupabase: url.includes('supabase.co'),
      isFirebase: url.includes('firebase'),
      isHttp: url.startsWith('http'),
      length: url.length,
    });

    // Si es una URL de Supabase Storage, asegurar que sea pública
    if (url.includes('supabase.co/storage/v1/object')) {
      // Si ya tiene /public/, está bien
      if (url.includes('/public/')) {
        console.log('✅ URL de Supabase Storage pública:', url);
        return url;
      }
      // Si no, intentar convertir a URL pública
      // Formato: /storage/v1/object/sign/... -> /storage/v1/object/public/...
      const publicUrl = url.replace('/object/sign/', '/object/public/');
      const cleanUrl = publicUrl.split('?')[0]; // Remover parámetros de firma
      console.log('🔄 URL convertida a pública:', cleanUrl);
      return cleanUrl;
    }

    // Si es Firebase Storage, verificar que sea accesible
    if (url.includes('firebasestorage.googleapis.com') || url.includes('firebase')) {
      console.log('🔥 URL de Firebase Storage:', url);
      // Firebase Storage URLs generalmente ya son públicas si tienen el token correcto
      return url;
    }

    // Si es una URL de Google Drive, usar el visor embebido con restricciones
    if (url.includes('drive.google.com')) {
      console.log('📁 URL de Google Drive detectada:', url);
      if (url.includes('/file/d/')) {
        const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
        if (fileId) {
          // Detectar si es material de solo lectura para aplicar restricciones máximas
          const isReadOnlyMaterial = material.metadata?.isReadOnly || !!material.metadata?.viewLink;
          // Usar el visor embebido con parámetros que restringen descarga e impresión
          // rm=minimal: oculta opciones de menú
          // rm=embedded: modo embebido con menos opciones
          // chrome=false: oculta la barra de Chrome
          // Para materiales de solo lectura, usar parámetros más restrictivos
          const restrictParams = isReadOnlyMaterial
            ? 'rm=minimal&rm=embedded&chrome=false&usp=sharing'
            : 'rm=minimal&chrome=false';
          const embedUrl = `https://drive.google.com/file/d/${fileId}/preview?${restrictParams}`;
          console.log(
            `🔄 URL de Google Drive convertida a preview con restricciones${isReadOnlyMaterial ? ' (SOLO LECTURA)' : ''}:`,
            embedUrl
          );
          return embedUrl;
        }
      }
    }

    console.log('📄 URL genérica:', url);
    return url;
  };

  // Función para verificar si la URL es accesible
  const checkUrlAccessibility = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch (error) {
      console.error('❌ Error verificando URL:', error);
      return false;
    }
  };

  // Función para obtener URL de Google Docs Viewer (fallback)
  const getGoogleDocsViewerUrl = (url: string): string => {
    // Google Docs Viewer requiere que la URL sea accesible públicamente
    // Para Supabase Storage, la URL ya debería ser pública
    const encodedUrl = encodeURIComponent(url);
    return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true&rm=minimal`;
  };

  // Función para descargar archivo con progreso
  const downloadFileWithProgress = async (
    url: string,
    abortSignal?: AbortSignal
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Si hay una señal de abort, cancelar cuando se dispare
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          if (xhrRef.current) {
            xhrRef.current.abort();
          }
        });
      }

      // Cancelar descarga anterior SOLO si es diferente
      if (xhrRef.current) {
        console.log('⚠️ DocumentViewer - Cancelando descarga anterior');
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
        if (xhr.status === 200 || xhr.status === 0) {
          // status 0 puede ocurrir con CORS si el servidor permite la petición
          try {
            // Obtener el tipo MIME del response header o inferirlo del tipo de archivo
            const contentType =
              xhr.getResponseHeader('Content-Type') ||
              (material.kind === 'pdf'
                ? 'application/pdf'
                : material.url?.endsWith('.pdf')
                  ? 'application/pdf'
                  : material.url?.endsWith('.ppt') || material.url?.endsWith('.pptx')
                    ? 'application/vnd.ms-powerpoint'
                    : material.url?.endsWith('.doc') || material.url?.endsWith('.docx')
                      ? 'application/msword'
                      : 'application/octet-stream');

            // Crear blob con el tipo MIME correcto para que el navegador lo renderice apropiadamente
            const blob = new Blob([xhr.response], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            setIsDownloading(false);
            setDownloadProgress(null);
            xhrRef.current = null;
            console.log(
              '✅ DocumentViewer - Archivo descargado exitosamente, tamaño:',
              formatBytes(blob.size),
              'tipo:',
              contentType
            );
            resolve(blobUrl);
          } catch (blobError: any) {
            console.error('❌ DocumentViewer - Error creando blob:', blobError);
            setIsDownloading(false);
            setDownloadProgress(null);
            xhrRef.current = null;
            reject(new Error(`Error al crear blob: ${blobError?.message || blobError}`));
          }
        } else {
          setIsDownloading(false);
          setDownloadProgress(null);
          xhrRef.current = null;
          reject(new Error(`Error al descargar: HTTP ${xhr.status} - ${xhr.statusText}`));
        }
      });

      // Evento de error
      xhr.addEventListener('error', () => {
        console.error('❌ DocumentViewer - Error de red en XMLHttpRequest');
        setIsDownloading(false);
        setDownloadProgress(null);
        xhrRef.current = null;
        reject(
          new Error(
            'Error de red al descargar el archivo. Esto puede ser un problema de CORS o conectividad.'
          )
        );
      });

      // Evento de abort
      xhr.addEventListener('abort', () => {
        setIsDownloading(false);
        setDownloadProgress(null);
        xhrRef.current = null;
        reject(new Error('Descarga cancelada'));
      });

      // Configurar y enviar la petición
      try {
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';

        // Agregar headers para mejor compatibilidad
        // Nota: algunos headers pueden causar problemas de CORS preflight
        // Solo agregamos headers seguros
        xhr.setRequestHeader('Accept', '*/*');

        xhr.send();
        console.log('📤 DocumentViewer - Petición XMLHttpRequest enviada para:', url);
      } catch (openError: any) {
        console.error('❌ DocumentViewer - Error al abrir/enviar petición:', openError);
        setIsDownloading(false);
        setDownloadProgress(null);
        xhrRef.current = null;
        reject(new Error(`Error al iniciar descarga: ${openError?.message || openError}`));
      }
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

  // Detectar si el navegador es Edge
  const isEdge = () => {
    return /Edg|Edge/i.test(navigator.userAgent);
  };

  // Función para determinar si se debe descargar con progreso
  const shouldDownloadWithProgress = (url: string): boolean => {
    // Descargar con progreso para:
    // - Archivos desde Supabase Storage (PDFs, PowerPoint, etc.)
    // - PDFs directos (no Google Drive ni Google Viewer)
    // - Cualquier archivo descargable desde Supabase Storage
    if (!url) return false;

    // No descargar si es Google Drive o Google Viewer
    if (url.includes('drive.google.com') || url.includes('docs.google.com/viewer')) {
      return false;
    }

    // Descargar si es desde Supabase Storage (para cualquier tipo de archivo descargable)
    if (url.includes('supabase.co/storage')) {
      return true;
    }

    // Descargar si es PDF directo
    if (material.kind === 'pdf' && (url.endsWith('.pdf') || url.includes('.pdf'))) {
      return true;
    }

    return false;
  };

  // Efecto para descargar archivo con progreso cuando sea necesario
  useEffect(() => {
    if (!isOpen || !material.url) {
      setLocalUrl(null);
      setDownloadProgress(null);
      setIsDownloading(false);
      return;
    }

    const processedUrl = getProcessedUrl(material.url);
    if (!processedUrl) {
      setLocalUrl(null);
      setDownloadProgress(null);
      setIsDownloading(false);
      return;
    }

    // Guardar la URL actual para verificar si cambió
    const urlToDownload = processedUrl;
    currentUrlRef.current = urlToDownload;
    isMountedRef.current = true;

    // Crear AbortController para poder cancelar solo cuando sea necesario
    const abortController = new AbortController();

    // Solo descargar con progreso si es apropiado
    if (shouldDownloadWithProgress(processedUrl)) {
      const loadDocument = async () => {
        try {
          console.log('📥 DocumentViewer - Iniciando descarga con progreso para:', processedUrl);

          // Verificar que la URL no cambió y el componente sigue montado
          if (
            !isMountedRef.current ||
            abortController.signal.aborted ||
            currentUrlRef.current !== urlToDownload
          ) {
            console.log(
              '⚠️ DocumentViewer - Componente desmontado o URL cambió antes de iniciar descarga'
            );
            return;
          }

          setDownloadProgress(null);
          setLoading(true);
          const blobUrl = await downloadFileWithProgress(urlToDownload, abortController.signal);

          // Verificar nuevamente que la URL no cambió y el componente sigue montado
          if (
            !isMountedRef.current ||
            abortController.signal.aborted ||
            currentUrlRef.current !== urlToDownload
          ) {
            console.log(
              '⚠️ DocumentViewer - Componente desmontado o URL cambió durante la descarga, limpiando blob URL'
            );
            if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
            }
            return;
          }

          console.log('✅ DocumentViewer - Descarga completada, blob URL creada');
          setLocalUrl(blobUrl);
          // Para blob URLs, usar 'object' mode que renderiza mejor los PDFs
          // En Edge, usar 'embed' para evitar bloqueos de seguridad
          if (isEdge()) {
            console.log('🌐 Edge detectado, usando modo embed para evitar bloqueos');
            setViewMode('embed');
          } else {
            setViewMode('object');
          }
          // Dar un tiempo para que el objeto cargue antes de desactivar loading
          setTimeout(() => {
            if (isMountedRef.current && currentUrlRef.current === urlToDownload) {
              setLoading(false);
            }
          }, 500);
        } catch (downloadError: any) {
          // Solo manejar el error si la URL no cambió y no fue cancelado intencionalmente
          if (
            !isMountedRef.current ||
            abortController.signal.aborted ||
            currentUrlRef.current !== urlToDownload
          ) {
            // Si la URL cambió, es normal que se cancele
            if (currentUrlRef.current !== urlToDownload) {
              console.log('⚠️ DocumentViewer - Descarga cancelada porque la URL cambió');
            } else {
              console.log('⚠️ DocumentViewer - Descarga cancelada por desmontaje del componente');
            }
            return;
          }

          // No mostrar error si fue una cancelación intencional por cambio de URL
          if (downloadError?.message === 'Descarga cancelada') {
            // Verificar si fue porque cambió la URL
            if (currentUrlRef.current !== urlToDownload) {
              console.log('⚠️ DocumentViewer - Descarga cancelada porque la URL cambió (normal)');
              return;
            }
            console.log('⚠️ DocumentViewer - Descarga cancelada intencionalmente');
            return;
          }

          console.warn('⚠️ DocumentViewer - No se pudo descargar con progreso:', {
            error: downloadError?.message || downloadError,
            url: urlToDownload,
            kind: material.kind,
          });

          // Fallback: usar la URL directamente solo si la URL no cambió
          if (isMountedRef.current && currentUrlRef.current === urlToDownload) {
            setLocalUrl(urlToDownload);
            setLoading(false);
          }
        }
      };

      loadDocument();
    } else {
      console.log('📄 DocumentViewer - Usando URL directa (sin descarga con progreso)');
      // Usar URL directamente sin descarga
      setLocalUrl(processedUrl);
      setLoading(false);
    }

    // Limpiar blob URL al desmontar o cambiar URL
    return () => {
      // Marcar que el componente se está desmontando o la URL cambió
      const wasCurrentUrl = currentUrlRef.current === urlToDownload;
      isMountedRef.current = false;

      // Cancelar descarga solo si la URL actual es la que se estaba descargando
      if (wasCurrentUrl && xhrRef.current && !abortController.signal.aborted) {
        console.log(
          '🧹 DocumentViewer - Limpiando: cancelando descarga en curso para URL:',
          urlToDownload
        );
        abortController.abort();
        try {
          xhrRef.current.abort();
        } catch (e) {
          // Ignorar errores al cancelar
        }
        xhrRef.current = null;
      }

      // Limpiar blob URL solo si es de esta descarga específica
      if (wasCurrentUrl && blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      // Solo limpiar estados si el componente se está desmontando completamente
      if (!isOpen) {
        setLocalUrl(null);
        setDownloadProgress(null);
        setIsDownloading(false);
        currentUrlRef.current = null;
      }
    };
  }, [isOpen, material.url, material.kind]);

  // Resetear estado cuando se abre/cierra
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setViewMode('iframe');

      // Timeout para detectar si el PDF no carga después de 10 segundos
      const timeout = setTimeout(() => {
        setLoading((prevLoading) => {
          if (prevLoading && material.kind === 'pdf') {
            setError(
              'El PDF está tardando en cargar. Intenta descargarlo o usar otro método de visualización.'
            );
            return false;
          }
          return prevLoading;
        });
      }, 10000); // 10 segundos

      return () => clearTimeout(timeout);
    } else {
      setLoading(false);
      setError(null);
    }
  }, [isOpen, material.kind]);

  useEffect(() => {
    if (!isOpen) return;

    // SIEMPRE bloquear impresión y descarga
    {
      // Bloquear Ctrl+P y Cmd+P (impresión)
      const handleKeyDown = (e: KeyboardEvent) => {
        // Bloquear impresión
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          e.stopPropagation();
          alert('🔒 La impresión de este documento no está permitida.');
          return false;
        }
        // Bloquear Ctrl+S (guardar/descargar)
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          e.stopPropagation();
          alert('🔒 La descarga de este documento no está permitida.');
          return false;
        }
        // Bloquear Ctrl+Shift+S (guardar como)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
          e.preventDefault();
          e.stopPropagation();
          alert('🔒 La descarga de este documento no está permitida.');
          return false;
        }
        // Bloquear Ctrl+A (seleccionar todo - puede usarse para copiar)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          if (isReadOnly) {
            e.preventDefault();
            e.stopPropagation();
            alert('🔒 La selección completa no está permitida en documentos de solo lectura.');
            return false;
          }
        }
        // Bloquear F12 (herramientas de desarrollador)
        if (e.key === 'F12') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };

      // SIEMPRE bloquear menú contextual (clic derecho)
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };

      // Bloquear arrastrar y soltar (drag & drop)
      const handleDragStart = (e: DragEvent) => {
        e.preventDefault();
        return false;
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('dragstart', handleDragStart);
      document.addEventListener('selectstart', (e) => {
        // Permitir selección para lectura, pero mostrar advertencia al copiar
        // No podemos bloquear completamente la selección sin afectar la UX
      });

      // Bloquear impresión desde el iframe
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.addEventListener('beforeprint', (e) => {
          e.preventDefault();
          alert('La impresión de este documento no está permitida.');
        });
      }

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('dragstart', handleDragStart);
      };
    }
  }, [isOpen]);

  // SIEMPRE bloquear impresión, copia y descarga con CSS y eventos
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const style = document.createElement('style');
    style.id = 'no-print-style';
    style.textContent = `
      @media print {
        * {
          display: none !important;
        }
        body * {
          visibility: hidden !important;
        }
      }
      @page {
        size: auto;
        margin: 0;
      }
      /* Bloquear selección de texto en el contenedor del visor */
      [id*="document-viewer"], iframe[title], object[type="application/pdf"], embed[type="application/pdf"] {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
    `;
    document.head.appendChild(style);

    // Bloquear beforeprint event
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      window.alert('La impresión de este documento no está permitida.');
      return false;
    };

    // Bloquear copia
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
        e.clipboardData.setData('text/html', '');
      }
      return false;
    };

    // Bloquear cortar
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Bloquear pegar (para evitar pegar contenido de otros lugares)
    const handlePaste = (e: ClipboardEvent) => {
      // Solo permitir dentro del visor si es necesario para otras funciones
      // Pero bloquear si intentan pegar para crear una copia
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);

    return () => {
      const existingStyle = document.getElementById('no-print-style');
      if (existingStyle) {
        existingStyle.remove();
      }
      window.removeEventListener('beforeprint', handleBeforePrint);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const canView = material.allow_view !== false;
  // Detectar si es material de solo lectura
  const isReadOnly = material.metadata?.isReadOnly || !!material.metadata?.viewLink;
  // BLOQUEAR descarga e impresión por defecto para seguridad (especialmente para materiales de solo lectura)
  const canDownload = false; // Siempre bloqueado
  const canPrint = false; // Siempre bloqueado

  // Si no hay URL, mostrar mensaje específico
  if (!material.url) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">URL no disponible</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Este material no tiene una URL asociada. Esto puede ocurrir si:
          </p>
          <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
            <li>El archivo aún no se ha procesado completamente</li>
            <li>El archivo no se subió correctamente</li>
            <li>La URL no se guardó en la base de datos</li>
          </ul>
          <div className="bg-gray-50 rounded p-3 mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-1">Información del material:</p>
            <p className="text-xs text-gray-600">
              <strong>ID:</strong> {material.id}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Título:</strong> {material.title}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Tipo:</strong> {material.kind}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                // Copiar información del material para debug
                const debugInfo = {
                  id: material.id,
                  title: material.title,
                  kind: material.kind,
                  url: material.url,
                };
                navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                alert('Información del material copiada al portapapeles');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Copiar Info
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no se permite visualización, mostrar mensaje
  if (!canView) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">Visualización no permitida</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Este material no está disponible para visualización en la plataforma.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onMouseDown={(e) => {
        // Prevenir cualquier comportamiento por defecto
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      ref={containerRef}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] mx-4 max-h-[95vh] flex flex-col"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">{material.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Botones de descarga e impresión ELIMINADOS por seguridad */}
            <div className="p-2 text-gray-400 cursor-not-allowed" title="Descarga no permitida">
              <Download className="w-5 h-5" />
            </div>
            <div className="p-2 text-gray-400 cursor-not-allowed" title="Impresión no permitida">
              <Printer className="w-5 h-5" />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-hidden relative"
          style={{
            minHeight: 'calc(95vh - 120px)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
              <div className="text-center w-full max-w-md px-6">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-4">Cargando documento...</p>

                {/* Barra de progreso de descarga */}
                {isDownloading && downloadProgress && (
                  <div className="w-full space-y-2 mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Descargando...
                      </span>
                      <span className="font-medium">{downloadProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${downloadProgress.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatBytes(downloadProgress.loaded)}</span>
                      <span>{formatBytes(downloadProgress.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-white flex items-center justify-center z-10 overflow-y-auto">
              <div className="text-center p-6 max-w-2xl">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-700 mb-2 font-medium">
                  {error.includes('bloqueado') || error.includes('extensión')
                    ? 'Documento bloqueado por extensión del navegador'
                    : 'Error al cargar el documento'}
                </p>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                {(error.includes('bloqueado') || error.includes('extensión')) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">💡 Solución:</p>
                    <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                      <li>
                        Haz clic en el icono de la extensión (Comet, uBlock Origin, etc.) en la
                        barra del navegador
                      </li>
                      <li>Desactívala temporalmente para este sitio</li>
                      <li>O haz clic en "Abrir en nueva ventana" para ver el documento</li>
                    </ol>
                  </div>
                )}

                {/* Panel de debug */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Información de Debug:</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>
                      <strong>Modo actual:</strong> {viewMode}
                    </p>
                    <p>
                      <strong>Tipo:</strong> {material.kind}
                    </p>
                    <p>
                      <strong>URL original:</strong>
                      <span className="break-all block mt-1 bg-white p-2 rounded border">
                        {material.url || 'No disponible'}
                      </span>
                    </p>
                    {material.url && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(material.url || '');
                          alert('URL copiada al portapapeles');
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Copiar URL
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {/* Botón de descarga ELIMINADO por seguridad */}
                  <button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      // Rotar entre métodos
                      const modes: Array<'iframe' | 'embed' | 'object' | 'google-viewer'> = [
                        'iframe',
                        'embed',
                        'object',
                        'google-viewer',
                      ];
                      const currentIndex = modes.indexOf(viewMode);
                      const nextMode = modes[(currentIndex + 1) % modes.length];
                      console.log(`🔄 Reintentando con modo: ${nextMode}`);
                      setViewMode(nextMode);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Reintentar ({viewMode})
                  </button>
                  {(material.url || localUrl) && (
                    <button
                      onClick={() => {
                        // Usar la URL actual que se está intentando mostrar
                        const urlToOpen =
                          localUrl || getProcessedUrl(material.url || '') || material.url;
                        if (urlToOpen) {
                          window.open(urlToOpen, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Eye className="w-4 h-4 inline mr-2" />
                      Abrir en nueva ventana
                    </button>
                  )}
                  {material.kind === 'pdf' && material.url && (
                    <button
                      onClick={() => {
                        const googleUrl = getGoogleDocsViewerUrl(
                          getProcessedUrl(material.url) || material.url
                        );
                        window.open(googleUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Eye className="w-4 h-4 inline mr-2" />
                      Abrir con Google Viewer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {material.kind === 'pdf' && material.url ? (
            (() => {
              // Usar localUrl si está disponible (descargado con progreso), sino usar processedUrl
              const displayUrl = localUrl || getProcessedUrl(material.url);
              if (!displayUrl) {
                return (
                  <div className="p-6 h-full overflow-y-auto">
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No se pudo procesar la URL del documento.</p>
                      <p className="text-xs text-gray-500 mt-2">
                        URL: {material.url?.substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                );
              }

              const googleViewerUrl = getGoogleDocsViewerUrl(displayUrl);

              return (
                <>
                  {/* Intentar múltiples métodos de visualización */}
                  {/* Para blob URLs, usar iframe con restricciones estrictas para mejor seguridad */}
                  {(viewMode === 'object' || displayUrl.startsWith('blob:')) && (
                    <div
                      className="relative w-full h-full"
                      style={{ minHeight: 'calc(95vh - 120px)', height: '100%' }}
                    >
                      {/* PDF en iframe con restricciones máximas y parámetros que deshabilitan funciones */}
                      <iframe
                        src={`${displayUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                        className="w-full h-full border-0 absolute inset-0"
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: 'calc(95vh - 120px)',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          pointerEvents: 'auto',
                          display: 'block',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                        sandbox={
                          isEdge()
                            ? undefined
                            : 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'
                        }
                        allow="fullscreen"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={material.title}
                        onLoad={() => {
                          setLoading(false);
                          setError(null);

                          // Detectar si extensiones (Comet, uBlock, etc.) o el navegador está bloqueando el contenido
                          setTimeout(() => {
                            try {
                              const iframe = document.querySelector(
                                `iframe[title="${material.title}"]`
                              ) as HTMLIFrameElement;
                              if (iframe) {
                                const iframeDoc =
                                  iframe.contentDocument || iframe.contentWindow?.document;
                                if (
                                  !iframeDoc ||
                                  iframeDoc.body?.textContent?.includes('bloqueó') ||
                                  iframeDoc.body?.textContent?.includes('blocked') ||
                                  iframeDoc.body?.textContent?.includes('Comet') ||
                                  iframeDoc.body?.innerHTML?.includes('bloqueado')
                                ) {
                                  console.warn(
                                    '⚠️ Extensión o navegador puede estar bloqueando el contenido del PDF'
                                  );
                                  // Intentar descargar el PDF como blob para mostrar alternativamente
                                  if (displayUrl && !displayUrl.startsWith('blob:')) {
                                    console.log(
                                      '🔄 Intentando descargar PDF como blob para evitar bloqueo de extensiones...'
                                    );
                                    downloadFileWithProgress(displayUrl)
                                      .then((blobUrl) => {
                                        if (blobUrl) {
                                          setLocalUrl(blobUrl);
                                          console.log(
                                            '✅ PDF descargado como blob, mostrando alternativamente'
                                          );
                                        }
                                      })
                                      .catch((err) => {
                                        console.error('❌ Error descargando PDF como blob:', err);
                                        setError(
                                          'El documento está siendo bloqueado por una extensión del navegador (Comet, uBlock, etc.). Por favor, desactiva la extensión temporalmente o abre el documento en una nueva pestaña.'
                                        );
                                      });
                                  }
                                }
                              } else {
                                // Si no podemos acceder al iframe después de 2 segundos, puede estar bloqueado
                                console.warn(
                                  '⚠️ No se puede acceder al contenido del iframe, posible bloqueo de extensión'
                                );
                              }
                            } catch (e) {
                              // Cross-origin es normal, pero si persiste mucho tiempo puede ser bloqueo
                              console.debug(
                                '🔒 Cross-origin restricción activa (normal y esperado para seguridad)'
                              );

                              // Detectar si el iframe está completamente vacío después de 3 segundos (indicador de bloqueo)
                              setTimeout(() => {
                                const iframe = document.querySelector(
                                  `iframe[title="${material.title}"]`
                                ) as HTMLIFrameElement;
                                if (iframe && iframe.contentWindow) {
                                  try {
                                    // Si no podemos acceder y no hay errores visibles, puede ser bloqueo silencioso
                                    const rect = iframe.getBoundingClientRect();
                                    if (rect.height > 0 && rect.width > 0) {
                                      // El iframe tiene tamaño pero no podemos acceder al contenido
                                      // Esto puede indicar un bloqueo silencioso de extensiones
                                      console.warn(
                                        '⚠️ Posible bloqueo silencioso detectado. Mostrando mensaje de ayuda.'
                                      );
                                      // No establecer error inmediatamente, solo loguear
                                    }
                                  } catch (innerErr) {
                                    // Ignorar errores de acceso
                                  }
                                }
                              }, 1000);
                            }
                          }, 2000);
                          // Intentar bloquear interacciones en el iframe
                          try {
                            const iframe = document.querySelector(
                              `iframe[title="${material.title}"]`
                            ) as HTMLIFrameElement;
                            if (iframe?.contentWindow) {
                              // Bloquear menú contextual
                              iframe.contentWindow.addEventListener(
                                'contextmenu',
                                (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return false;
                                },
                                true
                              );

                              // Bloquear impresión
                              iframe.contentWindow.addEventListener(
                                'beforeprint',
                                (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  return false;
                                },
                                true
                              );

                              // Bloquear guardado y descarga
                              iframe.contentWindow.addEventListener(
                                'keydown',
                                (e: any) => {
                                  if (
                                    (e.ctrlKey || e.metaKey) &&
                                    (e.key === 's' ||
                                      e.key === 'S' ||
                                      e.key === 'p' ||
                                      e.key === 'P' ||
                                      e.key === 'a' ||
                                      e.key === 'A')
                                  ) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return false;
                                  }
                                  if (
                                    e.key === 'F12' ||
                                    (e.ctrlKey &&
                                      e.shiftKey &&
                                      (e.key === 'I' || e.key === 'J' || e.key === 'C'))
                                  ) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return false;
                                  }
                                },
                                true
                              );

                              // Deshabilitar selección de texto
                              try {
                                const iframeDoc =
                                  iframe.contentDocument || iframe.contentWindow?.document;
                                if (iframeDoc) {
                                  iframeDoc.addEventListener(
                                    'selectstart',
                                    (e) => {
                                      e.preventDefault();
                                      return false;
                                    },
                                    true
                                  );

                                  iframeDoc.addEventListener(
                                    'copy',
                                    (e) => {
                                      e.preventDefault();
                                      e.clipboardData?.setData('text/plain', '');
                                      return false;
                                    },
                                    true
                                  );

                                  // Deshabilitar selección de texto con CSS
                                  const style = iframeDoc.createElement('style');
                                  style.textContent = `
                                  * {
                                    -webkit-user-select: none !important;
                                    -moz-user-select: none !important;
                                    -ms-user-select: none !important;
                                    user-select: none !important;
                                    -webkit-touch-callout: none !important;
                                    -webkit-tap-highlight-color: transparent !important;
                                  }
                                `;
                                  iframeDoc.head.appendChild(style);
                                }
                              } catch (docError) {
                                // Cross-origin error es esperado para blob URLs locales
                                console.debug(
                                  '🔒 No se puede acceder al contenido del iframe (cross-origin/blob)'
                                );
                              }
                            }
                          } catch (e) {
                            // Cross-origin es esperado
                            console.debug('🔒 Restricciones de cross-origin activas');
                          }
                        }}
                        onError={(e) => {
                          console.error('❌ Error cargando PDF en iframe (blob URL):', e);
                          // Intentar con método alternativo
                          setTimeout(() => {
                            console.log('🔄 Edge puede estar bloqueando, cambiando a método embed');
                            setViewMode('embed');
                            setLoading(true);
                          }, 1000);
                        }}
                      />

                      {/* Watermark overlay que permite ver el contenido pero dificulta la copia */}
                      <div
                        className="absolute inset-0 pointer-events-none z-20"
                        style={{
                          background: 'transparent',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  )}

                  {viewMode === 'iframe' && !displayUrl.startsWith('blob:') && (
                    <iframe
                      ref={iframeRef}
                      src={(() => {
                        // Para Supabase Storage, intentar primero con iframe directo
                        // Si falla, se cambiará automáticamente a Google Viewer
                        if (displayUrl.includes('supabase.co/storage')) {
                          // Intentar con iframe directo primero (URL directa)
                          return displayUrl;
                        }
                        // Para Google Drive
                        if (displayUrl.includes('drive.google.com')) {
                          return `${displayUrl}?rm=minimal&chrome=false&usp=sharing`;
                        }
                        // Para otros PDFs, intentar con parámetros de visualización
                        return `${displayUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit`;
                      })()}
                      className="w-full h-full border-0"
                      title={material.title}
                      onLoad={() => {
                        console.log('✅ PDF cargado exitosamente en iframe');
                        setLoading(false);
                        setError(null);

                        // Para Supabase Storage o blob URLs, verificar si realmente se cargó el PDF
                        if (
                          displayUrl.includes('supabase.co/storage') ||
                          displayUrl.startsWith('blob:') ||
                          displayUrl.includes('servepdfreadonly')
                        ) {
                          setTimeout(() => {
                            try {
                              const iframe = iframeRef.current;
                              if (iframe) {
                                // Verificar si el iframe tiene contenido visible
                                const iframeDoc =
                                  iframe.contentDocument || iframe.contentWindow?.document;
                                if (iframeDoc) {
                                  const body = iframeDoc.body;
                                  // Detectar bloqueos de extensiones (Comet, uBlock, etc.)
                                  const bodyText = body?.textContent || body?.innerText || '';
                                  const bodyHTML = body?.innerHTML || '';

                                  if (
                                    !body ||
                                    body.innerHTML.trim() === '' ||
                                    bodyHTML.includes('Error') ||
                                    bodyHTML.includes('404') ||
                                    bodyText.includes('bloqueó') ||
                                    bodyText.includes('blocked') ||
                                    bodyText.includes('Comet') ||
                                    bodyHTML.includes('bloqueado') ||
                                    bodyHTML.includes('extension')
                                  ) {
                                    console.warn(
                                      '⚠️ PDF bloqueado o no se cargó correctamente, posible extensión bloqueadora'
                                    );
                                    setError(
                                      'El documento está siendo bloqueado por una extensión del navegador (Comet, uBlock Origin, etc.). Por favor, desactiva la extensión temporalmente para este sitio, o haz clic en "Abrir en nueva ventana" para ver el documento.'
                                    );
                                  }
                                } else {
                                  // Si no podemos acceder al documento, puede ser bloqueo silencioso
                                  // Intentar descargar como blob como alternativa
                                  if (
                                    displayUrl &&
                                    !displayUrl.startsWith('blob:') &&
                                    displayUrl.includes('servepdfreadonly')
                                  ) {
                                    console.log(
                                      '🔄 Intentando descargar PDF como blob para evitar bloqueo...'
                                    );
                                    downloadFileWithProgress(displayUrl)
                                      .then((blobUrl) => {
                                        if (blobUrl) {
                                          setLocalUrl(blobUrl);
                                          console.log(
                                            '✅ PDF descargado como blob, mostrando alternativamente'
                                          );
                                        }
                                      })
                                      .catch((err) => {
                                        console.error('❌ Error descargando PDF:', err);
                                      });
                                  }
                                }
                              }
                            } catch (e) {
                              // Cross-origin error es esperado y normal - el PDF debería estar cargándose
                              // Usar console.debug para que solo aparezca si el usuario tiene la consola en modo debug
                              console.debug(
                                '🔒 Cross-origin restricción activa (normal y esperado para seguridad)'
                              );

                              // Verificar después de más tiempo si el iframe sigue sin mostrar contenido
                              setTimeout(() => {
                                const iframe = iframeRef.current;
                                if (iframe) {
                                  const rect = iframe.getBoundingClientRect();
                                  // Si el iframe tiene tamaño pero no podemos acceder, puede ser bloqueo
                                  // Mostrar mensaje de ayuda
                                  if (rect.width > 0 && rect.height > 0) {
                                    console.warn(
                                      '⚠️ Iframe tiene tamaño pero contenido no accesible - posible bloqueo de extensión'
                                    );
                                  }
                                }
                              }, 3000);
                            }
                          }, 2000);
                        }

                        // Intentar bloquear interacciones adicionales
                        try {
                          const iframe = iframeRef.current;
                          if (iframe && iframe.contentWindow) {
                            // Intentar bloquear menú contextual (click derecho)
                            iframe.contentWindow.addEventListener(
                              'contextmenu',
                              (e) => {
                                e.preventDefault();
                                return false;
                              },
                              true
                            );

                            // Intentar bloquear impresión desde el iframe
                            iframe.contentWindow.addEventListener(
                              'beforeprint',
                              (e) => {
                                e.preventDefault();
                                return false;
                              },
                              true
                            );
                          }
                        } catch (e) {
                          // Error de cross-origin es esperado y normal - no es un problema
                          // Usar console.debug para que solo aparezca si el usuario tiene la consola en modo debug
                          console.debug(
                            '🔒 Cross-origin restricción activa (normal y esperado para seguridad)'
                          );
                        }
                      }}
                      onError={(e) => {
                        console.error('❌ Error cargando PDF en iframe:', e);
                        setLoading(false);
                        // Para Supabase Storage, cambiar a Google Viewer
                        if (
                          displayUrl &&
                          (displayUrl.includes('supabase.co/storage') ||
                            displayUrl.startsWith('blob:'))
                        ) {
                          console.log(
                            '🔄 PDF de Supabase no se puede mostrar en iframe, cambiando a Google Docs Viewer'
                          );
                          setViewMode('google-viewer');
                          setLoading(true);
                        } else {
                          // Para otros, intentar con Google Viewer
                          setTimeout(() => {
                            console.log('🔄 Cambiando a Google Docs Viewer');
                            setViewMode('google-viewer');
                            setLoading(true);
                          }, 1000);
                        }
                      }}
                      // Restricciones MÁXIMAS para prevenir descarga e impresión
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      allow="fullscreen"
                      // Bloquear descarga mediante atributos adicionales
                      style={{
                        minHeight: 'calc(95vh - 120px)',
                        width: '100%',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                      }}
                    />
                  )}

                  {viewMode === 'embed' && (
                    <embed
                      src={`${displayUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitV&zoom=page-width`}
                      type="application/pdf"
                      className="w-full h-full"
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 'calc(95vh - 120px)',
                        display: 'block',
                      }}
                      onLoad={() => {
                        console.log('✅ PDF cargado exitosamente en embed');
                        setLoading(false);
                        setError(null);
                      }}
                      onError={() => {
                        console.error('❌ Error cargando PDF en embed');
                        setLoading(false);
                        // Intentar con Google Viewer
                        setTimeout(() => {
                          console.log('🔄 Cambiando a Google Docs Viewer');
                          setViewMode('google-viewer');
                          setLoading(true);
                        }, 1000);
                      }}
                    />
                  )}

                  {viewMode === 'object' && !displayUrl.startsWith('blob:') && (
                    <object
                      data={`${displayUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitV&zoom=page-width`}
                      type="application/pdf"
                      className="w-full h-full"
                      style={{
                        minHeight: 'calc(95vh - 120px)',
                        height: '100%',
                        width: '100%',
                        display: 'block',
                      }}
                      onLoad={() => {
                        console.log('✅ PDF cargado exitosamente en object');
                        setLoading(false);
                        setError(null);
                      }}
                      onError={() => {
                        console.error('❌ Error cargando PDF en object');
                        setLoading(false);
                        // Intentar con Google Viewer
                        setTimeout(() => {
                          console.log('🔄 Cambiando a Google Docs Viewer');
                          setViewMode('google-viewer');
                          setLoading(true);
                        }, 1000);
                      }}
                    >
                      <div className="p-6 h-full overflow-y-auto">
                        <div className="text-center py-12">
                          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-4">
                            Tu navegador no puede mostrar este PDF directamente.
                          </p>
                          {/* Botón de descarga ELIMINADO por seguridad */}
                        </div>
                      </div>
                    </object>
                  )}

                  {viewMode === 'google-viewer' && (
                    <iframe
                      src={googleViewerUrl}
                      className="w-full h-full border-0"
                      title={`${material.title} - Google Viewer`}
                      onLoad={() => {
                        console.log('✅ PDF cargado exitosamente en Google Viewer');
                        setLoading(false);
                        setError(null);

                        // Verificar que realmente mostró el PDF después de un delay
                        setTimeout(() => {
                          const iframe = iframeRef.current;
                          if (iframe) {
                            try {
                              // Verificar si el iframe tiene contenido
                              const hasContent = iframe.contentDocument?.body?.innerHTML;
                              if (!hasContent || hasContent.includes('Unable to display')) {
                                console.warn('⚠️ Google Viewer no pudo mostrar el PDF');
                                setError(
                                  'El PDF no se puede visualizar. Puede estar protegido o no ser accesible públicamente.'
                                );
                                setLoading(false);
                              }
                            } catch (e) {
                              // Cross-origin error es esperado, asumir que cargó correctamente
                              console.debug('✅ PDF cargado en Google Viewer');
                            }
                          }
                        }, 3000);
                      }}
                      onError={() => {
                        console.error('❌ Error cargando PDF en Google Viewer');
                        setLoading(false);
                        // Intentar con iframe directo como último recurso
                        setTimeout(() => {
                          console.log('🔄 Último intento con iframe directo');
                          setViewMode('iframe');
                          setLoading(true);
                        }, 2000);
                      }}
                      // Restricciones MÁXIMAS para prevenir descarga
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      allow="fullscreen"
                      style={{
                        minHeight: 'calc(95vh - 120px)',
                        width: '100%',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                      }}
                    />
                  )}
                </>
              );
            })()
          ) : material.kind === 'link' && material.url ? (
            <iframe
              ref={iframeRef}
              src={material.url}
              className="w-full h-full border-0"
              title={material.title}
              onLoad={() => {
                setLoading(false);
                setError(null);
              }}
              onError={() => {
                setLoading(false);
                setError('No se pudo cargar el enlace.');
              }}
            />
          ) : material.url && (material.kind === 'markdown' || material.kind === 'other') ? (
            <div className="p-6 h-full overflow-y-auto">
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Este tipo de material no se puede visualizar directamente en el visor.
                </p>
                {/* Botón de descarga ELIMINADO por seguridad */}
                {canView && material.url && (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    <Eye className="w-4 h-4" />
                    Abrir en nueva pestaña
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 h-full overflow-y-auto">
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Este material no tiene una URL disponible para visualización.
                </p>
                {/* Botón de descarga ELIMINADO por seguridad */}
              </div>
            </div>
          )}
        </div>

        {/* Footer con advertencia de seguridad */}
        <div
          className={`flex-shrink-0 border-t px-6 py-3 ${isReadOnly ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}
        >
          <p
            className={`text-sm flex items-center gap-2 ${isReadOnly ? 'text-red-800' : 'text-yellow-800'}`}
          >
            <Printer className="w-4 h-4" />
            {isReadOnly
              ? '🔒 Documento de solo lectura: La descarga e impresión están completamente deshabilitadas.'
              : 'La descarga e impresión de este documento están deshabilitadas por seguridad.'}
          </p>
        </div>
      </div>
    </div>
  );
};
