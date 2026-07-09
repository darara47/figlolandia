import { ViewStyle } from 'react-native';
import { spacing } from './tokens';

export const layout = {
  contentWidth: 480,
  formWidth: 400,
} as const;

export const centeredContent: ViewStyle = {
  width: '100%',
  maxWidth: layout.contentWidth,
  alignSelf: 'center',
};

export const centeredForm: ViewStyle = {
  width: '100%',
  maxWidth: layout.formWidth,
  alignSelf: 'center',
};

export const centeredScrollContent: ViewStyle = {
  flexGrow: 1,
  width: '100%',
  maxWidth: layout.contentWidth,
  alignSelf: 'center',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 24,
};

export const pageScrollContent: ViewStyle = {
  width: '100%',
  maxWidth: layout.contentWidth,
  alignSelf: 'center',
  paddingBottom: spacing.screen,
};
