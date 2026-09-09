import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { checkReachability, getReachability, subscribeReachability } from '@/api/client';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Stack } from '@/components/Stack';

export function OfflineBanner() {
  const reachable = useSyncExternalStore(subscribeReachability, getReachability);
  const queryClient = useQueryClient();
  const { color, t } = useTheme();
  const translate = useT();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function probe() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      try { await checkReachability(); } catch { /* The reachability store owns this state. */ } finally { busy = false; }
    }
    void probe();
    const timer = setInterval(() => void probe(), t.timing.reachabilityInterval);
    window.addEventListener('online', probe); window.addEventListener('offline', probe); window.addEventListener('focus', probe);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('online', probe); window.removeEventListener('offline', probe); window.removeEventListener('focus', probe); };
  }, [t]);
  useEffect(() => { if (reachable) void queryClient.invalidateQueries(); }, [reachable, queryClient]);
  if (reachable !== false) return null;
  return <aside aria-live="polite" style={{ position: 'sticky', top: t.space.none, zIndex: t.zIndex.banner, background: color.bg.subtle, padding: t.space.sm }}><Stack direction="row" align="center" wrap><Text>{translate('connection.offline')}</Text><Button variant="secondary" loading={pending} label={translate('common.retry')} onPress={async () => { setPending(true); try { await checkReachability(); } catch { /* Keep the banner visible. */ } finally { setPending(false); } }} /></Stack></aside>;
}
