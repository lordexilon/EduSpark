/**
 * Página del Tutor Virtual Integrada
 * Integra el sistema de agentes de IA con el sistema principal de EduSpark
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAgentSystem } from "@/modules/tutor/hooks/useAgentSystem";
import { useCourseContext } from "@/modules/tutor/hooks/useCourseContext";
import { useAudioCapabilities } from "@/modules/tutor/hooks/useAudioCapabilities";
import { isGeminiApiConfigured } from "@/modules/tutor/utils/env";
import { CourseSelector } from "@/modules/tutor/components/CourseSelector";
import { PedagogicalSettings } from "@/modules/tutor/components/PedagogicalSettings";
import { TokenUsageDashboard } from "@/modules/tutor/components/TokenUsageDashboard";
import { CourseContentPanel } from "@/modules/tutor/components/CourseContentPanel";
import { tokenMonitoring } from "@/modules/tutor/services/tokenMonitoringService";
import { trackTutorInteraction, updateTutorInteractionRating } from '@/services/tutorTrackingService';
import { autoRateTutorResponse, scoreToRating } from '@/services/tutorAutoRatingService';
import { checkTutorCostLimit, trackTutorInteractionCost, getUserCostStats } from '@/services/tutorCostService';
import { IconArrowLeft, IconSettings, IconTrash2, IconDownload, IconRefreshCw, IconDollarSign, IconBookOpen } from '@/components/Common/Icons';
import { rateMessage, getMessageRating, removeRating } from '@/services/tutorRatingService';
import { MarkdownText } from '@/components/Common/MarkdownText';
import { AudioEnableModal } from '@/components/Features/AudioEnableModal';
import { checkAiEligibility, tutorLimitsService, type TutorLimits } from '@/services/tutorLimitsService';
import { ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import { InteractiveTutorial } from '@/components/Features/InteractiveTutorial';
import { useTutorial } from '@/hooks/useTutorial';
import { tutorAITutorial } from '@/config/tutorialConfigs';
import { comprehensiveReportService } from '@/services/comprehensiveReportService';

/** Metadatos de fragmentos RAG (material + página) para la UI del tutor */
type TutorSourceMeta = {
  title?: string;
  sourceFileName?: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  materialId?: string | null;
};

