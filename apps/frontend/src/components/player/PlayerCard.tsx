import { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Row } from '../ui/Stack';
import { PlayerDto } from '../../types/api';
import { PROFESSION_DATA } from '@figlolandia/game-core';
import { PlayerSkyline } from '../design-system/PlayerSkyline';
import { StatusPill } from '../design-system/StatusPill';
import { NarrativeEvent } from '@/types/websocket';
import { Building2 } from 'lucide-react-native';
import { colors, spacing } from '@/src/theme/tokens';
import { getPlayerStats } from '@/src/utils/playerStats';

interface PlayerCardProps {
  player: PlayerDto;
  isMe?: boolean;
  buildConfirmed?: boolean;
  abilityConfirmed?: boolean;
  narrativeEvents?: NarrativeEvent[];
  showProfession?: boolean;
  compact?: boolean;
  highlightNew?: string[];
}

export const PlayerCard = ({
  player,
  isMe = false,
  buildConfirmed = false,
  abilityConfirmed = false,
  narrativeEvents = [],
  showProfession = true,
  compact = false,
  highlightNew = [],
}: PlayerCardProps) => {
  const professionData = player.profession
    ? PROFESSION_DATA[player.profession as keyof typeof PROFESSION_DATA]
    : null;

  const { buildingValue, points } = getPlayerStats(player);

  const playerEvents = narrativeEvents.filter((e) => e.playerId === player.id);
  const buildEvents = playerEvents.filter((e) => e.type === 'build');

  const goldAnim = useRef(new Animated.Value(player.gold)).current;
  const [displayedGold, setDisplayedGold] = useState(player.gold);

  useEffect(() => {
    const listener = goldAnim.addListener(({ value }) => {
      setDisplayedGold(Math.round(value));
    });

    Animated.timing(goldAnim, {
      toValue: player.gold,
      duration: 500,
      useNativeDriver: false,
    }).start();

    return () => goldAnim.removeListener(listener);
  }, [player.gold, goldAnim]);

  const newBuildingIds = [
    ...highlightNew,
    ...buildEvents
      .map((e) => e.data?.buildingId as string | undefined)
      .filter((id): id is string => !!id),
  ];

  return (
    <Card highlighted={isMe}>
      <View style={styles.headerRow}>
        <Row gap={8} align="center">
          <Text variant="display" style={styles.playerName}>
            {player.name}
          </Text>
          {isMe && (
            <Text variant="label" style={{ color: colors.brand.DEFAULT }}>
              (Ty)
            </Text>
          )}
        </Row>
        <Row gap={8}>
          <StatusPill label="Budowa" confirmed={buildConfirmed} />
          <StatusPill label="Zdolność" confirmed={abilityConfirmed} />
        </Row>
      </View>

      {showProfession && professionData && (
        <View style={styles.section}>
          <Text variant="label">Zawód: {professionData.name}</Text>
        </View>
      )}

      <View style={[styles.section, styles.statsRow]}>
        <View style={styles.statColumn}>
          <Text variant="label">Złoto</Text>
          <Text variant="stat" style={{ color: colors.gold.DEFAULT }}>
            {displayedGold}
          </Text>
        </View>
        <View style={[styles.statColumn, styles.statColumnCenter]}>
          <Row gap={4} align="center">
            <Building2 color={colors.text.primary} size={14} />
            <Text variant="label">Wartość budynków</Text>
          </Row>
          <Text variant="stat" style={styles.statNumber}>
            {buildingValue}
          </Text>
        </View>
        <View style={[styles.statColumn, styles.statColumnEnd]}>
          <Text variant="label">Punkty</Text>
          <Text variant="stat" style={styles.statNumber}>
            {points}
          </Text>
        </View>
      </View>

      <View>
        <Text variant="section" style={styles.buildingsLabel}>
          Budynki ({player.buildings.length})
        </Text>
        <PlayerSkyline
          buildings={player.buildings}
          highlightNew={newBuildingIds}
          size={compact ? 'compact' : 'compact'}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.cardGap,
  },
  playerName: {
    fontSize: 18,
  },
  section: {
    marginBottom: spacing.cardGap,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statColumn: {
    flex: 1,
  },
  statColumnCenter: {
    alignItems: 'center',
  },
  statColumnEnd: {
    alignItems: 'flex-end',
  },
  statNumber: {
    marginTop: 4,
  },
  buildingsLabel: {
    marginBottom: 4,
  },
});
