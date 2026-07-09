import { View, ScrollView } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { Card } from '@/src/components/ui/Card';
import { Text } from '@/src/components/ui/Text';
import { PlayerCard } from '@/src/components/player/PlayerCard';

export default function ResolutionScreen() {
  const { round, players, winner, narrativeEvents } = useGameStore();

  const sortedPlayers = [...players].sort((a, b) => a.order - b.order);

  return (
    <ScrollView className="flex-1 bg-bg-base">
      <View className="p-4">
        <Text variant="display" className="mb-4">
          Rozstrzygnięcie rundy {round}
        </Text>

        <Card className="mb-6">
          <Text variant="display" className="mb-2 text-lg">
            Kolejność działań
          </Text>
          <Text variant="body" className="text-text-secondary">
            Akcje są rozstrzygane w kolejności graczy. Szczegóły rozstrzygnięcia są widoczne w
            stanie gry.
          </Text>
        </Card>

        <Text variant="section" className="mb-3">
          Gracze
        </Text>
        {sortedPlayers.map((player) => (
          <View key={player.id} className="mb-3">
            <PlayerCard player={player} narrativeEvents={narrativeEvents} />
          </View>
        ))}

        {winner && (
          <Card className="mt-4 border-2 border-gold bg-gold/10">
            <Text variant="display" className="text-center text-gold">
              Zwycięzca: {players.find((p) => p.id === winner)?.name || 'Nieznany'}
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
