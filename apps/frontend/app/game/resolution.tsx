import { useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '@/src/store/game.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { useSocketStore } from '@/src/store/socket.store';
import { Text } from '@/src/components/ui/Text';
import { ResolutionPlayerCard } from '@/src/components/resolution/ResolutionPlayerCard';
import { SkipAnimationBar } from '@/src/components/resolution/SkipAnimationBar';
import { useResolutionPlayback } from '@/src/hooks/useResolutionPlayback';
import { translateNarrativeEvent } from '@/src/utils/narrative';
import { sortPlayersByJoinOrder } from '@/src/utils/players';
import { colors, spacing } from '@/src/theme/tokens';

export default function ResolutionScreen() {
  const {
    round,
    players,
    narrativeEvents,
    config,
    skipResolutionVotes,
    phase,
    gameId,
    localSkipVoted,
    setLocalSkipVoted,
    setResolutionNarratorEvent,
  } = useGameStore();
  const { playerId } = useLobbyStore();
  const { voteSkipResolution } = useSocketStore();

  const playback = useResolutionPlayback({
    players,
    narrativeEvents,
    animationSpeed: config.animationSpeed ?? 'full',
    localSkipVoted,
    phase,
    active: phase === 'RESOLUTION',
  });

  const sortedPlayers = sortPlayersByJoinOrder(playback.displayPlayers);

  const handleSkip = () => {
    if (!gameId || localSkipVoted) return;
    setLocalSkipVoted(true);
    voteSkipResolution({ gameId });
  };

  useEffect(() => {
    if (phase !== 'RESOLUTION') {
      setResolutionNarratorEvent(null);
      return;
    }
    if (config.animationSpeed === 'off') {
      setResolutionNarratorEvent(null);
      return;
    }
    setResolutionNarratorEvent(playback.currentEvent);
  }, [
    phase,
    playback.currentEvent,
    config.animationSpeed,
    setResolutionNarratorEvent,
  ]);

  const summaryText =
    config.animationSpeed === 'off'
      ? narrativeEvents.map(translateNarrativeEvent).join('\n\n')
      : playback.currentEvent
        ? translateNarrativeEvent(playback.currentEvent)
        : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text variant="display" style={styles.title}>
        Rozstrzygnięcie rundy {round}
      </Text>

      {gameId && phase === 'RESOLUTION' && (
        <SkipAnimationBar
          players={players}
          skipVotes={skipResolutionVotes}
          localSkipVoted={localSkipVoted}
          onSkip={handleSkip}
        />
      )}

      {config.animationSpeed === 'off' && summaryText ? (
        <View style={styles.summaryBox}>
          <Text variant="body" style={styles.summaryText}>
            {summaryText.replace(/<\/?b>/g, '')}
          </Text>
        </View>
      ) : null}

      {sortedPlayers.map((player) => (
        <ResolutionPlayerCard
          key={player.id}
          player={player}
          isMe={player.id === playerId}
          isActive={player.id === playback.activePlayerId}
          dimmed={!!playback.activePlayerId && player.id !== playback.activePlayerId}
          useSpotlight={playback.useSpotlight}
          highlightNew={playback.highlightNewByPlayer[player.id] ?? []}
          shake={player.id === playback.shakeTargetId}
          shield={player.id === playback.shieldPlayerId}
          flash={player.id === playback.flashTargetId}
          currentEvent={playback.currentEvent}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    padding: spacing.screen,
    paddingBottom: 32,
  },
  title: {
    marginBottom: spacing.cardGap,
  },
  summaryBox: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  summaryText: {
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
