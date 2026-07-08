import { StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';

import { Text, View } from '@/components/Themed';
import { useSocketStore } from '@/src/store/socket.store';
import { GameStateUpdatePayload } from '@/types/websocket';

export default function TabOneScreen() {
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState<GameStateUpdatePayload | null>(null);

  const { isConnected, isConnecting, joinGame, submitActions, connect, setEventHandlers } = useSocketStore();

  // Ustaw event handlery dla tego ekranu
  useEffect(() => {
    setEventHandlers({
      onGameStateUpdate: (payload) => {
        setGameState(payload);
        console.log('Stan gry zaktualizowany:', payload);
      },
      onPhaseChange: (payload) => {
        console.log('Zmiana fazy:', payload);
        Alert.alert('Zmiana fazy', `Faza: ${payload.phase}, Runda: ${payload.round}`);
      },
      onError: (payload) => {
        Alert.alert('Błąd', payload.message);
      },
    });
    return () => {
      setEventHandlers({});
    };
  }, [setEventHandlers]);

  // Opcjonalnie: połącz jeśli nie jesteśmy połączeni (tylko dla testów)
  // W produkcji połączenie powinno być zarządzane przez lobby.tsx
  // useEffect(() => {
  //   if (!isConnected && !isConnecting) {
  //     connect();
  //   }
  // }, [isConnected, isConnecting, connect]);

  const handleJoinGame = () => {
    if (!gameId.trim() || !playerName.trim()) {
      Alert.alert('Błąd', 'Wprowadź ID gry i nazwę gracza');
      return;
    }

    if (!isConnected) {
      Alert.alert('Błąd', 'Nie połączono z serwerem');
      return;
    }

    joinGame({
      gameId: gameId.trim(),
      playerName: playerName.trim(),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Figlolandia</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isConnecting ? 'Łączenie...' : isConnected ? '✅ Połączono' : '❌ Rozłączono'}
        </Text>
      </View>

      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="ID Gry"
          value={gameId}
          onChangeText={setGameId}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="Nazwa gracza"
          value={playerName}
          onChangeText={setPlayerName}
          placeholderTextColor="#999"
        />

        <Pressable
          style={[styles.button, (!isConnected || isConnecting) && styles.buttonDisabled]}
          onPress={handleJoinGame}
          disabled={!isConnected || isConnecting}
        >
          <Text style={styles.buttonText}>Dołącz do gry</Text>
        </Pressable>
      </View>

      {gameState && (
        <View style={styles.gameStateContainer}>
          <Text style={styles.gameStateTitle}>Stan gry:</Text>
          <Text style={styles.gameStateText}>Faza: {gameState.phase}</Text>
          <Text style={styles.gameStateText}>Runda: {gameState.round}</Text>
          <Text style={styles.gameStateText}>Gracze: {gameState.players.length}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusContainer: {
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: '100%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gameStateContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  gameStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  gameStateText: {
    fontSize: 14,
    marginBottom: 5,
  },
});
