import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { cn } from '@/src/utils/cn';
import { colors, radius } from '@/src/theme/tokens';
import { Text } from './Text';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

const variantStyles = {
  primary: {
    backgroundColor: colors.brand.DEFAULT,
  },
  secondary: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
  },
  danger: {
    backgroundColor: colors.danger,
  },
};

const sizeStyles = {
  sm: { paddingHorizontal: 12, paddingVertical: 8 },
  md: { paddingHorizontal: 16, paddingVertical: 12 },
  lg: { paddingHorizontal: 24, paddingVertical: 16 },
};

const textColors = {
  primary: '#FFFFFF',
  secondary: colors.text.secondary,
  danger: '#FFFFFF',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) => (
  <Pressable
    className={cn(className)}
    style={[
      {
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        ...variantStyles[variant],
        ...sizeStyles[size],
        opacity: disabled ? 0.6 : 1,
        backgroundColor: disabled ? colors.bg.hover : variantStyles[variant].backgroundColor,
      },
      style,
    ]}
    disabled={disabled}
    {...props}
  >
    <Text
      variant="body"
      style={{
        color: disabled ? colors.text.tertiary : textColors[variant],
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16,
      }}
    >
      {children}
    </Text>
  </Pressable>
);
