import { useEffect, useRef, useState } from 'react';
import { View, Text, ViewStyle, StyleSheet, Animated } from 'react-native';
import { Card } from '../ui/Card';
import { PlayerDto } from '../../types/api';
import { PROFESSION_DATA } from '@figlolandia/game-core';
import { BuildingCard } from '../cards/BuildingCard';
import { NarrativeEvent } from '@/types/websocket';

interface PlayerCardProps {
  player: PlayerDto;
  isMe?: boolean;
  className?: string;
  style?: ViewStyle;
  hasSubmitted?: boolean; // Czy gracz zatwierdził swój ruch (w fazie PLANNING)
  narrativeEvents?: NarrativeEvent[]; // Wydarzenia narratora dla animacji
}

export const PlayerCard = ({ player, isMe = false, style, hasSubmitted = false, narrativeEvents = [] }: PlayerCardProps) => {
  const professionData = player.profession
    ? PROFESSION_DATA[player.profession as keyof typeof PROFESSION_DATA]
    : null;

  const cityValue = player.gold + player.buildings.reduce((sum, b) => sum + b.value, 0);

  // Znajdź wydarzenia związane z tym graczem
  const playerEvents = narrativeEvents.filter((e) => e.playerId === player.id);
  const buildEvents = playerEvents.filter((e) => e.type === 'build');

  // Animacja dla złota (gdy gracz traci monety)
  const goldAnim = useRef(new Animated.Value(player.gold)).current;
  const [displayedGold, setDisplayedGold] = useState(player.gold);

  useEffect(() => {
    // Animuj zmianę złota
    const listener = goldAnim.addListener(({ value }) => {
      setDisplayedGold(Math.round(value));
    });

    Animated.timing(goldAnim, {
      toValue: player.gold,
      duration: 500,
      useNativeDriver: false,
    }).start();

    return () => {
      goldAnim.removeListener(listener);
    };
  }, [player.gold, goldAnim]);

  // Sprawdź które budynki powinny być animowane (nowo wybudowane)
  const getBuildingAnimationDelay = (buildingId: string): number => {
    const buildEvent = buildEvents.find((e) => e.data?.buildingId === buildingId);
    if (buildEvent) {
      // Opóźnienie bazuje na pozycji wydarzenia w liście
      const eventIndex = narrativeEvents.findIndex((e) => e === buildEvent);
      return eventIndex * 100; // 100ms opóźnienia między wydarzeniami
    }
    return 0;
  };

  const shouldAnimateBuilding = (buildingId: string): boolean => {
    return buildEvents.some((e) => e.data?.buildingId === buildingId);
  };

  return (
    <Card style={[isMe && styles.meCard, style]}>
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Text style={styles.playerName}>{player.name}</Text>
          {isMe && <Text style={styles.meLabel}>(Ty)</Text>}
        </View>
        {hasSubmitted && (
          <View style={styles.submittedBadge}>
            <Text style={styles.submittedText}>✓ Gotowy</Text>
          </View>
        )}
      </View>

      {professionData && (
        <View style={styles.professionSection}>
          <Text style={styles.professionLabel}>Zawód:</Text>
          <Text style={styles.professionName}>{professionData.name}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Złoto</Text>
          <Text style={styles.goldValue}>{displayedGold}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Wartość miasta</Text>
          <Text style={styles.cityValue}>{cityValue}</Text>
        </View>
      </View>

      <View style={styles.buildingsSection}>
        <Text style={styles.buildingsLabel}>
          Budynki ({player.buildings.length})
        </Text>
        {player.buildings.length > 0 ? (
          <View style={styles.buildingsList}>
            {player.buildings.slice(0, 5).map((building) => (
              <BuildingCard
                key={building.id}
                building={building}
                size="sm"
                animate={shouldAnimateBuilding(building.id)}
                animationDelay={getBuildingAnimationDelay(building.id)}
              />
            ))}
            {player.buildings.length > 5 && (
              <View style={styles.moreBuildings}>
                <Text style={styles.moreBuildingsText}>+{player.buildings.length - 5}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noBuildings}>Brak budynków</Text>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  meCard: {
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  meLabel: {
    color: '#60A5FA',
    fontSize: 12,
    marginLeft: 4,
  },
  submittedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submittedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  professionSection: {
    marginBottom: 8,
  },
  professionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  professionName: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  goldValue: {
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cityValue: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  buildingsSection: {
    marginTop: 8,
  },
  buildingsLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  buildingsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moreBuildings: {
    width: 80,
    height: 120,
    backgroundColor: '#374151',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6B7280',
    borderStyle: 'dashed',
  },
  moreBuildingsText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noBuildings: {
    color: '#6B7280',
    fontSize: 12,
  },
});
