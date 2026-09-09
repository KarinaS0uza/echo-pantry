import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';
import en from '../src/i18n/en.json';
import pt from '../src/i18n/pt-BR.json';
import { createLanguageController, initialLanguage, LANGUAGE_KEY } from '../src/i18n/language';

beforeEach(() => localStorage.clear());
describe('explicit language preference', () => {
  it('starts in English even on a Portuguese browser', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR');
    expect(initialLanguage()).toBe('en');
  });
  it.each(['en', 'pt-BR'])('reads supported saved choice %s', value => {
    localStorage.setItem(LANGUAGE_KEY, value); expect(initialLanguage()).toBe(value);
  });
  it.each(['pt', 'fr', 'null', '"pt-BR"', ''])('ignores invalid choice %s', value => {
    localStorage.setItem(LANGUAGE_KEY, value); expect(initialLanguage()).toBe('en');
  });
  it('tolerates unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(initialLanguage()).toBe('en');
  });
  it('switches bundled strings, document language, and reload preference', async () => {
    const runtime = i18next.createInstance();
    await runtime.init({ resources: { en: { translation: en }, 'pt-BR': { translation: pt } }, lng: initialLanguage(), fallbackLng: 'en', load: 'currentOnly' });
    const controller = createLanguageController(runtime);
    expect(await controller.change('pt-BR')).toBe(true);
    expect(runtime.t('nav.menu')).toBe('Abrir menu');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(initialLanguage()).toBe('pt-BR');
  });
  it('keeps the active language when its storage write fails', async () => {
    const runtime = i18next.createInstance(); await runtime.init({ lng: 'en' });
    const controller = createLanguageController(runtime);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await controller.change('pt-BR');
    expect(controller.getSnapshot()).toEqual({ active: 'pt-BR', pending: false, saveFailed: true, changeFailed: false });
    expect(runtime.language).toBe('pt-BR');
  });
  it('guards overlapping changes and preserves language on runtime failure', async () => {
    const runtime = i18next.createInstance(); await runtime.init({ lng: 'en' });
    const controller = createLanguageController(runtime);
    let finish!: () => void;
    const change = vi.spyOn(runtime, 'changeLanguage').mockImplementation(() => new Promise(resolve => { finish = () => resolve(runtime.t); }));
    const pending = controller.change('pt-BR');
    expect(await controller.change('en')).toBe(false);
    expect(change).toHaveBeenCalledTimes(1);
    finish(); await pending;
    change.mockRejectedValue(new Error('runtime'));
    await controller.change('en');
    expect(controller.getSnapshot().active).toBe('pt-BR');
    expect(controller.getSnapshot().changeFailed).toBe(true);
  });
  it('bundles the same keys and interpolation variables in both languages', () => {
    function flat(value: object, prefix = ''): Record<string, string> {
      return Object.fromEntries(Object.entries(value).flatMap(([key, content]) => typeof content === 'object' ? Object.entries(flat(content, `${prefix}${key}.`)) : [[`${prefix}${key}`, content]]));
    }
    const english = flat(en), portuguese = flat(pt);
    expect(Object.keys(portuguese).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) expect(portuguese[key].match(/{{\w+}}/g)).toEqual(english[key].match(/{{\w+}}/g));
  });
});
