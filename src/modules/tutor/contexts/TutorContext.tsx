import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { AgentCoordinator } from '../agents/AgentCoordinator';
import { VoiceAgent } from '../agents/VoiceAgent';
import { RAGAgent } from '../agents/RAGAgent';
import { ContextAgent } from '../agents/ContextAgent';
import { ChatMessage, AgentResponse, VoiceConfig } from '../types/agents';
import { getUserCostStats, UserCostStats } from '@/services/tutorCostService';

interface TutorContextType {
  messages: ChatMessage[];
  isProcessing: boolean;
  isInitialized: boolean;
  error: string | null;
  hasError: boolean;
  conversation: any;
  pedagogicalSettings: any;
  studentProfile: any;
  voiceConfig: VoiceConfig;
  usageStats: UserCostStats | null;
  refreshUsageStats: () => Promise<void>;

  initializeAgentSystem: (user: any, moduleId?: string, extraContext?: any) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  sendVoiceMessage: () => Promise<void>;
  stopVoiceInput: () => void;
  setAudioMuted: (muted: boolean) => void;
  clearError: () => void;
  clearConversation: () => Promise<void>;
  cancelCurrentResponse: () => void;
  isReady: () => boolean;
}

const TutorContext = createContext<TutorContextType | undefined>(undefined);

export const TutorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [pedagogicalSettings, setPedagogicalSettings] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({ voiceName: 'Kore', speed: 1.1 });
  const [usageStats, setUsageStats] = useState<UserCostStats | null>(null);

  const coordinatorRef = useRef<AgentCoordinator | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const currentCourseIdRef = useRef<string | null>(null);

  const refreshUsageStats = useCallback(async () => {
    if (currentUserIdRef.current) {
      const stats = await getUserCostStats(currentUserIdRef.current);
      setUsageStats(stats);
    }
  }, []);

  const initializeAgentSystem = useCallback(
    async (user: any, courseId: string, options?: any) => {
      // Si ya está inicializado para este curso, podemos omitir o solo actualizar el módulo
      if (isInitialized && currentCourseIdRef.current === courseId) {
        console.log('Tutor system already initialized for this course');
        return;
      }

      try {
        setIsProcessing(true);
        setError(null);
        currentCourseIdRef.current = courseId;

        const voiceAgent = new VoiceAgent(voiceConfig);
        const ragAgent = new RAGAgent();
        const contextAgent = new ContextAgent();
        const coordinator = new AgentCoordinator(voiceAgent, ragAgent, contextAgent);

        await coordinator.initialize(user.id, courseId, user, options);

        coordinatorRef.current = coordinator;
        const status = coordinator.getSystemStatus();

        setConversation(status.contextAgent);
        setPedagogicalSettings(status.currentContext?.pedagogical);
        setStudentProfile(status.currentContext?.student);
        setIsInitialized(true);

        const history = (await contextAgent.getConversationHistory()) || [];
        setMessages(history);

        currentUserIdRef.current = user.id;
        await refreshUsageStats();
      } catch (err: any) {
        console.error('Error in Tutor system init:', err);
        setError(err.message || 'Error de conexión');
      } finally {
        setIsProcessing(false);
      }
    },
    [isInitialized, voiceConfig]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!coordinatorRef.current || !text.trim()) return;
      setIsProcessing(true);
      try {
        const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        const response = await coordinatorRef.current.handleUserInput(text);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response.message,
          timestamp: new Date(),
          metadata: response.metadata,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsProcessing(false);
        refreshUsageStats();
      }
    },
    [refreshUsageStats]
  );

  const sendVoiceMessage = useCallback(async () => {
    if (!coordinatorRef.current) return;
    setIsProcessing(true);
    try {
      const audioBlob = new Blob([], { type: 'audio/wav' });
      const response = await coordinatorRef.current.handleUserInput(audioBlob);
      if (response.success) {
        const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: response.metadata?.userMessage || '[Mensaje de voz]',
          timestamp: new Date(),
        };
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response.message,
          timestamp: new Date(),
          metadata: response.metadata,
        };
        setMessages((prev) => [...prev, userMsg, aiMsg]);
      } else {
        // Fallback visual si el audio falla (ej: problemas de red en Chrome)
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          text: response.message || 'Error en el sistema de voz.',
          timestamp: new Date(),
          metadata: { isError: true },
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
      refreshUsageStats();
    }
  }, [refreshUsageStats]);

  const stopVoiceInput = useCallback(() => {
    coordinatorRef.current?.stopVoiceInput();
  }, []);

  const setAudioMuted = useCallback((muted: boolean) => {
    coordinatorRef.current?.setAudioMuted(muted);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const clearConversation = useCallback(async () => {
    setMessages([]);
  }, []);

  const cancelCurrentResponse = useCallback(() => {
    coordinatorRef.current?.cancelCurrentResponse();
    setIsProcessing(false);
  }, []);

  const isReady = useCallback(() => isInitialized && !isProcessing, [isInitialized, isProcessing]);

  return (
    <TutorContext.Provider
      value={{
        messages,
        isProcessing,
        isInitialized,
        error,
        hasError: !!error,
        conversation,
        pedagogicalSettings,
        studentProfile,
        voiceConfig,
        usageStats,
        initializeAgentSystem,
        sendMessage,
        sendVoiceMessage,
        stopVoiceInput,
        setAudioMuted,
        clearError,
        clearConversation,
        cancelCurrentResponse,
        isReady,
        refreshUsageStats,
      }}
    >
      {children}
    </TutorContext.Provider>
  );
};

export const useTutor = () => {
  const context = useContext(TutorContext);
  if (!context) throw new Error('useTutor must be used within TutorProvider');
  return context;
};
