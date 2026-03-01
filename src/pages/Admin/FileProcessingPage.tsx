// pages/FileProcessingPage.tsx
// Página para procesar archivos de Google Drive para RAG

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { googleDriveService } from '@/services/googleDriveService';
import { googleOAuthService } from '@/services/googleOAuthService';
import { subscribeToAllJobs } from '@/services/firestoreService';
import { cancelJob } from '@/services/firestoreService';
import { estimateCosts } from '@/services/costEstimator';
import { FileAnalysisModal } from '@/components/Features/FileAnalysisModal';
import { ProcessingTimer } from '@/components/Features/ProcessingTimer';
import { CourseMaterialSelector } from '@/components/Features/CourseMaterialSelector';
import { ProcessingNotification } from '@/components/Features/ProcessingNotification';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
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
import { FolderManager } from '@/components/Features/FolderManager';
import { supabase } from '@/lib/supabase';
import type { FileAnalysis, FileProcessingJob, MaterialCategory } from '@/types/fileProcessing';

// URLs de las Cloud Functions (deben estar en variables de entorno)
const ANALYZE_FILE_URL = import.meta.env.VITE_ANALYZE_FILE_URL || '';
const CREATE_JOB_URL = import.meta.env.VITE_CREATE_JOB_URL || '';
const CANCEL_JOB_URL = import.meta.env.VITE_CANCEL_JOB_URL || 'https://us-central1-eduspark-py.cloudfunctions.net/cancelFileProcessingJob';
const RAG_WORKER_URL = import.meta.env.VITE_RAG_WORKER_URL || 'https://us-central1-eduspark-py.cloudfunctions.net/rag-worker';

// Helper para manejar errores de Supabase/PostgreSQL que deben ignorarse silenciosamente
const shouldIgnoreSupabaseError = (error: any): boolean => {
  if (!error) return false;

  const errorCode = error.code;
  const errorMessage = error.message?.toLowerCase() || '';

  // Errores que deben ignorarse silenciosamente:
  // - 25P02: Transaction aborted (ocurre cuando una transacción previa falló)
  // - 57014: Statement timeout
  // - Errores de transacción abortada
  const ignorableCodes = ['25P02', '57014'];
  const ignorableMessages = [
    'current transaction is aborted',
    'commands ignored until end of transaction block',
    'statement timeout'
  ];

  return ignorableCodes.includes(errorCode) ||
    ignorableMessages.some(msg => errorMessage.includes(msg));
};

