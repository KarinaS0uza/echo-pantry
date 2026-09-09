import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useTheme, webStyle } from '@/design/theme';
import type tokens from '@/design/tokens';

export function Stack({ children, direction = 'column', gap = 'sm', align = 'stretch', justify, wrap = false, variant, id }: PropsWithChildren<{ direction?: 'row' | 'column'; gap?: keyof typeof tokens.space; align?: 'center' | 'stretch' | 'flex-start' | 'flex-end'; justify?: 'center' | 'space-between' | 'flex-start' | 'flex-end'; wrap?: boolean; variant?: 'grid' | 'grow' | 'center'; id?: string }>) {
  const { t } = useTheme();
  return <View nativeID={id} dataSet={{ grid: variant === 'grid' ? '' : undefined }} style={webStyle({ flexDirection: direction, gap: t.space[gap], alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : 'nowrap', minWidth: t.space.none, flex: variant === 'grow' ? 1 : undefined, alignSelf: variant === 'center' ? 'center' : undefined })}>{children}</View>;
}
