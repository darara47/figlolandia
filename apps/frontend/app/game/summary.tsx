import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { Card } from '@/src/components/ui/Card';
import { PlayerCard } from '@/src/components/player/PlayerCard';
import { BuildingCard } from '@/src/components/cards/BuildingCard';

export default function SummaryScreen() {
  const { players, winner, config } = useGameStore();

  const sortedPlayers = [...players].sort((a, b) => {
    const aValue = a.gold + a.buildings.reduce((sum, b) => sum + b.value, 0);
    const bValue = b.gold + b.buildings.reduce((sum, b) => sum + b.value, 0);
    return bValue - aValue;
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Podsumowanie gry</Text>

        {winner && (
          <Card style={styles.winnerCard}>
            <Text style={styles.winnerEmoji}>🏆 Zwycięzca 🏆</Text>
            <Text style={styles.winnerName}>
              {players.find((p) => p.id === winner)?.name || 'Nieznany'}
            </Text>
          </Card>
        )}

        <View style={styles.rankingSection}>
          <Text style={styles.sectionTitle}>Ranking graczy</Text>
          {sortedPlayers.map((player, index) => {
            const cityValue = player.gold + player.buildings.reduce((sum, b) => sum + b.value, 0);
            return (
              <Card key={player.id} style={styles.rankingCard}>
                <View style={styles.rankingHeader}>
                  <View style={styles.rankingLeft}>
                    <Text style={styles.rankingNumber}>#{index + 1}</Text>
                    <Text style={styles.rankingName}>{player.name}</Text>
                  </View>
                  <View style={styles.rankingRight}>
                    <Text style={styles.rankingValue}>{cityValue}</Text>
                    <Text style={styles.rankingDetails}>
                      {player.gold} zł + {player.buildings.reduce((sum, b) => sum + b.value, 0)} budynki
                    </Text>
                  </View>
                </View>

                <View style={styles.playerDetails}>
                  <Text style={styles.detailLabel}>Złoto: {player.gold}</Text>
                  <Text style={styles.detailLabel}>
                    Budynki ({player.buildings.length}):
                  </Text>
                  {player.buildings.length > 0 ? (
                    <View style={styles.buildingsContainer}>
                      {player.buildings.map((building) => (
                        <BuildingCard key={building.id} building={building} size="sm" />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noBuildings}>Brak budynków</Text>
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statystyki gry</Text>
          <Text style={styles.statsText}>
            Próg zwycięstwa: {config.victoryThreshold}
          </Text>
          <Text style={styles.statsText}>
            Maksymalna liczba rund: {config.maxRounds}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  winnerCard: {
    marginBottom: 24,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  winnerEmoji: {
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerName: {
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  rankingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  rankingCard: {
    marginBottom: 12,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankingNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
  },
  rankingName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  rankingRight: {
    alignItems: 'flex-end',
  },
  rankingValue: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  rankingDetails: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  playerDetails: {
    marginTop: 12,
  },
  detailLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  buildingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noBuildings: {
    color: '#6B7280',
    fontSize: 12,
  },
  statsCard: {
    marginTop: 8,
  },
  statsTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  statsText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
});
