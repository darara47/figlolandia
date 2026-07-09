import { TextStyle } from 'react-native';
import { colors, fonts } from './tokens';

export const typography: Record<string, TextStyle> = {
  'display-xl': {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.text.primary,
  },
  display: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text.primary,
  },
  section: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.primary,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
  },
  stat: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
};

export const textColorFromClassName = (className?: string): TextStyle => {
  if (!className) return {};

  const style: TextStyle = {};

  if (className.includes('text-gold')) style.color = colors.gold.DEFAULT;
  if (className.includes('text-brand')) style.color = colors.brand.DEFAULT;
  if (className.includes('text-success')) style.color = colors.success;
  if (className.includes('text-danger')) style.color = colors.danger;
  if (className.includes('text-warning')) style.color = colors.warning;
  if (className.includes('text-text-primary')) style.color = colors.text.primary;
  if (className.includes('text-text-secondary')) style.color = colors.text.secondary;
  if (className.includes('text-text-tertiary')) style.color = colors.text.tertiary;
  if (className.includes('text-bg-base')) style.color = colors.bg.base;
  if (className.includes('text-white')) style.color = '#FFFFFF';

  if (className.includes('font-display')) style.fontFamily = fonts.display;
  if (className.includes('font-bodyBold')) style.fontFamily = fonts.bodyBold;
  if (className.includes('font-body')) style.fontFamily = fonts.body;

  if (className.includes('text-4xl')) style.fontSize = 36;
  if (className.includes('text-lg')) style.fontSize = 18;
  if (className.includes('text-sm')) style.fontSize = 14;
  if (className.includes('text-xs')) style.fontSize = 12;
  if (className.includes('text-base')) style.fontSize = 16;

  if (className.includes('text-center')) style.textAlign = 'center';
  if (className.includes('italic')) style.fontStyle = 'italic';
  if (className.includes('uppercase')) style.textTransform = 'uppercase';
  if (className.includes('tracking-[')) {
    style.letterSpacing = 4;
  }

  return style;
};
