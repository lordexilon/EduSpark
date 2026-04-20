import { useSyncExternalStore } from 'react';
import {
  getCourseViewCardLocale,
  type CourseViewCardLocale,
  EDUSPARK_UI_LANG_STORAGE_KEY,
} from '@/constants/courseViewCardLabels';

const LANG_CHANGE_EVENT = 'eduspark-ui-lang-change';

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(LANG_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(LANG_CHANGE_EVENT, onStoreChange);
  };
}

/**
 * Preferencia de idioma UI (es / gn) persistida en `localStorage`.
 * Re-renderiza al cambiar desde el selector o otra pestaña (`storage`).
 */
export function useUiLang(): CourseViewCardLocale {
  return useSyncExternalStore(subscribe, getCourseViewCardLocale, () => 'es');
}

export function setUiLang(locale: CourseViewCardLocale): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EDUSPARK_UI_LANG_STORAGE_KEY, locale === 'gn' ? 'gn' : 'es');
  window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
}
