import { ApiError, request } from '@/api/client';
import { acceptSession } from '@/api/session';
import type { Tokens, User } from '@/api/endpoints';
import { useState, type FormEvent } from 'react';
import { AuthShell, Button, Checkbox, Input, Stack, Text } from '@/components';
import { useT } from '@/i18n';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export function SignUp() {
  const t = useT();
  const [pending, setPending] = useState(false);
  const navigate = useGuardedNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const trimmed = email.trim();
    const next: { name?: string; email?: string; password?: string } = {};
    if (!name.trim()) next.name = t('common.required', { label: t('auth.name') });
    if (!trimmed) next.email = t('common.required', { label: t('auth.email') });
    else if (!EMAIL.test(trimmed)) next.email = t('auth.emailInvalid');
    if (!password) next.password = t('common.required', { label: t('auth.password') });
    else if (password.length < MIN_PASSWORD) next.password = t('auth.passwordShort');
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true); setNotice('');
    try { const result = await request<Tokens & { user: User; pantrySeeded: number }>('/auth/register', { method: 'POST', anonymous: true, body: { email: trimmed, password, name: name.trim() } }); acceptSession(result, result.user); navigate('/pantry?welcome=1'); }
    catch (error) { if (error instanceof ApiError) setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([key, value]) => [key, value.join(' ')]))); setNotice(t('owned.saveFailed')); }
    finally { setPending(false); }
  }

  return (
    <AuthShell>
      <Stack gap="2xs">
        <Text heading variant="h1Compact">{t('auth.signUpTitle')}</Text>
        <Text tone="secondary">{t('auth.signUpSubtitle')}</Text>
      </Stack>
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <Input
            label={t('auth.name')}
            autoComplete="name"
            required
            value={name}
            onChange={value => { setName(value); setErrors(current => ({ ...current, name: undefined })); setNotice(''); }}
            error={errors.name}
          />
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
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            helper={t('auth.passwordHelper')}
            required
            value={password}
            onChange={value => { setPassword(value); setErrors(current => ({ ...current, password: undefined })); setNotice(''); }}
            error={errors.password}
          />
          <Checkbox label={t('auth.showPassword')} checked={reveal} onChange={setReveal} />
          <Button type="submit" loading={pending} label={t('auth.submit')} fullWidth />
          {notice ? <Text live tone="secondary">{notice}</Text> : null}
        </Stack>
      </form>
      <Stack gap="2xs" align="center">
        <Text tone="secondary" variant="bodySm">{t('auth.haveAccount')}</Text>
        <Stack variant="center">
          <Button variant="ghost" label={t('auth.signIn')} onPress={() => navigate('/sign-in')} />
        </Stack>
      </Stack>
      <Stack align="center">
        <Button variant="ghost" iconLeft="ArrowLeft" label={t('landing.backHome')} onPress={() => navigate('/')} />
      </Stack>
    </AuthShell>
  );
}
