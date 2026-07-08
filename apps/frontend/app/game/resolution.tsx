import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { Card } from '@/src/components/ui/Card';
import { PlayerCard } from '@/src/components/player/PlayerCard';

export default function ResolutionScreen() {
  const { phase, round, players, winner, narrativeEvents } = useGameStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Rozstrzygnięcie rundy {round}
        </Text>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Kolejność działań
          </Text>
          <Text style={styles.infoText}>
            Akcje są rozstrzygane w kolejności graczy. Szczegóły rozstrzygnięcia
            są widoczne w stanie gry.
          </Text>
        </Card>

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Gracze</Text>
          {players
            .sort((a, b) => a.order - b.order)
            .map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                style={styles.playerCard}
                narrativeEvents={narrativeEvents}
              />
            ))}
        </View>

        {winner && (
          <Card style={styles.winnerCard}>
            <Text style={styles.winnerTitle}>
              Zwycięzca: {players.find((p) => p.id === winner)?.name || 'Nieznany'}
            </Text>
          </Card>
        )}
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
  infoCard: {
    marginBottom: 24,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  playersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerCard: {
    marginBottom: 12,
  },
  winnerCard: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  winnerTitle: {
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
});
