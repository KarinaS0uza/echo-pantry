import { createContext, useContext, useMemo, useState, useEffect, type PropsWithChildren, type CSSProperties } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import type { Transition } from 'motion/react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { OverlayProvider } from '@react-native-aria/overlays';
import { storage } from '@/api/storage';
import tokens from './tokens';
import { gluestackConfig } from './gluestack-ui.config';

export { MotionView, MotionPressable } from './motion-primitives';
export type Scheme = 'light' | 'dark';
export type ThemePreference = Scheme | 'system';
type ThemeColor = typeof tokens.color.light | typeof tokens.color.dark;
type ThemeValue = { scheme: Scheme; preference: ThemePreference; color: ThemeColor; t: typeof tokens; reduceMotion: boolean; setScheme: (scheme: ThemePreference) => void };
const ThemeContext = createContext<ThemeValue | null>(null);
export const webStyle = (style: CSSProperties) => style as unknown as ViewStyle & TextStyle;
const media = (query: string) => typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;

export function ThemeProvider({ children, forceScheme }: PropsWithChildren<{ forceScheme?: Scheme }>) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const saved = storage.read('echo:ui:v1:theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  });
  const [systemDark, setSystemDark] = useState(() => media('(prefers-color-scheme: dark)')?.matches ?? false);
  const [reduceMotion, setReduceMotion] = useState(() => media('(prefers-reduced-motion: reduce)')?.matches ?? false);
  useEffect(() => {
    const dark = media('(prefers-color-scheme: dark)');
    const motion = media('(prefers-reduced-motion: reduce)');
    const sync = () => { setSystemDark(dark?.matches ?? false); setReduceMotion(motion?.matches ?? false); };
    dark?.addEventListener('change', sync); motion?.addEventListener('change', sync);
    return () => { dark?.removeEventListener('change', sync); motion?.removeEventListener('change', sync); };
  }, []);
  const scheme = forceScheme ?? (preference === 'system' ? (systemDark ? 'dark' : 'light') : preference);
  const value = useMemo<ThemeValue>(() => ({ scheme, preference, color: tokens.color[scheme], t: tokens, reduceMotion, setScheme(next) { setPreference(next); storage.write('echo:ui:v1:theme', next); } }), [scheme, preference, reduceMotion]);
  const config = useMemo(() => gluestackConfig(scheme), [scheme]);
  useEffect(() => { document.documentElement.dataset.theme = scheme; document.documentElement.style.colorScheme = scheme; }, [scheme]);
  return <ThemeContext.Provider value={value}><GluestackUIProvider config={config} colorMode={scheme}><OverlayProvider>{children}</OverlayProvider></GluestackUIProvider></ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is required.');
  return value;
}
export function useTransition(spring: Transition): Transition {
  const { reduceMotion, t } = useTheme();
  return reduceMotion ? { duration: t.motion.duration.instant } : { ...spring, duration: t.motion.duration.base / t.timing.second };
}

/** Local theme for immersive cooking, without changing the page preference. */
export function ThemeScope({ children, scheme }: PropsWithChildren<{ scheme: Scheme }>) {
  const parent = useTheme();
  return <ThemeContext.Provider value={{ ...parent, scheme, color: tokens.color[scheme] }}>{children}</ThemeContext.Provider>;
}
