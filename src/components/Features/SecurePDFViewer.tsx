// =====================================================
// Visor Seguro de PDF (Versión Canvas)
// Usa react-pdf para renderizar sin iframe
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Document, Page, pdfjs } from 'react-pdf';

// Configurar worker de PDF.js (necesario para react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Estilos necesarios para react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface SecurePDFViewerProps {
  pdfUrl: string;
  title: string;
  onClose: () => void;
  isOpen: boolean;
  bucket?: string;
}

const SecurePDFViewer: React.FC<SecurePDFViewerProps> = ({
  pdfUrl,
  title,
  onClose,
  isOpen,
  bucket = 'materials',
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [secureUrl, setSecureUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ==================================================
  // OBTENER URL SEGURA
  // ==================================================
  const getSecureUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SecurePDFViewer] 🔍 Procesando URL:', pdfUrl?.substring(0, 100) + '...');

      if (pdfUrl.includes('supabase')) {
        const decodedUrl = decodeURIComponent(pdfUrl);

        // Soportar tanto URLs públicas como firmadas
        // Formato: .../storage/v1/object/public/BUCKET/PATH
        // Formato: .../storage/v1/object/sign/BUCKET/PATH
        const publicMatch = decodedUrl.split('/storage/v1/object/public/');
        const signMatch = decodedUrl.split('/storage/v1/object/sign/');
        const urlParts = publicMatch.length > 1 ? publicMatch : signMatch;

        if (urlParts.length > 1) {
          const pathWithQuery = urlParts[1];
          const pathWithoutQuery = pathWithQuery.split('?')[0]; // Remover query params
          const pathParts = pathWithoutQuery.split('/');
          const bucketName = pathParts[0];
          const filePath = pathParts.slice(1).join('/');

          console.log(`[SecurePDFViewer] 📦 Bucket: ${bucketName}, Path: ${filePath}`);

          const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600); // 1 hora de validez

          if (error) {
            console.error('[SecurePDFViewer] ❌ Error creando signed URL:', error);
            throw error;
          }
          if (data?.signedUrl) {
            console.log('[SecurePDFViewer] ✅ Signed URL generada exitosamente');
            setSecureUrl(data.signedUrl);
            return;
          }
        } else {
          console.warn('[SecurePDFViewer] ⚠️ URL de Supabase no tiene formato esperado de Storage');
        }
      }
      // Fallback: usar la URL tal cual (para Cloud Function proxy o URLs externas)
      console.log('[SecurePDFViewer] 📌 Usando URL directamente (no Supabase Storage)');
      setSecureUrl(pdfUrl);
    } catch (err: any) {
      console.error('[SecurePDFViewer] ❌ Error obteniendo URL segura:', err);
      setError(`No se pudo acceder al documento: ${err.message || 'Error desconocido'}`);
    } finally {
      // No ponemos loading false aquí, esperamos a que react-pdf cargue
    }
  }, [pdfUrl]);

  useEffect(() => {
    if (isOpen) {
      getSecureUrl();
      setPageNumber(1);
      setScale(1.0);
    } else {
      setSecureUrl('');
    }
  }, [isOpen, getSecureUrl]);

  // ==================================================
  // MANEJADORES DE PDF
  // ==================================================
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error('Error cargando PDF:', err);

    let userMessage = 'Error al renderizar el documento.';
    const errorMsg = err.message || '';

    if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
      userMessage = 'No tienes permiso para ver este documento (403).';
    } else if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
      userMessage =
        'Error interno del servidor al procesar el PDF (500). Por favor intente más tarde.';
    } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
      userMessage = 'Documento no encontrado (404).';
    } else {
      userMessage = 'Error: Es posible que el archivo esté dañado o protegido.';
    }

    setError(userMessage);
    setLoading(false);
  }

  // ==================================================
  // CONTROLES
  // ==================================================
  const changePage = (offset: number) => {
    setPageNumber((prev) => Math.min(Math.max(1, prev + offset), numPages || 1));
  };

  const changeScale = (delta: number) => {
    setScale((prev) => Math.min(Math.max(0.5, prev + delta), 3.0));
  };

  // ==================================================
  // SEGURIDAD (Teclado y ContextMenu)
  // ==================================================
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();

      // Bloquear Ctrl+P y Ctrl+S
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white w-[95%] max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={24} />
            <div>
              <h2 className="font-semibold text-gray-800">{title}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Eye size={12} /> Solo lectura • {numPages ? `${numPages} páginas` : 'Cargando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Controles de Zoom */}
            <div className="flex items-center bg-white border rounded-lg overflow-hidden">
              <button
                onClick={() => changeScale(-0.25)}
                className="p-2 hover:bg-gray-100"
                title="Reducir"
              >
                <ZoomOut size={18} />
              </button>
              <span className="px-2 text-sm font-medium w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => changeScale(0.25)}
                className="p-2 hover:bg-gray-100"
                title="Aumentar"
              >
                <ZoomIn size={18} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* CONTENIDO PDF */}
        <div
          className="flex-1 bg-gray-100 overflow-auto flex justify-center p-8 relative select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 z-10">
              <Loader2 className="animate-spin text-blue-600 mb-2" size={48} />
              <p className="text-gray-600 font-medium">Cargando documento seguro...</p>
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center text-red-600">
              <AlertCircle size={48} className="mb-4" />
              <p className="text-lg font-medium">{error}</p>
              <button
                onClick={getSecureUrl}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          ) : (
            secureUrl && (
              <Document
                file={secureUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className="shadow-lg"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={false} // Deshabilitar selección de texto
                  renderAnnotationLayer={false} // Deshabilitar links/anotaciones
                  className="bg-white shadow-xl"
                />
              </Document>
            )
          )}
        </div>

        {/* FOOTER (Paginación) */}
        {numPages && (
          <div className="px-6 py-3 border-t bg-white flex items-center justify-center gap-4">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Página {pageNumber} de {numPages}
            </span>
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurePDFViewer;
