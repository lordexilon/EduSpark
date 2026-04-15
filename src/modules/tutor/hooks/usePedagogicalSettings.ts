// =====================================================
// Hook para Gestión de Configuración Pedagógica
// Maneja el estado y operaciones de configuración pedagógica
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import type { PedagogicalSettings, GradingScale, Course } from '../types/pedagogical';
import * as supabaseService from "../services/supabaseService";

interface UsePedagogicalSettingsProps {
  courseId: string;
  teacherId?: string;
  initialSettings?: PedagogicalSettings | null;
  initialGradingScale?: GradingScale | null;
}

interface UsePedagogicalSettingsReturn {
  // Estado
  settings: PedagogicalSettings | null;
  gradingScale: GradingScale | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Acciones
  updateSettings: (updates: Partial<PedagogicalSettings>) => Promise<boolean>;
  updateGradingScale: (updates: Partial<GradingScale>) => Promise<boolean>;
  resetSettings: () => void;
  resetGradingScale: () => void;
  refreshSettings: () => Promise<void>;
  refreshGradingScale: () => Promise<void>;
  
  // Utilidades
  hasChanges: boolean;
  canSave: boolean;
  getSettingsSummary: () => string;
}

export const usePedagogicalSettings = ({
  courseId,
  teacherId,
  initialSettings,
  initialGradingScale
}: UsePedagogicalSettingsProps): UsePedagogicalSettingsReturn => {
  // Estados
  const [settings, setSettings] = useState<PedagogicalSettings | null>(initialSettings || null);
  const [gradingScale, setGradingScale] = useState<GradingScale | null>(initialGradingScale || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Configuración por defecto
  const defaultSettings: PedagogicalSettings = {
    courseId,
    teacherId: teacherId || '',
    teachingStyle: 'constructivista',
    tonePreference: 'amigable',
    detailLevel: 'medio',
    useExamples: true,
    encourageQuestions: true,
    voiceName: 'Kore',
    voiceSpeed: 1.0,
    systemPromptOverride: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const defaultGradingScale: GradingScale = {
    courseId,
    name: 'Escala Estándar',
    scale: [
      { grade: 'A+', minScore: 95, maxScore: 100, description: 'Excelente' },
      { grade: 'A', minScore: 90, maxScore: 94, description: 'Muy bueno' },
      { grade: 'B+', minScore: 85, maxScore: 89, description: 'Bueno' },
      { grade: 'B', minScore: 80, maxScore: 84, description: 'Satisfactorio' },
      { grade: 'C', minScore: 70, maxScore: 79, description: 'Aceptable' },
      { grade: 'F', minScore: 0, maxScore: 69, description: 'Reprobado' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Cargar configuración inicial
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    } else {
      setSettings(defaultSettings);
    }
  }, [initialSettings, courseId]);

  useEffect(() => {
    if (initialGradingScale) {
      setGradingScale(initialGradingScale);
    } else {
      setGradingScale(defaultGradingScale);
    }
  }, [initialGradingScale, courseId]);

  // Actualizar configuración pedagógica
  const updateSettings = useCallback(async (updates: Partial<PedagogicalSettings>): Promise<boolean> => {
    if (!settings) return false;

    try {
      setIsSaving(true);
      setError(null);

      const updatedSettings = {
        ...settings,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const success = await supabaseService.savePedagogicalSettings(updatedSettings);
      
      if (success) {
        setSettings(updatedSettings);
        setHasChanges(false);
        return true;
      } else {
        setError('Error al guardar la configuración');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Actualizar escala de calificación
  const updateGradingScale = useCallback(async (updates: Partial<GradingScale>): Promise<boolean> => {
    if (!gradingScale) return false;

    try {
      setIsSaving(true);
      setError(null);

      const updatedGradingScale = {
        ...gradingScale,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const success = await supabaseService.saveGradingScale(updatedGradingScale);
      
      if (success) {
        setGradingScale(updatedGradingScale);
        setHasChanges(false);
        return true;
      } else {
        setError('Error al guardar la escala de calificación');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [gradingScale]);

  // Resetear configuración
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setHasChanges(false);
    setError(null);
  }, [defaultSettings]);

  const resetGradingScale = useCallback(() => {
    setGradingScale(defaultGradingScale);
    setHasChanges(false);
    setError(null);
  }, [defaultGradingScale]);

  // Refrescar desde la base de datos
  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fetchedSettings = await supabaseService.getPedagogicalSettings(courseId);
      
      if (fetchedSettings) {
        setSettings(fetchedSettings);
        setHasChanges(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la configuración');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  const refreshGradingScale = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fetchedGradingScale = await supabaseService.getGradingScale(courseId);
      
      if (fetchedGradingScale) {
        setGradingScale(fetchedGradingScale);
        setHasChanges(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la escala de calificación');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  // Generar resumen de configuración
  const getSettingsSummary = useCallback((): string => {
    if (!settings) return 'Sin configuración';

    const style = settings.teachingStyle.charAt(0).toUpperCase() + settings.teachingStyle.slice(1);
    const tone = settings.tonePreference.charAt(0).toUpperCase() + settings.tonePreference.slice(1);
    const detail = settings.detailLevel.charAt(0).toUpperCase() + settings.detailLevel.slice(1);
    
    return `${style} • ${tone} • ${detail} • ${settings.voiceName} (${settings.voiceSpeed}x)`;
  }, [settings]);

  // Detectar cambios
  useEffect(() => {
    if (settings && initialSettings) {
      const hasSettingsChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);
      setHasChanges(hasSettingsChanges);
    }
  }, [settings, initialSettings]);

  return {
    // Estado
    settings,
    gradingScale,
    isLoading,
    isSaving,
    error,
    
    // Acciones
    updateSettings,
    updateGradingScale,
    resetSettings,
    resetGradingScale,
    refreshSettings,
    refreshGradingScale,
    
    // Utilidades
    hasChanges,
    canSave: hasChanges && !isSaving && !isLoading,
    getSettingsSummary
  };
};
