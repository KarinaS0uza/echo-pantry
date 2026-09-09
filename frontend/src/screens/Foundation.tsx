import { useLocation } from 'react-router-dom';
import { AppShell, AuthShell, ListTemplate, EmptyState, Button, Stack } from '@/components';
import { useT } from '@/i18n';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';

/** Route scaffolds. Product workflows are implemented by the following story phases. */
export function Foundation() {
  const t = useT();
  const { pathname } = useLocation();
  const navigate = useGuardedNavigate();
  const auth = pathname === '/sign-in' || pathname === '/sign-up';
  const title = pathname === '/pantry' ? t('nav.pantry') : pathname === '/my-recipes' ? t('nav.recipes') : auth ? t(pathname === '/sign-in' ? 'nav.signIn' : 'nav.signUp') : t('foundation.title');
  const description = pathname === '/pantry' ? t('foundation.pantryBody') : pathname === '/my-recipes' ? t('foundation.recipesBody') : auth ? t('foundation.authBody') : t('foundation.description');
  const actions = <Stack gap="md">{auth && <Button variant="ghost" label={t('foundation.back')} onPress={() => navigate('/meals')} />}</Stack>;
  return auth ? <AuthShell><EmptyState title={title} description={description} action={actions} /></AuthShell> : <AppShell><ListTemplate title={title} introduction={description}>{actions}</ListTemplate></AppShell>;
}
