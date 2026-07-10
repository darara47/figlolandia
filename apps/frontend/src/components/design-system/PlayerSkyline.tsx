import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BUILDING_DATA, CATEGORY_COLORS, UI_ANIMATION_MS } from '@figlolandia/game-core';
import { BuildingDto } from '@/src/types/api';
import { getBuildingIcon } from '@/src/theme/buildingIcons';
import { Text } from '@/src/components/ui/Text';
import { ValueStars } from '@/src/components/design-system/ValueStars';
import { colors, radius, shadows } from '@/src/theme/tokens';

interface PlayerSkylineProps {
  buildings: BuildingDto[];
  highlightNew?: string[];
  pendingBuildingIds?: string[];
  size?: 'compact' | 'hero';
  className?: string;
}

const sizeConfig = {
  compact: { width: 46, height: 58, icon: 22, bar: 4, padding: 4 },
  hero: { width: 58, height: 74, icon: 28, bar: 5, padding: 6 },
} as const;

const SkylineBuilding = ({
  building,
  size,
  isNew,
  isCompleting,
  isPending,
  lit,
  onPress,
}: {
  building: BuildingDto;
  size: 'compact' | 'hero';
  isNew: boolean;
  isCompleting: boolean;
  isPending: boolean;
  lit: boolean;
  onPress: () => void;
}) => {
  const dims = sizeConfig[size];
  const categoryColor =
    CATEGORY_COLORS[building.category as keyof typeof CATEGORY_COLORS] ??
    colors.text.tertiary;
  const displayColor = isPending ? colors.text.tertiary : categoryColor;
  const Icon = getBuildingIcon(building.type);
  const scaleAnim = useRef(new Animated.Value(isNew ? 0.2 : 1)).current;
  const rotateAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(isPending ? 0.55 : 1)).current;
  const hasAnimatedRef = useRef(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (isNew && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: UI_ANIMATION_MS.spotlightSpring.tension,
          friction: UI_ANIMATION_MS.spotlightSpring.friction,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: UI_ANIMATION_MS.buildingEntrance,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew, scaleAnim, rotateAnim]);

  useEffect(() => {
    if (isCompleting && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.55,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          tension: UI_ANIMATION_MS.spotlightSpring.tension,
          friction: UI_ANIMATION_MS.spotlightSpring.friction,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: UI_ANIMATION_MS.buildingEntrance,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: UI_ANIMATION_MS.spotlightSpring.tension,
            friction: UI_ANIMATION_MS.spotlightSpring.friction,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isCompleting, opacityAnim, scaleAnim]);

  useEffect(() => {
    if (isPending && !isCompleting) {
      opacityAnim.setValue(0.55);
    }
  }, [isPending, isCompleting, opacityAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: ['-14deg', '6deg', '0deg'],
  });

  return (
    <Pressable onPress={onPress} style={styles.buildingWrap}>
      <Animated.View
        style={[
          styles.building,
          {
            width: dims.width,
            height: dims.height,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }, { rotate }],
          },
          lit && !isPending && shadows.glow,
        ]}
      >
        <View style={[styles.categoryBar, { height: dims.bar, backgroundColor: displayColor }]} />
        <View
          style={[
            styles.buildingBody,
            {
              borderColor: displayColor,
              padding: dims.padding,
              backgroundColor: isPending ? colors.bg.base : colors.bg.elevated,
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <Icon color={displayColor} size={dims.icon} strokeWidth={1.75} />
          </View>
          <View style={styles.starsWrap}>
            <ValueStars value={isPending ? 0 : building.value} size="xs" />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const PlayerSkyline = ({
  buildings,
  highlightNew = [],
  pendingBuildingIds = [],
  size = 'compact',
  className,
}: PlayerSkylineProps) => {
  const [tooltipBuildingId, setTooltipBuildingId] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const height = size === 'hero' ? 88 : 72;

  useEffect(() => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      buildings.forEach((b) => {
        if (!highlightNew.includes(b.id)) {
          next.add(b.id);
        }
      });
      return next;
    });
  }, [buildings, highlightNew]);

  const tooltipBuilding = tooltipBuildingId
    ? buildings.find((building) => building.id === tooltipBuildingId)
    : null;
  const tooltipBuildingData = tooltipBuilding
    ? BUILDING_DATA[tooltipBuilding.type as keyof typeof BUILDING_DATA]
    : null;

  if (buildings.length === 0) {
    return (
      <View
        className={`items-center justify-center rounded-card border border-border-subtle ${className ?? ''}`}
        style={{ height }}
      >
        <Text variant="label">Brak budynków</Text>
      </View>
    );
  }

  return (
    <View className={className}>
      <LinearGradient
        colors={[colors.bg.elevated, colors.bg.base]}
        className="rounded-card border border-border-subtle px-2"
        style={{ height }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row items-end py-2" style={{ gap: 6 }}>
            {buildings.map((building) => {
              const isPending =
                pendingBuildingIds.includes(building.id) || building.pending === true;
              const isNew = highlightNew.includes(building.id) && !seenIds.has(building.id);
              const isCompleting =
                highlightNew.includes(building.id) && seenIds.has(building.id) && !isPending;
              const lit = highlightNew.includes(building.id) || isNew;
              const isTooltipActive = tooltipBuildingId === building.id;

              return (
                <SkylineBuilding
                  key={building.id}
                  building={building}
                  size={size}
                  isNew={isNew}
                  isCompleting={isCompleting}
                  isPending={isPending}
                  lit={lit}
                  onPress={() =>
                    setTooltipBuildingId(isTooltipActive ? null : building.id)
                  }
                />
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {tooltipBuilding && (
        <Pressable onPress={() => setTooltipBuildingId(null)} className="mt-1">
          <Text variant="label">
            {tooltipBuildingData?.name ?? tooltipBuilding.type} — wartość {tooltipBuilding.value}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  buildingWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  building: {
    borderRadius: radius.chip,
    overflow: 'hidden',
    backgroundColor: colors.bg.elevated,
  },
  categoryBar: {
    width: '100%',
  },
  buildingBody: {
    flex: 1,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.chip,
    borderBottomRightRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsWrap: {
    marginBottom: 2,
  },
});
