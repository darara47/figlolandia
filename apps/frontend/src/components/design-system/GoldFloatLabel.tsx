import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { colors, fonts } from '@/src/theme/tokens';
import { formatGoldDelta } from '@/src/utils/goldDelta';

export interface GoldFloatItem {
  id: string;
  playerId: string;
  amount: number;
}

interface GoldFloatLabelProps {
  item: GoldFloatItem;
  onDone: (id: string) => void;
}

const HOLD_MS = 1600;
const FADE_IN_MS = 150;
const FADE_OUT_MS = 900;

export const GoldFloatLabel = ({ item, onDone }: GoldFloatLabelProps) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -2, duration: FADE_IN_MS, useNativeDriver: true }),
      ]),
      Animated.delay(HOLD_MS),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -18, duration: FADE_OUT_MS, useNativeDriver: true }),
      ]),
    ]).start(() => onDone(item.id));
  }, [item.id, onDone, opacity, translateY]);

  const positive = item.amount > 0;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.float,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: positive ? colors.success : colors.danger },
        ]}
      >
        {formatGoldDelta(item.amount)}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  float: {
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
