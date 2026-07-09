import { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Alert, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { useGameStore } from '@/src/store/game.store';
import { api } from '@/src/services/api';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Screen } from '@/src/components/ui/Screen';
import { Text } from '@/src/components/ui/Text';
import { PlayerAvatar } from '@/src/components/design-system/PlayerAvatar';
import { Row } from '@/src/components/ui/Stack';
import { colors, spacing } from '@/src/theme/tokens';
import { pageScrollContent } from '@/src/theme/layout';

export default function LobbyScreen() {
  const router = useRouter();
  const { gameId, gamePin, playerId, playerName, isHost, gameState, config, updateConfig, setGameState } =
    useLobbyStore();
  const { connect, joinGame, isConnected, isConnecting } = useSocketStore();
  const { phase, updateFromServer } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  const connectionAttemptedRef = useRef<string | null>(null);
  const joinGameAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameId || !playerId) return;

    const connectionKey = `${gameId}-${playerId}`;
    if (connectionAttemptedRef.current === connectionKey) return;

    const attemptConnection = () => {
      const { isConnected: currentConnected, isConnecting: currentConnecting } =
        useSocketStore.getState();
      if (!currentConnected && !currentConnecting) {
        connectionAttemptedRef.current = connectionKey;
        connect();
      }
    };

    const timeoutId = setTimeout(attemptConnection, 100);
    return () => {
      clearTimeout(timeoutId);
      if (connectionAttemptedRef.current === connectionKey) {
        connectionAttemptedRef.current = null;
      }
    };
  }, [gameId, playerId, connect]);

  useEffect(() => {
    if (!gameId || !playerId || !isConnected) return;

    const joinKey = `${gameId}-${playerId}`;
    if (joinGameAttemptedRef.current === joinKey) return;

    joinGameAttemptedRef.current = joinKey;
    joinGame({ gameId, playerName: playerName || '' });

    return () => {
      if (joinGameAttemptedRef.current === joinKey) {
        joinGameAttemptedRef.current = null;
      }
    };
  }, [gameId, playerId, isConnected, playerName, joinGame]);

  useEffect(() => {
    const { setEventHandlers } = useSocketStore.getState();
    setEventHandlers({
      onGameStateUpdate: (payload) => {
        if (!gameId || payload.gameId !== gameId) return;

        if (playerId) updateFromServer(payload, playerId);
        const gameStateDto: any = {
          gameId: payload.gameId,
          gamePin: payload.gamePin,
          phase: payload.phase,
          round: payload.round,
          players: payload.players.map((p) => ({
            id: p.id,
            name: p.name,
            gold: p.gold,
            buildings: p.buildings,
            cards: p.cards,
            profession: p.profession,
            order: p.order,
          })),
          winner: payload.winner,
          config: {
            maxRounds: payload.config.maxRounds,
            victoryThreshold: payload.config.victoryThreshold,
            eventFrequency: payload.config.eventFrequency,
            minPlayers: 3,
            maxPlayers: 8,
            animationSpeed: payload.config.animationSpeed ?? 'full',
          },
        };
        setGameState(gameStateDto);
        if (payload.phase !== 'LOBBY' && payload.phase !== 'PREP') {
          router.replace(`/game/${payload.gameId}`);
        }
      },
      onPhaseChange: (payload) => {
        if (!gameId || payload.gameId !== gameId) return;
        if (payload.phase !== 'LOBBY' && payload.phase !== 'PREP') {
          router.replace(`/game/${payload.gameId}`);
        }
      },
    });
    return () => setEventHandlers({});
  }, [gameId, playerId, router, updateFromServer, setGameState]);

  useEffect(() => {
    if (phase && phase !== 'LOBBY' && phase !== 'PREP' && gameId) {
      router.replace(`/game/${gameId}`);
    }
  }, [phase, gameId, router]);

  useEffect(() => {
    if (!gameId) return;

    const refreshState = async () => {
      try {
        const response = await api.getGameState(gameId);
        setGameState(response.state);

        if (response.state.phase !== 'LOBBY' && response.state.phase !== 'PREP') {
          if (playerId) {
            const gameStatePayload: any = {
              gameId: response.state.gameId,
              phase: response.state.phase,
              round: response.state.round,
              players: response.state.players.map((p) => ({
                id: p.id,
                name: p.name,
                gold: p.gold,
                buildings: p.buildings,
                cards: p.cards,
                profession: p.profession,
                order: p.order,
              })),
              winner: response.state.winner,
              config: {
                maxRounds: response.state.config.maxRounds,
                victoryThreshold: response.state.config.victoryThreshold,
                eventFrequency: response.state.config.eventFrequency,
                animationSpeed: response.state.config.animationSpeed ?? 'full',
              },
            };
            updateFromServer(gameStatePayload, playerId);
          }
          router.replace(`/game/${gameId}`);
        }
      } catch (error) {
        console.error('Błąd odświeżania stanu:', error);
      }
    };

    refreshState();
    const interval = setInterval(refreshState, 2000);
    return () => clearInterval(interval);
  }, [gameId, setGameState, playerId, updateFromServer, router]);

  const handleStartGame = async () => {
    if (!gameId || loading) return;

    setLoading(true);
    try {
      await api.startGame(gameId, config);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Błąd', error.message || 'Nie udało się rozpocząć gry');
    }
  };

  const canStart = isHost && gameState && gameState.players.length >= (config.minPlayers || 3);

  const handleCopyPin = async () => {
    if (!gamePin) return;

    await Clipboard.setStringAsync(gamePin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text variant="display-xl" style={styles.title}>
          Lobby
        </Text>

        {gamePin && (
          <Card
            highlighted
            style={[styles.sectionCard, styles.pinCard]}
          >
            <Row align="center" justify="space-between" style={styles.pinHeader}>
              <Text variant="label" style={styles.cardLabel}>
                PIN gry
              </Text>
              <Pressable
                onPress={handleCopyPin}
                style={styles.copyButton}
                accessibilityLabel="Kopiuj PIN do schowka"
                accessibilityRole="button"
              >
                {pinCopied ? (
                  <Check size={20} color={colors.success} />
                ) : (
                  <Copy size={20} color={colors.text.secondary} />
                )}
              </Pressable>
            </Row>
            <Text variant="stat" style={styles.pinValue}>
              {gamePin}
            </Text>
            <Text variant="label" style={styles.pinHint}>
              Udostępnij ten PIN innym graczom
            </Text>
          </Card>
        )}

        {isHost && (
          <Card style={styles.sectionCard}>
            <Text variant="section" style={styles.sectionHeading}>
              Konfiguracja gry
            </Text>

            {[
              { label: 'Maksymalna liczba rund', key: 'maxRounds' as const, value: config.maxRounds?.toString() || '10' },
              { label: 'Próg zwycięstwa', key: 'victoryThreshold' as const, value: config.victoryThreshold?.toString() || '50' },
              { label: 'Częstotliwość zdarzeń (0-100%)', key: 'eventFrequency' as const, value: config.eventFrequency !== undefined ? String(config.eventFrequency) : '0' },
              { label: 'Minimalna liczba graczy', key: 'minPlayers' as const, value: config.minPlayers?.toString() || '3' },
              { label: 'Maksymalna liczba graczy', key: 'maxPlayers' as const, value: config.maxPlayers?.toString() || '8' },
            ].map((field) => (
              <View key={field.key} style={styles.field}>
                <Text variant="label" style={styles.fieldLabel}>
                  {field.label}
                </Text>
                <Input
                  value={field.value}
                  onChangeText={(text) => {
                    if (field.key === 'eventFrequency') {
                      const digitsOnly = text.replace(/\D/g, '');
                      if (digitsOnly === '') {
                        updateConfig({ eventFrequency: 0 });
                        return;
                      }
                      const parsed = Math.min(100, parseInt(digitsOnly, 10));
                      updateConfig({ eventFrequency: Number.isFinite(parsed) ? parsed : 0 });
                      return;
                    }
                    updateConfig({ [field.key]: parseInt(text) || (field.key === 'minPlayers' ? 3 : field.key === 'maxPlayers' ? 8 : field.key === 'maxRounds' ? 10 : 50) });
                  }}
                  keyboardType="numeric"
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text variant="label" style={styles.fieldLabel}>
                Tempo animacji rozstrzygnięcia
              </Text>
              <Row gap={8}>
                {(
                  [
                    { id: 'full' as const, label: 'Pełne' },
                    { id: 'fast' as const, label: 'Szybkie' },
                    { id: 'off' as const, label: 'Wyłączone' },
                  ] as const
                ).map((option) => {
                  const selected = (config.animationSpeed ?? 'full') === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => updateConfig({ animationSpeed: option.id })}
                      style={[styles.segment, selected && styles.segmentSelected]}
                    >
                      <Text
                        variant="label"
                        style={{ color: selected ? colors.text.primary : colors.text.secondary }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </Row>
            </View>
          </Card>
        )}

        <Card style={styles.sectionCard}>
          <Text variant="section" style={styles.sectionHeading}>
            Gracze ({gameState?.players.length || 0})
          </Text>

          {gameState?.players.map((player, index) => (
            <View
              key={player.id}
              style={[
                styles.playerRow,
                index < gameState.players.length - 1 && styles.playerRowBorder,
              ]}
            >
              <Row gap={12} align="center" style={styles.playerInfo}>
                <PlayerAvatar playerId={player.id} name={player.name} />
                <View>
                  <Text variant="body" style={styles.playerName}>
                    {player.name}
                    {player.id === playerId && ' (Ty)'}
                  </Text>
                  {isHost && index === 0 && (
                    <Text variant="label" style={{ color: colors.gold.DEFAULT }}>
                      Host
                    </Text>
                  )}
                </View>
              </Row>
              <Text variant="label" style={{ color: colors.success }}>
                ✓ Gotowy
              </Text>
            </View>
          )) || (
              <Text variant="label" style={styles.emptyPlayers}>
                Brak graczy
              </Text>
            )}
        </Card>

        {isHost && (
          <Button
            variant="primary"
            size="lg"
            onPress={handleStartGame}
            disabled={!canStart}
            loading={loading}
            style={styles.startButton}
          >
            {loading
              ? 'Rozpoczynanie...'
              : canStart
                ? 'Rozpocznij grę'
                : `Wymagane minimum ${config.minPlayers || 3} graczy`}
          </Button>
        )}

        {!isHost && (
          <View style={styles.waitingBlock}>
            <Text variant="body" style={styles.waitingText}>
              Czekaj na rozpoczęcie gry przez hosta...
            </Text>
            {isConnecting && (
              <Text variant="label" style={styles.connectingText}>
                Łączenie z serwerem...
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
  },
  scrollContent: {
    ...pageScrollContent,
    paddingHorizontal: spacing.screen,
  },
  title: {
    marginBottom: 24,
  },
  sectionCard: {
    marginBottom: spacing.cardGap,
  },
  pinCard: {
    borderWidth: 2,
    borderColor: colors.brand.DEFAULT,
  },
  cardLabel: {
    marginBottom: 0,
  },
  pinHeader: {
    marginBottom: 8,
  },
  copyButton: {
    padding: 4,
  },
  pinValue: {
    fontSize: 36,
    letterSpacing: 4,
    textAlign: 'center',
  },
  pinHint: {
    marginTop: 8,
    fontSize: 12,
  },
  sectionHeading: {
    marginBottom: spacing.cardGap,
  },
  field: {
    marginBottom: spacing.cardGap,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.bg.elevated,
  },
  segmentSelected: {
    borderColor: colors.brand.DEFAULT,
    backgroundColor: colors.brand.muted,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.cardGap,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  emptyPlayers: {
    paddingVertical: spacing.cardGap,
    textAlign: 'center',
  },
  startButton: {
    width: '100%',
    marginTop: 4,
    marginBottom: spacing.screen,
  },
  waitingBlock: {
    marginTop: 24,
    alignItems: 'center',
  },
  waitingText: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
  connectingText: {
    marginTop: 8,
  },
});
