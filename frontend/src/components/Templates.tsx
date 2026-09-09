import type { PropsWithChildren, ReactNode } from 'react';
import { useTheme } from '@/design/theme';
import { Text } from './Text';
import { Stack } from './Stack';
import { Surface } from './Surface';
import { Skeleton } from './Status';
import { Image } from './Image';
import { GlassIconButton } from './Button';

export function ListTemplate({ children, title, introduction, filters, state = 'ready', empty, error }: PropsWithChildren<{ title?: string; introduction?: string; filters?: ReactNode; state?: 'ready' | 'loading' | 'empty' | 'error'; empty?: ReactNode; error?: ReactNode }>) {
  const { t } = useTheme();
  return <div style={{ paddingBlock: t.space.xl, paddingBottom: t.layout.fabSafeArea }}><Stack gap="lg"><Stack gap="md">{title && <Text heading variant="display">{title}</Text>}{introduction && <Text tone="secondary" variant="bodyLg">{introduction}</Text>}</Stack>{filters}{state === 'loading' ? <Skeleton /> : state === 'empty' ? empty : state === 'error' ? error : children}</Stack></div>;
}
export function DetailTemplate({ children, title, imageSrc, imageAlt, action, onBack, backLabel }: PropsWithChildren<{ title: string; imageSrc?: string; imageAlt: string; action?: ReactNode; onBack?: () => void; backLabel?: string }>) {
  const { t } = useTheme();
  return <div style={{ paddingBlock: t.space.lg, paddingBottom: t.layout.fabSafeArea }}><div style={{ position: 'relative' }}><Image src={imageSrc} alt={imageAlt} aspect="hero" />{imageSrc && onBack && backLabel && <div style={{ position: 'absolute', top: t.space.sm, left: t.space.sm }}><GlassIconButton name="ArrowLeft" label={backLabel} onPress={onBack} /></div>}</div><div style={{ position: 'relative', paddingInline: t.space.sm, transform: `translateY(-${t.space.lg})`, maxWidth: t.measure.max, marginInline: 'auto' }}><Surface variant="prose" radius="xl"><Stack gap="md"><Text heading variant="display">{title}</Text>{children}</Stack>{action && <div data-detail-action="">{action}</div>}</Surface></div></div>;
}
