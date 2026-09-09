import { Text as NativeText } from 'react-native';
import type { PropsWithChildren } from 'react';
import { useTheme, webStyle } from '@/design/theme';
import type tokens from '@/design/tokens';

export type Tone = 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'inverse' | 'onPrimary' | 'link' | 'accent' | 'danger' | 'success' | 'critical' | 'urgent' | 'soon';
export function Text({ children, variant = 'body', tone = 'primary', id, align, heading, live, strike }: PropsWithChildren<{ variant?: keyof typeof tokens.type; tone?: Tone; id?: string; align?: 'left' | 'center' | 'right'; heading?: boolean; live?: boolean; strike?: boolean }>) {
  const { color, t } = useTheme();
  const s = t.type[variant];
  return <NativeText nativeID={id} accessibilityRole={heading ? 'header' : undefined} aria-live={live ? 'polite' : undefined} aria-level={heading ? (variant === 'display' || variant === 'h1' || variant === 'h1Compact' ? 1 : variant === 'h2' ? 2 : 3) : undefined} style={webStyle({ fontFamily: t.font.family.base, fontSize: s.size, lineHeight: s.lineHeight, fontWeight: s.weight, letterSpacing: s.letterSpacing, color: tone === 'critical' || tone === 'urgent' || tone === 'soon' ? color.urgency[tone] : tone === 'danger' || tone === 'success' ? color.feedback[tone] : color.text[tone], textAlign: align, maxWidth: variant.startsWith('body') ? t.measure.max : undefined, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', textDecoration: strike ? 'line-through' : undefined, fontVariantNumeric: variant === 'numeric' ? 'tabular-nums' : undefined })}>{children}</NativeText>;
}
