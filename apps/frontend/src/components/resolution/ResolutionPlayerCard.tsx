import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Pressable } from 'react-native';
import { PlayerDto } from '@/src/types/api';
import { PlayerCard } from '@/src/components/player/PlayerCard';
import { colors, shadows } from '@/src/theme/tokens';
import { getEventEffectKind } from '@/src/utils/professionEffects';
import { NarrativeEvent } from '@/types/websocket';

interface ResolutionPlayerCardProps {
  player: PlayerDto;
  isActive: boolean;
  isMe: boolean;
  dimmed: boolean;
  useSpotlight: boolean;
  highlightNew: string[];
  shake: boolean;
  shield: boolean;
  flash: boolean;
  currentEvent: NarrativeEvent | null;
}

export const ResolutionPlayerCard = ({
  player,
  isActive,
  isMe,
  dimmed,
  useSpotlight,
  highlightNew,
  shake,
  shield,
  flash,
  currentEvent,
}: ResolutionPlayerCardProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!useSpotlight) {
      Animated.timing(scaleAnim, {
        toValue: isActive ? 1.02 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: dimmed ? 0.35 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.04 : 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, dimmed, useSpotlight, scaleAnim, opacityAnim]);

  useEffect(() => {
    if (!shake) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shake, shakeAnim]);

  useEffect(() => {
    if (!flash) return;
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [flash, flashAnim]);

  const effectKind = currentEvent && isActive ? getEventEffectKind(currentEvent) : null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
        },
        isActive && useSpotlight && shadows.glow,
        shield && styles.shield,
      ]}
    >
      {useSpotlight && dimmed && (
        <View style={styles.dimOverlay} pointerEvents="none" />
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.flashOverlay,
          { opacity: flashAnim },
        ]}
      />

      {effectKind === 'economy' && isActive && (
        <View style={styles.effectBadge}>
          <Animated.Text style={styles.effectText}>💰</Animated.Text>
        </View>
      )}

      <PlayerCard
        player={player}
        isMe={isMe}
        showProfession
        highlightNew={highlightNew}
        narrativeEvents={currentEvent && isActive ? [currentEvent] : []}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
    zIndex: 1,
  },
  shield: {
    borderWidth: 2,
    borderColor: colors.success,
    borderRadius: 16,
  },
  flashOverlay: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    zIndex: 2,
  },
  effectBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
  },
  effectText: {
    fontSize: 20,
  },
});
