import { getBackendUrl } from '@/constants/Config';
import {
  CreateGameResponseDto,
  JoinGameResponseDto,
  StartGameResponseDto,
  GameStateDto,
  GameConfigDto,
} from '../types/api';

/**
 * REST API Service
 * Komunikacja z backendem przez HTTP
 */
export const api = {
  /**
   * Tworzy nową grę
   */
  async createGame(hostName: string): Promise<CreateGameResponseDto> {
    const response = await fetch(`${getBackendUrl()}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hostName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Błąd serwera' }));
      throw new Error(error.message || 'Nie udało się utworzyć gry');
    }

    return response.json();
  },

  /**
   * Dołącza do gry używając PIN-u
   */
  async joinGameByPin(playerName: string, gamePin: string): Promise<JoinGameResponseDto> {
    const response = await fetch(`${getBackendUrl()}/games/join-by-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerName, gamePin }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Błąd serwera' }));
      throw new Error(error.message || 'Nie udało się dołączyć do gry');
    }

    return response.json();
  },

  /**
   * Pobiera stan gry
   */
  async getGameState(gameId: string): Promise<{ gameId: string; state: GameStateDto }> {
    const response = await fetch(`${getBackendUrl()}/games/${gameId}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Błąd serwera' }));
      throw new Error(error.message || 'Nie udało się pobrać stanu gry');
    }

    return response.json();
  },

  /**
   * Rozpoczyna grę (tylko host)
   */
  async startGame(gameId: string, config?: GameConfigDto): Promise<StartGameResponseDto> {
    const response = await fetch(`${getBackendUrl()}/games/${gameId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Błąd serwera' }));
      throw new Error(error.message || 'Nie udało się rozpocząć gry');
    }

    return response.json();
  },
};

