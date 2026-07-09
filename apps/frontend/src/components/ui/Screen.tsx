import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/src/theme/tokens';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  safe?: boolean;
  centered?: boolean;
}

export const Screen = ({
  children,
  safe = true,
  centered = false,
  style,
  ...props
}: ScreenProps) => {
  const Wrapper = safe ? SafeAreaView : View;

  return (
    <Wrapper
      style={[
        {
          flex: 1,
          backgroundColor: colors.bg.base,
          paddingHorizontal: spacing.screen,
        },
        centered && styles.centered,
        style,
      ]}
      {...props}
    >
      {children}
    </Wrapper>
  );
};

const styles = {
  centered: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
