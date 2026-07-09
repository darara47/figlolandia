import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect } from 'react-native-svg';
import { BUILDING_DATA, CATEGORY_COLORS } from '@figlolandia/game-core';
import { BuildingDto } from '@/src/types/api';
import { Text } from '@/src/components/ui/Text';
import { colors } from '@/src/theme/tokens';

interface PlayerSkylineProps {
  buildings: BuildingDto[];
  highlightNew?: string[];
  size?: 'compact' | 'hero';
  className?: string;
}

const silhouetteHeights = [28, 36, 24, 40, 32, 26, 38, 30];

const BuildingSilhouette = ({
  height,
  categoryColor,
  lit,
}: {
  height: number;
  categoryColor: string;
  lit: boolean;
}) => (
  <View className="mx-0.5 items-end justify-end" style={{ height: 48, width: 20 }}>
    <Svg width={20} height={height}>
      <Rect
        x={2}
        y={0}
        width={16}
        height={height}
        rx={2}
        fill={colors.bg.hover}
        stroke={categoryColor}
        strokeWidth={1}
        opacity={lit ? 1 : 0.6}
      />
      <Rect
        x={6}
        y={height * 0.25}
        width={8}
        height={6}
        rx={1}
        fill={categoryColor}
        opacity={lit ? 1 : 0.3}
      />
    </Svg>
  </View>
);

export const PlayerSkyline = ({
  buildings,
  highlightNew = [],
  size = 'compact',
  className,
}: PlayerSkylineProps) => {
  const [tooltip, setTooltip] = useState<{ name: string; value: number } | null>(null);
  const height = size === 'hero' ? 72 : 48;

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
          <View className="flex-row items-end py-2">
            {buildings.map((building, index) => {
              const buildingData = BUILDING_DATA[building.type as keyof typeof BUILDING_DATA];
              const categoryColor =
                CATEGORY_COLORS[building.category as keyof typeof CATEGORY_COLORS] ??
                colors.text.tertiary;
              const silhouetteHeight = silhouetteHeights[index % silhouetteHeights.length];
              const lit = highlightNew.includes(building.id);

              return (
                <Pressable
                  key={building.id}
                  onPress={() =>
                    setTooltip({
                      name: buildingData?.name ?? building.type,
                      value: building.value,
                    })
                  }
                >
                  <BuildingSilhouette
                    height={silhouetteHeight}
                    categoryColor={categoryColor}
                    lit={lit}
                  />
                </Pressable>
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
