/**
 * Servicio para gestionar tutoriales interactivos
 * Maneja el estado y persistencia de tutoriales completados
 */

import { supabase } from '@/lib/supabase';

export type TutorialId = 
  | 'welcome'
  | 'course-view' 
  | 'tutor-ai' 
  | 'course-materials' 
  | 'course-evaluations'
  | 'tutor-voice'
  | 'tutor-sources';

export interface TutorialStep {
  id: string;
  target: string; // Selector CSS o ID del elemento
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'scroll' | 'wait';
  actionTarget?: string; // Selector del elemento a interactuar
  actionDelay?: number; // Delay en ms antes de la acción
}

export interface TutorialConfig {
  id: TutorialId;
  name: string;
  description: string;
  steps: TutorialStep[];
}

/**
 * Verifica si un tutorial ha sido completado por el usuario
 */
export async function isTutorialCompleted(
  userId: string,
  tutorialId: TutorialId
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_tutorials')
      .select('completed')
      .eq('user_id', userId)
      .eq('tutorial_id', tutorialId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error verificando tutorial:', error);
      return false;
    }

    return data?.completed || false;
  } catch (error) {
    console.error('Error verificando tutorial:', error);
    // Fallback a localStorage si hay error
    const localKey = `tutorial_${tutorialId}_completed`;
    return localStorage.getItem(localKey) === 'true';
  }
}

/**
 * Marca un tutorial como completado
 */
export async function markTutorialCompleted(
  userId: string,
  tutorialId: TutorialId,
  dontShowAgain: boolean = false
): Promise<void> {
  try {
    // Intentar guardar en Supabase
    const { error } = await supabase
      .from('user_tutorials')
      .upsert({
        user_id: userId,
        tutorial_id: tutorialId,
        completed: true,
        dont_show_again: dontShowAgain,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,tutorial_id'
      });

    if (error) {
      console.error('Error guardando tutorial en Supabase:', error);
    }
  } catch (error) {
    console.error('Error guardando tutorial:', error);
  }

  // Fallback a localStorage
  const localKey = `tutorial_${tutorialId}_completed`;
  localStorage.setItem(localKey, 'true');
  if (dontShowAgain) {
    const dontShowKey = `tutorial_${tutorialId}_dont_show_again`;
    localStorage.setItem(dontShowKey, 'true');
  }
}

/**
 * Verifica si el usuario marcó "no volver a mostrar" para un tutorial
 */
export async function shouldShowTutorial(
  userId: string,
  tutorialId: TutorialId
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_tutorials')
      .select('dont_show_again, completed')
      .eq('user_id', userId)
      .eq('tutorial_id', tutorialId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error verificando tutorial:', error);
      return true; // Por defecto mostrar si hay error
    }

    // Si no existe registro, mostrar (primera vez)
    if (!data) return true;

    // Si marcó "no volver a mostrar", no mostrar
    if (data.dont_show_again) return false;

    // Si está completado pero no marcó "no volver a mostrar", no mostrar automáticamente
    // pero permitir mostrarlo manualmente desde el sidebar
    return false;
  } catch (error) {
    console.error('Error verificando tutorial:', error);
    // Fallback a localStorage
    const dontShowKey = `tutorial_${tutorialId}_dont_show_again`;
    return localStorage.getItem(dontShowKey) !== 'true';
  }
}

/**
 * Resetea un tutorial (marca como no completado)
 */
export async function resetTutorial(
  userId: string,
  tutorialId: TutorialId
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_tutorials')
      .delete()
      .eq('user_id', userId)
      .eq('tutorial_id', tutorialId);

    if (error) {
      console.error('Error reseteando tutorial:', error);
    }
  } catch (error) {
    console.error('Error reseteando tutorial:', error);
  }

  // Limpiar localStorage
  const localKey = `tutorial_${tutorialId}_completed`;
  localStorage.removeItem(localKey);
}

/**
 * Obtiene todos los tutoriales completados del usuario
 */
export async function getCompletedTutorials(
  userId: string
): Promise<TutorialId[]> {
  try {
    const { data, error } = await supabase
      .from('user_tutorials')
      .select('tutorial_id')
      .eq('user_id', userId)
      .eq('completed', true);

    if (error) {
      console.error('Error obteniendo tutoriales:', error);
      return [];
    }

    return (data || []).map((item: any) => item.tutorial_id as TutorialId);
  } catch (error) {
    console.error('Error obteniendo tutoriales:', error);
    // Fallback: leer de localStorage
    const completed: TutorialId[] = [];
    const tutorialIds: TutorialId[] = ['welcome', 'course-view', 'tutor-ai', 'course-materials', 'course-evaluations', 'tutor-voice', 'tutor-sources'];
    tutorialIds.forEach(id => {
      if (localStorage.getItem(`tutorial_${id}_completed`) === 'true') {
        completed.push(id);
      }
    });
    return completed;
  }
}

/**
 * Guarda el progreso de un tutorial (último paso visto)
 */
export function saveTutorialProgress(
  tutorialId: TutorialId,
  stepIndex: number
): void {
  const key = `tutorial_${tutorialId}_progress`;
  localStorage.setItem(key, stepIndex.toString());
}

/**
 * Obtiene el último paso visto de un tutorial
 */
export function getTutorialProgress(tutorialId: TutorialId): number {
  const key = `tutorial_${tutorialId}_progress`;
  const progress = localStorage.getItem(key);
  return progress ? parseInt(progress, 10) : 0;
}

/**
 * Limpia el progreso de un tutorial
 */
export function clearTutorialProgress(tutorialId: TutorialId): void {
  const key = `tutorial_${tutorialId}_progress`;
  localStorage.removeItem(key);
}

