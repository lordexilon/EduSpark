/// <reference types="vite/client" />
// =====================================================
// Servicio de Configuración Centralizado
// Gestión unificada de configuración del sistema multi-agente
// =====================================================

// =====================================================
// Tipos de Configuración
// =====================================================

export interface SystemConfig {
  supabase: {
    url: string;
    anonKey: string;
    timeout: number;
  };
  gemini: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  memory: {
    maxLocalMessages: number;
    contextWindowSize: number;
    enableLongTermMemory: boolean;
    autoSummarizeThreshold: number;
  };
  agents: {
    voice: {
      enabled: boolean;
      defaultVoice: string;
      defaultSpeed: number;
    };
    rag: {
      enabled: boolean;
      searchLimit: number;
      similarityThreshold: number;
    };
    context: {
      enabled: boolean;
      maxContextLength: number;
      includeStudentProfile: boolean;
    };
    coordinator: {
      enabled: boolean;
      maxIterations: number;
      timeout: number;
    };
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    animations: boolean;
  };
  debug: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    saveLogs: boolean;
  };
}

// =====================================================
// Configuración por Defecto
// =====================================================

const DEFAULT_CONFIG: SystemConfig = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    timeout: 30000
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash',
    maxTokens: 2048,
    temperature: 0.7
  },
  memory: {
    maxLocalMessages: 50,
    contextWindowSize: 10,
    enableLongTermMemory: true,
    autoSummarizeThreshold: 20
  },
  agents: {
    voice: {
      enabled: true,
      defaultVoice: 'Kore',
      defaultSpeed: 1.0
    },
    rag: {
      enabled: true,
      searchLimit: 5,
      similarityThreshold: 0.7
    },
    context: {
      enabled: true,
      maxContextLength: 4000,
      includeStudentProfile: true
    },
    coordinator: {
      enabled: true,
      maxIterations: 3,
      timeout: 30000
    }
  },
  ui: {
    theme: 'dark',
    language: 'es',
    animations: true
  },
  debug: {
    enabled: import.meta.env.DEV,
    logLevel: 'info',
    saveLogs: false
  }
};

// =====================================================
// Clase de Gestión de Configuración
// =====================================================

export class ConfigService {
  private config: SystemConfig;
  private listeners: Map<string, ((config: SystemConfig) => void)[]> = new Map();

