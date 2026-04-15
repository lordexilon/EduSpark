// =====================================================
// Audio-Tutor Multi-Agente - App Principal
// Integración completa del sistema de agentes especializados
// =====================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InteractionMode } from './types';
import type { ChatMessage, AudioCapabilities } from './types';
import { useAudioCapabilities } from './hooks/useAudioCapabilities';
import { useAgentSystem } from './hooks/useAgentSystem';
import { useCourseContext } from './hooks/useCourseContext';
import { AttachmentIcon, LoadingSpinner, MicrophoneIcon, PauseIcon, PlayIcon, SendIcon, TrashIcon, ExportIcon } from './components/icons';
import { CourseSelector } from './components/CourseSelector';
import { PedagogicalSettings } from './components/PedagogicalSettings';

// Add pdf.js library to the global scope for TypeScript
declare const pdfjsLib: any;

// Audio decoding utilities (mantenidas para compatibilidad)
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

// Main App Component
export default function App() {
  // Estados principales
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showCourseSelector, setShowCourseSelector] = useState(true);
  const [showPedagogicalSettings, setShowPedagogicalSettings] = useState(false);
  const [user, setUser] = useState<any>(null); // Simular usuario autenticado

  // Hooks del sistema
  const capabilities = useAudioCapabilities();
  const agentSystem = useAgentSystem(selectedCourseId);
  const courseContext = useCourseContext(selectedCourseId);

  // Estados de UI
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{ content: string, id: string } | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.SILENT);
  const [browserWarning, setBrowserWarning] = useState<string | null>(null);

  // Referencias
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simular usuario autenticado (en un sistema real vendría del contexto de auth)
  useEffect(() => {
    // Simular datos de usuario
    setUser({
      id: 'user-123',
      first_name: 'Estudiante',
      last_name: 'Demo',
      role: { name: 'student' }
    });
  }, []);

  // Inicializar sistema de agentes cuando se selecciona un curso
  useEffect(() => {
    if (selectedCourseId && user && !agentSystem.isInitialized) {
      agentSystem.initializeAgentSystem(user);
    }
  }, [selectedCourseId, user, agentSystem.isInitialized]);

  // Configurar pdf.js y detectar navegador
  useEffect(() => {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs`;
    }

    // Detectar Brave (aproximado)
    const isBrave = (navigator as any).brave !== undefined || navigator.userAgent.includes('Brave');
    if (isBrave) {
      setBrowserWarning('Estás usando Brave. Algunas funciones de audio y reconocimiento de voz podrían estar bloqueadas por el navegador.');
    }
  }, []);

  // Sincronizar modo de interacción con el sistema de agentes
  useEffect(() => {
    const isMuted = interactionMode === InteractionMode.SILENT;
    agentSystem.setAudioMuted(isMuted);
    console.log(`🔇 Modo de audio actualizado: ${isMuted ? 'Silenciado' : 'Activado'} (${interactionMode})`);
  }, [interactionMode, agentSystem.setAudioMuted]);

  // Auto-scroll del chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [agentSystem.messages, documentPreview]);

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
    await agentSystem.sendVoiceMessage();
  }, [agentSystem.isProcessing, agentSystem.sendVoiceMessage]);

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
      const errorMsg = "El archivo es demasiado grande. El tamaño máximo es de 35 MB.";
      // En un sistema real, esto se manejaría a través del sistema de agentes
      console.error(errorMsg);
      return;
    }

    setIsProcessingFile(true);
    // Aquí se implementaría el procesamiento de archivos
    // Por ahora solo simulamos
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
      <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 font-sans">
        <header className="flex items-center justify-between p-4 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-sky-400">EduSpark Tutor</h1>
          <div className="text-slate-400">
            Selecciona un curso para comenzar
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <CourseSelector
            selectedCourseId={selectedCourseId}
            onCourseSelect={handleCourseSelect}
            isLoading={agentSystem.isProcessing}
          />
        </main>
      </div>
    );
  }

  // Renderizar interfaz principal
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 font-sans">
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-sky-400">EduSpark Tutor</h1>
          {selectedCourseId && (
            <span className="text-slate-400 text-sm">
              Curso: {courseContext.courseContext?.title || 'Cargando...'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Selector de modo de interacción */}
          {capabilities && agentSystem.pedagogicalSettings?.enableAudioResponse !== false && (
            <select
              value={interactionMode}
              onChange={(e) => setInteractionMode(e.target.value as InteractionMode)}
              className="bg-slate-800 border border-slate-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 text-white"
              aria-label="Seleccionar modo de interacción"
            >
              <option value={InteractionMode.SILENT}>Silencioso</option>
              <option value={InteractionMode.HYBRID} disabled={!capabilities.hasMicrophone || !capabilities.hasSpeakers}>
                Híbrido
              </option>
              <option value={InteractionMode.AUDIO} disabled={!capabilities.hasMicrophone || !capabilities.hasSpeakers}>
                Audio
              </option>
            </select>
          )}

          {/* Botón de configuración pedagógica (solo para docentes) */}
          {user?.role?.name === 'teacher' && (
            <button
              onClick={() => setShowPedagogicalSettings(!showPedagogicalSettings)}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Configuración pedagógica"
            >
              ⚙️
            </button>
          )}

          {/* Botón de exportar chat */}
          <button
            onClick={agentSystem.exportConversation}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Exportar chat"
          >
            <ExportIcon className="w-6 h-6" />
          </button>

          {/* Botón de limpiar chat */}
          <button
            onClick={agentSystem.clearConversation}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Limpiar chat"
          >
            <TrashIcon className="w-6 h-6" />
          </button>

          {/* Botón de cambiar curso */}
          <button
            onClick={() => setShowCourseSelector(true)}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Cambiar curso"
          >
            🔄
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {/* Panel de configuración pedagógica */}
        {showPedagogicalSettings && user?.role?.name === 'teacher' && (
          <div className="mb-6">
            <PedagogicalSettings
              courseId={selectedCourseId}
              initialSettings={agentSystem.pedagogicalSettings}
              onSave={handlePedagogicalSettingsSave}
              isLoading={agentSystem.isProcessing}
            />
          </div>
        )}

        {/* Aviso de compatibilidad del navegador */}
        {browserWarning && interactionMode !== InteractionMode.SILENT && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 flex items-start gap-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200 mb-1">Aviso de Compatibilidad</p>
              <p className="text-xs text-amber-300/90 leading-relaxed">{browserWarning}</p>
            </div>
            <button
              onClick={() => setBrowserWarning(null)}
              className="p-1 text-amber-400 hover:text-amber-200 transition-colors"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mensajes del chat */}
        <div ref={chatContainerRef} className="space-y-4">
          {agentSystem.messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl p-4 rounded-2xl ${message.role === 'user'
                  ? 'bg-sky-600 rounded-br-none shadow-md shadow-sky-900/20'
                  : 'bg-slate-700 rounded-bl-none shadow-md shadow-slate-900/20'
                }`}>
                <p className="whitespace-pre-wrap">{message.text}</p>

                {/* Controles de audio para mensajes del asistente */}
                {message.role === 'assistant' && capabilities?.hasSpeakers && interactionMode !== InteractionMode.SILENT && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-600/50">
                    <button
                      className="p-1.5 bg-slate-600/50 hover:bg-slate-500/50 rounded-md text-slate-300 hover:text-white transition-all"
                      aria-label="Reproducir audio"
                      onClick={() => agentSystem.sendMessage(`Explícame esto de nuevo por audio: ${message.text.substring(0, 50)}...`)}
                    >
                      <PlayIcon className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 bg-slate-600/50 hover:bg-slate-500/50 rounded-md text-slate-300 hover:text-white transition-all"
                      aria-label="Detener audio"
                      onClick={() => agentSystem.cancelCurrentResponse()}
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-current rounded-sm"></div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Metadatos de confianza */}
                {message.metadata?.confidence && (
                  <div className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Confianza: {Math.round(message.metadata.confidence * 100)}%
                  </div>
                )}

                {/* Fuentes */}
                {message.metadata?.sources && message.metadata.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-600/30">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Fuentes:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.metadata.sources.map((source: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-slate-800/50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-600/30">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Indicador de procesamiento */}
          {agentSystem.isProcessing && (
            <div className="flex justify-start gap-3">
              <div className="max-w-xl p-4 rounded-2xl bg-slate-700 rounded-bl-none flex items-center gap-3">
                <LoadingSpinner className="w-5 h-5 text-sky-400" />
                <p className="text-slate-300 animate-pulse">Procesando consulta...</p>
              </div>
            </div>
          )}
        </div>

        {/* Indicador de error */}
        {agentSystem.hasError && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 flex items-center gap-3 shadow-lg">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-200">Ha ocurrido un error</p>
              <p className="text-xs text-red-300/80">{agentSystem.error}</p>
            </div>
            <button
              onClick={agentSystem.clearError}
              className="p-1 text-red-400 hover:text-red-200 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </main>

      <footer className="p-4 bg-slate-900/50 backdrop-blur-md border-t border-slate-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-slate-800 rounded-full p-2 border border-slate-700 focus-within:ring-2 focus-within:ring-sky-500 shadow-xl transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Escuchando tu voz...' : '¿En qué puedo ayudarte hoy?'}
            className="flex-1 bg-transparent px-4 py-2 focus:outline-none disabled:opacity-50 text-white placeholder-slate-500"
            disabled={agentSystem.isProcessing || isListening || isProcessingFile}
            aria-label="Entrada de chat"
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
            className="p-2 text-slate-400 hover:text-sky-400 rounded-full transition-colors hover:bg-slate-700"
            aria-label="Adjuntar archivo"
            disabled={agentSystem.isProcessing || isProcessingFile}
          >
            <AttachmentIcon className="w-6 h-6" />
          </button>

          {capabilities?.hasMicrophone && interactionMode !== InteractionMode.SILENT && (
            <button
              type="button"
              onClick={handleVoiceMessage}
              className={`p-3 rounded-full transition-all shadow-lg ${isListening
                  ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-900/40'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              aria-label={isListening ? 'Dejar de escuchar' : 'Empezar a escuchar'}
              disabled={agentSystem.isProcessing}
            >
              <MicrophoneIcon className="w-6 h-6" />
            </button>
          )}

          <button
            type="submit"
            className="p-3 bg-sky-600 rounded-full hover:bg-sky-500 transition-all disabled:bg-slate-600 disabled:cursor-not-allowed shadow-lg shadow-sky-900/20 active:scale-95"
            disabled={!inputValue.trim() || agentSystem.isProcessing || isProcessingFile}
            aria-label="Enviar mensaje"
          >
            {agentSystem.isProcessing ? (
              <LoadingSpinner className="w-6 h-6" />
            ) : (
              <SendIcon className="w-6 h-6" />
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}