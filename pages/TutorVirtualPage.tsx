/**
 * Página del Tutor Virtual Integrada
 * Integra el sistema de agentes de IA con el sistema principal de EduSpark
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAgentSystem } from '../audio-tutor/hooks/useAgentSystem';
import { useCourseContext } from '../audio-tutor/hooks/useCourseContext';
import { useAudioCapabilities } from '../audio-tutor/hooks/useAudioCapabilities';
import { isGeminiApiConfigured } from '../audio-tutor/utils/env';
import { CourseSelector } from '../audio-tutor/components/CourseSelector';
import { PedagogicalSettings } from '../audio-tutor/components/PedagogicalSettings';
import { TokenUsageDashboard } from '../audio-tutor/components/TokenUsageDashboard';
import { CourseContentPanel } from '../audio-tutor/components/CourseContentPanel';
import { tokenMonitoring } from '../audio-tutor/services/tokenMonitoringService';
import { IconArrowLeft, IconSettings, IconTrash2, IconDownload, IconRefreshCw, IconDollarSign, IconBookOpen } from '../components/Icons';

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
  const [documentPreview, setDocumentPreview] = useState<{content: string, id: string} | null>(null);
  const [todayCost, setTodayCost] = useState(0);
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showSourcesFor, setShowSourcesFor] = useState<string | null>(null);
  const [highlightMaterialId, setHighlightMaterialId] = useState<string | undefined>(undefined);
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  // Hooks del sistema de agentes
  const capabilities = useAudioCapabilities();
  const agentSystem = useAgentSystem(selectedCourseId);
  const courseContext = useCourseContext(selectedCourseId);

  // Referencias
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar sistema de agentes cuando se selecciona un curso
  useEffect(() => {
    if (selectedCourseId && user && !agentSystem.isInitialized) {
      const initTimeout = setTimeout(() => {
        if (!agentSystem.isInitialized && agentSystem.isProcessing) {
          console.warn('⚠️ Timeout en inicialización del sistema de agentes, reintentando...');
          agentSystem.initializeAgentSystem(user, selectedModuleId);
        }
      }, 8000);

      agentSystem.initializeAgentSystem(user, selectedModuleId);

      return () => clearTimeout(initTimeout);
    }
  }, [selectedCourseId, user, agentSystem.isInitialized, agentSystem.isProcessing]);

  // Leer courseId/moduleId desde querystring al cargar
  useEffect(() => {
    if (initializedFromQuery) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const qs = new URLSearchParams(hash.split('?')[1] || '');
    const courseId = qs.get('courseId') || '';
    const moduleId = qs.get('moduleId') || '';
    if (courseId) {
      setSelectedCourseId(courseId);
      setShowCourseSelector(false);
    }
    if (moduleId) {
      setSelectedModuleId(moduleId);
    }
    setInitializedFromQuery(true);
  }, [initializedFromQuery]);

  // Auto-scroll del chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [agentSystem.messages, documentPreview]);

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
    setSelectedCourseId(courseId);
    setShowCourseSelector(false);
  }, []);

  // Manejar envío de mensaje
  const handleSubmit = useCallback(async (e: React.FormEvent, directInput?: string) => {
    e.preventDefault();
    const userInput = directInput || inputValue;
    if (!userInput.trim() || agentSystem.isProcessing) return;

    setInputValue('');
    await agentSystem.sendMessage(userInput);
  }, [inputValue, agentSystem.isProcessing, agentSystem.sendMessage]);

  // Manejar mensaje de voz
  const handleVoiceMessage = useCallback(async () => {
    if (agentSystem.isProcessing) return;
    
    try {
      setIsListening(true);
      await agentSystem.sendVoiceMessage();
    } catch (error) {
      console.error('Error en mensaje de voz:', error);
    } finally {
      setIsListening(false);
    }
  }, [agentSystem.isProcessing, agentSystem.sendVoiceMessage]);

  // Toggle microfono mute
  const toggleMicrophoneMute = useCallback(() => {
    setIsMicrophoneMuted(prev => !prev);
    if (isListening) {
      setIsListening(false);
    }
  }, [isListening]);

  // Toggle audio mute
  const toggleAudioMute = useCallback(() => {
    setIsAudioMuted(prev => !prev);
  }, []);

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
                1. Obtén tu API key de <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a><br/>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <IconArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold">Tutor Virtual IA</h1>
                  {selectedCourseId && (
                    <p className="text-blue-100 text-sm">
                      Curso: {courseContext.courseContext?.title || 'Cargando...'}
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
              
              <div className="flex items-center gap-2">
                {/* Botón de configuración pedagógica (solo para docentes) */}
                {user?.role?.name === 'teacher' && (
                  <button
                    onClick={() => setShowPedagogicalSettings(!showPedagogicalSettings)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Configuración pedagógica"
                  >
                    <IconSettings className="w-5 h-5" />
                  </button>
                )}

                {/* Botón de exportar chat */}
                <button
                  onClick={agentSystem.exportConversation}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Exportar chat"
                >
                  <IconDownload className="w-5 h-5" />
                </button>

                {/* Botón de limpiar chat */}
                <button
                  onClick={agentSystem.clearConversation}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Limpiar chat"
                >
                  <IconTrash2 className="w-5 h-5" />
                </button>

                {/* Botón de cambiar curso */}
                <button
                  onClick={() => setShowCourseSelector(true)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Cambiar curso"
                >
                  <IconRefreshCw className="w-5 h-5" />
                </button>

                {/* Botón de contenido del curso */}
                <button
                  onClick={() => setShowCourseContent(true)}
                  className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                  title="Ver contenido del curso"
                >
                  <IconBookOpen className="w-5 h-5" />
                </button>

                {/* Botón de silenciar audio */}
                <button
                  onClick={toggleAudioMute}
                  className={`p-2 rounded-lg transition-colors ${
                    isAudioMuted
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'hover:bg-white/20'
                  }`}
                  title={isAudioMuted ? 'Activar audio' : 'Silenciar audio'}
                >
                  {isAudioMuted ? '🔇' : '🔊'}
                </button>

                {/* Botón de monitoreo de tokens */}
                <button
                  onClick={() => setShowTokenDashboard(true)}
                  className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                  title="Monitoreo de tokens y costos"
                >
                  <IconDollarSign className="w-5 h-5" />
                </button>

                {/* Botón de recarga de emergencia */}
                <button
                  onClick={() => {
                    console.log('🚨 Recarga de emergencia del Tutor Virtual...');
                    if ((window as any).forceReload) {
                      (window as any).forceReload();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Recarga de emergencia"
                >
                  🔄
                </button>
              </div>
            </div>
          </div>

          {/* Panel de configuración pedagógica */}
          {showPedagogicalSettings && user?.role?.name === 'teacher' && (
            <div className="p-6 border-b border-gray-200">
              <PedagogicalSettings
                courseId={selectedCourseId}
                initialSettings={courseContext.pedagogicalSettings}
                onSave={handlePedagogicalSettingsSave}
                isLoading={courseContext.isLoading}
              />
            </div>
          )}

          {/* Chat Container */}
          <div className="h-96 overflow-y-auto p-6 space-y-4" ref={chatContainerRef}>
            {agentSystem.messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl p-4 rounded-2xl ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-900 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {/* Fuentes */}
                  {message.role === 'assistant' && Array.isArray(message.metadata?.sources) && message.metadata.sources.length > 0 && (
                    <div className="mt-2">
                      <button
                        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                        onClick={() => setShowSourcesFor(showSourcesFor === message.id ? null : message.id)}
                      >
                        Fuentes
                      </button>
                      {showSourcesFor === message.id && (
                        <div className="mt-2 bg-white rounded border p-2 text-xs text-gray-700">
                          <ul className="space-y-1">
                            {message.metadata.sources.map((s: any) => (
                              <li key={s.id} className="flex items-center justify-between gap-2">
                                <span className="truncate">{s.title || `Material #${s.id}`}</span>
                                {s.url ? (
                                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Abrir</a>
                                ) : (
                                  <button
                                    className="text-blue-600 hover:underline"
                                    onClick={() => {
                                      setShowCourseContent(true);
                                      setHighlightMaterialId(String(s.id));
                                    }}
                                  >
                                    Ver en panel
                                  </button>
                                )}
                              </li>
                            ))}
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
            ))}

            {/* Indicador de inicialización del sistema */}
            {!agentSystem.isInitialized && agentSystem.isProcessing && (
              <div className="flex justify-center gap-3">
                <div className="max-w-xl p-6 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <div className="flex-1">
                    <p className="text-blue-800 font-semibold">Inicializando Tutor Virtual...</p>
                    <p className="text-blue-600 text-sm">Cargando agentes y conectando con el curso (máx. 8s)</p>
                  </div>
                  <button
                    onClick={() => {
                      console.log('🔄 Forzando recarga...');
                      window.location.reload();
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                  >
                    Recargar
                  </button>
                </div>
              </div>
            )}

            {/* Indicador de error de inicialización */}
            {agentSystem.error && !agentSystem.isInitialized && (
              <div className="flex justify-center gap-3">
                <div className="max-w-xl p-6 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
                  <div className="text-red-600 text-2xl">⚠️</div>
                  <div>
                    <p className="text-red-800 font-semibold">Error de inicialización</p>
                    <p className="text-red-600 text-sm">{agentSystem.error}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          console.log('🔄 Reintentando inicialización...');
                          agentSystem.initializeAgentSystem(user);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Reintentar
                      </button>
                      <button
                        onClick={() => {
                          console.log('🔄 Recargando página...');
                          window.location.reload();
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        Recargar Página
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Indicador de procesamiento */}
            {agentSystem.isProcessing && agentSystem.isInitialized && (
              <div className="flex justify-start gap-3">
                <div className="max-w-xl p-4 rounded-2xl bg-gray-100 rounded-bl-none flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <div>
                    <p className="text-gray-600">Procesando tu consulta...</p>
                    <p className="text-gray-500 text-xs">Generando respuesta con IA (máx. 15s)</p>
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

          {/* Input Area */}
          <div className="p-6 border-t border-gray-200">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? 'Escuchando...' : 'Escribe tu pregunta...'}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                disabled={agentSystem.isProcessing || isListening || isProcessingFile}
              />
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".txt,.md,.pdf"
              />
              
              <button
                type="button"
                onClick={handleAttachFile}
                className="p-3 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                disabled={agentSystem.isProcessing || isProcessingFile}
                title="Adjuntar archivo"
              >
                📎
              </button>
              
              {capabilities?.hasMicrophone && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleVoiceMessage}
                    className={`p-3 rounded-lg transition-colors ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : isMicrophoneMuted
                        ? 'bg-gray-300 opacity-50'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                    }`}
                    disabled={agentSystem.isProcessing || isMicrophoneMuted}
                    title={isMicrophoneMuted ? 'Micrófono silenciado' : isListening ? 'Dejar de escuchar' : 'Empezar a escuchar'}
                  >
                    🎤
                  </button>
                  <button
                    type="button"
                    onClick={toggleMicrophoneMute}
                    className={`p-2 rounded-lg transition-colors ${
                      isMicrophoneMuted
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                    }`}
                    disabled={agentSystem.isProcessing}
                    title={isMicrophoneMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                  >
                    🔇
                  </button>
                </div>
              )}
              
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!inputValue.trim() || agentSystem.isProcessing || isProcessingFile}
              >
                {agentSystem.isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Enviar'
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
        onClose={() => setShowCourseContent(false)}
        courseId={selectedCourseId}
        filterMaterialId={highlightMaterialId}
        moduleId={selectedModuleId}
      />
    </div>
  );
};

export default TutorVirtualPage;
