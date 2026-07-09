import { View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { colors, radius } from '@/src/theme/tokens';

interface StatusPillProps {
  label: string;
  confirmed: boolean;
  className?: string;
}

export const StatusPill = ({ label, confirmed }: StatusPillProps) => (
  <View
    style={{
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: confirmed ? colors.success : colors.border.DEFAULT,
      backgroundColor: confirmed ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
    }}
  >
    <Text
      variant="label"
      style={{
        fontSize: 12,
        color: confirmed ? colors.success : colors.text.tertiary,
      }}
    >
      {label} {confirmed ? '✓' : ''}
    </Text>
  </View>
);
