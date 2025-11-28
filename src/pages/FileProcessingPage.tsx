// pages/FileProcessingPage.tsx
// Página para procesar archivos de Google Drive para RAG

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { googleDriveService } from '../services/googleDriveService';
import { googleOAuthService } from '../services/googleOAuthService';
import { subscribeToAllJobs } from '../services/firestoreService';
import { cancelJob } from '../services/firestoreService';
import { estimateCosts } from '../services/costEstimator';
import { FileAnalysisModal } from '../components/FileAnalysisModal';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { ProcessingTimer } from '../components/ProcessingTimer';
import { CourseMaterialSelector } from '../components/CourseMaterialSelector';
import { ProcessingNotification } from '../components/ProcessingNotification';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  FileText,
  Loader2,
  AlertCircle,
  Bell,
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  File,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { FolderManager } from '../components/FolderManager';
import { supabase } from '../lib/supabase';
import type { FileAnalysis, FileProcessingJob, MaterialCategory } from '../types/fileProcessing';

// URLs de las Cloud Functions (deben estar en variables de entorno)
const ANALYZE_FILE_URL = import.meta.env.VITE_ANALYZE_FILE_URL || '';
const CREATE_JOB_URL = import.meta.env.VITE_CREATE_JOB_URL || '';
const CANCEL_JOB_URL = import.meta.env.VITE_CANCEL_JOB_URL || 'https://us-central1-eduspark-py.cloudfunctions.net/cancelFileProcessingJob';

interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  modifiedTime: string;
}

