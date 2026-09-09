import { Children, useEffect, useRef, useState, type PropsWithChildren, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme, type ThemePreference } from '@/design/theme';
import { useT, language } from '@/i18n';
import { useLanguageState, supported } from '@/i18n/language';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';
import { OfflineBanner } from '@/app/OfflineBanner';
import { signOut, useSession } from '@/api/session';
import { Text } from './Text';
import { Button, IconButton } from './Button';
import { BrandLogo } from './BrandLogo';
import { Stack } from './Stack';
import { Surface } from './Surface';
import { Select } from './Input';
import { Sheet } from './Molecules';

export function AppHeader({ onMenu, menuRef }: { onMenu: () => void; menuRef: RefObject<HTMLButtonElement> }) {
  const { color, t } = useTheme();
  const translate = useT();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const sync = () => setScrolled(window.scrollY > 0); sync(); window.addEventListener('scroll', sync, { passive: true }); return () => window.removeEventListener('scroll', sync); }, []);
  return <header style={{ position: 'sticky', top: t.space.none, zIndex: t.zIndex.sticky, background: scrolled ? color.bg.glass : color.bg.canvas, backdropFilter: scrolled ? `blur(${t.blur.sm})` : undefined }}><div data-shell="" style={{ paddingBlock: t.space.sm }}><Stack direction="row" align="center" justify="space-between"><BrandLogo /><IconButton ref={menuRef} name="Menu" label={translate('nav.menu')} onPress={onMenu} /></Stack></div></header>;
}
export function NavDrawer({ open, onClose, menuRef, guest = true, insideKitchen = false }: { open: boolean; onClose: () => void; menuRef: RefObject<HTMLButtonElement>; guest?: boolean; insideKitchen?: boolean }) {
  const translate = useT();
  const { preference, setScheme } = useTheme();
  const locale = useLanguageState(language);
  const user = useSession();
  const location = useLocation();
  const navigate = useGuardedNavigate();
  const inDemo = insideKitchen || location.pathname.startsWith('/demo/');
  const routes = [{ path: '/kitchen', key: 'kitchen.home' }, { path: '/meals', key: 'nav.meals' }, ...(inDemo ? [{ path: '/demo/pantry', key: 'nav.pantry' }] : !guest ? [{ path: '/pantry', key: 'nav.pantry' }, { path: '/my-recipes', key: 'nav.recipes' }] : [])];
  const go = (path: string) => { onClose(); navigate(path); };
  return <Sheet open={open} title={translate('nav.title')} onClose={onClose} finalFocusRef={menuRef} variant="drawer"><Stack gap="lg">
    {user ? <Text>{translate('auth.signedInAs', { name: user.name || user.email })}</Text> : null}
    <nav aria-label={translate('nav.title')}><Stack gap="2xs">{routes.map(route => <Button key={route.path} label={translate(route.key)} variant="ghost" selected={location.pathname === route.path} onPress={() => go(route.path)} />)}</Stack></nav>
    <Select label={translate('settings.theme')} value={preference} onChange={value => setScheme(value as ThemePreference)} options={[{ value: 'system', label: translate('settings.system') }, { value: 'light', label: translate('settings.light') }, { value: 'dark', label: translate('settings.dark') }]} />
    <Select label={translate('settings.language.label')} value={locale.active} loading={locale.pending} helper={locale.saveFailed ? translate('settings.language.notSaved') : undefined} error={locale.changeFailed ? translate('settings.language.changeFailed') : undefined} onChange={value => { if (supported(value)) void language.change(value); }} options={[{ value: 'en', label: translate('settings.language.english'), lang: 'en' }, { value: 'pt-BR', label: translate('settings.language.portuguese'), lang: 'pt-BR' }]} />
    {user || insideKitchen || !guest ? <Button label={translate('nav.signOut')} variant="ghost" onPress={() => { onClose(); navigate('/sign-in', () => { signOut(); }); }} /> : <Stack gap="2xs"><Button label={translate('nav.signIn')} variant="ghost" onPress={() => go('/sign-in')} /><Button label={translate('nav.signUp')} variant="ghost" onPress={() => go('/sign-up')} /></Stack>}
  </Stack></Sheet>;
}
export function AddItemFAB({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { t } = useTheme();
  const translate = useT();
  return <div style={{ position: 'fixed', right: t.space.md, bottom: t.space.md, zIndex: t.zIndex.fab, minHeight: t.size.fab }}><Button size="fab" iconLeft="Plus" label={translate('common.add')} onPress={onPress} disabled={disabled} /></div>;
}
export function AppShell({ children, guest, onAdd, toast }: PropsWithChildren<{ guest?: boolean; onAdd?: () => void; toast?: React.ReactNode[] }>) {
  const [open, setOpen] = useState(false);
  const account = useSession();
  const menu = useRef<HTMLButtonElement>(null);
  const t = useT();
  const { t: tokens } = useTheme();
  return <><a data-skip="" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>{t('nav.skip')}</a><OfflineBanner /><AppHeader onMenu={() => setOpen(true)} menuRef={menu} /><main id="main-content" tabIndex={-1} data-shell="">{children}</main><NavDrawer open={open} onClose={() => setOpen(false)} menuRef={menu} guest={guest ?? !account} />{!(guest ?? !account) && onAdd && <AddItemFAB onPress={onAdd} />}<div aria-live="polite" style={{ position: 'fixed', bottom: tokens.layout.fabSafeArea, right: tokens.space.sm, left: tokens.space.sm, zIndex: tokens.zIndex.toast, pointerEvents: 'none' }}><div style={{ maxWidth: tokens.measure.max, marginInline: 'auto', pointerEvents: 'auto' }}><Stack gap="xs">{Children.toArray(toast).slice(-3)}</Stack></div></div></>;
}
export function AuthShell({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const { t } = useTheme();
  const translate = useT();
  return <><OfflineBanner /><main data-shell="" id="main-content" tabIndex={-1}><div style={{ paddingBlock: t.space.xl, display: 'flex', justifyContent: 'center' }}><Surface variant="auth" padding="md"><Stack gap="lg"><Stack direction="row" align="center" justify="space-between"><BrandLogo destination="/" /><IconButton ref={menu} name="Menu" label={translate('nav.menu')} onPress={() => setOpen(true)} /></Stack>{children}</Stack></Surface></div></main><NavDrawer open={open} onClose={() => setOpen(false)} menuRef={menu} /></>;
}