  constructor(initialConfig?: Partial<SystemConfig>) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, initialConfig || {});
    this.loadFromStorage();
  }

  /**
   * Obtiene la configuración completa
   */
  getConfig(): SystemConfig {
    return { ...this.config };
  }

  /**
   * Obtiene una sección específica de la configuración
   */
  getSection<K extends keyof SystemConfig>(section: K): SystemConfig[K] {
    return { ...this.config[section] };
  }

  /**
   * Actualiza una sección de la configuración
   */
  updateSection<K extends keyof SystemConfig>(
    section: K,
    updates: Partial<SystemConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Actualiza un valor específico en la configuración
   */
  updateValue<K extends keyof SystemConfig, T extends keyof SystemConfig[K]>(
    section: K,
    key: T,
    value: SystemConfig[K][T]
  ): void {
    this.config[section] = { ...this.config[section], [key]: value };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Resetea la configuración a los valores por defecto
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Valida la configuración actual
   */
  validate(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar Supabase
    if (!this.config.supabase.url) {
      errors.push('Supabase URL no configurada');
    }
    if (!this.config.supabase.anonKey) {
      errors.push('Supabase Anon Key no configurada');
    }


    // Validar Gemini
    if (!this.config.gemini.apiKey) {
      errors.push('Gemini API Key no configurada');
    }

    // Warnings
    if (this.config.memory.maxLocalMessages > 100) {
      warnings.push('Número alto de mensajes locales puede afectar el rendimiento');
    }


    if (this.config.gemini.temperature > 1.0) {
      warnings.push('Temperatura de Gemini muy alta puede generar respuestas inconsistentes');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Exporta la configuración actual
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importa una configuración
   */
  importConfig(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = this.mergeConfig(DEFAULT_CONFIG, importedConfig);
      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error importing configuration:', error);
      return false;
    }
  }

  /**
   * Suscribe a cambios en la configuración
   */
  subscribe(listener: (config: SystemConfig) => void): () => void {
    const id = Math.random().toString(36).substr(2, 9);
    this.listeners.set(id, [listener]);

    return () => {
      this.listeners.delete(id);
    };
  }

  /**
   * Obtiene configuración específica para un agente
   */
  getAgentConfig(agentType: 'voice' | 'rag' | 'context' | 'coordinator') {
    return this.config.agents[agentType];
  }

  /**
   * Verifica si un agente está habilitado
   */
  isAgentEnabled(agentType: 'voice' | 'rag' | 'context' | 'coordinator'): boolean {
    return this.config.agents[agentType].enabled;
  }

  /**
   * Habilita o deshabilita un agente
   */
  setAgentEnabled(agentType: 'voice' | 'rag' | 'context' | 'coordinator', enabled: boolean): void {
    this.updateValue('agents', agentType, { ...this.config.agents[agentType], enabled });
  }

  /**
   * Obtiene la configuración de memoria
   */
  getMemoryConfig() {
    return this.config.memory;
  }

  /**
   * Obtiene la configuración de UI
   */
  getUIConfig() {
    return this.config.ui;
  }

  /**
   * Actualiza la configuración de UI
   */
  updateUIConfig(updates: Partial<SystemConfig['ui']>): void {
    this.updateSection('ui', updates);
  }

  /**
   * Obtiene la configuración de debug
   */
  getDebugConfig() {
    return this.config.debug;
  }

  /**
   * Habilita o deshabilita el modo debug
   */
  setDebugEnabled(enabled: boolean): void {
    this.updateValue('debug', 'enabled', enabled);
  }

  /**
   * Combina configuraciones de forma recursiva
   */
  private mergeConfig(defaultConfig: SystemConfig, userConfig: Partial<SystemConfig>): SystemConfig {
    const result = { ...defaultConfig };

    for (const key in userConfig) {
      if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
        result[key as keyof SystemConfig] = {
          ...(result[key as keyof SystemConfig] as any),
          ...(userConfig[key] as any)
        };
      } else {
        result[key as keyof SystemConfig] = userConfig[key] as any;
      }
    }

    return result;
  }

  /**
   * Carga la configuración desde localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('eduspark-config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        this.config = this.mergeConfig(this.config, parsedConfig);
      }
    } catch (error) {
      console.warn('Error loading configuration from storage:', error);
    }
  }

  /**
   * Guarda la configuración en localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('eduspark-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Error saving configuration to storage:', error);
    }
  }

  /**
   * Notifica a los listeners sobre cambios
   */
  private notifyListeners(): void {
    this.listeners.forEach(listeners => {
      listeners.forEach(listener => listener(this.config));
    });
  }
}

// =====================================================
// Instancia Singleton
// =====================================================

export const configService = new ConfigService();

// =====================================================
// Funciones de Utilidad
// =====================================================

/**
 * Obtiene la configuración actual
 */
export const getConfig = (): SystemConfig => configService.getConfig();

/**
 * Obtiene una sección de la configuración
 */
export const getConfigSection = <K extends keyof SystemConfig>(section: K): SystemConfig[K] =>
  configService.getSection(section);

/**
 * Actualiza una sección de la configuración
 */
export const updateConfigSection = <K extends keyof SystemConfig>(
  section: K,
  updates: Partial<SystemConfig[K]>
): void => configService.updateSection(section, updates);

/**
 * Valida la configuración actual
 */
export const validateConfig = () => configService.validate();

/**
 * Resetea la configuración a los valores por defecto
 */
export const resetConfig = () => configService.resetToDefaults();

/**
 * Verifica si un agente está habilitado
 */
export const isAgentEnabled = (agentType: 'voice' | 'rag' | 'context' | 'coordinator'): boolean =>
  configService.isAgentEnabled(agentType);

/**
 * Habilita o deshabilita un agente
 */
export const setAgentEnabled = (agentType: 'voice' | 'rag' | 'context' | 'coordinator', enabled: boolean): void =>
  configService.setAgentEnabled(agentType, enabled);

// =====================================================
// Configuraciones Específicas por Entorno
// =====================================================

export const getEnvironmentConfig = (): Partial<SystemConfig> => {
  const env = import.meta.env.MODE;

  switch (env) {
    case 'development':
      return {
        debug: {
          enabled: true,
          logLevel: 'debug',
          saveLogs: true
        },
        memory: {
          maxLocalMessages: 20,
          contextWindowSize: 5,
          enableLongTermMemory: true,
          autoSummarizeThreshold: 10
        }
      };

    case 'production':
      return {
        debug: {
          enabled: false,
          logLevel: 'error',
          saveLogs: false
        },
        memory: {
          maxLocalMessages: 100,
          contextWindowSize: 20,
          enableLongTermMemory: true,
          autoSummarizeThreshold: 50
        }
      };

    case 'test':
      return {
        debug: {
          enabled: true,
          logLevel: 'warn',
          saveLogs: false
        },
        memory: {
          maxLocalMessages: 10,
          contextWindowSize: 3,
          enableLongTermMemory: false,
          autoSummarizeThreshold: 5
        }
      };

    default:
      return {};
  }
};

// Aplicar configuración del entorno
const envConfig = getEnvironmentConfig();
Object.keys(envConfig).forEach(section => {
  configService.updateSection(section as keyof SystemConfig, envConfig[section as keyof SystemConfig] as any);
});
