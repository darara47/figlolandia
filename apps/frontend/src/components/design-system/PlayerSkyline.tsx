import { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BUILDING_DATA, CATEGORY_COLORS } from '@figlolandia/game-core';
import { BuildingDto } from '@/src/types/api';
import { getBuildingIcon } from '@/src/theme/buildingIcons';
import { Text } from '@/src/components/ui/Text';
import { colors, radius, shadows } from '@/src/theme/tokens';

interface PlayerSkylineProps {
  buildings: BuildingDto[];
  highlightNew?: string[];
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
  lit,
  onPress,
}: {
  building: BuildingDto;
  size: 'compact' | 'hero';
  isNew: boolean;
  lit: boolean;
  onPress: () => void;
}) => {
  const dims = sizeConfig[size];
  const categoryColor =
    CATEGORY_COLORS[building.category as keyof typeof CATEGORY_COLORS] ??
    colors.text.tertiary;
  const Icon = getBuildingIcon(building.type);
  const scaleAnim = useRef(new Animated.Value(isNew ? 0.2 : 1)).current;
  const rotateAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const glowAnim = useRef(new Animated.Value(lit ? 1 : 0.25)).current;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (isNew && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 55,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew, scaleAnim, rotateAnim]);

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: lit ? 1 : 0.35,
      duration: lit ? 400 : 200,
      useNativeDriver: true,
    }).start();
  }, [lit, glowAnim]);

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
            transform: [{ scale: scaleAnim }, { rotate }],
          },
          lit && shadows.glow,
        ]}
      >
        <View style={[styles.categoryBar, { height: dims.bar, backgroundColor: categoryColor }]} />
        <View
          style={[
            styles.buildingBody,
            {
              borderColor: categoryColor,
              padding: dims.padding,
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <Icon color={categoryColor} size={dims.icon} strokeWidth={1.75} />
          </View>
          <Animated.View
            style={[
              styles.windowGlow,
              { backgroundColor: categoryColor, opacity: glowAnim },
            ]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const PlayerSkyline = ({
  buildings,
  highlightNew = [],
  size = 'compact',
  className,
}: PlayerSkylineProps) => {
  const [tooltip, setTooltip] = useState<{ name: string; value: number } | null>(null);
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
              const buildingData = BUILDING_DATA[building.type as keyof typeof BUILDING_DATA];
              const isNew = highlightNew.includes(building.id) && !seenIds.has(building.id);
              const lit = highlightNew.includes(building.id) || isNew;

              return (
                <SkylineBuilding
                  key={building.id}
                  building={building}
                  size={size}
                  isNew={isNew}
                  lit={lit}
                  onPress={() =>
                    setTooltip({
                      name: buildingData?.name ?? building.type,
                      value: building.value,
                    })
                  }
                />
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {tooltip && (
        <Pressable onPress={() => setTooltip(null)} className="mt-1">
          <Text variant="label">
            {tooltip.name} — wartość {tooltip.value}
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
  windowGlow: {
    position: 'absolute',
    bottom: 4,
    width: 10,
    height: 6,
    borderRadius: 2,
  },
});
