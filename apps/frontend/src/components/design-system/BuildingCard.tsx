import { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BUILDING_DATA, CATEGORY_COLORS, UI_ANIMATION_MS } from '@figlolandia/game-core';
import { CardDto, BuildingDto } from '@/src/types/api';
import { getBuildingIcon } from '@/src/theme/buildingIcons';
import { Text } from '@/src/components/ui/Text';
import { ValueStars } from '@/src/components/design-system/ValueStars';
import { colors, shadows, radius, fonts } from '@/src/theme/tokens';

type CardSize = 'mini' | 'hand' | 'sm' | 'md' | 'lg';
type CostVariant = 'default' | 'danger';

interface BuildingCardProps {
  card?: CardDto;
  building?: BuildingDto;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  size?: CardSize;
  animate?: boolean;
  animationDelay?: number;
  cost?: number;
  costVariant?: CostVariant;
}

const sizeConfig: Record<CardSize, { width: number; height: number; icon: number; name: number }> = {
  mini: { width: 64, height: 80, icon: 18, name: 9 },
  hand: { width: 88, height: 110, icon: 28, name: 11 },
  sm: { width: 80, height: 100, icon: 24, name: 10 },
  md: { width: 100, height: 125, icon: 32, name: 12 },
  lg: { width: 120, height: 150, icon: 36, name: 13 },
};

export const BuildingCard = ({
  card,
  building,
  selected = false,
  onPress,
  disabled = false,
  size = 'hand',
  animate = false,
  animationDelay = 0,
  cost,
  costVariant = 'default',
}: BuildingCardProps) => {
  const buildingType = card?.buildingType ?? building?.type ?? '';
  const buildingCategory = card?.buildingCategory ?? building?.category ?? 'education';
  const buildingValue = card?.buildingValue ?? building?.value ?? 0;
  const buildingName =
    card?.name ??
    BUILDING_DATA[buildingType as keyof typeof BUILDING_DATA]?.name ??
    buildingType;

  const categoryColor =
    CATEGORY_COLORS[buildingCategory as keyof typeof CATEGORY_COLORS] ?? colors.text.tertiary;

  const dims = sizeConfig[size];
  const Icon = getBuildingIcon(buildingType);
  const borderColor = selected ? colors.brand.DEFAULT : categoryColor;
  const borderWidth = selected ? 3 : 2;
  const showCostBadge = cost !== undefined;
  const badgeGradient =
    costVariant === 'danger'
      ? ([colors.danger, '#FF8FA3'] as const)
      : ([colors.gold.DEFAULT, colors.gold.glow] as const);
  const badgeTextColor = costVariant === 'danger' ? colors.text.primary : colors.bg.base;

  const scaleAnim = useRef(new Animated.Value(animate ? 0.2 : 1)).current;
  const rotateAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;

    Animated.sequence([
      Animated.delay(animationDelay),
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
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: UI_ANIMATION_MS.buildingRotate,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [animate, animationDelay, scaleAnim, rotateAnim, opacityAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: ['-10deg', '5deg', '0deg'],
  });

  const cardContent = (
    <Animated.View
      style={[
        styles.card,
        {
          width: dims.width,
          height: dims.height,
          opacity: disabled && !selected ? 0.5 : opacityAnim,
          transform: [{ scale: scaleAnim }, { rotate }],
        },
        selected ? shadows.glow : shadows.card,
      ]}
    >
      <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />

      <View
        style={[
          styles.body,
          {
            borderColor,
            borderWidth,
          },
        ]}
      >
        {showCostBadge && (
          <LinearGradient colors={badgeGradient} style={styles.valueBadge}>
            <Text
              style={{
                color: badgeTextColor,
                fontFamily: fonts.bodyBold,
                fontSize: dims.name,
                lineHeight: dims.name + 2,
              }}
            >
              {cost}
            </Text>
          </LinearGradient>
        )}

        <View style={styles.iconArea}>
          <Icon color={categoryColor} size={dims.icon} strokeWidth={1.75} />
        </View>

        <Text
          numberOfLines={2}
          style={{
            color: selected ? colors.text.primary : colors.text.secondary,
            fontFamily: fonts.bodyBold,
            fontSize: dims.name,
            lineHeight: dims.name + 3,
            textAlign: 'center',
          }}
        >
          {buildingName}
        </Text>

        <View style={styles.starsRow}>
          <ValueStars value={buildingValue} size="sm" />
        </View>
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.card,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  categoryBar: {
    height: 6,
    width: '100%',
  },
  body: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    position: 'relative',
  },
  valueBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg.base,
    zIndex: 2,
  },
  iconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  starsRow: {
    marginTop: 2,
    alignItems: 'center',
  },
});
