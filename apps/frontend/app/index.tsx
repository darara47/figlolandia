import { useState, useEffect } from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
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
import { CitySkylineBackground } from '@/src/components/design-system/CitySkylineBackground';
import { Stack, Row } from '@/src/components/ui/Stack';
import { spacing } from '@/src/theme/tokens';
import { centeredForm, centeredScrollContent } from '@/src/theme/layout';

export default function HomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'join' | 'create'>('select');
  const [playerName, setPlayerName] = useState('');
  const [gamePin, setGamePin] = useState('');
  const [loading, setLoading] = useState(false);
  const { setGame } = useLobbyStore();

  useEffect(() => {
    useSocketStore.getState().setEventHandlers({});
    useSocketStore.getState().disconnect();
    useLobbyStore.getState().reset();
    useGameStore.getState().reset();
  }, []);

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
        true,
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
        false,
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
      <Screen centered style={styles.homeScreen}>
        <CitySkylineBackground />
        <Text variant="display-xl" style={[styles.homeTitle, styles.homeContent]}>
          Figlolandia
        </Text>
        <Stack gap={16} align="stretch" style={[styles.homeButtons, styles.homeContent]}>
          <Button variant="primary" size="lg" onPress={() => setMode('create')}>
            Stwórz grę
          </Button>
          <Button variant="secondary" size="lg" onPress={() => setMode('join')}>
            Dołącz do gry
          </Button>
        </Stack>
      </Screen>
    );
  }

  if (mode === 'create') {
    return (
      <Screen>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={centeredScrollContent}
        >
          <Text variant="display" style={styles.formTitle}>
            Stwórz grę
          </Text>
          <Card style={styles.formCard}>
            <View style={styles.field}>
              <Text variant="label" style={styles.fieldLabel}>
                Nazwa gracza
              </Text>
              <Input
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Wprowadź swoją nazwę"
                autoCapitalize="words"
              />
            </View>
            <Row gap={12}>
              <Button
                variant="secondary"
                onPress={() => setMode('select')}
                style={styles.halfButton}
                disabled={loading}
              >
                Wstecz
              </Button>
              <Button
                variant="primary"
                onPress={handleCreateGame}
                style={styles.halfButton}
                disabled={loading || !playerName.trim()}
              >
                {loading ? 'Tworzenie...' : 'Stwórz'}
              </Button>
            </Row>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={centeredScrollContent}
      >
        <Text variant="display" style={styles.formTitle}>
          Dołącz do gry
        </Text>
        <Card style={styles.formCard}>
          <View style={styles.field}>
            <Text variant="label" style={styles.fieldLabel}>
              Nazwa gracza
            </Text>
            <Input
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Wprowadź swoją nazwę"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text variant="label" style={styles.fieldLabel}>
              PIN gry
            </Text>
            <Input
              value={gamePin}
              onChangeText={setGamePin}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
          <Row gap={12}>
            <Button
              variant="secondary"
              onPress={() => setMode('select')}
              style={styles.halfButton}
              disabled={loading}
            >
              Wstecz
            </Button>
            <Button
              variant="primary"
              onPress={handleJoinGame}
              style={styles.halfButton}
              disabled={loading || !playerName.trim() || gamePin.trim().length !== 6}
            >
              {loading ? 'Łączenie...' : 'Dołącz'}
            </Button>
          </Row>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeScreen: {
    position: 'relative',
  },
  homeTitle: {
    marginBottom: 32,
    textAlign: 'center',
  },
  homeContent: {
    zIndex: 1,
  },
  homeButtons: {
    ...centeredForm,
  },
  scroll: {
    flex: 1,
  },
  formTitle: {
    marginBottom: 32,
    textAlign: 'center',
  },
  formCard: {
    ...centeredForm,
  },
  field: {
    marginBottom: spacing.screen,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  halfButton: {
    flex: 1,
  },
});
