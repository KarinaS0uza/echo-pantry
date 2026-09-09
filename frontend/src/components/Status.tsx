import { useEffect, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useTheme, webStyle } from '@/design/theme';
import { useT } from '@/i18n';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button, IconButton, type ButtonProps } from './Button';
import { Stack } from './Stack';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'critical' | 'urgent' | 'soon' | 'success' }) {
  const { color, t } = useTheme();
  const urgency = tone === 'critical' || tone === 'urgent' || tone === 'soon';
  return <View style={webStyle({ alignSelf: 'flex-start', borderRadius: t.radius.pill, paddingTop: t.space['3xs'], paddingBottom: t.space['3xs'], paddingLeft: t.space.xs, paddingRight: t.space.xs, background: urgency ? color.urgency[`${tone}Tint`] : color.bg.subtle })}>
    <Text variant="label" tone={urgency ? tone : tone === 'accent' || tone === 'success' ? 'accent' : 'secondary'}>{label}</Text>
  </View>;
}
export function Chip({ onRemove, ...props }: ButtonProps & { onRemove?: () => void }) {
  const translate = useT();
  return <Stack direction="row" align="center" gap="2xs"><Button {...props} variant="secondary" />{onRemove && <IconButton name="X" label={translate('common.remove', { label: props.label })} onPress={onRemove} disabled={props.disabled || props.loading} />}</Stack>;
}
export function StepMarker({ index }: { index: number }) {
  const { color, t } = useTheme();
  return <View style={webStyle({ width: t.size.stepMarker, height: t.size.stepMarker, borderRadius: t.radius.pill, background: color.action.primary, alignItems: 'center', justifyContent: 'center' })}><Text variant="label" tone="onPrimary">{index}</Text></View>;
}
export function Spinner() {
  const translate = useT();
  return <Stack direction="row" gap="2xs" align="center"><Icon name="LoaderCircle" /><Text live>{translate('common.loading')}</Text></Stack>;
}
export function Skeleton() {
  const { color, t } = useTheme();
  const translate = useT();
  const [visible, setVisible] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setVisible(true), t.timing.skeletonDelay); return () => clearTimeout(timer); }, [t]);
  if (!visible) return null;
  return <View aria-busy style={webStyle({ backgroundColor: color.bg.subtle, borderRadius: t.radius.lg, minHeight: t.space['3xl'], padding: t.space.md })}><Text live tone="secondary">{translate('common.loading')}</Text></View>;
}
export function Divider() {
  const { color, t } = useTheme();
  return <div role="separator" style={{ borderBottom: `${t.size.hairline} solid ${color.border.subtle}` }} />;
}
export function Avatar({ src, fallback }: { src?: string; fallback: string }) {
  const { color, t } = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <View style={webStyle({ width: t.size.fab, height: t.size.fab, borderRadius: t.radius.pill, background: color.bg.subtle, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' })}>{src && !failed ? <img src={src} alt={fallback} onError={() => setFailed(true)} style={{ width: t.layout.full, height: t.layout.full, objectFit: 'cover' }} /> : <Text>{fallback}</Text>}</View>;
}
export function Scrim({ children }: PropsWithChildren) {
  const { color, t } = useTheme();
  return <View style={webStyle({ background: color.bg.scrim, position: 'absolute', inset: t.space.none })}>{children}</View>;
}
