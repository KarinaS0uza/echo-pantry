import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from './en.json';
import pt from './pt-BR.json';
import kitchenEn from './demo-kitchen-en.json';
import kitchenPt from './demo-kitchen-pt.json';
import pantryEn from './demo-pantry-en.json';
import pantryPt from './demo-pantry-pt.json';
import mealsEn from './demo-meals-en.json';
import mealsPt from './demo-meals-pt.json';
import { initialLanguage, createLanguageController, supported } from './language';

export const i18n = i18next.createInstance();
export const ready = i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { ...en, ...kitchenEn, ...pantryEn, ...mealsEn } },
    'pt-BR': { translation: { ...pt, ...kitchenPt, ...pantryPt, ...mealsPt } },
  },
  lng: initialLanguage(), fallbackLng: 'en', supportedLngs: ['en', 'pt-BR'],
  load: 'currentOnly', interpolation: { escapeValue: false }, initImmediate: false,
});
const syncDocument = (language: string) => { document.documentElement.lang = supported(language) ? language : 'en'; };
syncDocument(i18n.language);
i18n.on('languageChanged', syncDocument);
if (import.meta.hot) import.meta.hot.dispose(() => i18n.off('languageChanged', syncDocument));
export const language = createLanguageController(i18n);
export const useT = () => useTranslation().t;
