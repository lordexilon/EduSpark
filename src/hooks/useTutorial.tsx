/**
 * Hook personalizado para gestionar tutoriales interactivos
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  isTutorialCompleted,
  markTutorialCompleted,
  getTutorialProgress,
  shouldShowTutorial,
  type TutorialId,
} from '@/services/tutorialService';

interface UseTutorialOptions {
  tutorialId: TutorialId;
  autoStart?: boolean; // Iniciar automáticamente si no está completado y no marcó "no volver a mostrar"
  showOnFirstVisit?: boolean; // Mostrar solo en la primera visita
}

export function useTutorial(options: UseTutorialOptions) {
  const { tutorialId, autoStart = false, showOnFirstVisit = false } = options;
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startStep, setStartStep] = useState(0);

  // Verificar estado del tutorial al cargar
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const completed = await isTutorialCompleted(user.id, tutorialId);
        setIsCompleted(completed);

        // Verificar si debe mostrarse (no está marcado como "no volver a mostrar")
        const shouldShow = await shouldShowTutorial(user.id, tutorialId);

        if (!completed && shouldShow) {
          // Cargar progreso guardado
          const progress = getTutorialProgress(tutorialId);
          setStartStep(progress);

          // Auto-iniciar si está configurado
          if (autoStart) {
            // Delay más largo para asegurar que el DOM esté completamente renderizado
            // Especialmente importante para el dashboard que tiene muchos componentes
            setTimeout(() => {
              setIsOpen(true);
            }, 1500);
          }
        }
      } catch (error) {
        console.error('Error verificando tutorial:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkTutorialStatus();
  }, [user?.id, tutorialId, autoStart]);

  const startTutorial = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
  }, []);

  const completeTutorial = useCallback(
    async (dontShowAgain: boolean = false) => {
      if (!user?.id) return;

      try {
        await markTutorialCompleted(user.id, tutorialId, dontShowAgain);
        setIsCompleted(true);
        setIsOpen(false);
      } catch (error) {
        console.error('Error completando tutorial:', error);
      }
    },
    [user?.id, tutorialId]
  );

  const resetTutorial = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { resetTutorial: resetTutorialService } = await import('@/services/tutorialService');
      await resetTutorialService(user.id, tutorialId);
      setIsCompleted(false);
      setStartStep(0);
    } catch (error) {
      console.error('Error reseteando tutorial:', error);
    }
  }, [user?.id, tutorialId]);

  return {
    isOpen,
    isCompleted,
    isLoading,
    startStep,
    startTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial,
  };
}
