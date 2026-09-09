import { useState } from 'react';
import { signIn, useExpiredSession, useSession } from '@/api/session';
import { useT } from '@/i18n';
import { Sheet } from './Molecules';
import { Input } from './Input';
import { Button } from './Button';
import { Text } from './Text';
import { Stack } from './Stack';
export function SessionRecovery() {
  const expired = useExpiredSession(); const account = useSession(); const t = useT();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false); const [error, setError] = useState('');
  return <Sheet open={expired} title={t('owned.sessionTitle')} onClose={() => {}} variant="dialog"><Text>{t('owned.sessionBody')}</Text><form onSubmit={async event => { event.preventDefault(); if (pending) return; setPending(true); try { await signIn(account?.email || email, password); setPassword(''); setError(''); } catch { setError(t('owned.saveFailed')); } finally { setPending(false); } }}><Stack><Input label={t('auth.email')} value={account?.email || email} onChange={setEmail} type="email" disabled={Boolean(account)} /><Input label={t('auth.password')} value={password} onChange={setPassword} type="password" autoComplete="current-password" /><Button type="submit" label={t('auth.signInSubmit')} loading={pending} />{Boolean(error) && <Text live tone="danger">{error}</Text>}</Stack></form></Sheet>;
}
