/**
 * Página del Tutor Virtual Integrada
 * Integra el sistema de agentes de IA con el sistema principal de EduSpark
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAgentSystem } from '../../audio-tutor/hooks/useAgentSystem';
import { useCourseContext } from '../../audio-tutor/hooks/useCourseContext';
import { useAudioCapabilities } from '../../audio-tutor/hooks/useAudioCapabilities';
import { isGeminiApiConfigured } from '../../audio-tutor/utils/env';
import { CourseSelector } from '../../audio-tutor/components/CourseSelector';
import { PedagogicalSettings } from '../../audio-tutor/components/PedagogicalSettings';
import { TokenUsageDashboard } from '../../audio-tutor/components/TokenUsageDashboard';
import { CourseContentPanel } from '../../audio-tutor/components/CourseContentPanel';
import { tokenMonitoring } from '../../audio-tutor/services/tokenMonitoringService';
import { trackTutorInteraction } from '../services/tutorTrackingService';
import { IconArrowLeft, IconSettings, IconTrash2, IconDownload, IconRefreshCw, IconDollarSign, IconBookOpen } from '../components/Icons';
import { MarkdownText } from '../components/MarkdownText';
import { AudioEnableModal } from '../components/AudioEnableModal';

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

  // Hooks del sistema de agentes
  const capabilities = useAudioCapabilities();
  const agentSystem = useAgentSystem(selectedCourseId);
  const courseContext = useCourseContext(selectedCourseId);

  // Referencias
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastInitializedModuleId = useRef<string>('');

  // Inicializar sistema de agentes cuando se selecciona un curso o cambia el módulo
  useEffect(() => {
    const debugInfo = {
      selectedCourseId,
      hasUser: !!user,
      userId: user?.id,
      isInitialized: agentSystem.isInitialized,
      isProcessing: agentSystem.isProcessing,
      selectedModuleId,
      lastInitializedModuleId: lastInitializedModuleId.current
    };
    console.log('🔄 useEffect inicialización:', debugInfo);

    if (!selectedCourseId) {
      console.warn('⚠️ No hay curso seleccionado, no se puede inicializar el sistema');
      return;
    }

    if (!user) {
      console.warn('⚠️ No hay usuario, no se puede inicializar el sistema');
      return;
    }

    // Solo reinicializar si el módulo cambió realmente
    const moduleChanged = selectedModuleId !== lastInitializedModuleId.current;
    console.log('🔍 Verificando condiciones de inicialización:', {
      isInitialized: agentSystem.isInitialized,
      isProcessing: agentSystem.isProcessing,
      moduleChanged,
      lastModuleId: lastInitializedModuleId.current,
      currentModuleId: selectedModuleId
    });

    // Si ya está inicializado pero cambió el módulo, reinicializar
    if (agentSystem.isInitialized && selectedModuleId && moduleChanged) {
      console.log('🔄 Módulo cambió, reinicializando sistema con moduleId:', selectedModuleId);
      lastInitializedModuleId.current = selectedModuleId;
      agentSystem.initializeAgentSystem(user, selectedModuleId);
      return;
    }

    // Si no está inicializado Y no está procesando, inicializar
    if (!agentSystem.isInitialized && !agentSystem.isProcessing) {
      // Crear una clave única para identificar esta combinación curso+módulo
      const initKey = `${selectedCourseId}-${selectedModuleId || 'no-module'}`;
      const lastInitKey = lastInitializedModuleId.current;

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

        // Guardar la clave de inicialización ANTES de llamar
        lastInitializedModuleId.current = initKey;

        // Llamar a initializeAgentSystem
        console.log('📞 Llamando a initializeAgentSystem...');
        agentSystem.initializeAgentSystem(user, selectedModuleId).catch((error) => {
          console.error('❌ Error en initializeAgentSystem:', error);
          // Si falla, resetear la clave para permitir reintentar
          lastInitializedModuleId.current = '';
          // Forzar actualización del componente
          setTimeout(() => {
            if (!agentSystem.isInitialized) {
              lastInitializedModuleId.current = '';
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
  }, [selectedCourseId, selectedModuleId, user, agentSystem.isInitialized, agentSystem.isProcessing, agentSystem]);

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
      lastInitializedModuleId.current = '';
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

        console.log('📊 Registrando interacción del tutor:', {
          studentId: user.id,
          courseId: selectedCourseId,
          questionLength: userMessage.text.length,
          answerLength: lastMessage.text.length,
        });

        await trackTutorInteraction(
          user.id,
          selectedCourseId,
          userMessage.text,
          lastMessage.text,
          estimatedTokens,
          responseTime,
          conversationId
        );

        console.log('✅ Interacción registrada exitosamente');
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

  // Manejar selección de curso
  const handleCourseSelect = useCallback((courseId: string) => {
    console.log('📚 Curso seleccionado:', courseId);
    // Resetear el estado de inicialización ANTES de cambiar el curso
    // para permitir que se inicialice nuevamente
    lastInitializedModuleId.current = '';
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

  // Renderizar selector de curso

  if (showCourseSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Tutor Virtual IA</h1>
              </div>
              <div className="text-gray-600">
                Selecciona un curso para comenzar
              </div>
            </div>

            <CourseSelector
              selectedCourseId={selectedCourseId}
              onCourseSelect={handleCourseSelect}
              isLoading={agentSystem.isProcessing}
            />
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Tutor Virtual IA</h1>
            <p className="text-gray-600 mb-6">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-3 sm:p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full min-h-0">
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
                      {courseContext.courseContext?.title || 'Cargando...'}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-blue-100 text-xs">Costo hoy:</span>
                    <span className="text-yellow-200 text-xs font-medium">
                      ${todayCost.toFixed(4)}
                    </span>
                  </div>
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

                {/* Botones secundarios - ocultos en mobile */}
                {user?.role?.name === 'teacher' && (
                  <button
                    onClick={() => setShowPedagogicalSettings(!showPedagogicalSettings)}
                    className="hidden sm:block p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Configuración pedagógica"
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

                <button
                  onClick={() => setShowTokenDashboard(true)}
                  className="hidden sm:block p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                  title="Monitoreo de tokens y costos"
                >
                  <IconDollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

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
            <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0 max-h-96 overflow-y-auto">
              <PedagogicalSettings
                courseId={selectedCourseId}
                initialSettings={courseContext.pedagogicalSettings}
                onSave={handlePedagogicalSettingsSave}
                isLoading={courseContext.isLoading}
              />
            </div>
          )}

          {/* Chat Container - Área principal flexible */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 min-h-0" ref={chatContainerRef}>
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
                <div className="max-w-xl w-full p-3 sm:p-4 rounded-2xl bg-blue-50 border border-blue-200">
                  <p className="text-blue-800 font-medium text-sm sm:text-base">⏳ Inicializando Tutor Virtual...</p>
                  <p className="text-blue-600 text-xs sm:text-sm mt-1">Por favor espera mientras se carga el sistema. Esto puede tomar unos segundos.</p>
                </div>
              </div>
            )}

            {agentSystem.messages.length === 0 && (
              <div className="flex justify-center px-2">
                <div className="max-w-xl w-full p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <p className="text-gray-600 font-medium text-sm sm:text-base text-center">
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
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
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
                      </div>
                    )}
                    {/* Timestamp para debug - solo en desarrollo y con menor opacidad */}
                    {process.env.NODE_ENV === 'development' && message.timestamp && (
                      <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`} style={{ opacity: 0.6 }}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                    {/* Fuentes */}
                    {message.role === 'assistant' && Array.isArray(message.metadata?.sources) && message.metadata.sources.length > 0 && (
                      <div className="mt-2">
                        <button
                          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                          onClick={() => setShowSourcesFor(showSourcesFor === message.id ? null : message.id)}
                        >
                          Fuentes ({message.metadata.sources.length})
                        </button>
                        {showSourcesFor === message.id && (
                          <div className="mt-2 bg-white rounded border p-2 text-xs text-gray-700">
                            <ul className="space-y-2">
                              {message.metadata.sources.map((s: any) => {
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
                                  <li key={s.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="text-gray-500">{getTypeLabel(s.type || 'material')}</span>
                                      </div>
                                      <span className="font-medium text-gray-900 block truncate">{s.title || `Recurso #${s.id}`}</span>
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
                        <span className="text-xs text-gray-500">La respuesta se cortó por límite de tokens</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Debug: mostrar información de mensajes en desarrollo */}
            {process.env.NODE_ENV === 'development' && agentSystem.messages.length > 0 && (
              <div className="text-xs text-gray-400 p-2 border-t border-gray-200 mt-4 bg-gray-50 rounded">
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
                <div className="max-w-xl w-full p-4 sm:p-6 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 flex-shrink-0"></div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-blue-800 font-semibold text-sm sm:text-base">Inicializando Tutor Virtual...</p>
                    <p className="text-blue-600 text-xs sm:text-sm">Cargando agentes y conectando con el curso</p>
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
                <div className="max-w-xl w-full p-4 sm:p-6 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="text-red-600 text-2xl flex-shrink-0">⚠️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-red-800 font-semibold text-sm sm:text-base">Error de inicialización</p>
                    <p className="text-red-600 text-xs sm:text-sm break-words">{agentSystem.error}</p>
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
                <div className="max-w-[85%] sm:max-w-xl p-3 sm:p-4 rounded-2xl bg-gray-100 rounded-bl-none flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-gray-600 text-sm sm:text-base">Procesando tu consulta...</p>
                    <p className="text-gray-500 text-xs">Generando respuesta con IA</p>
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

          {/* Input Area - Fijo en la parte inferior */}
          <div className="p-3 sm:p-4 md:p-6 border-t border-gray-200 bg-white flex-shrink-0">
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

            {/* Opción para iniciar con voz */}
            {capabilities?.hasMicrophone && agentSystem.isInitialized && !agentSystem.isProcessing && (
              <div className="mb-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 cursor-pointer">
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
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  disabled={agentSystem.isProcessing || isListening || isProcessingFile || !agentSystem.isInitialized}
                  title={!agentSystem.isInitialized ? 'El sistema no está inicializado. Por favor, selecciona un curso primero.' : undefined}
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
                          ? 'bg-gray-300 opacity-50'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                    disabled={agentSystem.isProcessing || isMicrophoneMuted}
                    title={isMicrophoneMuted ? 'Micrófono silenciado' : isListening ? 'Dejar de escuchar' : 'Empezar a escuchar'}
                  >
                    <span className="text-sm sm:text-base">🎤</span>
                  </button>
                  {/* Botón mute mic - oculto en mobile */}
                  <button
                    type="button"
                    onClick={toggleMicrophoneMute}
                    className={`hidden sm:block p-2 rounded-lg transition-colors ${isMicrophoneMuted
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
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
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0 text-sm sm:text-base"
                disabled={!inputValue.trim() || agentSystem.isProcessing || isProcessingFile}
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
    </div>
  );
};

export default TutorVirtualPage;