const handleSupabaseError = (error: any, context: string = '') => {
  if (shouldIgnoreSupabaseError(error)) {
    // Error ignorable, solo loggear en modo debug si es necesario
    return;
  }

  // Error que debe ser reportado
  console.error(`Error${context ? ` en ${context}` : ''}:`, error);
};

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

  // Manejar errores de MutationObserver y otros errores de librerías externas
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Filtrar errores de MutationObserver que vienen de librerías externas
      if (args[0]?.toString().includes('MutationObserver') ||
        args[0]?.toString().includes('observe')) {
        // No hacer nada, estos errores son de librerías externas y no afectan la funcionalidad
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const reloadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref para rastrear actualizaciones pendientes de rag_status y evitar duplicados
  const pendingRagStatusUpdates = useRef<Map<string, { status: string; timestamp: number }>>(new Map());
  const ragStatusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
                setError('La API de Google Drive no está habilitada en el proyecto de Google Cloud. Por favor, habilítala visitando: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=151821961684');
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
        // Usar Promise.race con timeout para evitar esperar demasiado tiempo
        try {
          const queryPromise = supabase
            .from('materials')
            .select('id, metadata, rag_status')
            .eq('rag_status', 'completed')
            .not('metadata->sourceFileId', 'is', null)
            .limit(1000); // Limitar resultados para evitar timeouts

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), 5000); // 5 segundos de timeout
          });

          const { data: materialsWithChunks, error: materialsError } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]) as any;

          // Si hay error 500/503/504 o timeout, ignorarlo silenciosamente (problema temporal del servidor)
          if (materialsError) {
            if (materialsError.status === 500 || materialsError.status === 503 || materialsError.status === 504 ||
              materialsError.code === '57014' || materialsError.message?.includes('timeout')) {
              console.warn('[FileProcessing] Error temporal del servidor o timeout verificando materiales procesados, usando solo datos de Firestore');
            } else {
              console.warn('Error verificando materiales procesados en Supabase:', materialsError);
            }
          } else if (materialsWithChunks) {
            const materialFileIds = materialsWithChunks
              .map((m: any) => m.metadata?.sourceFileId)
              .filter(Boolean) as string[];

            // Combinar con los IDs de Firestore
            const allProcessedIds = [...new Set([...processedIds, ...materialFileIds])];
            setProcessedFileIds(allProcessedIds);
          }
        } catch (queryErr: any) {
          // Manejar timeouts y otros errores silenciosamente
          if (queryErr?.message?.includes('timeout') || queryErr?.code === '57014' || shouldIgnoreSupabaseError(queryErr)) {
            console.warn('[FileProcessing] Timeout o error ignorable verificando materiales procesados, usando solo datos de Firestore');
          } else {
            // Solo loggear errores que no sean del servidor
            if (queryErr?.status !== 500 && queryErr?.status !== 503 && queryErr?.status !== 504) {
              console.warn('Error verificando materiales procesados en Supabase:', queryErr);
            } else {
              console.warn('[FileProcessing] Error temporal del servidor verificando materiales, usando solo datos de Firestore');
            }
          }
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
      console.log(`[FileProcessing] Jobs actualizados: ${updatedJobs.length} jobs`, updatedJobs.map(j => ({
        id: j.id,
        status: j.status,
        sourceFileId: j.sourceFileId,
        metadataSourceFileId: (j.metadata as any)?.sourceFileId,
        fileName: j.sourceFileName
      })));
      setJobs(updatedJobs);

      // Actualizar IDs de archivos procesados
      const processedIds = updatedJobs
        .filter(job => job.status === 'completed')
        .map(job => job.sourceFileId || (job.metadata as any)?.sourceFileId)
        .filter(Boolean);
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
          // Usar debounce para evitar actualizaciones repetidas
          const materialId = job.metadata?.materialId;
          if (materialId) {
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
              newStatus = 'pending';
              updateData.rag_status = newStatus;
            } else {
              return; // No hacer nada para otros estados
            }

            // Verificar si ya hay una actualización pendiente para este material con el mismo estado
            const pending = pendingRagStatusUpdates.current.get(materialId);
            const now = Date.now();
            const DEBOUNCE_MS = 2000; // 2 segundos de debounce

            if (pending && pending.status === newStatus && (now - pending.timestamp) < DEBOUNCE_MS) {
              // Ya hay una actualización pendiente con el mismo estado, ignorar
              return;
            }

            // Registrar esta actualización como pendiente
            pendingRagStatusUpdates.current.set(materialId, { status: newStatus, timestamp: now });

            // Limpiar timeout anterior si existe
            if (ragStatusUpdateTimeoutRef.current) {
              clearTimeout(ragStatusUpdateTimeoutRef.current);
            }

            // Usar debounce para agrupar actualizaciones
            ragStatusUpdateTimeoutRef.current = setTimeout(() => {
              // Ejecutar actualización de forma asíncrona sin await para evitar bloqueos
              (async () => {
                try {
                  if (Object.keys(updateData).length > 0) {
                    const { error: updateError } = await supabase
                      .from('materials')
                      .update(updateData)
                      .eq('id', materialId);

                    // Remover de pendientes después de intentar actualizar
                    pendingRagStatusUpdates.current.delete(materialId);

                    if (updateError) {
                      // Solo loggear errores que no sean 500/503/504 (errores temporales del servidor)
                      if (updateError.status !== 500 && updateError.status !== 503 && updateError.status !== 504) {
                        handleSupabaseError(updateError, 'actualizando rag_status');
                      }
                      // Los errores 500/503/504 se ignoran silenciosamente
                    }
                  }
                } catch (err: any) {
                  // Remover de pendientes en caso de error
                  pendingRagStatusUpdates.current.delete(materialId);
                  // Solo loggear errores que no sean del servidor
                  if (err?.status !== 500 && err?.status !== 503 && err?.status !== 504) {
                    handleSupabaseError(err, 'actualizando estado del material');
                  }
                }
              })();
            }, DEBOUNCE_MS);
          }
        } else if (job.status === 'processing') {
          // Actualizar a processing cuando inicia (asíncrono, no bloquea)
          const materialId = job.metadata?.materialId;
          if (materialId) {
            // Verificar si ya hay una actualización pendiente para este material
            const pending = pendingRagStatusUpdates.current.get(materialId);
            const now = Date.now();
            const DEBOUNCE_MS = 2000; // 2 segundos de debounce

            if (pending && pending.status === 'processing' && (now - pending.timestamp) < DEBOUNCE_MS) {
              // Ya hay una actualización pendiente, ignorar
              return;
            }

            // Registrar esta actualización como pendiente
            pendingRagStatusUpdates.current.set(materialId, { status: 'processing', timestamp: now });

            // Ejecutar actualización de forma asíncrona sin bloquear
            supabase
              .from('materials')
              .update({ rag_status: 'processing' })
              .eq('id', materialId)
              .then(({ error: updateError }) => {
                // Remover de pendientes después de intentar actualizar
                pendingRagStatusUpdates.current.delete(materialId);

                if (updateError) {
                  // Solo loggear errores que no sean 500/503/504 (errores temporales del servidor)
                  if (updateError.status !== 500 && updateError.status !== 503 && updateError.status !== 504) {
                    handleSupabaseError(updateError, 'actualizando rag_status a processing');
                  }
                  // Los errores 500/503/504 se ignoran silenciosamente
                }
              })
              .catch((err: any) => {
                // Remover de pendientes en caso de error
                pendingRagStatusUpdates.current.delete(materialId);
                // Solo loggear errores que no sean del servidor
                if (err?.status !== 500 && err?.status !== 503 && err?.status !== 504) {
                  handleSupabaseError(err, 'actualizando estado del material');
                }
              });
          }
        }
      }
    });

    return () => {
      unsubscribe();
      // Limpiar timeouts pendientes
      if (ragStatusUpdateTimeoutRef.current) {
        clearTimeout(ragStatusUpdateTimeoutRef.current);
        ragStatusUpdateTimeoutRef.current = null;
      }
      // Limpiar actualizaciones pendientes
      pendingRagStatusUpdates.current.clear();
    };
  }, [user]);

  // Calcular si hay jobs en procesamiento usando useMemo para evitar re-renderizados innecesarios
  const hasProcessingJobs = useMemo(() => {
    return jobs.some(j =>
      j.status === 'processing' || j.status === 'pending'
    );
  }, [jobs]);

  // Recargar jobs cada 1 minuto cuando hay jobs en procesamiento
  useEffect(() => {
    if (!user) {
      // Limpiar intervalo si no hay usuario
      if (reloadIntervalRef.current) {
        clearInterval(reloadIntervalRef.current);
        reloadIntervalRef.current = null;
      }
      return;
    }

    // Si ya hay un intervalo activo y no hay jobs en procesamiento, limpiarlo
    if (!hasProcessingJobs && reloadIntervalRef.current) {
      console.log('[FileProcessing] 🛑 Deteniendo intervalo de recarga (no hay jobs en procesamiento)');
      clearInterval(reloadIntervalRef.current);
      reloadIntervalRef.current = null;
      return;
    }

    // Si no hay jobs en procesamiento, no hacer nada
    if (!hasProcessingJobs) {
      return;
    }

    // Si ya hay un intervalo activo, no crear otro
    if (reloadIntervalRef.current) {
      return;
    }

    console.log('[FileProcessing] ⏰ Iniciando intervalo de recarga cada 1 minuto para jobs en procesamiento');

    // Función para recargar jobs
    const reloadJobs = async () => {
      try {
        const { getAllJobs } = await import('@/services/firestoreService');
        const updatedJobs = await getAllJobs(user.id);

        // Solo loggear si hay cambios significativos (evitar spam)
        setJobs(prevJobs => {
          const hasStatusChanges = updatedJobs.some(updatedJob => {
            const existingJob = prevJobs.find(j => j.id === updatedJob.id);
            return !existingJob || existingJob.status !== updatedJob.status;
          });

          if (hasStatusChanges) {
            console.log(`[FileProcessing] 🔄 Recarga automática: ${updatedJobs.length} jobs encontrados`);
          }
          return updatedJobs;
        });

        // Actualizar IDs de archivos procesados
        const processedIds = updatedJobs
          .filter(job => job.status === 'completed')
          .map(job => job.sourceFileId || (job.metadata as any)?.sourceFileId)
          .filter(Boolean);
        setProcessedFileIds(processedIds);
      } catch (error) {
        console.error('[FileProcessing] Error recargando jobs:', error);
      }
    };

    // Recargar inmediatamente y luego cada 1 minuto
    reloadJobs();
    reloadIntervalRef.current = setInterval(reloadJobs, 60000); // 60000ms = 1 minuto

    return () => {
      if (reloadIntervalRef.current) {
        console.log('[FileProcessing] 🛑 Deteniendo intervalo de recarga');
        clearInterval(reloadIntervalRef.current);
        reloadIntervalRef.current = null;
      }
    };
  }, [user, hasProcessingJobs]); // Usar hasProcessingJobs en lugar de jobs para evitar bucles infinitos

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
      console.error('[FileProcessing] ❌ Error analizando archivo:', err);

      // Mensajes de error más descriptivos
      let errorMessage = 'Error analizando archivo';

      if (err.message) {
        errorMessage = err.message;
      } else if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        errorMessage = 'Error de conexión con el servidor. Verifica tu conexión a internet e intenta nuevamente.';
      } else if (err.name === 'AbortError') {
        errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intenta nuevamente.';
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        errorMessage = 'No tienes permisos para analizar este archivo. Verifica tu sesión.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Error interno del servidor. Por favor, intenta nuevamente más tarde.';
      } else if (err.response?.status >= 400) {
        errorMessage = `Error del servidor (${err.response.status}). Por favor, intenta nuevamente.`;
      }

      setError(errorMessage);
    } finally {
      setAnalyzing(null);
      console.log('[FileProcessing] Estado: analyzing = null');
    }
  };

  // Cancelar procesamiento
  const handleCancel = async (jobId: string) => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas cancelar este procesamiento?\n\nEl progreso actual se perderá y tendrás que iniciar el procesamiento nuevamente.')) {
      return;
    }

    try {
      setError(null);
      await cancelJob(jobId);
      console.log('✅ Job cancelado:', jobId);
      // Mostrar mensaje de éxito
      setStatusMessage('Procesamiento cancelado correctamente');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Error cancelando job:', err);
      setError(err.message || 'Error cancelando procesamiento');
    }
  };

  // Eliminar job fallido completamente
  const handleDeleteFailed = async (jobId: string, fileId: string) => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas eliminar este procesamiento fallido?\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    try {
      setError(null);
      console.log(`[FileProcessing] 🗑️ Intentando eliminar job: ${jobId}`);

      // Verificar que el usuario esté autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }

      console.log(`[FileProcessing] Usuario autenticado: ${session.user.id}`);

      // Verificar que el job pertenece al usuario antes de eliminar
      const { data: jobData, error: fetchError } = await supabase
        .from('file_processing_jobs')
        .select('id, user_id')
        .eq('id', jobId)
        .single();

      if (fetchError || !jobData) {
        throw new Error('Job no encontrado');
      }

      if (jobData.user_id !== session.user.id) {
        throw new Error('No tienes permisos para eliminar este job. El job pertenece a otro usuario.');
      }

      console.log(`[FileProcessing] ✅ Verificación de permisos OK. Job pertenece al usuario. Eliminando...`);
      console.log(`[FileProcessing] Detalles del job:`, {
        jobId,
        jobUserId: jobData.user_id,
        sessionUserId: session.user.id,
        match: jobData.user_id === session.user.id
      });

      // Eliminar el job de la base de datos
      // La política RLS ya verifica que user_id = auth.uid(), así que solo necesitamos el ID
      const { data: deleteData, error: deleteError } = await supabase
        .from('file_processing_jobs')
        .delete()
        .eq('id', jobId)
        .select();

      if (deleteError) {
        console.error('[FileProcessing] ❌ Error eliminando job:', {
          error: deleteError,
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint
        });

        // Si es un error de permisos, mostrar mensaje más claro
        if (deleteError.code === '42501' || deleteError.message?.includes('permission') || deleteError.message?.includes('policy')) {
          throw new Error('No tienes permisos para eliminar este job. Esto podría ser un problema de configuración de seguridad en la base de datos.');
        }

        throw deleteError;
      }

      // Verificar que realmente se eliminó
      if (deleteData && deleteData.length > 0) {
        console.log(`[FileProcessing] ✅ Job eliminado exitosamente. Filas afectadas: ${deleteData.length}`, deleteData);
      } else {
        console.warn(`[FileProcessing] ⚠️ DELETE ejecutado pero no se eliminó ninguna fila. Esto podría indicar:
          - El job no existe
          - Hay un problema de permisos RLS (Row Level Security)
          - El job pertenece a otro usuario
          
          Job ID: ${jobId}
          Usuario actual: ${user?.id}`);

        // Mostrar error al usuario
        setError('No se pudo eliminar el job. Verifica que tengas permisos o que el job exista.');
        return;
      }

      // Filtrar el job eliminado inmediatamente del estado local
      setJobs(prevJobs => {
        const filtered = prevJobs.filter(j => j.id !== jobId);
        console.log(`[FileProcessing] Job ${jobId} eliminado del estado local. Jobs restantes: ${filtered.length}`);
        return filtered;
      });

      // También ocultar el archivo
      handleHideFile(fileId);

      console.log('✅ Job eliminado:', jobId);
      setStatusMessage('Procesamiento fallido eliminado');
      setTimeout(() => setStatusMessage(null), 3000);

      // Forzar recarga de jobs después de eliminar (con delay mayor para dar tiempo a Supabase)
      setTimeout(async () => {
        console.log('[FileProcessing] Forzando recarga de jobs después de eliminar job...');
        try {
          const { getAllJobs } = await import('@/services/firestoreService');
          const allJobs = await getAllJobs(user?.id || '');
          console.log(`[FileProcessing] Jobs cargados después de eliminar: ${allJobs.length}`, allJobs.map(j => ({
            id: j.id,
            status: j.status,
            sourceFileId: j.sourceFileId,
            fileName: j.sourceFileName,
            errorMessage: j.errorMessage
          })));

          // Verificar que el job eliminado realmente no esté en la lista
          const deletedJobStillExists = allJobs.find(j => j.id === jobId);
          if (deletedJobStillExists) {
            console.warn(`⚠️ El job eliminado ${jobId} todavía aparece en la lista. Filtrando manualmente...`);
            // Filtrar manualmente si todavía aparece
            const filteredJobs = allJobs.filter(j => j.id !== jobId);
            setJobs(filteredJobs);
          } else {
            setJobs(allJobs);
          }
        } catch (err) {
          console.error('[FileProcessing] Error recargando jobs después de eliminar:', err);
        }
      }, 2000); // Aumentado a 2 segundos para dar más tiempo a Supabase
    } catch (err: any) {
      console.error('Error eliminando job:', err);
      setError(err.message || 'Error eliminando procesamiento fallido');
    }
  };

  // Forzar procesamiento de un job que está atascado en pending
  const handleForceProcess = async (jobId: string) => {
    if (!confirm('🔄 ¿Deseas forzar el procesamiento de este job?\n\nEsto invocará directamente al RAG worker para procesar el job.')) {
      return;
    }

    try {
      setError(null);
      console.log(`[FileProcessing] 🔄 Forzando procesamiento del job: ${jobId}`);

      // Obtener token de autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }

      // Invocar directamente al RAG worker
      const response = await fetch(RAG_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jobId: jobId,
          action: 'process'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del RAG worker: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log(`[FileProcessing] ✅ RAG worker invocado exitosamente. Respuesta: ${responseText}`);

      setStatusMessage('✅ Procesamiento forzado. El job debería comenzar a procesarse en breve.');
      setTimeout(() => setStatusMessage(null), 5000);

      // Recargar jobs después de un momento
      setTimeout(async () => {
        try {
          const { getAllJobs } = await import('@/services/firestoreService');
          const allJobs = await getAllJobs(user.id);
          setJobs(allJobs);
        } catch (err) {
          console.error('[FileProcessing] Error recargando jobs:', err);
        }
      }, 2000);
    } catch (err: any) {
      console.error('[FileProcessing] ❌ Error forzando procesamiento:', err);
      setError(err.message || 'Error al forzar el procesamiento del job');
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
  // Función para guardar el material sin procesar (solo crear el registro)
  const handleSaveWithoutProcessing = async () => {
    if (!user || !analysis) {
      setError('Datos incompletos para guardar. Por favor, verifica que todos los datos estén disponibles.');
      return;
    }

    if (!selectedCourseId) {
      setError('Por favor, selecciona un curso para el material');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setStatusMessage(null);

      console.log('[FileProcessing] Guardando material sin procesar:', {
        fileId: analysis.fileId,
        fileName: analysis.fileName,
        courseId: selectedCourseId,
      });

      // Crear material en Supabase sin iniciar procesamiento
      const file = files.find(f => f.id === analysis.fileId);
      if (!file) {
        throw new Error(`No se encontró el archivo ${analysis.fileId} en la lista de archivos`);
      }

      const isImage = file?.mimeType?.startsWith('image/') || false;
      const materialKind = isImage ? 'other' : 'pdf';
      const mimeType = file?.mimeType || 'application/pdf';

      // Crear material con rag_status NULL (no procesado) y purpose 'download'
      const { data: material, error: materialError } = await supabase
        .from('materials')
        .insert({
          course_id: selectedCourseId,
          title: analysis.fileName,
          kind: materialKind,
          category: selectedCategory,
          rag_status: null, // NULL = no procesado
          purpose: 'download', // Solo para descarga/visualización
          mime_type: mimeType,
          size_bytes: analysis.fileSize,
          metadata: {
            sourceFileId: analysis.fileId,
            pdfType: analysis.pdfType,
            requiresOCR: analysis.requiresOCR,
            isImage: isImage,
            savedWithoutProcessing: true, // Marcar que fue guardado sin procesar
          },
        })
        .select('id')
        .single();

      if (materialError) {
        console.error('[FileProcessing] Error detallado al crear material:', materialError);
        throw new Error(`Error al crear el material: ${materialError.message || 'Error desconocido'}`);
      }

      if (!material?.id) {
        throw new Error('No se recibió el ID del material creado');
      }

      console.log(`[FileProcessing] ✅ Material guardado sin procesar: ${material.id}`);
      setShowAnalysisModal(false);
      setAnalysis(null);
      setStatusMessage(
        `✅ Material guardado exitosamente. Puedes procesarlo más tarde desde la página de materiales. ` +
        `Material ID: ${material.id}`
      );

      // Recargar archivos para actualizar la lista
      setTimeout(async () => {
        try {
          const folder = await googleDriveService.getUserFolder(user.id);
          if (folder) {
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
          }
        } catch (err) {
          console.warn('[FileProcessing] Error recargando archivos:', err);
        }
      }, 1000);
    } catch (err: any) {
      console.error('[FileProcessing] ❌ Error guardando material:', err);
      const errorMessage = err.message || 'Error guardando material';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async (ragProcessingType: 'full' | 'readonly' = 'full') => {
    if (!user || !analysis || !CREATE_JOB_URL) {
      setError('Datos incompletos para procesar. Por favor, verifica que todos los datos estén disponibles.');
      return;
    }

    if (!selectedCourseId) {
      setError('Por favor, selecciona un curso para el material');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setStatusMessage(null);

      console.log('[FileProcessing] Iniciando procesamiento:', {
        fileId: analysis.fileId,
        fileName: analysis.fileName,
        courseId: selectedCourseId,
        ragProcessingType,
        hasAnalysis: !!analysis
      });

      // Crear material en Supabase primero - ES CRÍTICO
      let materialId: string | undefined;
      try {
        // Determinar el tipo de material basado en el archivo
        const file = files.find(f => f.id === analysis.fileId);
        if (!file) {
          throw new Error(`No se encontró el archivo ${analysis.fileId} en la lista de archivos`);
        }

        const isImage = file?.mimeType?.startsWith('image/') || false;
        const materialKind = isImage ? 'other' : 'pdf'; // Las imágenes se guardan como 'other'
        const mimeType = file?.mimeType || 'application/pdf';

        // Determinar rag_status según el tipo de procesamiento
        // Para materiales de solo lectura, rag_status debe ser NULL (no se procesan para RAG)
        // La constraint solo permite: 'pending', 'processing', 'completed', 'failed', NULL
        const ragStatus = ragProcessingType === 'readonly' ? null : 'pending';

        // Establecer purpose según el tipo de procesamiento
        // 'rag' = Solo para RAG (procesar pero NO mostrar a estudiantes)
        // 'download' = Solo para descarga/visualización (NO procesar para RAG)
        // 'both' = Para RAG Y descarga/visualización
        const purpose = ragProcessingType === 'readonly' ? 'download' :
          ragProcessingType === 'full' ? 'rag' :
            'rag'; // Por defecto, solo para RAG

        console.log('[FileProcessing] Creando material en Supabase:', {
          course_id: selectedCourseId,
          title: analysis.fileName,
          kind: materialKind,
          category: selectedCategory,
          rag_status: ragStatus,
          purpose: purpose,
          ragProcessingType: ragProcessingType
        });

        const { data: material, error: materialError } = await supabase
          .from('materials')
          .insert({
            course_id: selectedCourseId,
            title: analysis.fileName,
            kind: materialKind,
            category: selectedCategory,
            rag_status: ragStatus, // NULL para solo lectura, 'pending' para RAG
            purpose: purpose, // 'download' para solo lectura, 'rag' para procesamiento RAG
            mime_type: mimeType,
            size_bytes: analysis.fileSize,
            metadata: {
              sourceFileId: analysis.fileId,
              pdfType: analysis.pdfType,
              requiresOCR: analysis.requiresOCR,
              isImage: isImage,
              ragProcessingType: ragProcessingType, // Guardar en metadata para referencia
            },
          })
          .select('id')
          .single();

        if (materialError) {
          console.error('[FileProcessing] Error detallado al crear material:', materialError);
          throw new Error(`Error al crear el material: ${materialError.message || 'Error desconocido'}`);
        }

        if (!material?.id) {
          throw new Error('No se recibió el ID del material creado');
        }

        materialId = material.id;
        console.log(`[FileProcessing] ✅ Material creado exitosamente: ${materialId}`);
      } catch (err: any) {
        console.error('[FileProcessing] ❌ Error crítico creando material:', err);
        const errorMsg = err.message || 'Error al crear el material en la base de datos';
        setError(`No se pudo crear el material. ${errorMsg}. Por favor, intenta nuevamente.`);
        setProcessing(false);
        return; // NO continuar si no se puede crear el material
      }

      // Obtener token de autenticación de Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const errorMsg = 'No hay sesión activa. Por favor, inicia sesión nuevamente.';
        console.error('[FileProcessing]', errorMsg);
        setError(errorMsg);
        setProcessing(false);
        return;
      }

      // Para materiales de solo lectura, aplicar restricciones al archivo INMEDIATAMENTE
      // Las restricciones se aplican al archivo de Google Drive antes de compartirlo
      if (ragProcessingType === 'readonly') {
        console.log('[FileProcessing] Material de solo lectura creado. Aplicando restricciones al archivo de Google Drive...');

        try {
          // Importar el servicio de Google Drive dinámicamente
          const { googleDriveService } = await import('@/services/googleDriveService');

          // Aplicar restricciones al archivo PRIMERO (sin compartir con usuarios)
          const restrictionsResult = await googleDriveService.applyReadOnlyRestrictions(
            user.id,
            analysis.fileId
          );

          if (!restrictionsResult.success) {
            console.error('[FileProcessing] ❌ Error aplicando restricciones:', restrictionsResult.error);
            setShowAnalysisModal(false);
            setAnalysis(null);
            setStatusMessage(
              `⚠️ Material creado pero no se pudieron aplicar las restricciones de solo lectura. ` +
              `Error: ${restrictionsResult.error}. Puedes intentar compartirlo manualmente desde la página de materiales.`
            );
            setProcessing(false);
            return;
          }

          console.log('[FileProcessing] ✅ Restricciones aplicadas al archivo de Google Drive');

          // Intentar compartir con estudiantes (si hay estudiantes inscritos)
          try {
            const { materialService } = await import('@/services/teacherCourses');

            const shareResult = await materialService.shareMaterialWithCourseStudents(
              materialId,
              selectedCourseId,
              user.id,
              'reader' // Solo lectura
            );

            if (shareResult.success.length > 0) {
              console.log('[FileProcessing] ✅ Material compartido con estudiantes. viewLink generado:', shareResult.viewLink);
              setShowAnalysisModal(false);
              setAnalysis(null);
              setStatusMessage(
                `✅ Material de solo lectura creado y compartido exitosamente con ${shareResult.success.length} estudiante(s). ` +
                `El documento tiene restricciones de solo lectura - no se puede imprimir ni descargar.`
              );
            } else {
              console.log('[FileProcessing] ⚠️ No hay estudiantes inscritos para compartir');
              setShowAnalysisModal(false);
              setAnalysis(null);
              setStatusMessage(
                `✅ Material de solo lectura creado con restricciones aplicadas. ` +
                `No se compartió porque no hay estudiantes inscritos en el curso. ` +
                `Puedes compartirlo manualmente cuando haya estudiantes.`
              );
            }
          } catch (shareError: any) {
            console.warn('[FileProcessing] ⚠️ Error compartiendo material (las restricciones ya están aplicadas):', shareError);
            setShowAnalysisModal(false);
            setAnalysis(null);
            setStatusMessage(
              `✅ Material de solo lectura creado con restricciones aplicadas. ` +
              `No se pudo compartir automáticamente: ${shareError.message}. ` +
              `Puedes compartirlo manualmente desde la página de materiales.`
            );
          }
        } catch (error: any) {
          console.error('[FileProcessing] ❌ Error crítico aplicando restricciones:', error);
          setShowAnalysisModal(false);
          setAnalysis(null);
          setStatusMessage(
            `⚠️ Material creado pero hubo un error aplicando las restricciones: ${error.message}. ` +
            `Puedes intentar compartirlo manualmente desde la página de materiales.`
          );
        }

        setProcessing(false);
        return; // Terminar aquí para materiales de solo lectura
      }

      // Para procesamiento RAG completo, crear el job
      // Validar que tenemos todos los datos necesarios
      if (!analysis.fileId || !analysis.fileName) {
        throw new Error('Datos de análisis incompletos');
      }

      const requestBody = {
        fileId: analysis.fileId,
        fileName: analysis.fileName,
        courseId: selectedCourseId,
        userId: user.id,
        category: selectedCategory,
        materialId: materialId,
        ragProcessingType: ragProcessingType, // 'full'
        analysis: {
          totalPages: analysis.totalPages,
          pdfType: analysis.pdfType,
          estimatedCosts: {
            ...analysis.estimatedCosts.estimatedCosts,
            processingTime: (analysis.estimatedCosts as any).processingTime, // Incluir processingTime desde estimatedCosts
          },
        },
      };

      console.log('[FileProcessing] Creando job directamente en Supabase (evitando Cloud Function antigua)');

      // Importar createJob solo cuando se necesite
      const { createJob } = await import('@/services/firestoreService');

      const jobData = {
        courseId: selectedCourseId,
        sourceFileId: analysis.fileId,
        sourceFileName: analysis.fileName,
        jobType: 'split' as const,
        metadata: {
          userId: user.id,
          materialId: materialId,
          source: 'google_drive',
          driveFileId: analysis.fileId,
          ragProcessingType: ragProcessingType,
          totalPages: analysis.totalPages,
          pdfType: analysis.pdfType,
          estimatedCosts: {
            ...analysis.estimatedCosts.estimatedCosts,
            processingTime: (analysis.estimatedCosts as any).processingTime,
          },
        },
      };

      console.log('[FileProcessing] Datos del job a crear:', jobData);

      const newJobId = await createJob(jobData);

      // Simular estructura de respuesta para compatibilidad con código existente
      const data = {
        success: true,
        jobId: newJobId
      };

      console.log('[FileProcessing] Job creado exitosamente en tabla local:', newJobId);

      // Ya tenemos 'data' simulado arriba con el jobId

      if (!data.success) {
        throw new Error('Error en la creación del trabajo');
      }

      if (!data.jobId) {
        throw new Error('No se recibió el ID del job creado. El procesamiento puede no haberse iniciado correctamente.');
      }

      console.log(`[FileProcessing] ✅ Job creado exitosamente: ${data.jobId}`);
      setShowAnalysisModal(false);
      setAnalysis(null);
      setStatusMessage(`✅ Procesamiento iniciado correctamente. Job ID: ${data.jobId}`);

      // Limpiar jobs antiguos fallidos para el mismo archivo (opcional, no bloqueante)
      (async () => {
        try {
          const { getAllJobs } = await import('@/services/firestoreService');
          const allJobs = await getAllJobs(user.id);

          // Encontrar jobs antiguos fallidos para el mismo archivo
          const oldFailedJobs = allJobs.filter(j => {
            const jobFileId = j.sourceFileId || (j.metadata as any)?.sourceFileId;
            return jobFileId === analysis.fileId &&
              j.status === 'failed' &&
              j.id !== data.jobId &&
              j.errorMessage !== 'Cancelado por el usuario'; // No eliminar cancelados manualmente
          });

          // Eliminar jobs antiguos (máximo 1 a la vez para no sobrecargar)
          if (oldFailedJobs.length > 0) {
            console.log(`[FileProcessing] 🧹 Limpiando ${oldFailedJobs.length} job(s) antiguo(s) fallido(s) para el mismo archivo`);
            const oldestJob = oldFailedJobs.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateA - dateB; // Más antiguo primero
            })[0];

            // Eliminar solo el más antiguo
            const { error: deleteError } = await supabase
              .from('file_processing_jobs')
              .delete()
              .eq('id', oldestJob.id);

            if (deleteError) {
              console.warn('[FileProcessing] ⚠️ No se pudo eliminar job antiguo:', deleteError);
            } else {
              console.log(`[FileProcessing] ✅ Job antiguo eliminado: ${oldestJob.id}`);
            }
          }
        } catch (err) {
          console.warn('[FileProcessing] ⚠️ Error limpiando jobs antiguos (no crítico):', err);
        }
      })();

      // Forzar recarga de jobs después de un breve delay para asegurar que se haya guardado
      setTimeout(async () => {
        console.log('[FileProcessing] Forzando recarga de jobs después de crear job...');
        try {
          const { getAllJobs } = await import('@/services/firestoreService');
          const allJobs = await getAllJobs(user.id);
          console.log(`[FileProcessing] Jobs cargados manualmente: ${allJobs.length}`, allJobs);
          setJobs(allJobs);
        } catch (err) {
          console.error('[FileProcessing] Error recargando jobs:', err);
        }
      }, 2000);
    } catch (err: any) {
      console.error('[FileProcessing] ❌ Error procesando archivo:', err);
      const errorMessage = err.message || 'Error procesando archivo';
      setError(errorMessage);

      // Si el error es por falta de material, sugerir reintentar
      if (errorMessage.includes('material')) {
        setStatusMessage('⚠️ No se pudo crear el material. Por favor, verifica que el curso esté correcto e intenta nuevamente.');
      }
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

      {/* Mensaje de estado (éxito/info) */}
      {statusMessage && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="text-green-500 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-green-700">{statusMessage}</p>
                </div>
                <button
                  onClick={() => setStatusMessage(null)}
                  className="ml-4 text-green-500 hover:text-green-700 transition-colors"
                  title="Cerrar mensaje"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200 border-l-4 border-l-red-500">
          <div className="flex items-start space-x-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Error en el Procesamiento</h3>
                  <p className="text-red-700 mb-3 font-medium">{error}</p>
                  {/* Mensajes de ayuda según el tipo de error */}
                  {error.includes('conexión') || error.includes('conexion') || error.includes('network') ? (
                    <p className="text-sm text-red-600 mt-2">
                      💡 Verifica tu conexión a internet e intenta nuevamente.
                    </p>
                  ) : error.includes('Google Drive') || error.includes('Drive') ? (
                    <p className="text-sm text-red-600 mt-2">
                      💡 Asegúrate de tener acceso a Google Drive y que la API esté habilitada.
                    </p>
                  ) : error.includes('sesión') || error.includes('sesion') || error.includes('autenticación') ? (
                    <p className="text-sm text-red-600 mt-2">
                      💡 Tu sesión puede haber expirado. Por favor, recarga la página e inicia sesión nuevamente.
                    </p>
                  ) : error.includes('procesamiento') || error.includes('procesar') ? (
                    <p className="text-sm text-red-600 mt-2">
                      💡 El procesamiento falló. Puedes intentar nuevamente o contactar al administrador si el problema persiste.
                    </p>
                  ) : null}
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
                    href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=151821961684"
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

      {/* Advertencia para archivos grandes */}
      {folderId && (
        <Card className="mb-8 bg-amber-50 border-amber-200">
          <div className="flex items-start space-x-4">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                📚 ¿Tienes libros o documentos muy grandes?
              </h3>
              <p className="text-amber-700 mb-3">
                Para libros de texto o PDFs de más de 100MB (como manuales universitarios),
                te recomendamos usar nuestra <strong>herramienta de escritorio</strong> que procesa localmente
                y evita problemas de memoria en la nube.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://drive.google.com/uc?export=download&id=11XQJieebEoFqKMCPG_vNzEDh06YzFGos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Descargar EduSpark Desktop Uploader
                </a>
                <span className="text-amber-600 text-sm self-center">
                  (Ideal para PDFs de más de 100 páginas)
                </span>
              </div>
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
        <div className="w-full">
          {/* Lista de archivos - Ocupa todo el ancho disponible */}
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
                {files.filter(file => !hiddenFileIds.has(file.id)).map((file, fileIndex) => {
                  const isAnalyzing = analyzing === file.id;
                  // Buscar jobs que coincidan con el fileId (puede estar en sourceFileId o en metadata.sourceFileId)
                  let fileJobs = jobs.filter(j => {
                    const jobFileId = j.sourceFileId || (j.metadata as any)?.sourceFileId;
                    const matches = jobFileId === file.id;
                    // Log comentado para evitar spam en consola - solo usar para debugging específico
                    // if (matches) {
                    //   console.log(`[FileProcessing] ✅ Job encontrado para archivo ${file.id}:`, {
                    //     jobId: j.id,
                    //     status: j.status,
                    //     sourceFileId: j.sourceFileId,
                    //     metadataSourceFileId: (j.metadata as any)?.sourceFileId
                    //   });
                    // }
                    return matches;
                  });

                  // Filtrar jobs: mostrar solo el más relevante
                  // Prioridad: processing > pending > completed > failed (más reciente) > cancelled
                  if (fileJobs.length > 1) {
                    // Guardar el conteo original antes de filtrar
                    const originalCount = fileJobs.length;

                    // Ordenar por prioridad y fecha
                    fileJobs.sort((a, b) => {
                      // Prioridad de estados
                      const priorityOrder: Record<string, number> = {
                        'processing': 1,
                        'pending': 2,
                        'completed': 3,
                        'failed': 4,
                        'cancelled': 5
                      };

                      const priorityA = priorityOrder[a.status] || 99;
                      const priorityB = priorityOrder[b.status] || 99;

                      // Si tienen la misma prioridad, usar la fecha más reciente
                      if (priorityA === priorityB) {
                        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
                        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
                        return dateB - dateA; // Más reciente primero
                      }

                      return priorityA - priorityB; // Menor número = mayor prioridad
                    });

                    // Filtrar jobs cancelados explícitamente
                    const cancelledJobs = fileJobs.filter(j =>
                      j.status === 'cancelled' ||
                      (j.status === 'failed' && j.errorMessage === 'Cancelado por el usuario')
                    );

                    const activeJobs = fileJobs.filter(j =>
                      j.status !== 'cancelled' &&
                      !(j.status === 'failed' && j.errorMessage === 'Cancelado por el usuario')
                    );

                    // Si hay jobs activos, mostrar solo el más prioritario
                    if (activeJobs.length > 0) {
                      fileJobs = [activeJobs[0]]; // Solo el más prioritario
                    } else if (cancelledJobs.length > 0) {
                      // Si todos están cancelados, mostrar solo el más reciente
                      fileJobs = [cancelledJobs[0]];
                    } else {
                      // Fallback: mostrar solo el primero después de ordenar
                      fileJobs = [fileJobs[0]];
                    }

                    // Log comentado para evitar spam - solo usar para debugging específico
                    // console.log(`[FileProcessing] 🔍 Filtrado: 1 job mostrado de ${originalCount} total(es) para archivo ${file.name}`);
                  }
                  const hasJobs = fileJobs.length > 0;

                  // Debug: Log comentado para evitar spam - solo usar para debugging específico
                  // console.log(`[FileProcessing] 📄 Archivo ${file.name} (${file.id}):`, {
                  //   totalJobs: jobs.length,
                  //   fileJobs: fileJobs.length,
                  //   hasJobs,
                  //   fileJobsDetails: fileJobs.map(j => ({
                  //     id: j.id,
                  //     status: j.status,
                  //     sourceFileId: j.sourceFileId,
                  //     metadataSourceFileId: (j.metadata as any)?.sourceFileId
                  //   })),
                  //   allJobs: jobs.map(j => ({
                  //     id: j.id,
                  //     status: j.status,
                  //     sourceFileId: j.sourceFileId,
                  //     metadataSourceFileId: (j.metadata as any)?.sourceFileId,
                  //     fileName: j.sourceFileName
                  //   }))
                  // });
                  const isCompleted = fileJobs.length > 0 && fileJobs.every(j => j.status === 'completed');
                  const isAlreadyProcessed = processedFileIds.includes(file.id);
                  const canReanalyze = isCompleted || isAlreadyProcessed; // Permitir re-análisis solo si está completado

                  const thumbnailUrl = getThumbnailUrl(file.id, file.mimeType);
                  const isImage = file.mimeType.startsWith('image/');
                  const fileTypeLabel = getFileTypeLabel(file.mimeType);
                  // Mejorar detección de procesamiento para evitar jobs "colgados"
                  const isProcessing = fileJobs.some(j => {
                    // Considerar tanto 'processing' como 'pending' como estados de procesamiento
                    if (j.status !== 'processing' && j.status !== 'pending') return false;

                    // Verificar si el job lleva más de 2 horas sin actualizar (posiblemente colgado)
                    const updatedAt = j.updatedAt ? new Date(j.updatedAt) : new Date(j.createdAt);
                    const now = new Date();
                    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

                    // Si lleva más de 2 horas sin actualizar, considerarlo como "stuck"
                    if (hoursSinceUpdate > 2) {
                      console.warn(`⚠️ Job ${j.id} lleva ${hoursSinceUpdate.toFixed(1)} horas sin actualizar (posiblemente colgado)`);
                      // Aún así lo mostramos como procesando pero con advertencia
                      return true;
                    }
                    return true;
                  });

                  // Detectar si hay jobs "stuck" (más de 2 horas)
                  const hasStuckJob = fileJobs.some(j => {
                    if (j.status !== 'processing' && j.status !== 'pending') return false;
                    const updatedAt = j.updatedAt ? new Date(j.updatedAt) : new Date(j.createdAt);
                    const now = new Date();
                    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
                    return hoursSinceUpdate > 2;
                  });

                  const hasFailed = fileJobs.some(j => j.status === 'failed');

                  // Obtener el job principal para usar en los badges
                  const mainJobForBadge = fileJobs.length > 0 ? fileJobs[0] : null;

                  return (
                    <div
                      key={`file-${file.id}-${fileIndex}`}
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
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${hasStuckJob
                                    ? 'bg-orange-100 text-orange-800'
                                    : fileJobs.some(j => j.status === 'pending')
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {hasStuckJob ? (
                                      <>
                                        <AlertCircle className="w-3 h-3" />
                                        Detenido
                                      </>
                                    ) : fileJobs.some(j => j.status === 'pending') ? (
                                      <>
                                        <Clock className="w-3 h-3" />
                                        En cola
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3 animate-pulse" />
                                        Procesando
                                      </>
                                    )}
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

                            {/* Tarjeta de procesamiento - mostrar siempre que haya un job para este archivo */}
                            {hasJobs && (() => {
                              const mainJob = fileJobs[0]; // Usar directamente el primer job de fileJobs

                              if (!mainJob) {
                                console.warn(`[FileProcessing] ⚠️ hasJobs es true pero no hay mainJob para ${file.id}`);
                                return null;
                              }

                              // Log comentado para evitar spam en consola - solo usar para debugging específico
                              // console.log(`[FileProcessing] 🎯 Renderizando tarjeta de procesamiento para ${file.name}:`, {
                              //   jobId: mainJob.id,
                              //   status: mainJob.status,
                              //   hasJobs,
                              //   fileJobsCount: fileJobs.length
                              // });
                              // Obtener chunks desde metadata o desde el job directamente
                              const chunksProcessed = (mainJob?.metadata as any)?.chunksProcessed ||
                                (mainJob as any)?.chunksProcessed || 0;
                              const chunksTotal = (mainJob?.metadata as any)?.chunksTotal ||
                                (mainJob as any)?.chunksTotal;

                              // NUEVO: Obtener información de fase y progreso de páginas del worker VM
                              const phase = (mainJob?.metadata as any)?.phase || null;
                              const pagesProcessed = (mainJob?.metadata as any)?.pagesProcessed || 0;
                              const totalPages = (mainJob?.metadata as any)?.totalPages || 0;

                              // Log del progreso comentado para evitar spam en consola - solo usar para debugging específico
                              // if (chunksTotal && chunksTotal > 0) {
                              //   const progressPercent = Math.round((chunksProcessed / chunksTotal) * 100);
                              //   console.log(`[FileProcessing] 📊 Progreso de chunks para ${file.name}: ${chunksProcessed}/${chunksTotal} (${progressPercent}%)`, {
                              //     jobId: mainJob?.id,
                              //     status: mainJob?.status,
                              //     metadata: mainJob?.metadata
                              //   });
                              // }
                              // Detectar estado de procesamiento (incluyendo pending)
                              const isProcessingJob = mainJob?.status === 'processing' || mainJob?.status === 'pending';
                              // Usar las variables del scope externo para isCompleted y hasFailed
                              const isCompletedJob = mainJob?.status === 'completed';
                              const hasFailedJob = mainJob?.status === 'failed';

                              // Detectar si el job está "stuck" (más de 2 horas sin actualizar)
                              const isStuck = isProcessingJob && mainJob?.updatedAt && (() => {
                                const updatedAt = new Date(mainJob.updatedAt);
                                const now = new Date();
                                const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
                                return hoursSinceUpdate > 2;
                              })();

                              // Obtener tiempo estimado de diferentes posibles ubicaciones
                              const estimatedMinutes = mainJob?.metadata?.estimatedCosts?.processingTime?.estimatedMinutes ||
                                (mainJob?.metadata?.estimatedCosts as any)?.estimatedCosts?.processingTime?.estimatedMinutes ||
                                (mainJob?.metadata?.estimatedCosts?.processingTime?.estimatedHours
                                  ? mainJob.metadata.estimatedCosts.processingTime.estimatedHours * 60
                                  : undefined);

                              // Obtener startTime: usar startedAt si está disponible, sino usar createdAt
                              const startTime = mainJob?.startedAt || mainJob?.createdAt;

                              // Debug: Log comentado para evitar spam en consola - solo usar para debugging específico
                              // console.log(`[FileProcessing] Timer para ${file.name}:`, {
                              //   status: mainJob?.status,
                              //   isProcessingJob,
                              //   startTime,
                              //   startedAt: mainJob?.startedAt,
                              //   createdAt: mainJob?.createdAt,
                              //   estimatedMinutes,
                              //   chunksProcessed,
                              //   chunksTotal
                              // });

                              // Determinar etapa actual del procesamiento con más detalles
                              const getProcessingStage = () => {
                                if (!isProcessingJob) return null;

                                // Normalizar estado a minúsculas para comparación robusta
                                const jobStatus = (mainJob?.status || '').toLowerCase().trim();

                                // Debug: Log para diagnosticar el problema
                                console.log(`[ProcessingStage] ${file.name}:`, {
                                  status: mainJob?.status,
                                  statusNormalized: jobStatus,
                                  startedAt: mainJob?.startedAt,
                                  createdAt: mainJob?.createdAt,
                                  chunksProcessed,
                                  chunksTotal,
                                  isProcessingJob
                                });

                                // Si el job está en "pending", mostrar mensaje de espera
                                if (jobStatus === 'pending') {
                                  console.log(`[ProcessingStage] ✅ Job en pending, retornando mensaje de cola`);
                                  return '⏳ Esperando en cola de procesamiento...';
                                }

                                // Si el job está en "processing", mostrar etapas según progreso
                                if (jobStatus === 'processing') {
                                  // NUEVO: Usar la fase reportada por el worker VM si está disponible
                                  if (phase === 'extracting') {
                                    if (pagesProcessed > 0 && totalPages > 0) {
                                      const progress = Math.round((pagesProcessed / totalPages) * 100);
                                      return `📄 Extrayendo texto: ${pagesProcessed.toLocaleString()}/${totalPages.toLocaleString()} páginas (${progress}%)`;
                                    }
                                    return '📄 Extrayendo texto del PDF...';
                                  }

                                  // PDF grandes procesados con qpdf - mostrar progreso de chunks del PDF
                                  if (phase === 'extracting_chunks') {
                                    if (chunksProcessed > 0 && chunksTotal > 0) {
                                      const progress = Math.round((chunksProcessed / chunksTotal) * 100);
                                      return `📦 Procesando sección ${chunksProcessed}/${chunksTotal} del PDF (${progress}%)`;
                                    }
                                    return '📦 Dividiendo PDF en secciones...';
                                  }

                                  if (phase === 'embedding') {
                                    if (chunksProcessed > 0 && chunksTotal > 0) {
                                      const progress = Math.round((chunksProcessed / chunksTotal) * 100);
                                      return `🤖 Generando embeddings: ${chunksProcessed}/${chunksTotal} (${progress}%)`;
                                    }
                                    return '🤖 Preparando embeddings...';
                                  }

                                  // Fallback: Si no hay fase definida, usar lógica basada en tiempo/chunks
                                  if (!mainJob?.startedAt && chunksProcessed === 0) {
                                    return '🔄 Iniciando procesamiento...';
                                  }

                                  if (chunksProcessed === 0) {
                                    const startTime = mainJob.startedAt || mainJob.createdAt;
                                    if (startTime && mainJob.startedAt) {
                                      const elapsed = (new Date().getTime() - new Date(startTime).getTime()) / 1000 / 60;
                                      if (elapsed < 2) return '📥 Descargando archivo...';
                                      if (elapsed < 10) return '📄 Extrayendo texto del PDF...';
                                      return '⏳ Preparando chunks...';
                                    }
                                    return '🔄 Iniciando procesamiento...';
                                  }

                                  if (chunksTotal && chunksTotal > 0 && chunksProcessed > 0 && chunksProcessed < chunksTotal) {
                                    const progress = Math.round((chunksProcessed / chunksTotal) * 100);
                                    return `🤖 Generando embeddings: ${chunksProcessed}/${chunksTotal} (${progress}%)`;
                                  }

                                  if (chunksTotal && chunksTotal > 0 && chunksProcessed === 0) {
                                    return '⏳ Preparando chunks para embeddings...';
                                  }

                                  return '✅ Finalizando...';
                                }

                                console.warn(`[ProcessingStage] ⚠️ Estado desconocido: ${jobStatus}`);
                                return null;
                              };

                              const processingStage = getProcessingStage();

                              return (
                                <div className="space-y-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                                  {/* Estado del job con más detalles */}
                                  <div className="flex items-center justify-between">
                                    <div className={`flex items-center gap-2 ${isProcessingJob ? 'text-blue-700' : isCompletedJob ? 'text-green-700' : hasFailedJob ? 'text-red-700' : 'text-gray-600'}`}>
                                      <span className="font-semibold text-base">
                                        {isStuck ? '⚠️ Procesamiento Detenido' :
                                          mainJob?.status === 'processing' ? '🔄 Procesando' :
                                            mainJob?.status === 'pending' ? '⏳ Pendiente' :
                                              mainJob?.status === 'completed' ? '✅ Completado' :
                                                mainJob?.status === 'failed' ? '❌ Error' :
                                                  'Iniciando...'}
                                      </span>
                                      {isProcessingJob && !isStuck && <Loader2 className="w-5 h-5 animate-spin" />}
                                      {isStuck && <AlertCircle className="w-5 h-5 text-orange-500" />}
                                      {isCompletedJob && <CheckCircle2 className="w-5 h-5" />}
                                      {hasFailedJob && <XCircle className="w-5 h-5" />}
                                    </div>
                                  </div>

                                  {/* Mostrar progreso de sub-jobs si el archivo fue dividido */}
                                  {mainJob?.metadata?.subJobIds && mainJob?.metadata?.subJobsTotal > 0 && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-medium text-indigo-800">
                                          📄 Archivo dividido en {mainJob.metadata.subJobsTotal} partes
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-indigo-600 mb-1">
                                          <span>Partes procesadas</span>
                                          <span>{mainJob.metadata.subJobsCompleted || 0}/{mainJob.metadata.subJobsTotal} ({Math.round(((mainJob.metadata.subJobsCompleted || 0) / mainJob.metadata.subJobsTotal) * 100)}%)</span>
                                        </div>
                                        <div className="w-full bg-indigo-200 rounded-full h-2.5">
                                          <div
                                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${Math.round(((mainJob.metadata.subJobsCompleted || 0) / mainJob.metadata.subJobsTotal) * 100)}%` }}
                                          />
                                        </div>
                                        <p className="text-xs text-indigo-600 mt-1">
                                          Procesando partes en paralelo para optimizar el tiempo de procesamiento
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Advertencia si el job está stuck */}
                                  {isStuck && (
                                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-orange-800">⚠️ Procesamiento Detenido</p>
                                          <p className="text-xs text-orange-700 mt-1">
                                            El procesamiento lleva {(() => {
                                              const updatedAt = mainJob?.updatedAt ? new Date(mainJob.updatedAt) : new Date(mainJob?.createdAt || Date.now());
                                              const now = new Date();
                                              const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
                                              return `${hoursSinceUpdate.toFixed(1)} horas`;
                                            })()} sin actualizarse. Puede estar colgado o haber fallado silenciosamente.
                                          </p>
                                          <div className="flex gap-2 mt-2">
                                            <button
                                              onClick={() => {
                                                if (mainJob?.id) {
                                                  handleCancel(mainJob.id);
                                                }
                                              }}
                                              className="text-xs px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded border border-orange-300"
                                            >
                                              Cancelar
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (mainJob?.id) {
                                                  await handleForceProcess(mainJob.id);
                                                }
                                              }}
                                              className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-300"
                                              title="Forzar el procesamiento invocando directamente al RAG worker"
                                            >
                                              🔄 Forzar Procesamiento
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (mainJob?.id && file.id) {
                                                  if (confirm('¿Deseas reintentar el procesamiento de este archivo? Se cancelará el job actual y se creará uno nuevo.')) {
                                                    try {
                                                      // Cancelar el job actual
                                                      await handleCancel(mainJob.id);
                                                      // Esperar un momento y luego reiniciar
                                                      setTimeout(() => {
                                                        handleAnalyze(file);
                                                      }, 1000);
                                                    } catch (err: any) {
                                                      setError(err.message || 'Error al reintentar procesamiento');
                                                    }
                                                  }
                                                }
                                              }}
                                              className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300"
                                            >
                                              Reintentar
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Botón para forzar procesamiento si el job está en pending por más de 5 minutos */}
                                  {mainJob?.status === 'pending' && !isStuck && (() => {
                                    const createdAt = mainJob?.createdAt ? new Date(mainJob.createdAt) : null;
                                    if (!createdAt) return false;
                                    const now = new Date();
                                    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
                                    return minutesSinceCreation > 5; // Mostrar botón después de 5 minutos
                                  })() && (
                                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                        <div className="flex items-start gap-2">
                                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-yellow-800">⏳ Procesamiento en espera</p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                              El job lleva {(() => {
                                                const createdAt = mainJob?.createdAt ? new Date(mainJob.createdAt) : new Date();
                                                const now = new Date();
                                                const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
                                                return `${Math.round(minutesSinceCreation)} minutos`;
                                              })()} esperando en cola. Si parece estar atascado, puedes forzar el procesamiento.
                                            </p>
                                            <button
                                              onClick={async () => {
                                                if (mainJob?.id) {
                                                  await handleForceProcess(mainJob.id);
                                                }
                                              }}
                                              className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-300 mt-2 font-medium"
                                              title="Forzar el procesamiento invocando directamente al RAG worker"
                                            >
                                              🔄 Forzar Procesamiento
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                  {/* Mostrar error si el job falló */}
                                  {hasFailedJob && mainJob?.errorMessage && (
                                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                                      <div className="flex items-start gap-2">
                                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-red-800">❌ Error en el Procesamiento</p>
                                          <p className="text-xs text-red-700 mt-1">
                                            {mainJob.errorMessage || 'Ocurrió un error durante el procesamiento del archivo.'}
                                          </p>
                                          <div className="flex gap-2 mt-2">
                                            <button
                                              onClick={() => {
                                                if (mainJob?.id && file.id) {
                                                  handleDeleteFailed(mainJob.id, file.id);
                                                }
                                              }}
                                              className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300"
                                            >
                                              Eliminar
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (mainJob?.id && file.id) {
                                                  try {
                                                    // Eliminar el job fallido
                                                    await handleDeleteFailed(mainJob.id, file.id);
                                                    // Esperar un momento y luego reiniciar
                                                    setTimeout(() => {
                                                      handleAnalyze(file);
                                                    }, 1000);
                                                  } catch (err: any) {
                                                    setError(err.message || 'Error al reintentar procesamiento');
                                                  }
                                                }
                                              }}
                                              className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300"
                                            >
                                              Reintentar
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Etapa actual del procesamiento, barra de progreso y temporizador - todo en una sección */}
                                  {(processingStage || (chunksTotal !== undefined && chunksTotal > 0 && chunksProcessed > 0) || (isProcessingJob && startTime) || (!mainJob?.status || mainJob?.status === 'pending')) && (
                                    <div className="text-sm text-blue-700 bg-white rounded-lg px-3 py-2 border border-blue-300 shadow-sm">
                                      <div className="flex items-start justify-between gap-4">
                                        {/* Columna izquierda: Mensaje de etapa y barra de progreso */}
                                        <div className="flex-1">
                                          {/* Mensaje de etapa si existe, o "Iniciando..." si no hay processingStage pero el job está iniciando */}
                                          {processingStage ? (
                                            <div className="flex items-center gap-2 mb-2">
                                              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                              <div className="flex-1">
                                                <span className="font-semibold">{processingStage}</span>
                                                {chunksTotal && chunksTotal > 0 && chunksProcessed > 0 && (
                                                  <div className="text-xs text-blue-600 mt-1">
                                                    Velocidad: ~{Math.round(chunksProcessed / ((new Date().getTime() - new Date(mainJob.startedAt || mainJob.createdAt).getTime()) / 1000 / 60))} chunks/min
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ) : (!mainJob?.status || mainJob?.status === 'pending') ? (
                                            <div className="flex items-center gap-2 mb-2">
                                              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                              <div className="flex-1">
                                                <span className="font-semibold">Iniciando...</span>
                                              </div>
                                            </div>
                                          ) : null}

                                          {/* Barra de progreso visual - mostrar siempre que tengamos datos reales de chunks */}
                                          {chunksTotal !== undefined && chunksTotal > 0 && chunksProcessed > 0 && (
                                            <div className={(processingStage || (!mainJob?.status || mainJob?.status === 'pending')) ? 'mt-2' : ''}>
                                              <div className="flex justify-between text-sm mb-1">
                                                <span className={`font-medium ${isProcessingJob ? 'text-blue-700' : 'text-green-700'}`}>
                                                  {chunksProcessed} de {chunksTotal} chunks completados
                                                </span>
                                                <span className={`font-semibold ${isProcessingJob ? 'text-blue-700' : 'text-green-700'}`}>
                                                  {Math.round((chunksProcessed / chunksTotal) * 100)}%
                                                </span>
                                              </div>
                                              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                  className={`h-2.5 rounded-full transition-all duration-500 ease-out ${isProcessingJob
                                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                    : 'bg-gradient-to-r from-green-500 to-green-600'
                                                    }`}
                                                  style={{ width: `${Math.round((chunksProcessed / chunksTotal) * 100)}%` }}
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Columna derecha: Temporizador (solo Transcurrido) */}
                                        {(isProcessingJob || (!mainJob?.status || mainJob?.status === 'pending')) && mainJob && startTime && (
                                          <div className="flex-shrink-0">
                                            <ProcessingTimer
                                              startTime={startTime}
                                              isProcessing={isProcessingJob || (!mainJob?.status || mainJob?.status === 'pending')}
                                              estimatedMinutes={estimatedMinutes}
                                              chunksProcessed={chunksProcessed}
                                              chunksTotal={chunksTotal}
                                              jobStatus={mainJob?.status}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Mensaje de error si falló */}
                                  {hasFailedJob && mainJob?.errorMessage && (
                                    <div className="bg-red-50 border border-red-200 rounded p-2">
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-red-800">Error:</p>
                                          <p className="text-xs text-red-700 mt-1">{mainJob.errorMessage}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Mostrar tiempo estimado incluso si no está procesando y no hay startTime */}
                                  {!isProcessingJob && estimatedMinutes && !startTime && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded px-2 py-1 border border-blue-200">
                                      <Clock size={16} className="text-gray-500" />
                                      <span className="font-medium">Tiempo estimado: {
                                        estimatedMinutes >= 60
                                          ? `${Math.floor(estimatedMinutes / 60)}h ${Math.floor(estimatedMinutes % 60)}m`
                                          : `${Math.floor(estimatedMinutes)}m`
                                      }</span>
                                    </div>
                                  )}

                                  {/* Mensaje de completado con detalles */}
                                  {isCompletedJob && (
                                    <div className="bg-green-50 border border-green-200 rounded p-2">
                                      <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="font-semibold">Procesamiento completado exitosamente</span>
                                      </div>
                                      {chunksTotal && (
                                        <p className="text-xs text-green-600 mt-1 ml-7">
                                          {chunksTotal} chunks procesados y listos para usar en el Tutor RAG
                                        </p>
                                      )}
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
                          {/* Botones de acción */}
                          <div className="flex flex-col gap-2">
                            {/* Botón de cancelar para jobs en procesamiento - más visible */}
                            {isProcessing && fileJobs.length > 0 && (
                              <button
                                onClick={() => {
                                  const processingJob = fileJobs.find(j => j.status === 'processing' || j.status === 'pending');
                                  if (processingJob) {
                                    handleCancel(processingJob.id);
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 shadow-md"
                                title="Cancelar procesamiento (se perderá el progreso actual)"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Cancelar Procesamiento</span>
                              </button>
                            )}

                            {/* Botones para archivos fallidos */}
                            {hasFailed && fileJobs.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => {
                                    const failedJob = fileJobs.find(j => j.status === 'failed');
                                    if (failedJob) {
                                      handleDeleteFailed(failedJob.id, file.id);
                                    }
                                  }}
                                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm font-medium flex items-center justify-center space-x-2 shadow-md"
                                  title="Eliminar este procesamiento fallido permanentemente"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Eliminar Fallido</span>
                                </button>
                                <button
                                  onClick={() => handleHideFile(file.id)}
                                  className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs flex items-center justify-center space-x-1"
                                  title="Ocultar este archivo de la lista"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Ocultar</span>
                                </button>
                              </div>
                            )}
                          </div>
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
        onSaveWithoutProcessing={handleSaveWithoutProcessing}
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

export default FileProcessingPage;