function dedupeTutorSourceMeta(items: TutorSourceMeta[]): TutorSourceMeta[] {
  const seen = new Set<string>();
  const out: TutorSourceMeta[] = [];
  for (const m of items) {
    const name = String(m.sourceFileName || m.title || '').trim();
    if (!name) continue;
    const ps = m.pageStart ?? '';
    const pe = m.pageEnd ?? '';
    const key = `${name}|${ps}|${pe}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

function formatTutorSourceLine(m: TutorSourceMeta): string {
  const name = (m.sourceFileName || m.title || 'Material').trim();
  const ps = m.pageStart;
  const pe = m.pageEnd;
  if (ps != null && pe != null && pe !== ps) return `${name} — págs. ${ps}–${pe}`;
  if (ps != null) return `${name} — pág. ${ps}`;
  return name;
}

const TutorVirtualPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showCourseSelector, setShowCourseSelector] = useState(true);
  const [showPedagogicalSettings, setShowPedagogicalSettings] = useState(false);
  const [showTokenDashboard, setShowTokenDashboard] = useState(false);
  const [showCourseContent, setShowCourseContent] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{ content: string, id: string } | null>(null);
  const [todayCost, setTodayCost] = useState(0);
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true); // Audio desactivado por defecto
  const [showSourcesFor, setShowSourcesFor] = useState<string | null>(null);
  const [highlightMaterialId, setHighlightMaterialId] = useState<string | undefined>(undefined);
  const [highlightType, setHighlightType] = useState<'material' | 'unit' | 'session' | undefined>(undefined);
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [useVoiceInput, setUseVoiceInput] = useState(false); // Audio desactivado por defecto
  const [cancelRequested, setCancelRequested] = useState(false); // Solicitud de cancelación
  const [showAudioEnableModal, setShowAudioEnableModal] = useState(false);
  const [audioEnabledOnce, setAudioEnabledOnce] = useState(false); // Rastrear si el usuario ya habilitó audio alguna vez

  // Estados para calificaciones de mensajes
  const [messageRatings, setMessageRatings] = useState<Map<string, boolean | null>>(new Map());
  const [loadingRatings, setLoadingRatings] = useState<Set<string>>(new Set());

  // Estados para calificación automática
  const [evaluatingMessages, setEvaluatingMessages] = useState<Set<string>>(new Set());
  const [autoRatings, setAutoRatings] = useState<Map<string, { score: number; quality: string }>>(new Map());

  // Estados para límites de tiempo
  const [tutorLimits, setTutorLimits] = useState<TutorLimits | null>(null);
  const [timeLimitReached, setTimeLimitReached] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Estados para control de presupuesto
  const [costLimitReached, setCostLimitReached] = useState(false);
  const [costStats, setCostStats] = useState<{
    monthlyCost: number;
    monthlyLimit: number;
    remainingBudget: number;
    monthlyProjection: number;
  } | null>(null);

  // Hooks del sistema de agentes
  const capabilities = useAudioCapabilities();
  const agentSystem = useAgentSystem(selectedCourseId);
  const courseContext = useCourseContext(selectedCourseId);

  // Referencias
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Clave curso+módulo usada para no duplicar init (ej. "12-no-module"). */
  const lastInitKeyRef = useRef<string>('');
  /** Último moduleId con el que se sincronizó el agente (UUID o ''); no mezclar con initKey. */
  const lastSyncedModuleIdRef = useRef<string>('');

  // Tutorial interactivo - se inicia automáticamente si es la primera vez
  const tutorial = useTutorial({
    tutorialId: 'tutor-ai',
    autoStart: true, // Iniciar automáticamente si no está completado y no marcó "no volver a mostrar"
    showOnFirstVisit: true
  });

  // Inicializar sistema de agentes cuando se selecciona un curso o cambia el módulo
  useEffect(() => {
    const debugInfo = {
      selectedCourseId,
      hasUser: !!user,
      userId: user?.id,
      isInitialized: agentSystem.isInitialized,
      isProcessing: agentSystem.isProcessing,
      selectedModuleId,
      lastInitKey: lastInitKeyRef.current,
      lastSyncedModuleId: lastSyncedModuleIdRef.current
    };
    console.log('🔄 useEffect inicialización:', debugInfo);

    if (!selectedCourseId) {
      if (import.meta.env.DEV) {
        console.debug('Tutor: sin curso aún; se muestra el selector (esperado en /tutor sin ?courseId=).');
      }
      return;
    }

    if (!user) {
      console.warn('⚠️ No hay usuario, no se puede inicializar el sistema');
      return;
    }

    // Solo reinicializar si el módulo cambió realmente (comparar UUIDs, no initKey)
    const moduleChanged = (selectedModuleId || '') !== (lastSyncedModuleIdRef.current || '');
    console.log('🔍 Verificando condiciones de inicialización:', {
      isInitialized: agentSystem.isInitialized,
      isProcessing: agentSystem.isProcessing,
      moduleChanged,
      lastSyncedModuleId: lastSyncedModuleIdRef.current,
      currentModuleId: selectedModuleId
    });

    // Si ya está inicializado pero cambió el módulo, reinicializar
    if (agentSystem.isInitialized && selectedModuleId && moduleChanged) {
      console.log('🔄 Módulo cambió, reinicializando sistema con moduleId:', selectedModuleId);
      lastSyncedModuleIdRef.current = selectedModuleId;
      lastInitKeyRef.current = `${selectedCourseId}-${selectedModuleId}`;
      agentSystem.initializeAgentSystem(user, selectedModuleId);
      return;
    }

    // Si no está inicializado Y no está procesando, inicializar
    if (!agentSystem.isInitialized && !agentSystem.isProcessing) {
      // Crear una clave única para identificar esta combinación curso+módulo
      const initKey = `${selectedCourseId}-${selectedModuleId || 'no-module'}`;
      const lastInitKey = lastInitKeyRef.current;

      // Inicializar si:
      // 1. Nunca se ha inicializado (lastInitKey está vacío)
      // 2. O el curso/módulo cambió (las claves son diferentes)
      const shouldInitialize = !lastInitKey || lastInitKey !== initKey;

      console.log('🔍 Evaluando inicialización:', {
        shouldInitialize,
        initKey,
        lastInitKey,
        isInitialized: agentSystem.isInitialized,
        isProcessing: agentSystem.isProcessing
      });

      if (shouldInitialize) {
        console.log('🚀 Iniciando inicialización del sistema de agentes...', {
          courseId: selectedCourseId,
          moduleId: selectedModuleId,
          userId: user.id,
          initKey
        });

        const initTimeout = setTimeout(() => {
          if (!agentSystem.isInitialized && agentSystem.isProcessing) {
            console.warn('⚠️ Timeout en inicialización del sistema de agentes, reintentando...');
            agentSystem.initializeAgentSystem(user, selectedModuleId);
          }
        }, 8000);

        // Helper para inicializar con contexto enriquecido
        const initAgentWithContext = async () => {
          try {
            const extraContext: any = {};
            // Intentar cargar datos del estudiante si es posible
            if (user?.id && selectedCourseId) {
              try {
                const report = await comprehensiveReportService.getStudentComprehensiveReport(
                  user.id,
                  parseInt(selectedCourseId)
                );
                if (report) {
                  extraContext.comprehensiveData = report;
                  console.log('✅ Contexto del estudiante cargado para el tutor:', {
                    progress: report.academicProgress.completionPercentage,
                    risk: report.insights.riskLevel
                  });
                }
              } catch (e) {
                console.warn('⚠️ No se pudo cargar el reporte comprehensivo para el tutor', e);
              }
            }

            await agentSystem.initializeAgentSystem(user, selectedModuleId, extraContext);
          } catch (error) {
            console.error('❌ Error en initAgentWithContext:', error);
            // IMPORTANTE: Resetear la clave si falló la inicialización para permitir reintentar
            lastInitKeyRef.current = '';
            lastSyncedModuleIdRef.current = '';
          }
        };

        // Guardar la clave de inicialización ANTES de llamar
        lastInitKeyRef.current = initKey;
        lastSyncedModuleIdRef.current = selectedModuleId || '';

        // Llamar a initializeAgentSystem con contexto
        console.log('📞 Llamando a initializeAgentSystem con contexto enriquecido...');
        initAgentWithContext().catch((error) => {
          console.error('❌ Error en initializeAgentSystem:', error);
          // Si falla, resetear la clave para permitir reintentar
          lastInitKeyRef.current = '';
          lastSyncedModuleIdRef.current = '';
          // Forzar actualización del componente
          setTimeout(() => {
            if (!agentSystem.isInitialized) {
              lastInitKeyRef.current = '';
              lastSyncedModuleIdRef.current = '';
            }
          }, 1000);
        });

        return () => {
          console.log('🧹 Limpiando timeout de inicialización');
          clearTimeout(initTimeout);
        };
      } else {
        console.log('⏭️ Ya inicializado para esta combinación curso/módulo, saltando:', { initKey, lastInitKey });
      }
    } else {
      console.log('⏸️ Sistema ya inicializado o procesando, no se inicializa:', {
        isInitialized: agentSystem.isInitialized,
        isProcessing: agentSystem.isProcessing
      });
    }
    // No incluir el objeto `agentSystem` entero: useAgentSystem devuelve un objeto nuevo cada render
    // y re-dispararía este efecto en bucle (spam de logs y trabajo innecesario).
  }, [
    selectedCourseId,
    selectedModuleId,
    user,
    agentSystem.isInitialized,
    agentSystem.isProcessing,
    agentSystem.initializeAgentSystem
  ]);

  // Usar useSearchParams para leer parámetros de query
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer courseId/moduleId desde querystring al cargar y cuando cambie
  useEffect(() => {
    // Intentar obtener courseId desde searchParams primero (React Router)
    let courseId = searchParams.get('courseId') || '';
    let moduleId = searchParams.get('moduleId') || '';

    // Si no se encuentra en searchParams, intentar desde hash (fallback para hash routing)
    if (!courseId && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const hashQs = new URLSearchParams(hash.split('?')[1] || '');
      courseId = hashQs.get('courseId') || '';
      moduleId = hashQs.get('moduleId') || '';
    }

    console.log('🔍 Leyendo courseId desde query params:', {
      courseId,
      moduleId,
      searchParams: searchParams.toString(),
      currentSelectedCourseId: selectedCourseId,
      initializedFromQuery
    });

    // Si hay un courseId diferente al actual, actualizarlo
    if (courseId && courseId !== selectedCourseId) {
      console.log('✅ Cambiando courseId de', selectedCourseId, 'a', courseId);
      // Resetear el sistema de inicialización para forzar nueva carga
      lastInitKeyRef.current = '';
      lastSyncedModuleIdRef.current = '';
      setSelectedCourseId(courseId);
      setShowCourseSelector(false);
      // Resetear initializedFromQuery para permitir que se ejecute el efecto de inicialización
      setInitializedFromQuery(false);
    } else if (!courseId && initializedFromQuery) {
      // Solo marcar como inicializado si ya procesamos la query antes
      return;
    }

    if (courseId && !initializedFromQuery) {
      console.log('✅ Estableciendo courseId inicial:', courseId);
      setSelectedCourseId(courseId);
      setShowCourseSelector(false);
      setInitializedFromQuery(true);
    } else if (!courseId) {
      // Si no hay courseId, asegurar que se muestre el selector
      console.log('⚠️ No hay courseId, mostrando selector');
      setShowCourseSelector(true);
      if (!initializedFromQuery) {
        setInitializedFromQuery(true);
      }
    }

    if (moduleId) {
      console.log('✅ Estableciendo moduleId:', moduleId);
      setSelectedModuleId(moduleId);
    }
  }, [searchParams, selectedCourseId]);

  // Auto-scroll del chat
  useEffect(() => {
    if (chatContainerRef.current) {
      // Usar setTimeout para asegurar que el DOM se haya actualizado
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          console.log('📜 Auto-scroll ejecutado:', {
            scrollTop: chatContainerRef.current.scrollTop,
            scrollHeight: chatContainerRef.current.scrollHeight,
            messagesCount: agentSystem.messages.length
          });
        }
      }, 100);
    }
  }, [agentSystem.messages, documentPreview]);

  // Registrar interacciones del tutor en la base de datos
  // Usar useRef para evitar registrar la misma interacción múltiples veces
  const trackedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const trackInteraction = async () => {
      // Solo registrar si hay mensajes y el último es del asistente
      if (
        agentSystem.messages.length === 0 ||
        !user?.id ||
        !selectedCourseId ||
        agentSystem.isProcessing
      ) {
        return;
      }

      const messages = agentSystem.messages;
      const lastMessage = messages[messages.length - 1];

      // Solo registrar si el último mensaje es del asistente y hay un mensaje previo del usuario
      if (lastMessage.role !== 'assistant' || messages.length < 2) {
        return;
      }

      const userMessage = messages[messages.length - 2];
      if (userMessage.role !== 'user') {
        return;
      }

      // Crear una clave única para esta interacción (basada en IDs de mensajes)
      const interactionKey = `${userMessage.id}-${lastMessage.id}`;

      // Evitar registrar la misma interacción múltiples veces
      if (trackedMessagesRef.current.has(interactionKey)) {
        return;
      }

      // Marcar como registrada antes de intentar guardar
      trackedMessagesRef.current.add(interactionKey);

      // Obtener información de tokens del último uso registrado
      const todayUsage = tokenMonitoring.getTodayUsage();
      const usageHistory = tokenMonitoring.getUsageHistory(1);

      // Calcular tokens y costo aproximados
      // Nota: Esto es una aproximación, idealmente deberíamos obtener los tokens reales del response
      const estimatedTokens = {
        inputTokens: Math.ceil(userMessage.text.length / 4), // Aproximación: 1 token ≈ 4 caracteres
        outputTokens: Math.ceil(lastMessage.text.length / 4),
        totalTokens: Math.ceil((userMessage.text.length + lastMessage.text.length) / 4),
        cost: 0, // Se calculará basado en el modelo
        model: 'gemini-1.5-flash', // Modelo por defecto
      };

      // Calcular costo
      const pricing = {
        input: 0.075,
        output: 0.30,
      };
      estimatedTokens.cost =
        (estimatedTokens.inputTokens / 1000000) * pricing.input +
        (estimatedTokens.outputTokens / 1000000) * pricing.output;

      // Calcular tiempo de respuesta (aproximado)
      const responseTime =
        lastMessage.timestamp && userMessage.timestamp
          ? lastMessage.timestamp.getTime() - userMessage.timestamp.getTime()
          : 0;

      try {
        // Obtener conversation_id si existe
        const conversationId = agentSystem.conversation?.id || undefined;

        // Detectar si la respuesta es de conocimiento general
        // (cuando RAG no encuentra información en el material del curso)
        const answerLower = lastMessage.text.toLowerCase();
        const answerText = lastMessage.text;

        // Detectar frases explícitas de "no encontrar"
        const hasExplicitNoFind =
          answerLower.includes('no encuentro') ||
          answerLower.includes('no se encuentra') ||
          answerLower.includes('no está en el material') ||
          answerLower.includes('no encuentro esa información') ||
          answerLower.includes('no está disponible en el material') ||
          answerLower.includes('no se encuentra información') ||
          answerLower.includes('no hay información') ||
          answerLower.includes('no se encuentra información específica') ||
          answerLower.includes('no se encuentra información detallada') ||
          answerLower.includes('no se encuentra información explícita') ||
          answerLower.includes('no se mencionan') ||
          answerLower.includes('no mencionan') ||
          answerLower.includes('no está mencionada') ||
          answerLower.includes('no están mencionadas') ||
          answerLower.includes('no se menciona') ||
          answerLower.includes('no menciona') ||
          answerLower.includes('no se menciona ninguna') ||
          answerLower.includes('no se menciona ninguna escala') ||
          answerLower.includes('lamento informarte') ||
          answerLower.includes('no se aborda') ||
          answerLower.includes('no se aborda este tema') ||
          answerLower.includes('no se aborda en el contenido') ||
          answerLower.includes('en el contenido actual, no se aborda') ||
          answerLower.includes('sin embargo, en el contenido actual') ||
          answerLower.includes('en los materiales específicos disponibles') ||
          answerLower.includes('según el material disponible') ||
          answerLower.includes('te sugiero consultar materiales adicionales') ||
          answerLower.includes('consultar materiales adicionales') ||
          answerLower.includes('consultar a tu instructor');

        // Detectar si NO tiene referencias a páginas o fuentes del material
        // Las respuestas de RAG normalmente incluyen: [📄 PÁGINAS X-Y | Fuente: ...]
        const hasPageReferences =
          answerText.includes('PÁGINAS') ||
          answerText.includes('PÁGINA') ||
          answerText.includes('[📄') ||
          answerText.includes('Fuente:') ||
          answerText.match(/página\s+\d+/i) !== null ||
          answerText.match(/páginas\s+\d+/i) !== null;

        // Detectar si es una respuesta muy completa pero sin referencias al material
        // Esto indica que es conocimiento general de Gemini
        const isLongCompleteAnswer = answerText.length > 500; // Respuesta larga y completa
        const hasNoMaterialReferences = !hasPageReferences && !answerLower.includes('material del curso') && !answerLower.includes('este curso');

        // Es conocimiento general si:
        // 1. Tiene frases explícitas de "no encontrar" O
        // 2. Es una respuesta completa pero sin referencias a páginas/fuentes del material
        const isGeneralKnowledge = hasExplicitNoFind || (isLongCompleteAnswer && hasNoMaterialReferences);

        const ragConfidence = isGeneralKnowledge ? 0.3 : 0.8;
        const responseSource: 'RAG' | 'GENERAL' | 'HYBRID' = isGeneralKnowledge ? 'GENERAL' : 'RAG';

        console.log('📊 Registrando interacción del tutor:', {
          studentId: user.id,
          courseId: selectedCourseId,
          questionLength: userMessage.text.length,
          answerLength: lastMessage.text.length,
          responseSource,
          ragConfidence,
        });

        const interaction = await trackTutorInteraction(
          user.id,
          selectedCourseId,
          userMessage.text,
          lastMessage.text,
          estimatedTokens,
          responseTime,
          conversationId,
          ragConfidence,
          responseSource
        );

        console.log('✅ Interacción registrada exitosamente');

        // NUEVO: Registrar costo de la interacción
        if (interaction && estimatedTokens.cost) {
          await trackTutorInteractionCost(
            user.id,
            estimatedTokens.cost,
            estimatedTokens.totalTokens
          );

          // Actualizar estadísticas de costo
          const stats = await getUserCostStats(user.id);
          if (stats) {
            setCostStats({
              monthlyCost: stats.monthlyCost,
              monthlyLimit: stats.monthlyLimit,
              remainingBudget: stats.remainingBudget,
              monthlyProjection: stats.monthlyProjection,
            });

            // Verificar si se alcanzó el límite
            if (stats.remainingBudget <= 0) {
              setCostLimitReached(true);
            }
          }
        }

        /* 
        // COMENTADO PARA AHORRAR COSTOS: Calificar automáticamente la respuesta
        // El usuario solicitó limitar el análisis a los viernes o un máximo de 5 veces.
        if (interaction && lastMessage.id) {
          setEvaluatingMessages((prev) => new Set(prev).add(lastMessage.id));

          try {
            const courseTitle = courseContext.course?.title || undefined;
            const ratingResult = await autoRateTutorResponse(
              userMessage.text,
              lastMessage.text,
              courseTitle
            );

            // Guardar calificación automática en la interacción
            if (interaction.id) {
              await updateTutorInteractionRating(interaction.id, ratingResult.score);
            }

            // Guardar rating automático en tutor_message_ratings para compatibilidad
            const autoRating = scoreToRating(ratingResult.score);
            if (lastMessage.id && user.id) {
              await rateMessage(lastMessage.id, user.id, autoRating);
            }

            // Actualizar estado local
            setAutoRatings((prev) => {
              const updated = new Map(prev);
              updated.set(lastMessage.id, {
                score: ratingResult.score,
                quality: ratingResult.quality,
              });
              return updated;
            });

            setMessageRatings((prev) => {
              const updated = new Map(prev);
              updated.set(lastMessage.id, autoRating);
              return updated;
            });

            console.log('✅ Respuesta calificada automáticamente (Desactivado para ahorrar):', {
              messageId: lastMessage.id,
              score: ratingResult.score,
              quality: ratingResult.quality,
              rating: autoRating ? 'thumbs up' : 'thumbs down',
            });
          } catch (error) {
            console.error('❌ Error en calificación automática:', error);
          } finally {
            setEvaluatingMessages((prev) => {
              const updated = new Set(prev);
              updated.delete(lastMessage.id);
              return updated;
            });
          }
        }
        */
      } catch (error) {
        // Si falla, remover de la lista para permitir reintentos
        trackedMessagesRef.current.delete(interactionKey);
        console.error('❌ Error tracking tutor interaction:', error);
        // No interrumpir el flujo si falla el tracking
      }
    };

    // Esperar un poco para asegurar que el mensaje se haya procesado completamente
    const timeoutId = setTimeout(trackInteraction, 1500);
    return () => clearTimeout(timeoutId);
  }, [agentSystem.messages, user?.id, selectedCourseId, agentSystem.isProcessing, agentSystem.conversation]);

  // Actualizar costo del día
  useEffect(() => {
    const updateCost = () => {
      const todayUsage = tokenMonitoring.getTodayUsage();
      setTodayCost(todayUsage.totalCost);
    };

    updateCost();
    const interval = setInterval(updateCost, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, [agentSystem.messages]); // Actualizar cuando hay nuevos mensajes

  // Cargar límites del tutor cuando el usuario está disponible
  useEffect(() => {
    const loadLimits = async () => {
      if (!user?.id) return;

      try {
        const limits = await tutorLimitsService.getEffectiveLimits(user.id);
        setTutorLimits(limits);
        setTimeLimitReached(limits.remainingTimeToday <= 0);

        // Iniciar sesión si no está iniciada
        if (!sessionStartTime) {
          setSessionStartTime(new Date());
        }

        // Actualizar isAudioMuted basado en si TTS está habilitado
        if (!limits.ttsEnabled && !isAudioMuted) {
          setIsAudioMuted(true);
        }

        console.log('📊 Límites del tutor cargados:', {
          ttsEnabled: limits.ttsEnabled,
          dailyLimit: limits.dailyTimeLimitMinutes,
          remaining: limits.remainingTimeToday,
          planType: limits.planType
        });
      } catch (err) {
        console.error('Error cargando límites del tutor:', err);
      }
    };

    loadLimits();
    // Actualizar límites cada minuto
    const interval = setInterval(loadLimits, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Cargar estadísticas de costo
  useEffect(() => {
    const loadCostStats = async () => {
      if (!user?.id) return;

      try {
        const stats = await getUserCostStats(user.id);
        if (stats) {
          setCostStats({
            monthlyCost: stats.monthlyCost,
            monthlyLimit: stats.monthlyLimit,
            remainingBudget: stats.remainingBudget,
            monthlyProjection: stats.monthlyProjection,
          });

          // Verificar si se alcanzó el límite
          if (stats.remainingBudget <= 0) {
            setCostLimitReached(true);
          }
        }
      } catch (err) {
        console.error('Error cargando estadísticas de costo:', err);
      }
    };

    loadCostStats();
    // Actualizar cada 5 minutos
    const interval = setInterval(loadCostStats, 300000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Registrar tiempo de uso después de cada interacción
  useEffect(() => {
    const trackUsageAfterMessage = async () => {
      if (!user?.id || agentSystem.messages.length === 0 || agentSystem.isProcessing) return;

      const lastMessage = agentSystem.messages[agentSystem.messages.length - 1];
      if (lastMessage.role !== 'assistant') return;

      // Calcular tiempo aproximado de la interacción
      const estimatedTime = tutorLimitsService.estimateInteractionTime(
        lastMessage.text.length,
        !isAudioMuted && tutorLimits?.ttsEnabled === true
      );

      try {
        const result = await tutorLimitsService.trackTimeUsage(
          user.id,
          estimatedTime,
          !isAudioMuted && tutorLimits?.ttsEnabled === true
        );

        if (result.limitExceeded) {
          setTimeLimitReached(true);
          console.warn('⚠️ Límite de tiempo alcanzado');
        } else {
          // Actualizar tiempo restante
          const newLimits = await tutorLimitsService.getEffectiveLimits(user.id);
          setTutorLimits(newLimits);
        }
      } catch (err) {
        console.error('Error registrando uso del tutor:', err);
      }
    };

    trackUsageAfterMessage();
  }, [agentSystem.messages.length, agentSystem.isProcessing]);

  // Manejar selección de curso
  const handleCourseSelect = useCallback((courseId: string) => {
    console.log('📚 Curso seleccionado:', courseId);
    // Resetear el estado de inicialización ANTES de cambiar el curso
    // para permitir que se inicialice nuevamente
    lastInitKeyRef.current = '';
    lastSyncedModuleIdRef.current = '';
    setSelectedCourseId(courseId);
    setShowCourseSelector(false);
  }, []);

  // Manejar envío de mensaje
  const handleSubmit = useCallback(async (e: React.FormEvent, directInput?: string) => {
    e.preventDefault();
    const userInput = directInput || inputValue;

    console.log('📤 handleSubmit llamado:', {
      userInput: userInput?.trim(),
      isProcessing: agentSystem.isProcessing,
      isInitialized: agentSystem.isInitialized,
      useVoiceInput,
      hasError: agentSystem.hasError,
      courseId: selectedCourseId,
      error: agentSystem.error
    });

    if (!userInput.trim()) {
      console.warn('⚠️ handleSubmit: Input vacío');
      return;
    }

    // Si está procesando, cancelar primero
    if (agentSystem.isProcessing) {
      console.log('⚠️ handleSubmit: Cancelando respuesta anterior...');
      agentSystem.cancelCurrentResponse();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!agentSystem.isInitialized) {
      console.error('❌ handleSubmit: Sistema no inicializado');
      alert('El Tutor Virtual no está inicializado. Por favor, selecciona un curso primero.');
      return;
    }

    const messageText = userInput.trim();
    setInputValue('');
    console.log('📨 Enviando mensaje al sistema de agentes...', {
      messageText,
      useVoiceInput,
      hasMicrophone: capabilities?.hasMicrophone,
      isMicrophoneMuted
    });

    try {
      // Verificar límite de costo antes de enviar mensaje
      if (user?.id) {
        const estimatedCost = 0.0003; // Estimación conservadora: ~$0.0003 por interacción
        // Usar el nuevo sistema de límites centralizado (RPC)
        const eligibility = await checkAiEligibility(user.id, undefined, estimatedCost);

        if (!eligibility.allowed) {
          setCostLimitReached(true);
          alert(`⚠️ Límite de IA alcanzado: ${eligibility.reason}\n\nPor favor, contacta a tu administrador.`);
          return;
        }

        // Actualizar estadísticas de costo (visual legacy, el RPC ya controla el límite duro)
        const stats = await getUserCostStats(user.id);
        if (stats) {
          setCostStats({
            monthlyCost: stats.monthlyCost,
            monthlyLimit: stats.monthlyLimit,
            remainingBudget: stats.remainingBudget,
            monthlyProjection: stats.monthlyProjection,
          });
        }
      }

      // Si hay texto en el input, siempre usar ese texto (incluso si useVoiceInput está activado)
      // useVoiceInput solo se usa cuando NO hay texto (solo voz)
      if (messageText && messageText.trim()) {
        console.log('📝 Enviando mensaje de texto:', messageText.substring(0, 50));
        await agentSystem.sendMessage(messageText);
      } else if (useVoiceInput && capabilities?.hasMicrophone && !isMicrophoneMuted) {
        // Solo usar voz si NO hay texto en el input
        console.log('🎤 Usando entrada de voz (sin texto en input)...');
        setIsListening(true);
        try {
          await agentSystem.sendVoiceMessage();
        } catch (voiceError) {
          console.error('❌ Error en reconocimiento de voz:', voiceError);
          // Si falla el reconocimiento de voz, mostrar error pero no bloquear
          alert('Error en el reconocimiento de voz. Por favor, escribe tu mensaje en el campo de texto.');
        } finally {
          setIsListening(false);
        }
      } else {
        // Si no hay texto ni voz disponible, no hacer nada
        console.warn('⚠️ No hay texto ni voz disponible para enviar');
        return;
      }
      console.log('✅ Mensaje enviado exitosamente');
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      alert('Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
    }
  }, [inputValue, agentSystem, selectedCourseId, useVoiceInput, capabilities, isMicrophoneMuted]);

  // Manejar mensaje de voz
  const handleVoiceMessage = useCallback(async () => {
    // Si hay una respuesta en curso, cancelarla primero
    if (agentSystem.isProcessing) {
      agentSystem.cancelCurrentResponse();
      // Esperar un momento antes de iniciar escucha
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    try {
      setIsListening(true);
      await agentSystem.sendVoiceMessage();
    } catch (error) {
      console.error('Error en mensaje de voz:', error);
    } finally {
      setIsListening(false);
    }
  }, [agentSystem]);

  // Toggle microfono mute
  const toggleMicrophoneMute = useCallback(() => {
    setIsMicrophoneMuted(prev => !prev);
    if (isListening) {
      setIsListening(false);
    }
  }, [isListening]);

  // Toggle audio mute
  const toggleAudioMute = useCallback(() => {
    setIsAudioMuted(prev => {
      const newMuted = !prev;
      // Actualizar el coordinador para que no genere audio
      agentSystem.setAudioMuted(newMuted);
      return newMuted;
    });
  }, [agentSystem]);

  // Manejar archivo adjunto
  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    const MAX_FILE_SIZE = 35 * 1024 * 1024; // 35MB
    if (file.size > MAX_FILE_SIZE) {
      alert("El archivo es demasiado grande. El tamaño máximo es de 35 MB.");
      return;
    }

    setIsProcessingFile(true);
    // Aquí se implementaría el procesamiento de archivos
    setTimeout(() => {
      setIsProcessingFile(false);
      console.log('File processed:', file.name);
    }, 2000);
  };

  // Manejar configuración pedagógica
  const handlePedagogicalSettingsSave = useCallback(async (settings: any) => {
    return await courseContext.updatePedagogicalSettings(settings);
  }, [courseContext.updatePedagogicalSettings]);

  // Cargar ratings existentes cuando cambian los mensajes
  useEffect(() => {
    const loadRatings = async () => {
      if (!user?.id || agentSystem.messages.length === 0) return;

      const assistantMessages = agentSystem.messages.filter((m) => m.role === 'assistant');
      const newRatings = new Map<string, boolean | null>();

      // Obtener los IDs de mensajes actuales para comparar
      const currentMessageIds = new Set(assistantMessages.map((m) => m.id));

      for (const message of assistantMessages) {
        try {
          const rating = await getMessageRating(message.id, user.id);
          if (rating !== null) {
            newRatings.set(message.id, rating);
          }
        } catch (error) {
          console.error('Error loading rating for message:', message.id, error);
        }
      }

      if (newRatings.size > 0) {
        setMessageRatings((prev) => {
          const updated = new Map(prev);
          // Solo actualizar ratings para mensajes actuales
          newRatings.forEach((value, key) => {
            if (currentMessageIds.has(key)) {
              updated.set(key, value);
            }
          });
          return updated;
        });
      }
    };

    loadRatings();
  }, [agentSystem.messages, user?.id]);

  // Función para manejar calificación de mensaje
  const handleRateMessage = useCallback(
    async (messageId: string, rating: boolean) => {
      if (!user?.id) return;

      // Optimistic update
      const currentRating = messageRatings.get(messageId);
      setMessageRatings((prev) => {
        const updated = new Map(prev);
        // Si ya está calificado con el mismo rating, descalificar (toggle)
        if (currentRating === rating) {
          updated.set(messageId, null);
        } else {
          updated.set(messageId, rating);
        }
        return updated;
      });

      setLoadingRatings((prev) => new Set(prev).add(messageId));

      try {
        // Si estaba calificado con el mismo rating, eliminar (descalificar)
        if (currentRating === rating) {
          await removeRating(messageId, user.id);
          console.log('✅ Rating eliminado (descalificado):', { messageId });
        } else {
          // Guardar rating (o actualizar si ya existe)
          await rateMessage(messageId, user.id, rating);
          console.log('✅ Rating guardado:', { messageId, rating: rating ? 'thumbs up' : 'thumbs down' });
        }
      } catch (error) {
        console.error('Error guardando/eliminando rating:', error);
        // Revertir cambio optimista
        setMessageRatings((prev) => {
          const updated = new Map(prev);
          updated.set(messageId, currentRating);
          return updated;
        });
      } finally {
        setLoadingRatings((prev) => {
          const updated = new Set(prev);
          updated.delete(messageId);
          return updated;
        });
      }
    },
    [user?.id, messageRatings]
  );

  // Renderizar selector de curso

  if (showCourseSelector) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-surface rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <IconArrowLeft className="w-5 h-5 text-text-light" />
                </button>
                <h1 className="text-3xl font-bold text-text-dark">Tutor Virtual IA</h1>
              </div>
              <div className="text-text-light opacity-70">
                Selecciona un curso para comenzar
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div data-tutorial="course-selector" className="flex-1">
                <CourseSelector
                  selectedCourseId={selectedCourseId}
                  onCourseSelect={handleCourseSelect}
                  isLoading={agentSystem.isProcessing}
                />
              </div>
              <button
                onClick={tutorial.startTutorial}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors ml-4"
                title="Iniciar tutorial interactivo"
              >
                <HelpCircle size={16} />
                Tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verificar si hay API key configurada (VITE_GEMINI_API_KEY / GEMINI_API_KEY)
  if (!isGeminiApiConfigured()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h1 className="text-3xl font-bold text-text-dark mb-4">Tutor Virtual IA</h1>
            <p className="text-text-light opacity-70 mb-6">
              Para usar el Tutor Virtual, necesitas configurar tu API key de Google Gemini.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">Configuración requerida:</h3>
              <p className="text-sm text-yellow-700">
                1. Obtén tu API key de <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a><br />
                2. Agrega <code className="bg-yellow-100 px-2 py-1 rounded">VITE_GEMINI_API_KEY=tu_api_key</code> (o <code className="bg-yellow-100 px-2 py-1 rounded">GEMINI_API_KEY</code>) a tu archivo .env
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  console.log('🔄 Forzando recarga completa...');
                  if ((window as any).forceReload) {
                    (window as any).forceReload();
                  } else {
                    window.location.reload();
                  }
                }}
                className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
              >
                🔄 Recarga Completa (Forzada)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar interfaz principal del tutor
  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col w-full h-full">
        <div className="bg-background flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 sm:p-4 md:p-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Volver"
                >
                  <IconArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Tutor Virtual IA</h1>
                  {selectedCourseId && (
                    <p className="text-blue-100 text-xs sm:text-sm truncate">
                      {courseContext.courseContext?.title || (selectedCourseId ? 'Cargando curso...' : 'Cargando...')}
                    </p>
                  )}
                  {user?.role?.name !== 'student' && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-blue-100 text-xs">Costo hoy:</span>
                      <span className="text-yellow-200 text-xs font-medium">
                        ${todayCost.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {/* Indicador de tiempo restante */}
                  {tutorLimits && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-blue-100 text-xs">⏱️</span>
                      <span className={`text-xs font-medium ${tutorLimits.remainingTimeToday <= 10
                        ? 'text-red-300'
                        : tutorLimits.remainingTimeToday <= 30
                          ? 'text-yellow-200'
                          : 'text-green-200'
                        }`}>
                        Disponible: {tutorLimits.dailyTimeLimitMinutes}min | Restante: {Math.round(tutorLimits.remainingTimeToday)}min
                      </span>
                      {!tutorLimits.ttsEnabled && (
                        <span className="text-blue-200 text-xs">(Solo texto)</span>
                      )}
                    </div>
                  )}
                  {/* Indicador de presupuesto mensual */}
                  {costStats && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-blue-100 text-xs">💰</span>
                      <span className={`text-xs font-medium ${costStats.remainingBudget <= costStats.monthlyLimit * 0.1
                        ? 'text-red-300'
                        : costStats.remainingBudget <= costStats.monthlyLimit * 0.3
                          ? 'text-yellow-200'
                          : 'text-green-200'
                        }`}>
                        Presupuesto: ${costStats.monthlyCost.toFixed(4)} / ${costStats.monthlyLimit.toFixed(2)} (Restante: ${costStats.remainingBudget.toFixed(2)})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {/* Botones principales - siempre visibles */}
                <button
                  onClick={() => setShowCourseContent(true)}
                  className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="Ver contenido del curso"
                >
                  <IconBookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Botón de audio - solo si TTS está habilitado para la institución */}
                {tutorLimits?.ttsEnabled && (
                  <button
                    onClick={() => {
                      // Si el usuario intenta activar el audio y no lo ha habilitado antes, mostrar modal
                      if (isAudioMuted && !audioEnabledOnce) {
                        setShowAudioEnableModal(true);
                      } else {
                        toggleAudioMute();
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${isAudioMuted
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'hover:bg-white/20'
                      }`}
                    title={isAudioMuted ? 'Activar audio' : 'Silenciar audio'}
                  >
                    <span className="text-sm sm:text-base">{isAudioMuted ? '🔇' : '🔊'}</span>
                  </button>
                )}

                {/* Botones secundarios - ocultos en mobile */}
                {user?.role?.name === 'teacher' && (
                  <button
                    onClick={() => setShowPedagogicalSettings(!showPedagogicalSettings)}
                    className="hidden sm:block p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Configuración pedagógica"
                    data-tutorial="settings-button"
                  >
                    <IconSettings className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}

                <button
                  onClick={() => setShowCourseSelector(true)}
                  className="hidden sm:block p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Cambiar curso"
                >
                  <IconRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {user?.role?.name !== 'student' && (
                  <button
                    onClick={() => setShowTokenDashboard(true)}
                    className="hidden sm:block p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                    title="Monitoreo de tokens y costos"
                  >
                    <IconDollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}

                {/* Botones de acciones - menú móvil */}
                <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={agentSystem.exportConversation}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Exportar chat"
                  >
                    <IconDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button
                    onClick={agentSystem.clearConversation}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Limpiar chat"
                  >
                    <IconTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Botón de recarga - solo en emergencias */}
                <button
                  onClick={() => {
                    console.log('🚨 Recarga de emergencia del Tutor Virtual...');
                    if ((window as any).forceReload) {
                      (window as any).forceReload();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="hidden md:block p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Recarga de emergencia"
                >
                  <span className="text-sm">🔄</span>
                </button>
              </div>
            </div>
          </div>

          {/* Panel de configuración pedagógica */}
          {showPedagogicalSettings && user?.role?.name === 'teacher' && (
            <div className="p-3 sm:p-4 md:p-6 border-b border-border flex-shrink-0 max-h-96 overflow-y-auto bg-surface">
              <PedagogicalSettings
                courseId={selectedCourseId}
                initialSettings={courseContext.pedagogicalSettings}
                onSave={handlePedagogicalSettingsSave}
                isLoading={courseContext.isLoading}
              />
            </div>
          )}

          {/* Chat Container - Área principal flexible */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 min-h-0" ref={chatContainerRef} data-tutorial="response-area">
            {/* Mensaje de advertencia si no hay curso seleccionado */}
            {!selectedCourseId && (
              <div className="flex justify-center px-2">
                <div className="max-w-xl w-full p-3 sm:p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
                  <p className="text-yellow-800 font-medium text-sm sm:text-base">⚠️ Por favor, selecciona un curso para comenzar</p>
                  <p className="text-yellow-600 text-xs sm:text-sm mt-1">Usa el botón de contenido del curso (📖) en la parte superior para seleccionar un curso.</p>
                </div>
              </div>
            )}

            {/* Mensaje de advertencia si el sistema no está inicializado */}
            {selectedCourseId && !agentSystem.isInitialized && !agentSystem.isProcessing && (
              <div className="flex justify-center px-2">
                <div className="max-w-xl w-full p-4 sm:p-5 rounded-2xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⏳</span>
                    <p className="text-blue-800 font-semibold text-sm sm:text-base">Inicializando Tutor Virtual...</p>
                  </div>
                  <p className="text-blue-600 text-xs sm:text-sm mb-4">Por favor espera mientras se carga el sistema. Esto puede tomar unos segundos.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        console.log('🔄 Reintentando inicialización manual...');
                        lastInitKeyRef.current = '';
                        lastSyncedModuleIdRef.current = '';
                        agentSystem.initializeAgentSystem(user, selectedModuleId);
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      Reintentar conexión
                    </button>
                    <button
                      onClick={() => setShowCourseSelector(true)}
                      className="px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-xs font-medium"
                    >
                      Cambiar curso
                    </button>
                  </div>
                </div>
              </div>
            )}

            {agentSystem.messages.length === 0 && agentSystem.isInitialized && (
              <div className="flex justify-center px-2">
                <div className="max-w-xl w-full p-3 sm:p-4 rounded-2xl bg-surface border border-border">
                  <p className="text-text-dark font-medium text-sm sm:text-base text-center">
                    👋 ¡Hola! Soy tu Tutor Virtual. ¿En qué puedo ayudarte hoy?
                  </p>
                </div>
              </div>
            )}

            {agentSystem.messages.map((message) => {
              // Debug: verificar que los mensajes se están renderizando
              if (message.role === 'user') {
                console.log('👤 Renderizando mensaje del usuario:', { id: message.id, text: message.text.substring(0, 50) });
              }

              return (
                <div
                  key={message.id}
                  className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  style={{ minHeight: 'auto' }} // Asegurar que el mensaje tenga altura
                >
                  <div
                    className={`max-w-[85%] sm:max-w-xl p-3 sm:p-4 rounded-2xl ${message.role === 'user'
                      ? 'bg-primary text-white rounded-br-none shadow-lg shadow-primary/20'
                      : 'bg-surface text-text-dark rounded-bl-none border border-border shadow-sm'
                      }`}
                    style={{
                      display: 'block', // Asegurar que sea visible
                      visibility: 'visible', // Asegurar visibilidad
                      opacity: 1 // Asegurar opacidad completa
                    }}
                  >
                    {message.role === 'user' ? (
                      <p
                        className="whitespace-pre-wrap text-sm sm:text-base break-words"
                        style={{
                          color: 'white', // Asegurar color blanco para mensajes del usuario
                          fontWeight: 'normal'
                        }}
                      >
                        {message.text || '(mensaje vacío)'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <MarkdownText
                          text={message.text}
                          className="prose prose-sm sm:prose-base max-w-none text-sm sm:text-base leading-relaxed"
                        />
                        {(() => {
                          const meta = message.metadata?.sourceMetadata as TutorSourceMeta[] | undefined;
                          const srcStrings = message.metadata?.sources;
                          const structured =
                            Array.isArray(meta) &&
                            meta.length > 0 &&
                            meta.some((m) => m && (m.sourceFileName || m.title));
                          const stringFallback =
                            !structured &&
                            Array.isArray(srcStrings) &&
                            srcStrings.length > 0 &&
                            typeof srcStrings[0] === 'string';
                          if (!structured && !stringFallback) return null;
                          return (
                            <div
                              className="mt-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs sm:text-sm text-text-light"
                              data-tutorial="tutor-source-summary"
                            >
                              <p className="font-semibold text-text-dark mb-1.5">
                                {structured
                                  ? 'Información según estos materiales (páginas de los fragmentos usados)'
                                  : 'Referencias asociadas a la búsqueda'}
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-text-dark/90">
                                {structured
                                  ? dedupeTutorSourceMeta(meta)
                                      .slice(0, 15)
                                      .map((m, idx) => (
                                        <li key={`sm-${idx}-${formatTutorSourceLine(m)}`}>
                                          {formatTutorSourceLine(m)}
                                        </li>
                                      ))
                                  : (srcStrings as string[])
                                      .slice(0, 15)
                                      .map((line, idx) => (
                                        <li key={`ss-${idx}-${line.slice(0, 24)}`}>{line}</li>
                                      ))}
                              </ul>
                              {structured && meta.length > 15 && (
                                <p className="mt-1 text-[10px] sm:text-xs opacity-70">
                                  Mostrando 15 de {meta.length} fragmentos; el resto en «Fuentes».
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {/* Timestamp para debug - solo en desarrollo y con menor opacidad */}
                    {process.env.NODE_ENV === 'development' && message.timestamp && (
                      <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`} style={{ opacity: 0.6 }}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                    {/* Indicador de evaluación automática (solo metadata interna, no reemplaza calificación del usuario) */}
                    {message.role === 'assistant' && process.env.NODE_ENV === 'development' && (
                      <div className="mt-2 flex items-center gap-2">
                        {evaluatingMessages.has(message.id) ? (
                          <div className="flex items-center gap-2 text-xs text-blue-600">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            <span>Evaluando respuesta...</span>
                          </div>
                        ) : autoRatings.has(message.id) ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="px-2 py-1 rounded bg-gray-100">
                              [Auto] {autoRatings.get(message.id)?.score}/100
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {/* Fuentes */}
                    {message.role === 'assistant' && Array.isArray(message.metadata?.sources) && message.metadata.sources.length > 0 && (
                      <div className="mt-2">
                        <button
                          className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded transition-colors text-text-light"
                          onClick={() => setShowSourcesFor(showSourcesFor === message.id ? null : message.id)}
                          data-tutorial="sources-button"
                        >
                          Fuentes ({message.metadata.sources.length})
                        </button>
                        {showSourcesFor === message.id && (
                          <div className="mt-2 bg-surface rounded border border-border p-2 text-xs text-text-light">
                            <ul className="space-y-2">
                              {message.metadata.sources.map((s: any, srcIdx: number) => {
                                if (typeof s === 'string') {
                                  return (
                                    <li
                                      key={`src-str-${message.id}-${srcIdx}`}
                                      className="p-2 bg-gray-50 rounded text-text-dark text-xs sm:text-sm"
                                    >
                                      {s}
                                    </li>
                                  );
                                }
                                const getTypeLabel = (type: string) => {
                                  switch (type) {
                                    case 'unit': return '📚 Unidad';
                                    case 'session': return '📹 Sesión';
                                    case 'material': return '📄 Material';
                                    case 'course': return '🎓 Curso';
                                    default: return '📋 Recurso';
                                  }
                                };

                                return (
                                  <li key={s.id ?? `obj-${srcIdx}`} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="text-text-light opacity-60 font-medium">{getTypeLabel(s.type || 'material')}</span>
                                      </div>
                                      <span className="font-bold text-text-dark block truncate">{s.title || `Recurso #${s.id}`}</span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {s.unitId && (
                                          <a
                                            href={`/courses/${selectedCourseId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-0.5 bg-blue-50 rounded"
                                            title="Abrir unidad en nueva pestaña"
                                          >
                                            📚 Ver Unidad
                                          </a>
                                        )}
                                        {s.sessionId && (
                                          <a
                                            href={`/session/${s.sessionId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-0.5 bg-blue-50 rounded"
                                            title="Abrir sesión en nueva pestaña"
                                          >
                                            📹 Ver Sesión
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {s.url ? (
                                        <a
                                          href={s.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50"
                                          title="Abrir enlace externo"
                                        >
                                          Abrir
                                        </a>
                                      ) : (
                                        <button
                                          className="text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50"
                                          onClick={() => {
                                            setShowCourseContent(true);
                                            // Extraer el ID original si está en formato "type-id"
                                            const contentId = s.id?.includes('-') ? s.id.split('-')[1] : s.id;
                                            setHighlightMaterialId(contentId);
                                            // Establecer el tipo de contenido
                                            const contentType = s.type === 'unit' ? 'unit' : s.type === 'session' ? 'session' : 'material';
                                            setHighlightType(contentType);
                                          }}
                                          title="Ver en panel de contenido"
                                        >
                                          Ver
                                        </button>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadatos de confianza */}
                    {message.metadata?.confidence && (
                      <div className="mt-2 text-xs opacity-75">
                        Confianza: {Math.round(message.metadata.confidence * 100)}%
                      </div>
                    )}

                    {/* Truncado: permitir continuar */}
                    {message.role === 'assistant' && message.metadata?.truncated && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            const hint = message.metadata?.continuationHint || '';
                            const continuePrompt = `continúa desde: ${hint}`;
                            agentSystem.sendMessage(continuePrompt);
                          }}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Continuar
                        </button>
                        <span className="text-xs text-text-light opacity-60">La respuesta se cortó por límite de tokens</span>
                      </div>
                    )}

                    {/* Mensaje de advertencia para calificar - Siempre visible hasta que se califique */}
                    {message.role === 'assistant' && messageRatings.get(message.id) === undefined && (
                      <div className="mt-3 pt-2 border-t border-yellow-500/20">
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-yellow-500/5 border border-yellow-500/30 rounded-lg mb-2 shadow-sm">
                          <HelpCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 animate-pulse" />
                          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                            ⚠️ Por favor, evalúa esta respuesta (positiva o negativa) para ayudarnos a mejorar el tutor:
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Botones de calificación (pulgares arriba/abajo) - Mejorados */}
                    {message.role === 'assistant' && (
                      <div className={`${messageRatings.get(message.id) === undefined ? 'mt-0' : 'mt-3'} pt-2 border-t border-border flex items-center justify-end gap-2`} data-tutorial="rating-buttons">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRateMessage(message.id, true);
                          }}
                          disabled={loadingRatings.has(message.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${messageRatings.get(message.id) === true
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-800'
                            : 'text-text-light hover:text-green-600 hover:bg-background border border-border'
                            } ${loadingRatings.has(message.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title="Útil - La respuesta fue útil"
                          aria-label="Calificar como útil"
                        >
                          <ThumbsUp className={`w-4 h-4 ${messageRatings.get(message.id) === true ? 'text-green-700' : 'text-text-light'}`} strokeWidth={2.5} />
                          <span className="text-xs font-medium">Útil</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRateMessage(message.id, false);
                          }}
                          disabled={loadingRatings.has(message.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${messageRatings.get(message.id) === false
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-800'
                            : 'text-text-light hover:text-red-600 hover:bg-background border border-border'
                            } ${loadingRatings.has(message.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title="No útil - La respuesta no fue útil"
                          aria-label="Calificar como no útil"
                        >
                          <ThumbsDown className={`w-4 h-4 ${messageRatings.get(message.id) === false ? 'text-red-700' : 'text-text-light'}`} strokeWidth={2.5} />
                          <span className="text-xs font-medium">No útil</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Debug: mostrar información de mensajes en desarrollo */}
            {process.env.NODE_ENV === 'development' && agentSystem.messages.length > 0 && (
              <div className="text-xs text-text-light opacity-50 p-2 border-t border-border mt-4 bg-background/50 rounded">
                <p className="font-semibold">Debug Info:</p>
                <p>Total mensajes: {agentSystem.messages.length}</p>
                <p>Mensajes usuario: {agentSystem.messages.filter(m => m.role === 'user').length}</p>
                <p>Mensajes asistente: {agentSystem.messages.filter(m => m.role === 'assistant').length}</p>
                <p>Último mensaje: {agentSystem.messages[agentSystem.messages.length - 1]?.role || 'N/A'}</p>
              </div>
            )}

            {/* Indicador de inicialización del sistema */}
            {!agentSystem.isInitialized && agentSystem.isProcessing && (
              <div className="flex justify-center px-2">
                <div className="max-w-xl w-full p-4 sm:p-6 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 flex-shrink-0"></div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-blue-700 dark:text-blue-400 font-semibold text-sm sm:text-base">Inicializando Tutor Virtual...</p>
                    <p className="text-blue-600 dark:text-blue-500 text-xs sm:text-sm">Cargando agentes y conectando con el curso</p>
                  </div>
                  <button
                    onClick={() => {
                      console.log('🔄 Forzando recarga...');
                      window.location.reload();
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs flex-shrink-0"
                  >
                    Recargar
                  </button>
                </div>
              </div>
            )}

            {/* Indicador de error de inicialización */}
            {agentSystem.error && !agentSystem.isInitialized && (
              <div className="flex justify-center px-2">
                <div className="max-w-xl w-full p-4 sm:p-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="text-red-500 text-2xl flex-shrink-0">⚠️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-red-700 dark:text-red-400 font-semibold text-sm sm:text-base">Error de inicialización</p>
                    <p className="text-red-600 dark:text-red-500 text-xs sm:text-sm break-words">{agentSystem.error}</p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <button
                        onClick={() => {
                          console.log('🔄 Reintentando inicialización...');
                          agentSystem.initializeAgentSystem(user);
                        }}
                        className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={() => {
                          console.log('🔄 Recargando página...');
                          window.location.reload();
                        }}
                        className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs sm:text-sm"
                      >
                        Recargar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Indicador de procesamiento */}
            {agentSystem.isProcessing && agentSystem.isInitialized && (
              <div className="flex justify-start gap-2 sm:gap-3 px-2">
                <div className="max-w-[85%] sm:max-w-xl p-3 sm:p-4 rounded-2xl bg-surface border border-border rounded-bl-none flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-text-dark text-sm sm:text-base">Procesando tu consulta...</p>
                    <p className="text-text-light text-xs">Generando respuesta con IA</p>
                  </div>
                </div>
              </div>
            )}

            {/* Indicador de procesamiento de archivo */}
            {isProcessingFile && (
              <div className="flex justify-start gap-3">
                <div className="max-w-xl p-4 rounded-2xl bg-gray-100 rounded-bl-none flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600">Procesando tu documento...</p>
                </div>
              </div>
            )}

            {/* Vista previa de documento */}
            {documentPreview && (
              <div className="flex justify-start gap-3">
                <div className="max-w-xl p-4 rounded-2xl bg-gray-100 rounded-bl-none border border-blue-500">
                  <h3 className="font-bold mb-2">Vista Previa del Documento</h3>
                  <div className="max-h-60 overflow-y-auto p-2 bg-white rounded-md whitespace-pre-wrap mb-4">
                    {documentPreview.content}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setDocumentPreview(null)}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md transition-colors"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => setDocumentPreview(null)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      Aceptar y Enviar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Indicador de error */}
            {agentSystem.hasError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-red-500">⚠️</span>
                  <span className="text-red-700">{agentSystem.error}</span>
                  <button
                    onClick={agentSystem.clearError}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Input Area - Sticky en la parte inferior */}
          <div className="sticky bottom-0 z-10 p-3 sm:p-4 md:p-6 border-t border-border bg-surface shadow-lg">
            {/* Banner de límite de tiempo alcanzado */}
            {timeLimitReached && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-500 text-xl">⏰</span>
                  <div>
                    <p className="text-red-700 dark:text-red-400 font-medium text-sm">Límite de tiempo alcanzado</p>
                    <p className="text-red-600 dark:text-red-500 text-xs">
                      Has usado todo tu tiempo disponible de hoy. Vuelve mañana o contacta a tu institución.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de cancelar respuesta si está procesando */}
            {agentSystem.isProcessing && (
              <div className="mb-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    agentSystem.cancelCurrentResponse();
                    setCancelRequested(true);
                    setTimeout(() => setCancelRequested(false), 1000);
                  }}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs sm:text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5"
                >
                  <span>✕</span>
                  <span>Cancelar respuesta</span>
                </button>
              </div>
            )}

            {/* Opción para iniciar con voz - solo si TTS está habilitado */}
            {capabilities?.hasMicrophone && agentSystem.isInitialized && !agentSystem.isProcessing && tutorLimits?.ttsEnabled && (
              <div className="mb-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm text-text-light cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useVoiceInput}
                    onChange={(e) => {
                      // Si el usuario intenta activar el audio y no lo ha habilitado antes, mostrar modal
                      if (e.target.checked && !audioEnabledOnce) {
                        setShowAudioEnableModal(true);
                      } else {
                        setUseVoiceInput(e.target.checked);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
                  />
                  <span>🎤 Iniciar con voz (respuestas más rápidas)</span>
                </label>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    // Si el usuario empieza a escribir mientras procesa, cancelar
                    if (agentSystem.isProcessing && e.target.value.trim().length > 0) {
                      agentSystem.cancelCurrentResponse();
                    }
                  }}
                  placeholder={
                    !agentSystem.isInitialized
                      ? 'Esperando inicialización...'
                      : isListening
                        ? 'Escuchando...'
                        : useVoiceInput && capabilities?.hasMicrophone
                          ? 'Presiona Enter o habla...'
                          : 'Escribe tu pregunta...'
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-background text-text-dark border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  disabled={agentSystem.isProcessing || isListening || isProcessingFile || !agentSystem.isInitialized || timeLimitReached}
                  title={!agentSystem.isInitialized ? 'El sistema no está inicializado. Por favor, selecciona un curso primero.' : undefined}
                  data-tutorial="tutor-input"
                />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".txt,.md,.pdf"
              />

              {/* Botón adjuntar - oculto en mobile pequeño */}
              <button
                type="button"
                onClick={handleAttachFile}
                className="hidden sm:block p-2 sm:p-3 text-gray-400 hover:text-blue-600 rounded-lg transition-colors flex-shrink-0"
                disabled={agentSystem.isProcessing || isProcessingFile}
                title="Adjuntar archivo"
              >
                <span className="text-base sm:text-lg">📎</span>
              </button>

              {/* Controles de voz */}
              {capabilities?.hasMicrophone && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleVoiceMessage}
                    className={`p-2 sm:p-3 rounded-lg transition-colors flex-shrink-0 ${isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : isMicrophoneMuted
                        ? 'bg-muted opacity-50'
                        : 'bg-background hover:bg-muted text-text-light border border-border'
                      }`}
                    disabled={agentSystem.isProcessing || isMicrophoneMuted}
                    title={isMicrophoneMuted ? 'Micrófono silenciado' : isListening ? 'Dejar de escuchar' : 'Empezar a escuchar'}
                    data-tutorial="voice-button"
                  >
                    <span className="text-sm sm:text-base">🎤</span>
                  </button>
                  {/* Botón mute mic - oculto en mobile */}
                  <button
                    type="button"
                    onClick={toggleMicrophoneMute}
                    className={`hidden sm:block p-2 rounded-lg transition-colors border border-border ${isMicrophoneMuted
                      ? 'bg-orange-500 text-white'
                      : 'bg-background hover:bg-muted text-text-light'
                      }`}
                    disabled={agentSystem.isProcessing}
                    title={isMicrophoneMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                  >
                    <span className="text-xs">🔇</span>
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-bold disabled:bg-muted disabled:text-text-light/30 disabled:cursor-not-allowed flex-shrink-0 text-sm sm:text-base shadow-lg shadow-primary/20"
                disabled={!inputValue.trim() || agentSystem.isProcessing || isProcessingFile}
                data-tutorial="send-button"
              >
                {agentSystem.isProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span className="hidden sm:inline">Enviar</span>
                    <span className="sm:hidden">→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Dashboard de monitoreo de tokens */}
      <TokenUsageDashboard
        isOpen={showTokenDashboard}
        onClose={() => setShowTokenDashboard(false)}
      />

      {/* Panel de contenido del curso */}
      <CourseContentPanel
        isOpen={showCourseContent}
        onClose={() => {
          setShowCourseContent(false);
          setHighlightMaterialId(undefined);
          setHighlightType(undefined);
        }}
        courseId={selectedCourseId}
        filterMaterialId={highlightMaterialId}
        moduleId={selectedModuleId}
        highlightId={highlightMaterialId}
        highlightType={highlightType}
      />

      {/* Modal de habilitación de audio */}
      <AudioEnableModal
        isOpen={showAudioEnableModal}
        onConfirm={() => {
          setShowAudioEnableModal(false);
          setUseVoiceInput(true);
          setIsAudioMuted(false);
          setAudioEnabledOnce(true);
          // Habilitar audio en el sistema de agentes
          agentSystem.setAudioMuted(false);
        }}
        onCancel={() => {
          setShowAudioEnableModal(false);
        }}
      />

      {/* Tutorial Interactivo */}
      <InteractiveTutorial
        config={tutorAITutorial}
        isOpen={tutorial.isOpen}
        onClose={tutorial.closeTutorial}
        onComplete={tutorial.completeTutorial}
        startStep={tutorial.startStep}
      />
    </div>
  );
};

export default TutorVirtualPage;

