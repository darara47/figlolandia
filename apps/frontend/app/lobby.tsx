import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { useGameStore } from '@/src/store/game.store';
import { api } from '@/src/services/api';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';

export default function LobbyScreen() {
  const router = useRouter();
  const { gameId, gamePin, playerId, playerName, isHost, gameState, config, updateConfig, setGameState } = useLobbyStore();
  const { connect, joinGame, isConnected, isConnecting } = useSocketStore();
  const { phase, updateFromServer } = useGameStore();
  const [loading, setLoading] = useState(false);

  // Ref do śledzenia czy już próbowaliśmy się połączyć dla tego gameId/playerId
  const connectionAttemptedRef = useRef<string | null>(null);
  // Ref do śledzenia czy już dołączyliśmy do gry
  const joinGameAttemptedRef = useRef<string | null>(null);

  // Połącz z WebSocket gdy wejdziemy do lobby
  useEffect(() => {
    if (!gameId || !playerId) {
      return;
    }

    const connectionKey = `${gameId}-${playerId}`;

    // Jeśli już próbowaliśmy się połączyć dla tego gameId/playerId, nie rób nic
    if (connectionAttemptedRef.current === connectionKey) {
      return;
    }

    const attemptConnection = () => {
      const { isConnected: currentConnected, isConnecting: currentConnecting } = useSocketStore.getState();

      if (!currentConnected && !currentConnecting) {
        console.log('Lobby: Próba połączenia z WebSocket...');
        connectionAttemptedRef.current = connectionKey;
        connect();
      }
    };

    // Małe opóźnienie aby uniknąć wielokrotnych wywołań
    const timeoutId = setTimeout(attemptConnection, 100);

    return () => {
      clearTimeout(timeoutId);
      // Reset ref gdy zmienia się gameId lub playerId
      if (connectionAttemptedRef.current === connectionKey) {
        connectionAttemptedRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, playerId]); // Tylko gameId i playerId w zależnościach

  // Dołącz do gry przez WebSocket gdy połączenie jest gotowe
  useEffect(() => {
    if (!gameId || !playerId || !isConnected) {
      return;
    }

    const joinKey = `${gameId}-${playerId}`;

    // Jeśli już próbowaliśmy dołączyć do gry, nie rób nic
    if (joinGameAttemptedRef.current === joinKey) {
      return;
    }

    console.log('Lobby: Dołączanie do gry przez WebSocket...');
    joinGameAttemptedRef.current = joinKey;
    joinGame({ gameId, playerName: playerName || '' });

    return () => {
      // Reset ref gdy zmienia się gameId, playerId lub isConnected
      if (joinGameAttemptedRef.current === joinKey) {
        joinGameAttemptedRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, playerId, isConnected, playerName]); // Usuń joinGame z zależności

  // Ustaw event handlery dla WebSocket
  useEffect(() => {
    const { setEventHandlers } = useSocketStore.getState();
    setEventHandlers({
      onGameStateUpdate: (payload) => {
        console.log('Lobby: GAME_STATE_UPDATE received', payload.phase);
        if (playerId) {
          updateFromServer(payload, playerId);
        }
        // Zaktualizuj gameState w lobbyStore
        const gameStateDto: any = {
          gameId: payload.gameId,
          gamePin: payload.gamePin,
          phase: payload.phase,
          round: payload.round,
          players: payload.players.map(p => ({
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
            minPlayers: 3, // Domyślna wartość
            maxPlayers: 8, // Domyślna wartość
          },
        };
        setGameState(gameStateDto);
        // Sprawdź czy faza się zmieniła na grę
        if (payload.phase !== 'LOBBY' && payload.phase !== 'PREP') {
          console.log('Lobby: Przekierowanie do gry, faza:', payload.phase);
          router.replace(`/game/${payload.gameId}`);
        }
      },
      onPhaseChange: (payload) => {
        console.log('Lobby: PHASE_CHANGE received', payload.phase);
        if (payload.phase !== 'LOBBY' && payload.phase !== 'PREP') {
          console.log('Lobby: Przekierowanie do gry przez PHASE_CHANGE, faza:', payload.phase);
          router.replace(`/game/${payload.gameId}`);
        }
      },
    });
  }, [playerId, router, updateFromServer]);

  // Sprawdź fazę z gameStore i przekieruj jeśli potrzeba
  useEffect(() => {
    if (phase && phase !== 'LOBBY' && phase !== 'PREP' && gameId) {
      console.log('Lobby: Wykryto zmianę fazy w store, przekierowanie:', phase);
      router.replace(`/game/${gameId}`);
    }
  }, [phase, gameId, router]);

  // Odśwież stan gry i sprawdź fazę
  useEffect(() => {
    if (gameId) {
      const refreshState = async () => {
        try {
          const response = await api.getGameState(gameId);
          setGameState(response.state);

          // Jeśli faza się zmieniła, zaktualizuj gameStore i przekieruj
          if (response.state.phase !== 'LOBBY' && response.state.phase !== 'PREP') {
            console.log('Lobby: Wykryto zmianę fazy przez polling:', response.state.phase);
            if (playerId) {
              // Zaktualizuj gameStore z pełnym stanem
              const gameStatePayload: any = {
                gameId: response.state.gameId,
                phase: response.state.phase,
                round: response.state.round,
                players: response.state.players.map(p => ({
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
    }
  }, [gameId, setGameState, playerId, updateFromServer, router]);

  const handleStartGame = async () => {
    if (!gameId) return;

    setLoading(true);
    try {
      await api.startGame(gameId, config);
      // Przekierowanie nastąpi przez WebSocket event
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się rozpocząć gry');
    } finally {
      setLoading(false);
    }
  };

  const canStart = isHost && gameState && gameState.players.length >= (config.minPlayers || 3);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lobby</Text>

        {gamePin && (
          <Card style={styles.pinCard}>
            <Text style={styles.pinLabel}>PIN gry</Text>
            <Text style={styles.pinValue}>{gamePin}</Text>
            <Text style={styles.pinHint}>Udostępnij ten PIN innym graczom</Text>
          </Card>
        )}

        {isHost && (
          <Card style={styles.configCard}>
            <Text style={styles.sectionTitle}>Konfiguracja gry</Text>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Maksymalna liczba rund</Text>
              <Input
                value={config.maxRounds?.toString() || '10'}
                onChangeText={(text) => updateConfig({ maxRounds: parseInt(text) || 10 })}
                keyboardType="numeric"
                style={styles.configInput}
              />
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Próg zwycięstwa</Text>
              <Input
                value={config.victoryThreshold?.toString() || '50'}
                onChangeText={(text) => updateConfig({ victoryThreshold: parseInt(text) || 50 })}
                keyboardType="numeric"
                style={styles.configInput}
              />
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Częstotliwość zdarzeń (0-1)</Text>
              <Input
                value={config.eventFrequency?.toString() || '0.3'}
                onChangeText={(text) => updateConfig({ eventFrequency: parseFloat(text) || 0.3 })}
                keyboardType="decimal-pad"
                style={styles.configInput}
              />
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Minimalna liczba graczy</Text>
              <Input
                value={config.minPlayers?.toString() || '3'}
                onChangeText={(text) => updateConfig({ minPlayers: parseInt(text) || 3 })}
                keyboardType="numeric"
                style={styles.configInput}
              />
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Maksymalna liczba graczy</Text>
              <Input
                value={config.maxPlayers?.toString() || '8'}
                onChangeText={(text) => updateConfig({ maxPlayers: parseInt(text) || 8 })}
                keyboardType="numeric"
                style={styles.configInput}
              />
            </View>
          </Card>
        )}

        <Card style={styles.playersCard}>
          <Text style={styles.sectionTitle}>
            Gracze ({gameState?.players.length || 0})
          </Text>

          {gameState?.players.map((player, index) => (
            <View
              key={player.id}
              style={[
                styles.playerRow,
                index < (gameState.players.length - 1) && styles.playerRowBorder
              ]}
            >
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {player.name}
                  {player.id === playerId && ' (Ty)'}
                </Text>
                {isHost && index === 0 && (
                  <Text style={styles.hostBadge}>👑 Host</Text>
                )}
              </View>
              <View style={styles.playerStatus}>
                <Text style={styles.readyText}>✓ Gotowy</Text>
              </View>
            </View>
          )) || (
              <Text style={styles.noPlayers}>Brak graczy</Text>
            )}
        </Card>

        {isHost && (
          <Button
            variant="primary"
            size="lg"
            onPress={handleStartGame}
            disabled={loading || !canStart}
            style={styles.startButton}
          >
            {loading ? 'Rozpoczynanie...' : canStart ? 'Rozpocznij grę' : `Wymagane minimum ${config.minPlayers || 3} graczy`}
          </Button>
        )}

        {!isHost && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              Czekaj na rozpoczęcie gry przez hosta...
            </Text>
            {isConnecting && (
              <Text style={styles.connectingText}>Łączenie z serwerem...</Text>
            )}
          </View>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  pinCard: {
    marginBottom: 16,
    backgroundColor: '#1E40AF',
    borderColor: '#3B82F6',
  },
  pinLabel: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 8,
  },
  pinValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 4,
  },
  pinHint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  configCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  configRow: {
    marginBottom: 16,
  },
  configLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  configInput: {
    marginTop: 4,
  },
  playersCard: {
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hostBadge: {
    color: '#FBBF24',
    fontSize: 12,
    marginTop: 4,
  },
  playerStatus: {
    alignItems: 'flex-end',
  },
  readyText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  noPlayers: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  startButton: {
    width: '100%',
    marginTop: 8,
  },
  waitingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  waitingText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
  connectingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
});
