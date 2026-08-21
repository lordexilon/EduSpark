import type { PedagogicalSettings, StudentProfile } from './pedagogical';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
export type AgentMessage = ChatMessage;

export interface Conversation {
  id: string;
  studentId: string;
  courseId: string;
  startedAt: Date;
  lastActivityAt: Date;
  metadata: Record<string, any>;
}

// =====================================================
// Voice Agent Types
// =====================================================

export interface VoiceConfig {
  voiceName: 'Kore' | 'Charon' | 'Fenrir' | 'Aoede' | 'Puck';
  speed: number; // 0.5 a 2.0
  pitch?: number;
  volume?: number;
}

export interface VoiceAgentStatus {
  isListening: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentVoice: VoiceConfig;
}

export interface AudioCapabilities {
  hasMicrophone: boolean;
  hasSpeakers: boolean;
  hasAudioContext: boolean;
  supportsSpeechRecognition: boolean;
}

// =====================================================
// RAG Agent Types
// =====================================================

export interface RAGResponse {
  answer: string;
  context: string;
  sources: string[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface ConversationContext {
  studentId: string;
  courseId: string;
  moduleId?: string;
  conversationId: string;
  pedagogicalSettings: PedagogicalSettings;
  studentProfile: StudentProfile;
  recentMessages: ChatMessage[];
  metadata?: Record<string, any>;
}

// =====================================================
// Context Agent Types
// =====================================================

export interface ContextWindow {
  messages: ChatMessage[];
  summary: string;
  relevantTopics: string[];
  studentProgress: StudentProgress;
}

export interface StudentProgress {
  topicsMastered: string[];
  topicsStruggled: string[];
  interactionCount: number;
  avgSessionDuration: number;
}

// =====================================================
// Agent Coordinator Types
// =====================================================

export interface AgentResponse {
  success: boolean;
  message: string;
  audioUrl?: string;
  metadata: Record<string, any>;
  agentUsed: 'voice' | 'rag' | 'context' | 'coordinator';
}

export interface FullContext {
  user: {
    id: string;
    role: string;
    name: string;
  };
  course: {
    id: string;
    name: string;
    teacherId: string;
    moduleId?: string;
  };
  pedagogical: PedagogicalSettings;
  student: StudentProfile;
  conversation: Conversation;
  recentMessages: ChatMessage[];
}

// =====================================================
// Error Types
// =====================================================

export interface AgentError {
  code: string;
  message: string;
  agent: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface AgentErrorHandler {
  handle(error: AgentError): Promise<AgentResponse>;
  canRecover(error: AgentError): boolean;
}

// =====================================================
// Event Types
// =====================================================

export interface AgentEvent {
  type: 'message_sent' | 'message_received' | 'voice_started' | 'voice_stopped' | 'error_occurred';
  agent: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface AgentEventListener {
  (event: AgentEvent): void;
}

// =====================================================
// Configuration Types
// =====================================================

export interface AgentSystemConfig {
  voice: VoiceConfig;
  rag: {
    timeout: number;
    retryAttempts: number;
  };
  context: {
    maxMessagesInMemory: number;
    contextWindowSize: number;
    enableLongTermMemory: boolean;
  };
  coordinator: {
    enableInterruption: boolean;
    maxConcurrentRequests: number;
    responseTimeout: number;
  };
}

// =====================================================
// API Response Types
// =====================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}
