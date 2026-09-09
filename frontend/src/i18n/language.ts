import type { i18n } from 'i18next';
import { useSyncExternalStore } from 'react';
import { storage } from '@/api/storage';

export const LANGUAGE_KEY = 'echo:ui:v1:language';
export type Language = 'en' | 'pt-BR';
export const supported = (value: unknown): value is Language => value === 'en' || value === 'pt-BR';
export function initialLanguage(): Language {
  const value = storage.read(LANGUAGE_KEY);
  return supported(value) ? value : 'en';
}

export function createLanguageController(runtime: i18n) {
  let state = { active: initialLanguage(), pending: false, saveFailed: false, changeFailed: false };
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async change(language: Language) {
      if (!supported(language) || state.pending) return false;
      state = { ...state, pending: true, changeFailed: false };
      notify();
      try {
        await runtime.changeLanguage(language);
        document.documentElement.lang = language;
        state = { active: language, pending: false, saveFailed: !storage.write(LANGUAGE_KEY, language), changeFailed: false };
      } catch {
        state = { ...state, pending: false, changeFailed: true };
      }
      notify();
      return !state.changeFailed;
    },
  };
}

export function useLanguageState(controller: ReturnType<typeof createLanguageController>) {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot);
}
