import React, { useState, useEffect, useRef } from 'react';
import { fileStorageService } from '../services/fileStorageService';
import { Loader2, AlertTriangle, FileText, Download } from 'lucide-react';

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
    onClose
}) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDriveUrl, setIsDriveUrl] = useState(false);
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
                        percentage
                    });
                }
            });

            // Evento de carga completa
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const blob = new Blob([xhr.response]);
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
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
                        throw new Error('No se pudo obtener la URL segura del archivo. El archivo puede no estar disponible en el almacenamiento.');
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
                    }
                } else if (fileUrl) {
                    // Fallback para archivos antiguos (Google Drive)
                    // Detectar si es Drive para mostrar advertencia
                    if (fileUrl.includes('drive.google.com')) {
                        setIsDriveUrl(true);
                        // Convertir URL de vista a URL de embed si es necesario
                        const embedUrl = fileUrl.replace('/view', '/preview');
                        setUrl(embedUrl);
                    } else {
                        // Para URLs directas, intentar descargar con progreso si es posible
                        try {
                            const blobUrl = await downloadFileWithProgress(fileUrl);
                            setUrl(blobUrl);
                        } catch (downloadError: any) {
                            console.warn('No se pudo descargar con progreso, usando URL directa:', downloadError);
                            // Fallback: usar la URL directamente
                            setUrl(fileUrl);
                        }
                    }
                } else {
                    // No hay archivo disponible - mostrar mensaje informativo
                    setError('Este documento no tiene un archivo asociado. Puede ser un documento procesado que solo contiene chunks de texto para búsqueda. Si necesitas el archivo original, contacta al administrador.');
                }
            } catch (err: any) {
                console.error('Error loading document:', err);
                setError(err.message || 'Error al cargar el documento. Por favor intente más tarde.');
            } finally {
                setLoading(false);
            }
        };

        loadDocument();

        // Limpiar blob URL y cancelar descarga al desmontar el componente
        return () => {
            // Cancelar descarga en curso si existe
            if (xhrRef.current) {
                xhrRef.current.abort();
                xhrRef.current = null;
            }
            
            // Limpiar blob URL
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [storagePath, fileUrl]);

    // Bloquear todas las interacciones no deseadas
    useEffect(() => {
        if (!url) return;

        // Bloquear impresión
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Bloquear Ctrl+S (guardar/descargar)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Bloquear Ctrl+Shift+S (guardar como)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        };

        // Bloquear menú contextual (clic derecho)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        // Bloquear drag & drop
        const handleDragStart = (e: DragEvent) => {
            e.preventDefault();
            return false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('dragstart', handleDragStart);

        // Bloquear impresión con CSS
        const style = document.createElement('style');
        style.id = 'secure-no-print-style';
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
        `;
        document.head.appendChild(style);

        // Bloquear beforeprint event
        const handleBeforePrint = (e: Event) => {
            e.preventDefault();
            return false;
        };
        window.addEventListener('beforeprint', handleBeforePrint);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('dragstart', handleDragStart);
            window.removeEventListener('beforeprint', handleBeforePrint);
            const existingStyle = document.getElementById('secure-no-print-style');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, [url]);

    // Deshabilitar menú contextual (clic derecho)
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="w-full h-full max-w-6xl max-h-[95vh] flex flex-col bg-white rounded-lg overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <h3 className="font-medium truncate max-w-md">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div
                    className="flex-1 relative bg-gray-100 flex items-center justify-center"
                    onContextMenu={handleContextMenu}
                >
                    {loading && (
                        <div className="flex flex-col items-center gap-4 text-gray-500 w-full max-w-md px-6">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-center">Cargando documento seguro...</p>
                            
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
                    )}

                    {error && (
                        <div className="flex flex-col items-center gap-4 text-gray-700 p-8 text-center max-w-lg">
                            <AlertTriangle className="w-12 h-12 text-amber-500" />
                            <div>
                                <p className="font-medium text-lg mb-2">Archivo no disponible</p>
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">{error}</p>
                                
                                {/* Información adicional del documento */}
                                {(totalChunks || description) && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                                        {description && (
                                            <p className="text-sm text-gray-700 mb-2">
                                                <span className="font-medium">Descripción:</span> {description}
                                            </p>
                                        )}
                                        {totalChunks && (
                                            <p className="text-sm text-gray-700">
                                                <span className="font-medium">Chunks procesados:</span> {totalChunks}
                                                <span className="text-gray-500 ml-2">
                                                    (El contenido está disponible para búsqueda en el tutor AI)
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && url && (
                        <div className="w-full h-full relative">
                            {/* Overlay transparente para bloquear interacciones directas si fuera necesario */}
                            {/* <div className="absolute inset-0 z-10 bg-transparent" /> */}

                            {isDriveUrl && (
                                <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 px-4 py-2 text-xs text-center z-20 border-b border-yellow-200">
                                    ⚠️ Este documento está alojado en Google Drive y podría permitir descargas. Se recomienda migrarlo a almacenamiento seguro.
                                </div>
                            )}

                            <iframe
                                src={`${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=page-fit`}
                                className="w-full h-full border-0"
                                title="Document Viewer"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                style={{ 
                                    pointerEvents: 'auto',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    MozUserSelect: 'none',
                                    msUserSelect: 'none'
                                }}
                                onLoad={() => {
                                    // Intentar bloquear interacciones adicionales en el iframe
                                    try {
                                        const iframe = document.querySelector('iframe[title="Document Viewer"]') as HTMLIFrameElement;
                                        if (iframe && iframe.contentWindow) {
                                            iframe.contentWindow.addEventListener('contextmenu', (e) => {
                                                e.preventDefault();
                                                return false;
                                            }, true);
                                            iframe.contentWindow.addEventListener('beforeprint', (e) => {
                                                e.preventDefault();
                                                return false;
                                            }, true);
                                        }
                                    } catch (e) {
                                        // Cross-origin error es esperado
                                        console.log('⚠️ No se puede acceder al contenido del iframe (cross-origin) - esto es normal para seguridad');
                                    }
                                }}
                            />

                            {/* Watermark simple */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] select-none overflow-hidden">
                                <div className="transform -rotate-45 text-6xl font-bold text-black whitespace-nowrap">
                                    CONFIDENCIAL • PROPIEDAD DE EDUSPARK • NO DISTRIBUIR
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
