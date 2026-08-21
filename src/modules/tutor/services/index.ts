// =====================================================
// Índice de Servicios del Sistema Multi-Agente
// Exportaciones centralizadas de todos los servicios
// =====================================================

// =====================================================
// Servicios Principales
// =====================================================

// Supabase Service
import {
  saveConversation,
  loadConversation,
  updateConversationActivity,
  saveMessage,
  getConversationHistory,
  getPedagogicalSettings,
  savePedagogicalSettings,
  getStudentProfile,
  updateStudentProfile,
  getGradingScale,
  saveGradingScale,
  uploadCourseImage,
  getCourseImages,
  getCourseMaterials,
  saveCourseMaterial,
  saveUsageMetric,
  getUsageMetrics,
  getAgentConfiguration,
  saveAgentConfiguration,
  getCourseContext,
  healthCheck as supabaseHealthCheck,
} from './supabaseService';

export {
  saveConversation,
  loadConversation,
  updateConversationActivity,
  saveMessage,
  getConversationHistory,
  getPedagogicalSettings,
  savePedagogicalSettings,
  getStudentProfile,
  updateStudentProfile,
  getGradingScale,
  saveGradingScale,
  uploadCourseImage,
  getCourseImages,
  getCourseMaterials,
  saveCourseMaterial,
  saveUsageMetric,
  getUsageMetrics,
  getAgentConfiguration,
  saveAgentConfiguration,
  getCourseContext,
  supabaseHealthCheck,
};

// RAG Service (A2A)
import { RAGService, ragService, createRAGContext, isValidRAGResponse } from './ragService';

export { RAGService, ragService, createRAGContext, isValidRAGResponse };

// Memory Service
import { MemoryService, memoryService } from './memoryService';

export { MemoryService, memoryService };

// Gemini Service
import { getTutorResponse, synthesizeSpeech, processDocument } from './geminiService';

export { getTutorResponse, synthesizeSpeech, processDocument };

// =====================================================
// Servicios de Utilidad
// =====================================================

// Agent Utils
import {
  agentUtils,
  createConversationContext as createContext,
  enrichContext,
  extractContextForAgent,
  generatePersonalizedPrompt,
  validateAgentResponse,
  enhanceAgentResponse,
  combineAgentResponses,
  analyzeResponseQuality,
  extractConversationMetrics,
  generateDebugInfo,
  validateSystemConfiguration,
} from './agentUtils';

export {
  agentUtils,
  createContext,
  enrichContext,
  extractContextForAgent,
  generatePersonalizedPrompt,
  validateAgentResponse,
  enhanceAgentResponse,
  combineAgentResponses,
  analyzeResponseQuality,
  extractConversationMetrics,
  generateDebugInfo,
  validateSystemConfiguration,
};

// Config Service
import {
  ConfigService,
  configService,
  getConfig,
  getConfigSection,
  updateConfigSection,
  validateConfig,
  resetConfig,
  isAgentEnabled,
  setAgentEnabled,
  getEnvironmentConfig,
  type SystemConfig,
} from './configService';

export {
  ConfigService,
  configService,
  getConfig,
  getConfigSection,
  updateConfigSection,
  validateConfig,
  resetConfig,
  isAgentEnabled,
  setAgentEnabled,
  getEnvironmentConfig,
  type SystemConfig,
};

// =====================================================
// Servicios de Supabase (Cliente)
// =====================================================

import { supabase } from '../lib/supabase-shared';
import type { User, AuthUser, Role } from '../lib/supabase-shared';

export { supabase };

export type { User, AuthUser, Role };

// =====================================================
// Funciones de Utilidad Combinadas
// =====================================================

/**
 * Inicializa todos los servicios del sistema
 */
export const initializeServices = async (): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Verificar configuración
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      errors.push(...configValidation.errors);
    }
    warnings.push(...configValidation.warnings);

    // Verificar Supabase
    const supabaseHealthy = await supabaseHealthCheck();
    if (!supabaseHealthy) {
      errors.push('Supabase no está disponible');
    }

    // Verificar RAG Service
    const ragHealthy = await ragService.healthCheck();
    if (!ragHealthy) {
      warnings.push('RAG Service no está disponible - funcionalidad limitada');
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Error desconocido'],
      warnings,
    };
  }
};

/**
 * Obtiene el estado de todos los servicios
 */
export const getServicesStatus = async () => {
  const [supabaseStatus, ragStatus, configStatus] = await Promise.all([
    supabaseHealthCheck(),
    ragService.healthCheck(),
    Promise.resolve(validateConfig()),
  ]);

  return {
    supabase: {
      available: supabaseStatus,
      status: supabaseStatus ? 'healthy' : 'unhealthy',
    },
    rag: {
      available: ragStatus,
      status: ragStatus ? 'healthy' : 'unhealthy',
    },
    config: {
      valid: configStatus.valid,
      errors: configStatus.errors,
      warnings: configStatus.warnings,
    },
    memory: {
      available: true,
      status: 'healthy',
    },
    agents: {
      voice: isAgentEnabled('voice'),
      rag: isAgentEnabled('rag'),
      context: isAgentEnabled('context'),
      coordinator: isAgentEnabled('coordinator'),
    },
  };
};

/**
 * Resetea todos los servicios a su estado inicial
 */
export const resetAllServices = async (): Promise<void> => {
  try {
    // Resetear configuración
    resetConfig();

    // Limpiar memoria
    memoryService.clearMemory();

    console.log('Todos los servicios han sido reseteados');
  } catch (error) {
    console.error('Error reseteando servicios:', error);
    throw error;
  }
};

/**
 * Exporta la configuración completa del sistema
 */
export const exportSystemConfig = () => {
  return {
    config: configService.exportConfig(),
    memory: memoryService.exportMemory(),
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  };
};

/**
 * Importa una configuración completa del sistema
 */
export const importSystemConfig = (configData: string): boolean => {
  try {
    const parsed = JSON.parse(configData);

    if (parsed.config) {
      configService.importConfig(parsed.config);
    }

    if (parsed.memory) {
      memoryService.importMemory(parsed.memory);
    }

    return true;
  } catch (error) {
    console.error('Error importing system config:', error);
    return false;
  }
};

// =====================================================
// Tipos Exportados
// =====================================================

export type {
  AgentMessage,
  AgentResponse,
  ConversationContext,
  ContextWindow,
  StudentProgress,
  Conversation,
  ChatMessage,
  SupabaseResponse,
} from '../types/agents';

export type {
  PedagogicalSettings,
  StudentProfile,
  GradingScale,
  CourseImage,
  CourseContext,
} from '../types/pedagogical';
