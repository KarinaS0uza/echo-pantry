import { OverlayProvider } from '@react-native-aria/overlays';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '@/components/Molecules';
import { Text } from '@/components/Text';
import { Stack } from '@/components/Stack';
import { Button } from '@/components/Button';
import { useT } from '@/i18n';

const Context = createContext<{ navigate: (path: string, beforeNavigate?: () => void) => void; register: (id: symbol, discard: () => void) => () => void } | null>(null);
export function NavigationGuard({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const t = useT();
  const active = useRef(new Map<symbol, () => void>());
  const [pending, setPending] = useState<{ path: string; beforeNavigate?: () => void }>();
  const safeRef = useRef<HTMLButtonElement>(null);
  return <Context.Provider value={{ navigate(path, beforeNavigate) { if (active.current.size) setPending({ path, beforeNavigate }); else { beforeNavigate?.(); void navigate(path); } }, register(id, discard) { active.current.set(id, discard); return () => { active.current.delete(id); }; } }}>
    <OverlayProvider>{children}<Sheet open={pending !== undefined} title={t('draft.leaveTitle')} onClose={() => setPending(undefined)} initialFocusRef={safeRef} variant="dialog"><Text>{t('draft.leaveBody')}</Text><Stack gap="md"><Button ref={safeRef} label={t('draft.keep')} variant="secondary" onPress={() => setPending(undefined)} /><Button label={t('draft.discardChanges')} variant="ghost" onPress={() => { for (const discard of active.current.values()) discard(); const path = pending; setPending(undefined); if (path) { path.beforeNavigate?.(); void navigate(path.path); } }} /></Stack></Sheet>
  </OverlayProvider></Context.Provider>;
}
export function useGuardedNavigate() {
  const context = useContext(Context);
  if (!context) throw new Error('NavigationGuard is required.');
  return context.navigate;
}
export function useDraftGuard(dirty: boolean, discard: () => void) {
  const context = useContext(Context);
  const id = useRef(Symbol());
  useEffect(() => dirty ? context?.register(id.current, discard) : undefined, [context, dirty, discard]);
}