export const FileProcessingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [jobs, setJobs] = useState<FileProcessingJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory>('book');
  const [notifications, setNotifications] = useState<FileProcessingJob[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [processedFileIds, setProcessedFileIds] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [hiddenFileIds, setHiddenFileIds] = useState<Set<string>>(new Set());

  // Función de diagnóstico de tokens
  const diagnosticarTokens = async () => {
    if (!user) return;

    try {
      console.log('🔍 Iniciando diagnóstico de tokens...');

      // Verificar tokens del usuario
      const { data: tokens, error: tokensError } = await supabase
        .from('user_google_tokens')
        .select('id, service_type, expires_at, created_at, updated_at')
        .eq('user_id', user.id);

      if (tokensError) {
        console.error('Error obteniendo tokens:', tokensError);
        setDiagnosticInfo({
          error: tokensError.message,
          tokens: null,
        });
        return;
      }

      // Verificar token de Drive específicamente
      const driveToken = await googleOAuthService.getAccessToken(user.id, 'drive');

      const info = {
        userId: user.id,
        tokens: tokens || [],
        hasDriveToken: !!driveToken,
        driveTokenLength: driveToken?.length || 0,
        tokensByType: (tokens || []).reduce((acc: any, t: any) => {
          acc[t.service_type] = (acc[t.service_type] || 0) + 1;
          return acc;
        }, {}),
        tokensDetails: (tokens || []).map((t: any) => ({
          service_type: t.service_type,
          expires_at: t.expires_at,
          isExpired: t.expires_at ? new Date(t.expires_at) <= new Date() : false,
          created_at: t.created_at,
        })),
      };

      console.log('📊 Información de diagnóstico:', info);
      setDiagnosticInfo(info);
      setShowDiagnostics(true);
    } catch (err: any) {
      console.error('Error en diagnóstico:', err);
      setDiagnosticInfo({
        error: err.message,
        tokens: null,
      });
      setShowDiagnostics(true);
    }
  };

  // Función para cargar archivos de una carpeta específica
  const loadFilesFromFolder = async (folderId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const driveFiles = await googleDriveService.listFilesInFolder(user.id, folderId, [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ]);

      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Error cargando archivos:', err);
      setError(err.message || 'Error cargando archivos de Google Drive');
    } finally {
      setLoading(false);
    }
  };

  // Cargar notificaciones cerradas y archivos ocultos desde localStorage
  useEffect(() => {
    if (!user) return;

    const storageKey = `dismissed_notifications_${user.id}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const dismissedIds = JSON.parse(stored) as string[];
        setDismissedNotifications(new Set(dismissedIds));
      }
    } catch (err) {
      console.warn('Error cargando notificaciones cerradas:', err);
    }

    // Cargar archivos ocultos
    const hiddenFilesKey = `hidden_files_${user.id}`;
    try {
      const storedHidden = localStorage.getItem(hiddenFilesKey);
      if (storedHidden) {
        const hiddenIds = JSON.parse(storedHidden) as string[];
        setHiddenFileIds(new Set(hiddenIds));
      }
    } catch (err) {
      console.warn('Error cargando archivos ocultos:', err);
    }
  }, [user]);

  // Cargar carpeta del usuario y archivos
  useEffect(() => {
    if (!user) return;

    const loadFiles = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener carpeta del usuario
        let folder = await googleDriveService.getUserFolder(user.id);

        if (!folder) {
          // Verificar si tiene Google Drive conectado
          const hasDriveToken = await googleOAuthService.hasValidToken(user.id, 'drive');

          if (hasDriveToken) {
            // Si tiene Drive conectado pero no tiene carpeta, intentar crearla
            try {
              folder = await googleDriveService.createOrGetUserFolder(user.id);
            } catch (err: any) {
              console.error('Error creando carpeta de Drive:', err);
              // Verificar si el error es por API no habilitada
              const errorMessage = err.message || '';
              if (errorMessage.includes('API has not been used') || errorMessage.includes('disabled')) {
                setError('La API de Google Drive no está habilitada en el proyecto de Google Cloud. Por favor, habilítala visitando: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=468517556859');
              } else {
                setError('Error al crear la carpeta de Google Drive. Por favor, intenta vincularla desde tu perfil.');
              }
              setLoading(false);
              return;
            }
          } else {
            // No tiene Drive conectado, mostrar mensaje informativo
            setLoading(false);
            return;
          }
        }

        if (!folder) {
          // No establecer error aquí, mostrar mensaje informativo con botón
          setLoading(false);
          return;
        }

        setFolderId(folder.id);
        setSelectedFolderId(folder.id);
        setSelectedFolderName(folder.name || 'Carpeta Principal');

        // Listar archivos PDF, PPT e imágenes
        const driveFiles = await googleDriveService.listFilesInFolder(user.id, folder.id, [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
        ]);

        setFiles(driveFiles);

        // Obtener IDs de archivos ya procesados desde Firestore (jobs completados)
        const processedIds = jobs
          .filter(job => job.status === 'completed')
          .map(job => job.sourceFileId);
        setProcessedFileIds(processedIds);

        // Verificar en Supabase qué materiales ya tienen chunks procesados
        // Esto nos ayuda a saber si un archivo ya fue completamente procesado
        try {
          const { data: materialsWithChunks } = await supabase
            .from('materials')
            .select('id, metadata, rag_status')
            .eq('rag_status', 'completed')
            .not('metadata->sourceFileId', 'is', null);

          if (materialsWithChunks) {
            const materialFileIds = materialsWithChunks
              .map(m => m.metadata?.sourceFileId)
              .filter(Boolean) as string[];

            // Combinar con los IDs de Firestore
            const allProcessedIds = [...new Set([...processedIds, ...materialFileIds])];
            setProcessedFileIds(allProcessedIds);
          }
        } catch (err) {
          console.warn('Error verificando materiales procesados en Supabase:', err);
        }
      } catch (err: any) {
        console.error('Error cargando archivos:', err);
        setError(err.message || 'Error cargando archivos de Google Drive');
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [user]);

  // Suscribirse a trabajos en tiempo real y detectar cambios de estado
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToAllJobs(user.id, async (updatedJobs) => {
      setJobs(updatedJobs);

      // Actualizar IDs de archivos procesados
      const processedIds = updatedJobs
        .filter(job => job.status === 'completed')
        .map(job => job.sourceFileId);
      setProcessedFileIds(processedIds);

      // Detectar trabajos que cambiaron de estado para notificaciones y actualizar rag_status
      for (const job of updatedJobs) {
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          // Solo agregar a notificaciones si no fue cerrada previamente
          setDismissedNotifications(prevDismissed => {
            if (!prevDismissed.has(job.id)) {
              // Verificar si ya existe en notificaciones usando función de actualización
              setNotifications(prevNotifications => {
                // Evitar duplicados verificando si ya existe
                const exists = prevNotifications.find(n => n.id === job.id);
                if (exists) {
                  // Actualizar el job existente si el estado cambió
                  return prevNotifications.map(n => n.id === job.id ? job : n);
                }
                return [...prevNotifications, job]; // No existe, agregar
              });
            }
            return prevDismissed; // No cambiar el Set de cerradas
          });

          // Actualizar rag_status en Supabase si el job tiene materialId
          const materialId = job.metadata?.materialId;
          if (materialId) {
            try {
              let newStatus: string;
              const updateData: any = {};

              if (job.status === 'completed') {
                newStatus = 'completed';
                updateData.rag_status = newStatus;
                updateData.processed_at = new Date().toISOString();
              } else if (job.status === 'failed') {
                newStatus = 'failed';
                updateData.rag_status = newStatus;
                updateData.rag_error = job.errorMessage || 'Error en el procesamiento';
              } else if (job.status === 'cancelled') {
                // Para jobs cancelados, mantener el estado actual o marcarlo como 'pending'
                // No actualizar rag_status a menos que sea necesario
                newStatus = 'pending'; // O mantener el estado actual
                updateData.rag_status = newStatus;
              } else {
                continue; // No hacer nada para otros estados
              }

              if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase
                  .from('materials')
                  .update(updateData)
                  .eq('id', materialId);

                if (updateError) {
                  console.error('Error actualizando rag_status:', updateError);
                } else {
                  console.log(`✅ rag_status actualizado a "${newStatus}" para material ${materialId}`);
                }
              }
            } catch (err: any) {
              console.error('Error actualizando estado del material:', err);
            }
          }
        } else if (job.status === 'processing') {
          // Actualizar a processing cuando inicia
          const materialId = job.metadata?.materialId;
          if (materialId) {
            try {
              const { error: updateError } = await supabase
                .from('materials')
                .update({ rag_status: 'processing' })
                .eq('id', materialId);

              if (updateError) {
                console.error('Error actualizando rag_status a processing:', updateError);
              }
            } catch (err: any) {
              console.error('Error actualizando estado del material:', err);
            }
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Analizar archivo
  const handleAnalyze = async (file: DriveFile) => {
    console.log('[FileProcessing] Iniciando análisis de archivo:', file.name);

    if (!user) {
      const errorMsg = 'No hay usuario autenticado';
      console.error('[FileProcessing]', errorMsg);
      setError(errorMsg);
      return;
    }

    if (!ANALYZE_FILE_URL) {
      const errorMsg = 'URL de análisis no configurada. Verifica VITE_ANALYZE_FILE_URL en .env';
      console.error('[FileProcessing]', errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      setAnalyzing(file.id);
      setError(null);
      console.log('[FileProcessing] Estado: analyzing =', file.id);

      // Obtener token de autenticación de Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const errorMsg = 'No hay sesión activa. Por favor, inicia sesión nuevamente.';
        console.error('[FileProcessing]', errorMsg);
        setError(errorMsg);
        setAnalyzing(null);
        return;
      }

      // Obtener token de acceso de Google Drive del usuario
      const googleDriveToken = await googleOAuthService.getAccessToken(user.id, 'drive');
      if (!googleDriveToken) {
        const errorMsg = 'No tienes acceso a Google Drive. Por favor, conecta tu cuenta de Google Drive desde tu perfil.';
        console.error('[FileProcessing]', errorMsg);
        setError(errorMsg);
        setAnalyzing(null);
        return;
      }

      console.log('[FileProcessing] Enviando solicitud a:', ANALYZE_FILE_URL);
      const response = await fetch(ANALYZE_FILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileId: file.id,
          fileName: file.name,
          userId: user.id,
          googleDriveAccessToken: googleDriveToken, // Enviar token de Google Drive
        }),
      });

      console.log('[FileProcessing] Respuesta recibida:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Error analizando archivo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        console.error('[FileProcessing] Error en respuesta:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[FileProcessing] Datos recibidos:', data);

      if (data.success && data.analysis) {
        const fileAnalysis: FileAnalysis = {
          fileId: file.id,
          fileName: file.name,
          fileSize: data.analysis.fileSize,
          totalPages: data.analysis.totalPages,
          pdfType: data.analysis.pdfType,
          requiresOCR: data.analysis.requiresOCR,
          estimatedCosts: {
            totalPages: data.analysis.totalPages,
            pdfType: data.analysis.pdfType,
            estimatedCosts: data.analysis.estimatedCosts,
            processingTime: data.analysis.processingTime,
          },
        };
        console.log('[FileProcessing] Análisis completado:', fileAnalysis);
        setAnalysis(fileAnalysis);
        setShowAnalysisModal(true);
      } else {
        const errorMsg = data.error || 'Error en el análisis';
        console.error('[FileProcessing]', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('[FileProcessing] Error analizando archivo:', err);
      setError(err.message || 'Error analizando archivo');
    } finally {
      setAnalyzing(null);
      console.log('[FileProcessing] Estado: analyzing = null');
    }
  };

  // Cancelar procesamiento
  const handleCancel = async (jobId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar este procesamiento?')) {
      return;
    }

    try {
      await cancelJob(jobId);
      console.log('✅ Job cancelado:', jobId);
    } catch (err: any) {
      console.error('Error cancelando job:', err);
      setError(err.message || 'Error cancelando procesamiento');
    }
  };

  // Ocultar archivo de la vista
  const handleHideFile = (fileId: string) => {
    setHiddenFileIds(prev => {
      const newSet = new Set(prev);
      newSet.add(fileId);
      if (user) {
        try {
          localStorage.setItem(`hidden_files_${user.id}`, JSON.stringify(Array.from(newSet)));
        } catch (err) {
          console.warn('Error guardando archivos ocultos:', err);
        }
      }
      return newSet;
    });
  };

  // Procesar archivo
  const handleProcess = async (ragProcessingType: 'full' | 'readonly' = 'full') => {
    if (!user || !analysis || !CREATE_JOB_URL) {
      setError('Datos incompletos para procesar');
      return;
    }

    if (!selectedCourseId) {
      setError('Por favor, selecciona un curso para el material');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Crear material en Supabase primero
      let materialId: string | undefined;
      try {
        // Determinar el tipo de material basado en el archivo
        const file = files.find(f => f.id === analysis.fileId);
        const isImage = file?.mimeType?.startsWith('image/') || false;
        const materialKind = isImage ? 'other' : 'pdf'; // Las imágenes se guardan como 'other'
        const mimeType = file?.mimeType || 'application/pdf';

        // Determinar rag_status según el tipo de procesamiento
        const ragStatus = ragProcessingType === 'readonly' ? 'readonly' : 'pending';

        const { data: material, error: materialError } = await supabase
          .from('materials')
          .insert({
            course_id: selectedCourseId,
            title: analysis.fileName,
            kind: materialKind,
            category: selectedCategory,
            rag_status: ragStatus,
            mime_type: mimeType,
            size_bytes: analysis.fileSize,
            metadata: {
              sourceFileId: analysis.fileId,
              pdfType: analysis.pdfType,
              requiresOCR: analysis.requiresOCR,
              isImage: isImage,
              ragProcessingType: ragProcessingType,
            },
          })
          .select('id')
          .single();

        if (materialError) throw materialError;
        materialId = material.id;
      } catch (err: any) {
        console.error('Error creando material:', err);
        // Continuar aunque falle la creación del material
      }

      // Obtener token de autenticación de Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('No hay sesión activa. Por favor, inicia sesión nuevamente.');
        return;
      }

      const response = await fetch(CREATE_JOB_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileId: analysis.fileId,
          fileName: analysis.fileName,
          courseId: selectedCourseId,
          userId: user.id,
          category: selectedCategory,
          materialId: materialId,
          ragProcessingType: ragProcessingType, // 'full' o 'readonly'
          analysis: {
            totalPages: analysis.totalPages,
            pdfType: analysis.pdfType,
            estimatedCosts: analysis.estimatedCosts.estimatedCosts,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creando trabajo');
      }

      const data = await response.json();
      if (data.success) {
        setShowAnalysisModal(false);
        setAnalysis(null);
        // El trabajo se mostrará automáticamente en el dashboard gracias a la suscripción
      } else {
        throw new Error(data.error || 'Error en la creación del trabajo');
      }
    } catch (err: any) {
      console.error('Error procesando archivo:', err);
      setError(err.message || 'Error procesando archivo');
    } finally {
      setProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-green-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return <File className="w-5 h-5 text-orange-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const getFileTypeLabel = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) {
      return 'Imagen';
    } else if (mimeType === 'application/pdf') {
      return 'PDF';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return 'PowerPoint';
    }
    return 'Archivo';
  };

  const getThumbnailUrl = (fileId: string, mimeType: string): string | null => {
    if (mimeType.startsWith('image/')) {
      // Para imágenes, usar el thumbnail de Google Drive
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Motor de Ingesta Asíncrono para RAG
        </h1>
        <p className="text-gray-600">
          Clasifica y procesa materiales educativos para alimentar el Tutor RAG de tus cursos
        </p>
      </div>

      {/* Notificaciones */}
      {notifications.filter(job => !dismissedNotifications.has(job.id)).length > 0 && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center space-x-2 mb-2">
            <Bell size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
          </div>
          {notifications
            .filter(job => !dismissedNotifications.has(job.id))
            .map((job) => (
              <ProcessingNotification
                key={job.id}
                job={job}
                onDismiss={() => {
                  // Guardar en localStorage
                  if (user) {
                    const storageKey = `dismissed_notifications_${user.id}`;
                    try {
                      const newDismissed = new Set(dismissedNotifications);
                      newDismissed.add(job.id);
                      setDismissedNotifications(newDismissed);

                      // Guardar en localStorage (mantener solo los últimos 100 para no crecer demasiado)
                      const dismissedArray = Array.from(newDismissed);
                      const toStore = dismissedArray.slice(-100); // Solo los últimos 100
                      localStorage.setItem(storageKey, JSON.stringify(toStore));
                    } catch (err) {
                      console.warn('Error guardando notificación cerrada:', err);
                    }
                  }

                  // Remover de notificaciones visibles
                  setNotifications(prev => prev.filter(n => n.id !== job.id));
                }}
              />
            ))}
        </div>
      )}

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
                  <p className="text-red-700 mb-3">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                  title="Cerrar error"
                >
                  <XCircle size={20} />
                </button>
              </div>
              {error.includes('API de Google Drive no está habilitada') && (
                <div className="mt-3">
                  <a
                    href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=468517556859"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <ExternalLink size={16} />
                    <span>Habilitar API de Google Drive</span>
                  </a>
                  <p className="text-sm text-red-600 mt-2">
                    Después de habilitar la API, espera unos minutos y recarga esta página.
                  </p>
                </div>
              )}
              {(error.includes('token de acceso de Google Drive') || error.includes('conectar su cuenta de Google Drive')) && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={diagnosticarTokens}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw size={16} />
                      <span>🔍 Diagnosticar Problema de Token</span>
                    </button>
                    <button
                      onClick={() => setError(null)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <XCircle size={16} />
                      <span>Cerrar Error</span>
                    </button>
                  </div>
                  <p className="text-sm text-red-600">
                    Haz clic en "Diagnosticar" para ver información detallada, o en "Cerrar Error" para continuar trabajando.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Mensaje si no hay carpeta de Google Drive vinculada */}
      {!loading && !folderId && (
        <Card className="mb-8 bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-4">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Google Drive no vinculado
              </h3>
              <p className="text-yellow-700 mb-4">
                Para procesar materiales, necesitas vincular una carpeta de Google Drive.
                Esto te permitirá acceder a tus archivos PDF y PPT para procesarlos con el Tutor RAG.
              </p>
              <Button
                onClick={() => navigate('/profile')}
                variant="primary"
                className="flex items-center space-x-2"
              >
                <ExternalLink size={16} />
                <span>Ir a Perfil para Vincular Google Drive</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Selector de Curso y Categoría */}
      {folderId && (
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Configuración del Material
          </h2>
          {user && (
            <CourseMaterialSelector
              userId={user.id}
              onSelect={(courseId, category) => {
                setSelectedCourseId(courseId);
                setSelectedCategory(category);
              }}
              selectedCourseId={selectedCourseId}
              selectedCategory={selectedCategory}
              disabled={processing}
            />
          )}
        </Card>
      )}

      {/* Administrador de Carpetas */}
      {folderId && user && selectedFolderId && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <FolderTree size={24} />
              <span>Administración de Carpetas y Archivos</span>
            </h2>
            <Button
              onClick={() => setShowFolderManager(!showFolderManager)}
              variant="secondary"
            >
              {showFolderManager ? 'Ocultar' : 'Mostrar'} Administrador
            </Button>
          </div>
          {showFolderManager && (
            <FolderManager
              userId={user.id}
              rootFolderId={selectedFolderId}
              rootFolderName={selectedFolderName}
              onFolderSelect={(folderId, folderName) => {
                setSelectedFolderId(folderId);
                setSelectedFolderName(folderName);
                // Recargar archivos de la nueva carpeta
                loadFilesFromFolder(folderId);
              }}
              onFileSelect={(fileId, fileName) => {
                if (selectedFileIds.includes(fileId)) {
                  setSelectedFileIds(prev => prev.filter(id => id !== fileId));
                } else {
                  setSelectedFileIds(prev => [...prev, fileId]);
                }
              }}
              onUnlinkFolder={() => {
                // Desconectar carpeta y recargar página
                setFolderId(null);
                setSelectedFolderId(null);
                setSelectedFolderName('');
                setFiles([]);
                // Recargar para mostrar mensaje de vinculación
                window.location.reload();
              }}
              selectedFiles={selectedFileIds}
              processedFiles={processedFileIds}
            />
          )}
        </div>
      )}

      {folderId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de archivos */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Archivos Disponibles</h2>
              {hiddenFileIds.size > 0 && (
                <button
                  onClick={() => {
                    setHiddenFileIds(new Set());
                    if (user) {
                      try {
                        localStorage.removeItem(`hidden_files_${user.id}`);
                      } catch (err) {
                        console.warn('Error limpiando archivos ocultos:', err);
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-2"
                  title="Mostrar todos los archivos ocultos"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Mostrar {hiddenFileIds.size} oculto{hiddenFileIds.size > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="ml-2 text-gray-600">Cargando archivos...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto mb-2 text-gray-400" size={48} />
                <p>No se encontraron archivos PDF, PPT o imágenes en tu carpeta de Google Drive</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.filter(file => !hiddenFileIds.has(file.id)).map((file) => {
                  const isAnalyzing = analyzing === file.id;
                  const fileJobs = jobs.filter(j => j.sourceFileId === file.id);
                  const hasJobs = fileJobs.length > 0;
                  const isCompleted = fileJobs.length > 0 && fileJobs.every(j => j.status === 'completed');
                  const isAlreadyProcessed = processedFileIds.includes(file.id);
                  const canReanalyze = isCompleted || isAlreadyProcessed; // Permitir re-análisis solo si está completado

                  const thumbnailUrl = getThumbnailUrl(file.id, file.mimeType);
                  const isImage = file.mimeType.startsWith('image/');
                  const fileTypeLabel = getFileTypeLabel(file.mimeType);
                  // Mejorar detección de procesamiento para evitar jobs "colgados"
                  const isProcessing = fileJobs.some(j => {
                    if (j.status !== 'processing') return false;
                    // Verificar si el job lleva más de 2 horas sin actualizar
                    const updatedAt = j.updatedAt ? new Date(j.updatedAt) : new Date(j.createdAt);
                    const now = new Date();
                    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceUpdate > 2) {
                      console.warn(`Job ${j.id} lleva ${hoursSinceUpdate.toFixed(1)} horas sin actualizar`);
                      return false;
                    }
                    return true;
                  });
                  const hasFailed = fileJobs.some(j => j.status === 'failed');

                  return (
                    <div
                      key={file.id}
                      className={`border rounded-lg p-4 transition-all ${isCompleted
                        ? 'border-green-300 bg-green-50'
                        : isProcessing
                          ? 'border-blue-300 bg-blue-50'
                          : hasFailed
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail o Icono */}
                        <div className="flex-shrink-0">
                          {thumbnailUrl && isImage ? (
                            <div className="relative">
                              <img
                                src={thumbnailUrl}
                                alt={file.name}
                                className="w-20 h-20 object-cover rounded border border-gray-200"
                                onError={(e) => {
                                  // Si falla la carga del thumbnail, mostrar icono
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-20 h-20 flex items-center justify-center bg-gray-100 rounded border">' +
                                      getFileIcon(file.mimeType).props.children + '</div>';
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded border">
                              {getFileIcon(file.mimeType)}
                            </div>
                          )}
                        </div>

                        {/* Información del archivo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-800 mb-1 truncate" title={file.name}>
                                {file.name}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  {fileTypeLabel}
                                </span>
                                {isCompleted && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Completado
                                  </span>
                                )}
                                {isProcessing && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3 animate-pulse" />
                                    Procesando
                                  </span>
                                )}
                                {fileJobs.some(j => j.status === 'cancelled') && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Cancelado
                                  </span>
                                )}
                                {hasFailed && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Fallido
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-4">
                              <span>Tamaño: {formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>Modificado: {formatDate(file.modifiedTime)}</span>
                            </div>
                            {hasJobs && (() => {
                              const mainJob = fileJobs[0]; // El job principal
                              const chunksProcessed = mainJob?.chunksProcessed || 0;
                              const chunksTotal = mainJob?.chunksTotal;
                              const isProcessing = mainJob?.status === 'processing' || mainJob?.status === 'pending';
                              // Obtener tiempo estimado de diferentes posibles ubicaciones
                              const estimatedMinutes = mainJob?.metadata?.estimatedCosts?.processingTime?.estimatedMinutes ||
                                mainJob?.metadata?.estimatedCosts?.estimatedCosts?.processingTime?.estimatedMinutes ||
                                (mainJob?.metadata?.estimatedCosts?.processingTime?.estimatedHours
                                  ? mainJob.metadata.estimatedCosts.processingTime.estimatedHours * 60
                                  : undefined);

                              return (
                                <div className="space-y-2 mt-2">
                                  {/* Estado del job */}
                                  <div className={`flex items-center gap-2 ${isProcessing ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                                    <span className="font-medium">
                                      {mainJob?.status === 'processing' ? 'Procesando...' :
                                        mainJob?.status === 'pending' ? 'Pendiente' :
                                          mainJob?.status === 'completed' ? 'Completado' :
                                            mainJob?.status === 'failed' ? 'Error' :
                                              'Iniciando...'}
                                    </span>
                                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                                  </div>

                                  {/* Barra de progreso visual - solo si hay chunksTotal */}
                                  {chunksTotal !== undefined && chunksTotal > 0 && (
                                    <div>
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className={`font-medium ${isProcessing ? 'text-blue-700' : 'text-green-700'}`}>
                                          {chunksProcessed} de {chunksTotal} chunks completados
                                        </span>
                                        <span className={`font-semibold ${isProcessing ? 'text-blue-700' : 'text-green-700'}`}>
                                          {Math.round((chunksProcessed / chunksTotal) * 100)}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div
                                          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${isProcessing
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                            : 'bg-gradient-to-r from-green-500 to-green-600'
                                            }`}
                                          style={{ width: `${Math.round((chunksProcessed / chunksTotal) * 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Temporizador - mostrar siempre si hay tiempo estimado o si está procesando */}
                                  {(estimatedMinutes || (isProcessing && (mainJob.startedAt || mainJob.createdAt))) && (
                                    <ProcessingTimer
                                      startTime={mainJob.startedAt || mainJob.createdAt}
                                      isProcessing={isProcessing}
                                      estimatedMinutes={estimatedMinutes}
                                      chunksProcessed={chunksProcessed}
                                      chunksTotal={chunksTotal}
                                    />
                                  )}

                                  {/* Mensaje de completado */}
                                  {isCompleted && (
                                    <div className="flex items-center gap-2 text-green-700">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span className="font-medium">Procesamiento completado</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end space-y-2">
                          {!selectedCourseId && (
                            <p className="text-xs text-red-600">Selecciona un curso primero</p>
                          )}
                          {/* Botón de cancelar para jobs en procesamiento */}
                          {isProcessing && fileJobs.length > 0 && (
                            <button
                              onClick={() => {
                                const processingJob = fileJobs.find(j => j.status === 'processing' || j.status === 'pending');
                                if (processingJob) {
                                  handleCancel(processingJob.id);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-1"
                              title="Cancelar procesamiento"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Cancelar</span>
                            </button>
                          )}
                          {/* Botón para ocultar archivos fallados */}
                          {hasFailed && (
                            <button
                              onClick={() => handleHideFile(file.id)}
                              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center space-x-1"
                              title="Ocultar este archivo de la lista"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Ocultar</span>
                            </button>
                          )}
                          {canReanalyze ? (
                            <div className="flex flex-col items-end gap-2">
                              <button
                                onClick={() => {
                                  if (!confirm(`⚠️ Este archivo ya fue procesado.\n\n¿Deseas procesarlo nuevamente?\n\nEsto creará nuevos chunks y puede duplicar información en el sistema RAG.`)) {
                                    return;
                                  }
                                  if (!selectedCourseId) {
                                    setError('Por favor, selecciona un curso antes de analizar el archivo');
                                    return;
                                  }
                                  handleAnalyze(file);
                                }}
                                disabled={isAnalyzing || processing || !selectedCourseId}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                title={!selectedCourseId ? 'Selecciona un curso primero' : 'Re-procesar archivo (ya fue procesado anteriormente)'}
                              >
                                {isAnalyzing ? (
                                  <>
                                    <Loader2 className="animate-spin" size={16} />
                                    <span>Re-analizando...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Re-procesar</span>
                                  </>
                                )}
                              </button>
                              <span className="text-xs text-green-700 font-medium">✓ Ya procesado</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                console.log('[FileProcessing] Click en Analizar para:', file.name);
                                if (!selectedCourseId) {
                                  setError('Por favor, selecciona un curso antes de analizar el archivo');
                                  return;
                                }
                                handleAnalyze(file);
                              }}
                              disabled={isAnalyzing || processing || !selectedCourseId}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                              title={!selectedCourseId ? 'Selecciona un curso primero' : 'Analizar archivo'}
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="animate-spin" size={16} />
                                  <span>Analizando...</span>
                                </>
                              ) : (
                                <span>Analizar</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Dashboard de estado */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Estado de Procesamiento</h2>
            <ProcessingProgress
              jobs={jobs}
              onHideFile={handleHideFile}
              hiddenFileIds={hiddenFileIds}
            />
          </Card>
        </div>
      )}

      {/* Modal de análisis */}
      <FileAnalysisModal
        analysis={analysis}
        isOpen={showAnalysisModal}
        onClose={() => {
          setShowAnalysisModal(false);
          setAnalysis(null);
        }}
        onProcess={handleProcess}
        isProcessing={processing}
      />

      {/* Modal de Diagnóstico */}
      {showDiagnostics && diagnosticInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🔍 Diagnóstico de Tokens de Google Drive</h2>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            {diagnosticInfo.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-semibold">Error:</p>
                <p className="text-red-700">{diagnosticInfo.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Usuario ID:</h3>
                  <p className="text-sm text-gray-600 font-mono">{diagnosticInfo.userId}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Estado del Token de Drive:</h3>
                  {diagnosticInfo.hasDriveToken ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800 font-semibold">✅ Token de Drive disponible</p>
                      <p className="text-sm text-green-700">Longitud: {diagnosticInfo.driveTokenLength} caracteres</p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 font-semibold">❌ No se pudo obtener token de Drive</p>
                      <p className="text-sm text-red-700">El usuario necesita conectar Google Drive desde su perfil</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Tokens por Tipo:</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {Object.keys(diagnosticInfo.tokensByType).length > 0 ? (
                      <ul className="space-y-1">
                        {Object.entries(diagnosticInfo.tokensByType).map(([type, count]: [string, any]) => (
                          <li key={type} className="text-sm">
                            <span className="font-medium">{type}:</span> {count} token(s)
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600">No se encontraron tokens</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Detalles de Tokens:</h3>
                  {diagnosticInfo.tokensDetails && diagnosticInfo.tokensDetails.length > 0 ? (
                    <div className="space-y-2">
                      {diagnosticInfo.tokensDetails.map((token: any, index: number) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-3 ${token.isExpired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">Tipo: {token.service_type}</span>
                            {token.isExpired ? (
                              <span className="text-xs text-red-600 font-semibold">❌ Expirado</span>
                            ) : (
                              <span className="text-xs text-green-600 font-semibold">✅ Válido</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">Expira: {token.expires_at || 'No expira'}</p>
                          <p className="text-xs text-gray-600">Creado: {token.created_at}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No hay tokens para mostrar</p>
                  )}
                </div>

                {!diagnosticInfo.hasDriveToken && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">💡 Solución:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                      <li>Ve a tu perfil de usuario</li>
                      <li>Conecta tu cuenta de Google Drive</li>
                      <li>Asegúrate de autorizar los permisos de Drive</li>
                      <li>Vuelve a intentar procesar el archivo</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setShowDiagnostics(false)}
                variant="secondary"
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

