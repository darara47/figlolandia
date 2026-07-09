import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '@/src/theme/tokens';

interface ValueStarsProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

const sizeConfig = {
  xs: { icon: 6, gap: 0 },
  sm: { icon: 8, gap: 1 },
  md: { icon: 10, gap: 2 },
} as const;

export const ValueStars = ({ value, max = 5, size = 'sm' }: ValueStarsProps) => {
  const dims = sizeConfig[size];
  const clampedValue = Math.max(0, Math.min(max, value));

  if (clampedValue === 0) {
    return null;
  }

  return (
    <View style={[styles.row, { gap: dims.gap }]}>
      {Array.from({ length: clampedValue }, (_, index) => (
        <Star
          key={index}
          size={dims.icon}
          color={colors.gold.DEFAULT}
          fill={colors.gold.DEFAULT}
          strokeWidth={0}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
