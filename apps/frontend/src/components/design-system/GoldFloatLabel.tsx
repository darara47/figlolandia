import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text } from '@/src/components/ui/Text';
import { colors, fonts } from '@/src/theme/tokens';
import { formatGoldDelta } from '@/src/utils/goldDelta';
import { GOLD_FLOAT_MS } from '@figlolandia/game-core';

export interface GoldFloatItem {
  id: string;
  playerId: string;
  amount: number;
}

interface GoldFloatLabelProps {
  item: GoldFloatItem;
  onDone: (id: string) => void;
}

export const GoldFloatLabel = ({ item, onDone }: GoldFloatLabelProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  const startedForId = useRef<string | null>(null);

  onDoneRef.current = onDone;

  useEffect(() => {
    if (startedForId.current === item.id) return;
    startedForId.current = item.id;
    opacity.setValue(0);

    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: GOLD_FLOAT_MS.fadeIn,
        useNativeDriver: true,
      }),
      Animated.delay(GOLD_FLOAT_MS.hold),
      Animated.timing(opacity, {
        toValue: 0,
        duration: GOLD_FLOAT_MS.fadeOut,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onDoneRef.current(item.id);
      }
    });

    return () => animation.stop();
  }, [item.id, opacity]);

  const positive = item.amount > 0;

  return (
    <Animated.View pointerEvents="none" style={[styles.float, { opacity }]}>
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
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
