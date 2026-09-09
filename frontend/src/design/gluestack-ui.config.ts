import { createConfig } from '@gluestack-style/react';
import { AnimationResolver } from '@gluestack-style/animation-resolver';
import { MotionDriver } from './motion-primitives';
import tokens from './tokens';

export function gluestackConfig(scheme: 'light' | 'dark') {
  const color = tokens.color[scheme];
  return createConfig({
    plugins: [new AnimationResolver(MotionDriver)],
    tokens: {
      colors: { background: color.bg.canvas, surface: color.bg.surface, primary: color.action.primary, text: color.text.primary, border: color.border.strong, focus: color.border.focus },
      space: tokens.space, radii: tokens.radius, fontWeights: tokens.font.weight,
      fonts: { body: tokens.font.family.base, heading: tokens.font.family.base, mono: tokens.font.family.numeric },
      fontSizes: Object.fromEntries(Object.entries(tokens.type).map(([key, value]) => [key, value.size])),
      lineHeights: Object.fromEntries(Object.entries(tokens.type).map(([key, value]) => [key, value.lineHeight])),
      breakpoints: tokens.breakpoint,
    },
    aliases: { bg: 'backgroundColor', p: 'padding', rounded: 'borderRadius' },
  });
}
