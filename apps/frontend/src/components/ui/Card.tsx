import { View, ViewProps } from 'react-native';
import { cn } from '@/src/utils/cn';
import { colors, radius, shadows } from '@/src/theme/tokens';

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export const Card = ({
  className,
  children,
  highlighted = false,
  style,
  ...props
}: CardProps) => (
  <View
    className={cn(className)}
    style={[
      {
        backgroundColor: colors.bg.elevated,
        borderRadius: radius.card,
        padding: 16,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? colors.brand.DEFAULT : colors.border.DEFAULT,
        ...shadows.card,
      },
      style,
    ]}
    {...props}
  >
    {children}
  </View>
);
