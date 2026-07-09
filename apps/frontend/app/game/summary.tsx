import { View, ScrollView } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { Card } from '@/src/components/ui/Card';
import { Text } from '@/src/components/ui/Text';
import { PlayerSkyline } from '@/src/components/design-system/PlayerSkyline';
import { PlayerAvatar } from '@/src/components/design-system/PlayerAvatar';
import { BuildingDto } from '@/src/types/api';

export default function SummaryScreen() {
  const { players, winner, config } = useGameStore();

  const sortedPlayers = [...players].sort((a, b) => {
    const aValue = a.gold + a.buildings.reduce((sum: number, bld: BuildingDto) => sum + bld.value, 0);
    const bValue = b.gold + b.buildings.reduce((sum: number, bld: BuildingDto) => sum + bld.value, 0);
    return bValue - aValue;
  });

  const winnerPlayer = winner ? players.find((p) => p.id === winner) : sortedPlayers[0];

  return (
    <ScrollView className="flex-1 bg-bg-base">
      <View className="p-4">
        <Text variant="display" className="mb-6">
          Podsumowanie gry
        </Text>

        {winnerPlayer && (
          <Card className="mb-6 border-2 border-gold bg-gold/10">
            <Text variant="display" className="mb-2 text-center text-gold">
              Zwycięzca
            </Text>
            <Text variant="display-xl" className="mb-4 text-center">
              {winnerPlayer.name}
            </Text>
            <PlayerSkyline buildings={winnerPlayer.buildings} size="hero" />
          </Card>
        )}

        <Text variant="section" className="mb-3">
          Ranking graczy
        </Text>
        {sortedPlayers.map((player, index) => {
          const cityValue =
            player.gold + player.buildings.reduce((sum: number, bld: BuildingDto) => sum + bld.value, 0);
          return (
            <Card key={player.id} className="mb-3">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Text variant="stat" className="text-text-secondary">
                    #{index + 1}
                  </Text>
                  <PlayerAvatar playerId={player.id} name={player.name} />
                  <Text variant="display" className="text-lg">
                    {player.name}
                  </Text>
                </View>
                <View className="items-end">
                  <Text variant="stat">{cityValue}</Text>
                  <Text variant="label" className="text-xs">
                    {player.gold} zł +{' '}
                    {player.buildings.reduce((sum: number, bld: BuildingDto) => sum + bld.value, 0)} budynki
                  </Text>
                </View>
              </View>
              <PlayerSkyline buildings={player.buildings} />
            </Card>
          );
        })}

        <Card className="mt-2">
          <Text variant="section" className="mb-2">
            Statystyki gry
          </Text>
          <Text variant="label">Próg zwycięstwa: {config.victoryThreshold}</Text>
          <Text variant="label">Maksymalna liczba rund: {config.maxRounds}</Text>
        </Card>
      </View>
    </ScrollView>
  );
}
