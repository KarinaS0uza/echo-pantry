import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme, webStyle } from '@/design/theme';
import { Icon } from './Icon';
import type tokens from '@/design/tokens';

export function CategoryIcon({ category = 'pantry', label }: { category?: string; label?: string }) {
  const name = category === 'produce' ? 'Carrot' : category === 'dairy' ? 'Milk' : category === 'meat' ? 'Beef' : category === 'frozen' ? 'Snowflake' : 'Package';
  return <Icon name={name} size="lg" tone="secondary" label={label} />;
}
export function Image({ src, alt, category, aspect = 'card', treatment = 'framed', decorative = false }: { src?: string; alt: string; category?: string; aspect?: keyof typeof tokens.layout.aspect; treatment?: 'framed' | 'floating'; decorative?: boolean }) {
  const { color, t, scheme } = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <View aria-hidden={decorative} style={webStyle({ width: t.layout.full, aspectRatio: t.layout.aspect[aspect], background: color.bg.subtle, borderRadius: treatment === 'framed' ? t.radius.lg : t.radius.none, overflow: treatment === 'framed' ? 'hidden' : 'visible', boxShadow: treatment === 'floating' && scheme === 'light' ? t.elevation.contact : undefined, justifyContent: 'center', alignItems: 'center' })}>
    {src && !failed ? <img src={src} alt={decorative ? '' : alt} onError={() => setFailed(true)} style={{ width: t.layout.full, height: t.layout.full, objectFit: treatment === 'framed' ? 'cover' : 'contain' }} /> : <CategoryIcon category={category} label={decorative ? undefined : alt} />}
  </View>;
}
