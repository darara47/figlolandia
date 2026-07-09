import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { getWsUrl } from '@/constants/Config';
import {
  ClientEvents,
  ServerEvents,
  JoinGamePayload,
  SubmitActionsPayload,
  ConfirmBuildPayload,
  ConfirmAbilityPayload,
  VoteSkipResolutionPayload,
  GameStateUpdatePayload,
  PhaseChangePayload,
  ErrorPayload,
} from '@/types/websocket';

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectionAttempts: number; // Licznik prób połączenia
  activeGameId: string | null; // Aktualnie obsługiwany gameId (po stronie klienta)

  // Actions
  connect: () => void;
  disconnect: () => void;
  joinGame: (payload: JoinGamePayload) => void;
  submitActions: (payload: SubmitActionsPayload) => void;
  confirmBuild: (payload: ConfirmBuildPayload) => void;
  confirmAbility: (payload: ConfirmAbilityPayload) => void;
  voteSkipResolution: (payload: VoteSkipResolutionPayload) => void;

  // Event handlers (set from outside)
  onGameStateUpdate?: (payload: GameStateUpdatePayload) => void;
  onPhaseChange?: (payload: PhaseChangePayload) => void;
  onError?: (payload: ErrorPayload) => void;
  setEventHandlers: (handlers: {
    onGameStateUpdate?: (payload: GameStateUpdatePayload) => void;
    onPhaseChange?: (payload: PhaseChangePayload) => void;
    onError?: (payload: ErrorPayload) => void;
  }) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connectionAttempts: 0,
  activeGameId: null,

  connect: () => {
    try {
      const { socket, isConnecting, connectionAttempts } = get();

      // Jeśli już próbujemy się połączyć, nie rób nic
      if (isConnecting) {
        console.log('Połączenie już w toku...');
        return;
      }

      // Jeśli socket już istnieje i jest połączony, nie rób nic
      if (socket?.connected) {
        console.log('Socket już jest połączony');
        return;
      }

      // Ograniczenie liczby prób połączenia (zapobiega pętli)
      if (connectionAttempts >= 3) {
        console.warn('Zbyt wiele prób połączenia. Czekam przed kolejną próbą...');
        // Reset licznika po 30 sekundach (można to zrobić lepiej z timeoutem)
        setTimeout(() => {
          set({ connectionAttempts: 0 });
        }, 30000);
        return;
      }

      // Jeśli socket istnieje ale nie jest połączony, wyłącz reconnection i wyczyść
      if (socket) {
        console.log('Czyszczenie starego socketu...');
        socket.io.opts.reconnection = false; // Wyłącz reconnection przed disconnect
        socket.removeAllListeners();
        socket.disconnect();
      }

      set({
        isConnecting: true,
        error: null,
        connectionAttempts: connectionAttempts + 1
      });

      const newSocket = io(`${getWsUrl()}/game`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000, // Zwiększ opóźnienie między próbami
        reconnectionAttempts: 3, // Zmniejsz liczbę prób
        reconnectionDelayMax: 5000,
        timeout: 10000, // Zwiększ timeout
        // Usuń forceNew - pozwól Socket.IO zarządzać połączeniem
      });

      newSocket.on('connect', () => {
        console.log('✅ Połączono z serwerem WebSocket');
        set({
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionAttempts: 0 // Reset licznika po udanym połączeniu
        });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Rozłączono z serwerem WebSocket:', reason);
        set({ isConnected: false });

        // Jeśli rozłączenie było nieoczekiwane, Socket.IO automatycznie spróbuje się reconnectować
        // Nie ustawiamy isConnecting na false, aby nie blokować automatycznego reconnectu
        if (reason === 'io server disconnect') {
          // Serwer wymusił rozłączenie - nie próbuj reconnectować
          set({ isConnecting: false });
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Błąd połączenia WebSocket:', error);
        // Nie ustawiaj isConnecting na false od razu - pozwól Socket.IO próbować reconnectować
        // Ustaw tylko po przekroczeniu wszystkich prób
        set({
          error: error.message || 'Błąd połączenia',
        });
      });

      // Obsługa gdy reconnect się nie powiedzie
      newSocket.on('reconnect_failed', () => {
        console.error('❌ Nie udało się połączyć po wszystkich próbach');
        set({
          isConnecting: false,
          error: 'Nie udało się połączyć z serwerem',
        });
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconnected po ${attemptNumber} próbach`);
        set({ isConnected: true, isConnecting: false, error: null });
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Próba reconnection ${attemptNumber}...`);
        set({ isConnecting: true });
      });

      // Obsługa eventów serwera
      newSocket.on(ServerEvents.GAME_STATE_UPDATE, (payload: GameStateUpdatePayload) => {
        console.log('📥 GAME_STATE_UPDATE:', payload);
        const { onGameStateUpdate } = get();
        onGameStateUpdate?.(payload);
      });

      newSocket.on(ServerEvents.PHASE_CHANGE, (payload: PhaseChangePayload) => {
        console.log('📥 PHASE_CHANGE:', payload);
        const { onPhaseChange } = get();
        onPhaseChange?.(payload);
      });

      newSocket.on(ServerEvents.ERROR, (payload: ErrorPayload) => {
        console.error('❌ ERROR:', payload);
        const { onError } = get();
        onError?.(payload);
        set({ error: payload.message });
      });

      set({ socket: newSocket });
    } catch (err) {
      console.error('Error connecting socket:', err);
      set({ isConnecting: false, error: err instanceof Error ? err.message : 'Connection error' });
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      // Usuń wszystkie event listenery przed rozłączeniem
      socket.removeAllListeners();
      socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        isConnecting: false,
        connectionAttempts: 0, // Reset licznika przy rozłączeniu
        activeGameId: null,
        onGameStateUpdate: undefined,
        onPhaseChange: undefined,
        onError: undefined,
      });
    }
  },

  joinGame: (payload: JoinGamePayload) => {
    const { socket, activeGameId } = get();
    if (!socket?.connected) {
      console.error('Socket nie jest połączony');
      set({ error: 'Socket nie jest połączony' });
      return;
    }

    // Jeśli łączymy się do innej gry niż poprzednia, opuść poprzedni room,
    // żeby nie dostawać starych eventów podczas nowej sesji.
    if (activeGameId && activeGameId !== payload.gameId) {
      socket.leave(`game:${activeGameId}`);
    }

    console.log('📤 JOIN_GAME:', payload);
    socket.emit(ClientEvents.JOIN_GAME, payload);
    set({ activeGameId: payload.gameId });
  },

  submitActions: (payload: SubmitActionsPayload) => {
    const { socket } = get();
    if (!socket?.connected) {
      console.error('Socket nie jest połączony');
      set({ error: 'Socket nie jest połączony' });
      return;
    }
    console.log('📤 SUBMIT_ACTIONS:', payload);
    socket.emit(ClientEvents.SUBMIT_ACTIONS, payload);
  },

  confirmBuild: (payload: ConfirmBuildPayload) => {
    const { socket } = get();
    if (!socket?.connected) {
      console.error('Socket nie jest połączony');
      set({ error: 'Socket nie jest połączony' });
      return;
    }
    console.log('📤 CONFIRM_BUILD:', payload);
    socket.emit(ClientEvents.CONFIRM_BUILD, payload);
  },

  confirmAbility: (payload: ConfirmAbilityPayload) => {
    const { socket } = get();
    if (!socket?.connected) {
      console.error('Socket nie jest połączony');
      set({ error: 'Socket nie jest połączony' });
      return;
    }
    console.log('📤 CONFIRM_ABILITY:', payload);
    socket.emit(ClientEvents.CONFIRM_ABILITY, payload);
  },

  voteSkipResolution: (payload: VoteSkipResolutionPayload) => {
    const { socket } = get();
    if (!socket?.connected) {
      console.error('Socket nie jest połączony');
      set({ error: 'Socket nie jest połączony' });
      return;
    }
    console.log('📤 VOTE_SKIP_RESOLUTION:', payload);
    socket.emit(ClientEvents.VOTE_SKIP_RESOLUTION, payload);
  },

  setEventHandlers: (handlers) => {
    set({
      onGameStateUpdate: handlers.onGameStateUpdate,
      onPhaseChange: handlers.onPhaseChange,
      onError: handlers.onError,
    });
  },
}));

