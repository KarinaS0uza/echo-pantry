import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useTheme, webStyle } from '@/design/theme';
import type tokens from '@/design/tokens';

export function Surface({ children, bg = 'surface', padding = 'md', radius = 'lg', elevation = 'resting', variant }: PropsWithChildren<{ bg?: 'canvas' | 'surface' | 'subtle' | 'glass' | 'inverse'; padding?: keyof typeof tokens.space; radius?: keyof typeof tokens.radius; elevation?: keyof typeof tokens.elevation; variant?: 'auth' | 'prose' | 'fill' | 'image' }>) {
  const { color, t, scheme } = useTheme();
  return <View style={webStyle({ backgroundColor: color.bg[bg], padding: t.space[padding], borderRadius: t.radius[radius], boxShadow: scheme === 'dark' ? t.elevation.none : t.elevation[elevation], border: scheme === 'dark' && elevation !== 'none' ? `${t.size.hairline} solid ${color.border.subtle}` : undefined, backdropFilter: bg === 'glass' ? `blur(${t.blur.md})` : undefined, maxWidth: variant === 'auth' ? t.layout.authWidth : variant === 'prose' ? t.measure.max : undefined, width: variant === 'auth' || variant === 'fill' ? t.layout.full : undefined, alignSelf: variant === 'auth' ? 'center' : undefined, position: 'relative', minWidth: t.space.none })}>{children}</View>;
}
