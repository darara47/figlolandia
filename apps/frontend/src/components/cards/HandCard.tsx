import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CardDto } from '../../types/api';
import { BUILDING_DATA, CATEGORY_COLORS } from '@figlolandia/game-core';

interface HandCardProps {
  card: CardDto;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: { width: 80, height: 120, padding: 8 },
  md: { width: 100, height: 140, padding: 12 },
  lg: { width: 120, height: 160, padding: 16 },
};

export const HandCard = ({
  card,
  selected = false,
  onPress,
  size = 'md',
  className,
}: HandCardProps) => {
  const buildingType = card.buildingType as keyof typeof BUILDING_DATA;
  const buildingData = BUILDING_DATA[buildingType];
  const categoryColor = CATEGORY_COLORS[card.buildingCategory as keyof typeof CATEGORY_COLORS] || '#6B7280';
  const styles = sizeStyles[size];

  const cardContent = (
    <View
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
          borderWidth: selected ? 3 : 0,
          borderColor: selected ? '#60A5FA' : 'transparent',
          opacity: selected ? 1 : 1,
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
          {card.buildingValue}
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
        {card.name}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ opacity: 1 }}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};
