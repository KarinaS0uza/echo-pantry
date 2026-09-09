import { useState, type FormEvent } from 'react';
import { AuthShell, Button, Input, Stack, Text } from '@/components';
import { useT } from '@/i18n';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';

import { ApiError } from '@/api/client';
import { signIn, signOut } from '@/api/session';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignIn() {
  const t = useT();
  const navigate = useGuardedNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const trimmed = email.trim();
    const next: { email?: string; password?: string } = {};
    if (!trimmed) next.email = t('common.required', { label: t('auth.email') });
    else if (!EMAIL.test(trimmed)) next.email = t('auth.emailInvalid');
    if (!password) next.password = t('common.required', { label: t('auth.password') });
    setErrors(next);
    setNotice('');
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await signIn(trimmed, password);
      setPassword('');
      navigate('/pantry');
    } catch (error) {
      setNotice(t(error instanceof ApiError && error.status === 401 ? 'auth.invalidCredentials' : error instanceof ApiError && error.status === 429 ? 'auth.tooManyAttempts' : 'auth.connectionError'));
    } finally { setPending(false); }
  }

  return (
    <AuthShell>
      <Stack gap="2xs">
        <Text variant="label" tone="accent">{t('auth.signInKicker')}</Text>
        <Text heading variant="h1">{t('auth.signInTitle')}</Text>
        <Text tone="secondary">{t('auth.signInSubtitle')}</Text>
      </Stack>
      <Stack gap="sm">
        <Button variant="secondary" label={t('auth.continueDemo')} fullWidth disabled={pending} onPress={() => { signOut(); navigate('/pantry'); }} />
        <Text tone="secondary">{t('auth.demoDescription')}</Text>
      </Stack>
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={value => { setEmail(value); setErrors(current => ({ ...current, email: undefined })); setNotice(''); }}
            error={errors.email}
          />
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={value => { setPassword(value); setErrors(current => ({ ...current, password: undefined })); setNotice(''); }}
            error={errors.password}
          />
          <Button type="submit" label={t('auth.signInSubmit')} fullWidth loading={pending} disabled={pending} />
          {notice ? <Text live tone="secondary">{notice}</Text> : null}
        </Stack>
      </form>
      <Text>{t('owned.resetNote')}</Text>
      <Stack align="center">
        <Button variant="ghost" label={t('auth.signUp')} onPress={() => navigate('/sign-up')} />
      </Stack>
      <Stack align="center">
        <Button variant="ghost" iconLeft="ArrowLeft" label={t('landing.backHome')} onPress={() => navigate('/')} />
      </Stack>
    </AuthShell>
  );
}
