import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocketStore } from '@/src/store/socket.store';
import { useLobbyStore } from '@/src/store/lobby.store';
import { useGameStore } from '@/src/store/game.store';
import { api } from '@/src/services/api';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';

export default function HomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'join' | 'create'>('select');
  const [playerName, setPlayerName] = useState('');
  const [gamePin, setGamePin] = useState('');
  const [loading, setLoading] = useState(false);

  const { isConnected, isConnecting, disconnect, setEventHandlers } = useSocketStore();
  const { setGame, reset: resetLobby } = useLobbyStore();
  const { reset: resetGame } = useGameStore();

  // Powrót do głównego menu powinien czyścić stan klienta i “stare” eventy,
  // żeby nie wylądować w poprzedniej grze.
  useEffect(() => {
    setEventHandlers({});
    disconnect();
    resetLobby();
    resetGame();
  }, [disconnect, resetGame, resetLobby, setEventHandlers]);

  // NIE łączymy się automatycznie - tylko po dołączeniu do gry w lobby

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      Alert.alert('Błąd', 'Wprowadź nazwę gracza');
      return;
    }

    setLoading(true);
    try {
      const response = await api.createGame(playerName.trim());
      setGame(
        response.gameId,
        response.gamePin,
        response.hostId,
        playerName.trim(),
        true
      );
      router.push('/lobby');
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się utworzyć gry');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim() || !gamePin.trim()) {
      Alert.alert('Błąd', 'Wprowadź nazwę gracza i PIN gry');
      return;
    }

    if (gamePin.trim().length !== 6) {
      Alert.alert('Błąd', 'PIN musi mieć 6 cyfr');
      return;
    }

    setLoading(true);
    try {
      const response = await api.joinGameByPin(playerName.trim(), gamePin.trim());
      setGame(
        response.gameId,
        gamePin.trim(),
        response.playerId,
        playerName.trim(),
        false
      );
      router.push('/lobby');
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się dołączyć do gry');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'select') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Figlolandia</Text>

        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            size="lg"
            onPress={() => setMode('create')}
          >
            Stwórz grę
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onPress={() => setMode('join')}
          >
            Dołącz do gry
          </Button>
        </View>

      </View>
    );
  }

  if (mode === 'create') {
    return (
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.contentContainer}>
          <Text style={styles.screenTitle}>Stwórz grę</Text>

          <Card style={styles.cardContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nazwa gracza</Text>
              <Input
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Wprowadź swoją nazwę"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.buttonRow}>
              <Button
                variant="secondary"
                onPress={() => setMode('select')}
                style={{ flex: 1 }}
                disabled={loading}
              >
                Wstecz
              </Button>
              <Button
                variant="primary"
                onPress={handleCreateGame}
                style={{ flex: 1 }}
                disabled={loading || !playerName.trim()}
              >
                {loading ? 'Tworzenie...' : 'Stwórz'}
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.contentContainer}>
        <Text style={styles.screenTitle}>Dołącz do gry</Text>

        <Card className="w-full max-w-md">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nazwa gracza</Text>
            <Input
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Wprowadź swoją nazwę"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN gry</Text>
            <Input
              value={gamePin}
              onChangeText={setGamePin}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.buttonRow}>
            <Button
              variant="secondary"
              onPress={() => setMode('select')}
              className="flex-1"
              disabled={loading}
            >
              Wstecz
            </Button>
            <Button
              variant="primary"
              onPress={handleJoinGame}
              className="flex-1"
              disabled={loading || !playerName.trim() || gamePin.trim().length !== 6}
            >
              {loading ? 'Łączenie...' : 'Dołącz'}
            </Button>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  statusContainer: {
    marginTop: 32,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
  },
});
