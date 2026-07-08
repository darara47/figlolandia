import { Pressable, Text, PressableProps, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps extends PressableProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) => {
  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: '#2563EB' },
    secondary: { backgroundColor: '#4B5563' },
    danger: { backgroundColor: '#DC2626' },
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 12, paddingVertical: 8 },
    md: { paddingHorizontal: 16, paddingVertical: 12 },
    lg: { paddingHorizontal: 24, paddingVertical: 16 },
  };

  const buttonStyle: ViewStyle = {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...variantStyles[variant],
    ...sizeStyles[size],
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <Pressable
      style={[buttonStyle, style]}
      disabled={disabled}
      {...props}
    >
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
