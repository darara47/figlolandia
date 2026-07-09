import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWsUrl } from '@/constants/Config';
import {
  ClientEvents,
  ServerEvents,
  JoinGamePayload,
  SubmitActionsPayload,
  GameStateUpdatePayload,
  PhaseChangePayload,
  ErrorPayload,
} from '@/types/websocket';

interface UseSocketOptions {
  onGameStateUpdate?: (payload: GameStateUpdatePayload) => void;
  onPhaseChange?: (payload: PhaseChangePayload) => void;
  onError?: (payload: ErrorPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    onGameStateUpdate,
    onPhaseChange,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  // Inicjalizacja połączenia
  const connect = useCallback(() => {
    // Jeśli już próbujemy się połączyć, nie rób nic
    if (isConnectingRef.current) {
      console.log('Połączenie już w toku...');
      return;
    }

    // Jeśli socket już istnieje i jest połączony, nie rób nic
    if (socketRef.current?.connected) {
      console.log('Socket już jest połączony');
      return;
    }

    // Jeśli socket istnieje ale nie jest połączony, wyłącz reconnection i wyczyść
    if (socketRef.current) {
      console.log('Czyszczenie starego socketu...');
      socketRef.current.io.opts.reconnection = false; // Wyłącz reconnection przed disconnect
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);

    const socket = io(`${getWsUrl()}/game`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000, // Zwiększ opóźnienie między próbami
      reconnectionAttempts: 3, // Zmniejsz liczbę prób
      reconnectionDelayMax: 5000,
      timeout: 10000, // Zwiększ timeout
      // Usuń forceNew - pozwól Socket.IO zarządzać połączeniem
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Połączono z serwerem WebSocket');
      isConnectingRef.current = false;
      setIsConnected(true);
      setIsConnecting(false);
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Rozłączono z serwerem WebSocket:', reason);
      setIsConnected(false);
      onDisconnect?.();

      // Jeśli rozłączenie było nieoczekiwane, Socket.IO automatycznie spróbuje się reconnectować
      if (reason === 'io server disconnect') {
        // Serwer wymusił rozłączenie - nie próbuj reconnectować
        isConnectingRef.current = false;
        setIsConnecting(false);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Błąd połączenia WebSocket:', error);
      // Nie ustawiaj isConnecting na false od razu - pozwól Socket.IO próbować reconnectować
    });

    // Obsługa gdy reconnect się nie powiedzie
    socket.on('reconnect_failed', () => {
      console.error('❌ Nie udało się połączyć po wszystkich próbach');
      isConnectingRef.current = false;
      setIsConnecting(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected po ${attemptNumber} próbach`);
      isConnectingRef.current = false;
      setIsConnected(true);
      setIsConnecting(false);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Próba reconnection ${attemptNumber}...`);
      isConnectingRef.current = true;
      setIsConnecting(true);
    });

    // Obsługa eventów serwera
    socket.on(ServerEvents.GAME_STATE_UPDATE, (payload: GameStateUpdatePayload) => {
      console.log('📥 GAME_STATE_UPDATE:', payload);
      onGameStateUpdate?.(payload);
    });

    socket.on(ServerEvents.PHASE_CHANGE, (payload: PhaseChangePayload) => {
      console.log('📥 PHASE_CHANGE:', payload);
      onPhaseChange?.(payload);
    });

    socket.on(ServerEvents.ERROR, (payload: ErrorPayload) => {
      console.error('❌ ERROR:', payload);
      onError?.(payload);
    });
  }, [onGameStateUpdate, onPhaseChange, onError, onConnect, onDisconnect]);

  // Rozłączenie
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Usuń wszystkie event listenery przed rozłączeniem
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Wysyłanie eventów
  const joinGame = useCallback((payload: JoinGamePayload) => {
    if (!socketRef.current?.connected) {
      console.error('Socket nie jest połączony');
      return;
    }
    console.log('📤 JOIN_GAME:', payload);
    socketRef.current.emit(ClientEvents.JOIN_GAME, payload);
  }, []);

  const submitActions = useCallback((payload: SubmitActionsPayload) => {
    if (!socketRef.current?.connected) {
      console.error('Socket nie jest połączony');
      return;
    }
    console.log('📤 SUBMIT_ACTIONS:', payload);
    socketRef.current.emit(ClientEvents.SUBMIT_ACTIONS, payload);
  }, []);

  // Automatyczne połączenie przy montowaniu
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pusty array - łącz tylko raz przy montowaniu

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    joinGame,
    submitActions,
  };
};

