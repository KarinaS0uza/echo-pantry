import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthShell, Button, HeroHeading, Image, Stack, Text } from '@/components';
import { useSession } from '@/api/session';
import { useT } from '@/i18n';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';

export function Landing() {
  const t = useT();
  const account = useSession();
  const navigate = useGuardedNavigate();
  const [noticeOpen, setNoticeOpen] = useState(false);

  if (account) return <Navigate to="/kitchen" replace />;

  return <AuthShell>
    <HeroHeading title={t('landing.title')} description={t('landing.description')} />
    <Image src="/images/kitchen/ingredients.png" alt="" decorative treatment="floating" aspect="card" />
    <Stack gap="sm">
      <Button label={t('landing.trySample')} iconRight="ArrowRight" fullWidth onPress={() => navigate('/meals')} />
      <Stack direction="row" justify="center" wrap gap="sm">
        <Button variant="ghost" label={t('nav.signIn')} onPress={() => navigate('/sign-in')} />
        <Button variant="ghost" label={t('landing.createAccount')} onPress={() => navigate('/sign-up')} />
      </Stack>
      <Stack align="center">
        <Button expanded={noticeOpen} controls="landing-data-notice" variant="ghost" label={t('landing.noticeTitle')} onPress={() => setNoticeOpen(open => !open)} />
      </Stack>
    </Stack>
    {noticeOpen && <Text id="landing-data-notice">{t('landing.noticeBody')}</Text>}
  </AuthShell>;
}
