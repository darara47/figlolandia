import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '@/src/store/game.store';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { Narrator } from '@/src/components/narrator/Narrator';
import PlanningScreen from './planning';
import ResolutionScreen from './resolution';
import SummaryScreen from './summary';

export default function GameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { phase, updateFromServer, narrativeLog } = useGameStore();
  const { playerId } = useLobbyStore();
  const { setEventHandlers } = useSocketStore();

  // Ustaw event handlery
  useEffect(() => {
    setEventHandlers({
      onGameStateUpdate: (payload) => {
        if (playerId && payload.gameId === gameId) {
          updateFromServer(payload, playerId);
        }
      },
      onPhaseChange: (payload) => {
        if (payload.gameId === gameId && playerId) {
          // Stan zostanie zaktualizowany przez GAME_STATE_UPDATE
        }
      },
    });
  }, [gameId, playerId]);

  // Renderuj odpowiedni ekran w zależności od fazy
  const renderScreen = () => {
    switch (phase) {
      case 'PLANNING':
        return <PlanningScreen />;
      case 'RESOLUTION':
        return <ResolutionScreen />;
      case 'END':
        return <SummaryScreen />;
      default:
        return <PlanningScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <Narrator events={narrativeLog} />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
});

