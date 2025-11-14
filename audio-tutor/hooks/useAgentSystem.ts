// =====================================================
// Hook Principal del Sistema Multi-Agente
// Orquesta VoiceAgent, RAGAgent y ContextAgent
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCoordinator } from '../agents/AgentCoordinator';
import { VoiceAgent } from '../agents/VoiceAgent';
import { RAGAgent } from '../agents/RAGAgent';
import { ContextAgent } from '../agents/ContextAgent';
import type { 
  ChatMessage, 
  AgentResponse, 
  VoiceConfig,
  AgentEvent 
} from '../types/agents';
import type { 
  PedagogicalSettings, 
  StudentProfile 
} from '../types/pedagogical';

// =====================================================
// Hook useAgentSystem
// =====================================================

export const useAgentSystem = (courseId: string) => {
  // Estados principales
  const [coordinator, setCoordinator] = useState<AgentCoordinator | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de configuración
  const [pedagogicalSettings, setPedagogicalSettings] = useState<PedagogicalSettings | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    voiceName: 'Kore',
    speed: 1.0
  });

  // Referencias
  const coordinatorRef = useRef<AgentCoordinator | null>(null);
  const eventListenerRef = useRef<((event: AgentEvent) => void) | null>(null);

  // =====================================================
  // Inicialización del Sistema
  // =====================================================

  const initializeAgentSystem = useCallback(async (user: any, moduleId?: string) => {
    console.log('🚀 initializeAgentSystem llamado:', { 
      courseId, 
      hasUser: !!user,
      userId: user?.id,
      moduleId,
      isProcessing 
    });
    
    if (!courseId || !user) {
      console.error('❌ Missing courseId or user for agent system initialization:', { courseId, hasUser: !!user });
      setError('No se puede inicializar el sistema: falta curso o usuario');
      return;
    }

    // Evitar múltiples inicializaciones simultáneas
    if (isProcessing) {
      console.warn('⚠️ Sistema ya está inicializándose, ignorando llamada duplicada');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      console.log('🚀 Iniciando sistema de agentes...', { courseId, userId: user.id });

      // Crear agentes con timeout
      const createAgents = async () => {
        const voiceAgent = new VoiceAgent(voiceConfig);
        const ragAgent = new RAGAgent();
        const contextAgent = new ContextAgent();
        return { voiceAgent, ragAgent, contextAgent };
      };

      const { voiceAgent, ragAgent, contextAgent } = await Promise.race([
        createAgents(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout creando agentes')), 5000) // Reducido a 5s
        )
      ]) as any;

      // Crear coordinador
      const newCoordinator = new AgentCoordinator(voiceAgent, ragAgent, contextAgent);

      // Configurar listener de eventos
      const eventListener = (event: AgentEvent) => {
        console.log('Agent event:', event);
        
        switch (event.type) {
          case 'message_sent':
            setIsProcessing(false);
            break;
          case 'message_received':
            setIsProcessing(false);
            break;
          case 'error_occurred':
            setError(event.data.error);
            setIsProcessing(false);
            break;
        }
      };

      newCoordinator.addEventListener(eventListener);
      eventListenerRef.current = eventListener;

      // Inicializar sistema con timeout aumentado
      console.log('🔄 Inicializando coordinador...');
      try {
        await Promise.race([
          newCoordinator.initialize(user.id, courseId, user, { moduleId }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout inicializando coordinador (15s)')), 15000) // Aumentado a 15s
          )
        ]);
      } catch (initError) {
        console.error('❌ Error durante inicialización del coordinador:', initError);
        // Limpiar coordinador si falla
        coordinatorRef.current = null;
        throw initError;
      }

      // Obtener estado inicial
      const status = newCoordinator.getSystemStatus();
      
      setCoordinator(newCoordinator);
      setConversation(status.contextAgent);
      setPedagogicalSettings(status.currentContext?.pedagogical || null);
      setStudentProfile(status.currentContext?.student || null);
      setIsInitialized(true);

      console.log('✅ Sistema de agentes inicializado correctamente');

      // Cargar historial de mensajes (opcional, no crítico)
      try {
        await loadConversationHistory();
      } catch (historyError) {
        console.warn('⚠️ Error cargando historial (no crítico):', historyError);
      }

      // Asegurar que isProcessing se resetee
      setIsProcessing(false);

    } catch (error) {
      console.error('❌ Error initializing agent system:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setIsInitialized(false);
      setCoordinator(null);
      coordinatorRef.current = null;
      // Limpiar listeners si existen
      if (eventListenerRef.current && coordinatorRef.current) {
        coordinatorRef.current.removeEventListener(eventListenerRef.current);
        eventListenerRef.current = null;
      }
    } finally {
      setIsProcessing(false);
    }
  }, [courseId, voiceConfig, isProcessing]);

  // =====================================================
  // Gestión de Mensajes
  // =====================================================

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    console.log('🔵 sendMessage llamado:', { 
      hasCoordinator: !!coordinator, 
      text: text?.trim(),
      isInitialized,
      courseId 
    });
    
    if (!coordinator) {
      console.error('❌ sendMessage: Coordinator no está disponible');
      setError('El sistema de agentes no está inicializado. Por favor, espera a que se complete la inicialización.');
      return;
    }
    
    if (!text.trim()) {
      console.warn('⚠️ sendMessage: Texto vacío');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Agregar mensaje del usuario inmediatamente
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text,
        timestamp: new Date(),
        metadata: {}
      };

      setMessages(prev => [...prev, userMessage]);

      // Procesar con el coordinador
      const response: AgentResponse = await coordinator.handleUserInput(text);

      if (response.success) {
        // Agregar respuesta del asistente
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response.message,
          timestamp: new Date(),
          metadata: {
            confidence: response.metadata?.confidence,
            sources: response.metadata?.sources,
            audioUrl: response.audioUrl
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Agregar mensaje de error
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response.message,
          timestamp: new Date(),
          metadata: { error: true }
        };

        setMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Error al enviar mensaje');
    } finally {
      setIsProcessing(false);
    }
  }, [coordinator]);

  const sendVoiceMessage = useCallback(async (): Promise<void> => {
    if (!coordinator) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Crear un Blob de audio vacío para indicar que es entrada de voz
      const audioBlob = new Blob([], { type: 'audio/wav' });
      const response: AgentResponse = await coordinator.handleUserInput(audioBlob);

      if (response.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response.message,
          timestamp: new Date(),
          metadata: {
            confidence: response.metadata?.confidence,
            sources: response.metadata?.sources,
            audioUrl: response.audioUrl
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('Error sending voice message:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar audio');
    } finally {
      setIsProcessing(false);
    }
  }, [coordinator]);

  // =====================================================
  // Gestión de Conversaciones
  // =====================================================

  const loadConversationHistory = useCallback(async () => {
    if (!coordinator) return;

    try {
      // Obtener historial desde el contexto
      const history = await coordinator.getSystemStatus().contextAgent?.getConversationHistory?.() || [];
      setMessages(history);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }, [coordinator]);

  const clearConversation = useCallback(async (): Promise<void> => {
    if (!coordinator) return;

    try {
      // Limpiar mensajes locales
      setMessages([]);
      
      // Reinicializar sistema si es necesario
      // (En un sistema real, esto podría crear una nueva conversación)
      console.log('Conversation cleared');
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  }, [coordinator]);

  const exportConversation = useCallback(async (): Promise<string> => {
    try {
      const chatHistory = messages.map(msg => 
        `${msg.role === 'user' ? 'Tú' : 'EduSpark'}: ${msg.text}`
      ).join('\n\n');

      const blob = new Blob([chatHistory], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `eduspark-conversation-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return chatHistory;
    } catch (error) {
      console.error('Error exporting conversation:', error);
      throw error;
    }
  }, [messages]);

  // =====================================================
  // Gestión de Configuración
  // =====================================================

  const updateVoiceConfig = useCallback((newConfig: Partial<VoiceConfig>) => {
    setVoiceConfig(prev => ({ ...prev, ...newConfig }));
    
    if (coordinator) {
      // Actualizar configuración en el coordinador
      const status = coordinator.getSystemStatus();
      if (status.voiceAgent) {
        // Aquí se actualizaría la configuración de voz
        console.log('Voice config updated:', newConfig);
      }
    }
  }, [coordinator]);

  const updatePedagogicalSettings = useCallback((newSettings: Partial<PedagogicalSettings>) => {
    if (pedagogicalSettings) {
      setPedagogicalSettings(prev => prev ? { ...prev, ...newSettings } : null);
      // Aquí se actualizaría en Supabase
      console.log('Pedagogical settings updated:', newSettings);
    }
  }, [pedagogicalSettings]);

  const setAudioMuted = useCallback((muted: boolean) => {
    if (coordinator) {
      coordinator.setAudioMuted(muted);
      console.log('Audio muted state updated:', muted);
    }
  }, [coordinator]);

  const cancelCurrentResponse = useCallback(() => {
    if (coordinator) {
      coordinator.cancelCurrentResponse();
      setIsProcessing(false);
      console.log('🛑 Respuesta cancelada');
    }
  }, [coordinator]);

  // =====================================================
  // Utilidades
  // =====================================================

  const getSystemStatus = useCallback(() => {
    if (!coordinator) return null;
    return coordinator.getSystemStatus();
  }, [coordinator]);

  const isReady = useCallback(() => {
    return isInitialized && coordinator !== null && !isProcessing;
  }, [isInitialized, coordinator, isProcessing]);

  // =====================================================
  // Cleanup
  // =====================================================

  useEffect(() => {
    return () => {
      if (coordinatorRef.current) {
        // Remover event listener
        if (eventListenerRef.current) {
          coordinatorRef.current.removeEventListener(eventListenerRef.current);
        }
        
        // Limpiar recursos
        coordinatorRef.current.cleanup();
      }
    };
  }, []);

  // =====================================================
  // API Pública
  // =====================================================

  return {
    // Estados principales
    messages,
    isProcessing,
    isInitialized,
    error,
    conversation,
    
    // Configuración
    pedagogicalSettings,
    studentProfile,
    voiceConfig,
    
    // Funciones principales
    initializeAgentSystem,
    sendMessage,
    sendVoiceMessage,
    clearConversation,
    exportConversation,
    
    // Gestión de configuración
    updateVoiceConfig,
    updatePedagogicalSettings,
    setAudioMuted,
    
    // Utilidades
    getSystemStatus,
    isReady,
    cancelCurrentResponse,
    
    // Estados de error
    hasError: !!error,
    clearError: () => setError(null)
  };
};
