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
  const [documentPreview, setDocumentPreview] = useState<{content: string, id: string} | null>(null);

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

  // Configurar pdf.js
  useEffect(() => {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs`;
    }
  }, []);

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
          {capabilities && (
            <select
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
              initialSettings={courseContext.pedagogicalSettings}
              onSave={handlePedagogicalSettingsSave}
              isLoading={courseContext.isLoading}
            />
          </div>
        )}

        {/* Mensajes del chat */}
        <div ref={chatContainerRef} className="space-y-4">
          {agentSystem.messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl p-4 rounded-2xl ${
                message.role === 'user' 
                  ? 'bg-sky-600 rounded-br-none' 
                  : 'bg-slate-700 rounded-bl-none'
              }`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                
                {/* Controles de audio para mensajes del asistente */}
                {message.role === 'ai' && message.id !== 'init' && capabilities?.hasSpeakers && (
                  <div className="flex gap-2 mt-2">
                    <button
                      className="p-1 text-slate-300 hover:text-white transition-colors"
                      aria-label="Reproducir audio"
                    >
                      <PlayIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="p-1 text-slate-300 hover:text-white transition-colors"
                      aria-label="Detener audio"
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <div className="w-3 h-3 bg-current rounded-sm"></div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Metadatos de confianza */}
                {message.metadata?.confidence && (
                  <div className="mt-2 text-xs text-slate-400">
                    Confianza: {Math.round(message.metadata.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Indicador de procesamiento */}
          {agentSystem.isProcessing && (
            <div className="flex justify-start gap-3">
              <div className="max-w-xl p-4 rounded-2xl bg-slate-700 rounded-bl-none flex items-center gap-2">
                <LoadingSpinner className="w-5 h-5" />
                <p>Procesando tu consulta...</p>
              </div>
            </div>
          )}

          {/* Indicador de procesamiento de archivo */}
          {isProcessingFile && (
            <div className="flex justify-start gap-3">
              <div className="max-w-xl p-4 rounded-2xl bg-slate-700 rounded-bl-none flex items-center gap-2">
                <LoadingSpinner className="w-5 h-5" />
                <p>Procesando tu documento...</p>
              </div>
            </div>
          )}

          {/* Vista previa de documento */}
          {documentPreview && (
            <div className="flex justify-start gap-3">
              <div className="max-w-xl p-4 rounded-2xl bg-slate-700 rounded-bl-none border border-sky-500">
                <h3 className="font-bold mb-2">Vista Previa del Documento</h3>
                <div className="max-h-60 overflow-y-auto p-2 bg-slate-800 rounded-md whitespace-pre-wrap mb-4">
                  {documentPreview.content}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDocumentPreview(null)}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => setDocumentPreview(null)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-md transition-colors"
                  >
                    Aceptar y Enviar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Indicador de error */}
        {agentSystem.hasError && (
          <div className="bg-red-900 border border-red-700 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-red-200">{agentSystem.error}</span>
              <button
                onClick={agentSystem.clearError}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-slate-800 rounded-full p-2 border border-slate-700 focus-within:ring-2 focus-within:ring-sky-500">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Escuchando...' : 'Escribe tu pregunta...'}
            className="flex-1 bg-transparent px-4 py-2 focus:outline-none disabled:opacity-50 text-white"
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
            className="p-2 text-slate-400 hover:text-sky-400 rounded-full transition-colors"
            aria-label="Adjuntar archivo"
            disabled={agentSystem.isProcessing || isProcessingFile}
          >
            <AttachmentIcon className="w-6 h-6" />
          </button>
          
          {capabilities?.hasMicrophone && (
            <button
              type="button"
              onClick={handleVoiceMessage}
              className={`p-3 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              aria-label={isListening ? 'Dejar de escuchar' : 'Empezar a escuchar'}
              disabled={agentSystem.isProcessing}
            >
              <MicrophoneIcon className="w-6 h-6" />
            </button>
          )}
          
          <button
            type="submit"
            className="p-3 bg-sky-600 rounded-full hover:bg-sky-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
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