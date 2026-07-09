import { ActivityIndicator, Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import { cn } from '@/src/utils/cn';
import { colors, radius } from '@/src/theme/tokens';
import { Text } from './Text';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
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
  loading = false,
  style,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={cn(className)}
      style={[
        {
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          ...variantStyles[variant],
          ...sizeStyles[size],
          opacity: isDisabled ? 0.6 : 1,
          backgroundColor: isDisabled ? colors.bg.hover : variantStyles[variant].backgroundColor,
        },
        style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' ? colors.text.secondary : '#FFFFFF'}
          />
          <Text
            variant="body"
            style={{
              color: colors.text.tertiary,
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16,
            }}
          >
            {children}
          </Text>
        </View>
      ) : (
        <Text
          variant="body"
          style={{
            color: isDisabled ? colors.text.tertiary : textColors[variant],
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16,
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
};
