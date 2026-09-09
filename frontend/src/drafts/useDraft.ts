import { useCallback, useEffect, useRef, useState } from 'react';
import { timing } from '@/design/tokens';
import { storage } from '@/api/storage';

type DraftValue = string | number | boolean | null;
type DraftFields = Record<string, DraftValue>;
const sensitive = /password|secret|token|payment|card|cvv/i;
export const draftKey = (formId: string, entityId = 'new') => `echo:draft:v1:${formId}:${entityId}`;

export function useDraft<T extends DraftFields>(formId: string, initial: T, fields: (keyof T)[], entityId = 'new') {
  const key = draftKey(formId, entityId);
  const baseline = useRef(initial);
  const allowed = useRef(fields.filter(field => !sensitive.test(String(field))));
  const [restored, setRestored] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [, setRevision] = useState(0);
  const [values, setValues] = useState<T>(() => {
    try {
      const saved = JSON.parse(storage.read(key) || 'null');
      if (!saved) return initial;
      if (typeof saved.savedAt !== 'number' || Date.now() - saved.savedAt < 0 || Date.now() - saved.savedAt > timing.draftMaxAge || !saved.values || typeof saved.values !== 'object') { storage.remove(key); return initial; }
      const clean = Object.fromEntries(allowed.current.filter(field => Object.hasOwn(saved.values, field) && typeof saved.values[field] === typeof initial[field]).map(field => [field, saved.values[field]]));
      if (Object.keys(clean).length) { setRestored(true); return { ...initial, ...clean }; }
    } catch { storage.remove(key); }
    return initial;
  });
  const live = useRef(values); live.current = values;
  const active = useRef(true);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline.current);
  const flush = useCallback(() => {
    if (!active.current || JSON.stringify(live.current) === JSON.stringify(baseline.current)) return;
    const safe = Object.fromEntries(allowed.current.map(field => [field, live.current[field]]));
    setSaveFailed(!storage.write(key, JSON.stringify({ savedAt: Date.now(), values: safe })));
  }, [key]);
  useEffect(() => {
    active.current = true;
    const timer = setTimeout(flush, timing.draftSaveDebounce);
    return () => clearTimeout(timer);
  }, [values, flush]);
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [flush]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const clear = useCallback(() => {
    active.current = false;
    const removed = storage.remove(key);
    baseline.current = live.current;
    setRestored(false); setSaveFailed(!removed);
    setRevision(value => value + 1);
  }, [key]);
  const discard = useCallback(() => {
    active.current = false;
    live.current = baseline.current;
    setValues(baseline.current);
    const removed = storage.remove(key);
    setRestored(false); setSaveFailed(!removed);
  }, [key]);
  return { values, setValues, dirty, restored, saveFailed, clear, discard, flush };
}
