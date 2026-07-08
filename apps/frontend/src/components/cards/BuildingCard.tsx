import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BuildingDto } from '../../types/api';
import { BUILDING_DATA, CATEGORY_COLORS } from '@figlolandia/game-core';

interface BuildingCardProps {
  building: BuildingDto;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean; // Czy animować pojawienie się
  animationDelay?: number; // Opóźnienie animacji w ms
}

const sizeStyles = {
  sm: { width: 80, height: 120, padding: 8 },
  md: { width: 100, height: 140, padding: 12 },
  lg: { width: 120, height: 160, padding: 16 },
};

export const BuildingCard = ({ building, size = 'md', className, animate = false, animationDelay = 0 }: BuildingCardProps) => {
  const buildingData = BUILDING_DATA[building.type as keyof typeof BUILDING_DATA];
  const categoryColor = CATEGORY_COLORS[building.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
  const styles = sizeStyles[size];

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      // Animacja pojawienia się z efektem "pop"
      Animated.sequence([
        Animated.delay(animationDelay),
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    } else {
      // Bez animacji - pokaż od razu
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [animate, animationDelay, scaleAnim, opacityAnim, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  return (
    <Animated.View
      style={[
        {
          width: styles.width,
          height: styles.height,
          backgroundColor: categoryColor,
          borderRadius: 12,
          padding: styles.padding,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          transform: [
            { scale: scaleAnim },
            { rotate: rotateInterpolate },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Wartość w kółku u góry */}
      <View
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
          {building.value}
        </Text>
      </View>

      {/* Miejsce na grafikę (placeholder) */}
      <View
        style={{
          flex: 1,
          marginTop: 8,
          marginBottom: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 24 }}>
          🏛️
        </Text>
      </View>

      {/* Nazwa budynku */}
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: size === 'sm' ? 10 : size === 'md' ? 12 : 14,
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: 'auto',
        }}
        numberOfLines={2}
      >
        {buildingData?.name || building.type}
      </Text>
    </Animated.View>
  );
};
