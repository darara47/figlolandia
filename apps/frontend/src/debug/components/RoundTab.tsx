import { Pressable, View } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { colors, radius } from '@/src/theme/tokens';

interface RoundTabProps {
  round: number;
  active: boolean;
  hasAlert?: boolean;
  onPress: () => void;
}

export const RoundTab = ({ round, active, hasAlert = false, onPress }: RoundTabProps) => (
  <Pressable onPress={onPress}>
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: radius.chip,
        backgroundColor: active ? colors.brand.muted : colors.bg.elevated,
        borderWidth: 1,
        borderColor: active ? colors.brand.DEFAULT : colors.border.DEFAULT,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Text
        variant="label"
        style={{
          color: active ? colors.brand.DEFAULT : colors.text.secondary,
          fontWeight: active ? '700' : '400',
        }}
      >
        R{round}
      </Text>
      {hasAlert ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.verify.mismatch,
          }}
        />
      ) : null}
    </View>
  </Pressable>
);
