import { TextInput, TextInputProps } from 'react-native';
import { cn } from '@/src/utils/cn';
import { colors, fonts, radius } from '@/src/theme/tokens';

interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = ({ className, style, ...props }: InputProps) => (
  <TextInput
    className={cn(className)}
    placeholderTextColor={colors.text.tertiary}
    style={[
      {
        backgroundColor: colors.bg.elevated,
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
        borderRadius: radius.chip,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: colors.text.primary,
        fontFamily: fonts.body,
        fontSize: 16,
      },
      style,
    ]}
    {...props}
  />
);
