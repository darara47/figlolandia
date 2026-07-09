import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGameStore } from '@/src/store/game.store';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { NarratorPanel } from '@/src/components/design-system/NarratorPanel';
import PlanningScreen from './planning';
import ResolutionScreen from './resolution';
import SummaryScreen from './summary';

export default function GameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { phase, updateFromServer, narrativeLog, narrativeEvents, config, resolutionNarratorEvent } =
    useGameStore();
  const { playerId } = useLobbyStore();
  const { setEventHandlers } = useSocketStore();

  useEffect(() => {
    setEventHandlers({
      onGameStateUpdate: (payload) => {
        if (playerId && payload.gameId === gameId) {
          updateFromServer(payload, playerId);
        }
      },
      onPhaseChange: () => { },
    });
    return () => setEventHandlers({});
  }, [gameId, playerId, setEventHandlers, updateFromServer]);

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

  const narratorEvents =
    phase === 'RESOLUTION'
      ? resolutionNarratorEvent
        ? [resolutionNarratorEvent]
        : config.animationSpeed === 'off'
          ? narrativeEvents
          : []
      : narrativeLog;

  return (
    <View className="flex-1 bg-bg-base">
      <NarratorPanel events={narratorEvents} />
      <View className="min-h-0 flex-1">
        {renderScreen()}
      </View>
    </View>
  );
}
