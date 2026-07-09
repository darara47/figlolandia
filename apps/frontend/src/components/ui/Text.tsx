import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { typography, textColorFromClassName } from '@/src/theme/typography';

type TextVariant =
  | 'display-xl'
  | 'display'
  | 'section'
  | 'body'
  | 'label'
  | 'stat';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

export const Text = ({ variant = 'body', className, style, ...props }: TextProps) => (
  <RNText
    className={className}
    style={[typography[variant], textColorFromClassName(className), style]}
    {...props}
  />
);
