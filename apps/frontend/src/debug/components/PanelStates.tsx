import { View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { colors } from '@/src/theme/tokens';
import type { DevToolsDensity } from '@/src/debug/store/devtools.store';
import { densityPadding } from '@/src/debug/store/devtools.store';

interface PanelSkeletonProps {
  lines?: number;
  density?: DevToolsDensity;
}

export const PanelSkeleton = ({ lines = 4, density = 'comfortable' }: PanelSkeletonProps) => {
  const padding = densityPadding(density);

  return (
    <View style={{ gap: 8, padding }}>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={{
            height: density === 'compact' ? 36 : 48,
            backgroundColor: colors.bg.hover,
            borderRadius: 8,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
};

interface EmptyStateProps {
  message: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => (
  <View style={{ padding: 24, alignItems: 'center' }}>
    <Text variant="body" className="text-text-secondary">
      {message}
    </Text>
  </View>
);

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner = ({ message, onRetry }: ErrorBannerProps) => (
  <View
    style={{
      backgroundColor: 'rgba(255, 77, 109, 0.15)',
      borderColor: colors.danger,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Text variant="body" style={{ color: colors.danger, flex: 1 }}>
      {message}
    </Text>
    {onRetry ? (
      <Text
        variant="label"
        style={{ color: colors.brand.DEFAULT, marginLeft: 12 }}
        onPress={onRetry}
      >
        Ponów
      </Text>
    ) : null}
  </View>
);
