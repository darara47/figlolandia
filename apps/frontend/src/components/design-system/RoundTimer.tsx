import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/src/components/ui/Text';
import { colors } from '@/src/theme/tokens';

interface RoundTimerProps {
  remainingMs: number;
  totalMs: number;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const formatTime = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getTimerColor = (ratio: number, remainingMs: number): string => {
  if (remainingMs <= 10000) return colors.danger;
  if (ratio > 0.5) return colors.success;
  if (ratio > 0.2) return colors.warning;
  return colors.danger;
};

export const RoundTimer = ({ remainingMs, totalMs, size = 72 }: RoundTimerProps) => {
  const ratio = remainingMs / totalMs;
  const strokeColor = getTimerColor(ratio, remainingMs);
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);
  const center = size / 2;

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (remainingMs <= 10000 && remainingMs > 0) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = 1;
    }
  }, [remainingMs, pulse]);

  const animatedProps = useAnimatedProps(() => ({
    strokeWidth: strokeWidth * pulse.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.ring}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border.DEFAULT}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.label}>
        <Text
          variant="stat"
          style={{
            color: strokeColor,
            fontSize: 12,
            lineHeight: 14,
            textAlign: 'center',
          }}
        >
          {formatTime(remainingMs)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  label: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
