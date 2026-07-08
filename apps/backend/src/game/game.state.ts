import { Injectable } from '@nestjs/common';
import { GameInstance } from './types';
import { GameState, generateGameId, generatePlayerId } from '@figlolandia/game-core';

/**
 * In-memory storage dla gier
 * W MVP: Map, w produkcji: Redis/Database
 */
@Injectable()
export class GameStateManager {
  private games: Map<string, GameInstance> = new Map();
  private playerToGame: Map<string, string> = new Map(); // playerId -> gameId
  private pinToGame: Map<string, string> = new Map(); // gamePin -> gameId

  /**
   * Tworzy nową instancję gry
   */
  createGame(instance: GameInstance): void {
    this.games.set(instance.state.gameId, instance);
    this.playerToGame.set(instance.hostId, instance.state.gameId);
    // Mapuj PIN do gameId
    if (instance.state.gamePin) {
      this.pinToGame.set(instance.state.gamePin, instance.state.gameId);
    }
  }

  /**
   * Pobiera instancję gry
   */
  getGame(gameId: string): GameInstance | undefined {
    return this.games.get(gameId);
  }

  /**
   * Aktualizuje stan gry
   */
  updateGameState(gameId: string, state: GameState): void {
    const instance = this.games.get(gameId);
    if (instance) {
      instance.state = state;
      instance.lastActivity = new Date();
    }
  }

  /**
   * Dodaje klienta do gry
   */
  addClient(gameId: string, clientId: string): void {
    const instance = this.games.get(gameId);
    if (instance) {
      instance.clients.add(clientId);
    }
  }

  /**
   * Usuwa klienta z gry
   */
  removeClient(gameId: string, clientId: string): void {
    const instance = this.games.get(gameId);
    if (instance) {
      instance.clients.delete(clientId);
    }
  }

  /**
   * Pobiera wszystkie klienty w grze
   */
  getClients(gameId: string): Set<string> {
    const instance = this.games.get(gameId);
    return instance?.clients || new Set();
  }

  /**
   * Sprawdza czy gra istnieje
   */
  gameExists(gameId: string): boolean {
    return this.games.has(gameId);
  }

  /**
   * Usuwa grę
   */
  deleteGame(gameId: string): void {
    const instance = this.games.get(gameId);
    if (instance) {
      // Usuń wszystkie mapowania graczy
      instance.state.players.forEach((player) => {
        this.playerToGame.delete(player.id);
      });
      // Usuń mapowanie PIN-u
      if (instance.state.gamePin) {
        this.removePinMapping(instance.state.gamePin);
      }
      this.games.delete(gameId);
    }
  }

  /**
   * Pobiera gameId dla gracza
   */
  getGameIdForPlayer(playerId: string): string | undefined {
    return this.playerToGame.get(playerId);
  }

  /**
   * Mapuje gracza do gry
   */
  mapPlayerToGame(playerId: string, gameId: string): void {
    this.playerToGame.set(playerId, gameId);
  }

  /**
   * Pobiera wszystkie aktywne gry (dla debugowania)
   */
  getAllGames(): GameInstance[] {
    return Array.from(this.games.values());
  }

  /**
   * Pobiera gameId na podstawie PIN-u
   */
  getGameIdByPin(gamePin: string): string | undefined {
    return this.pinToGame.get(gamePin);
  }

  /**
   * Sprawdza czy PIN jest dostępny
   */
  isPinAvailable(gamePin: string): boolean {
    return !this.pinToGame.has(gamePin);
  }

  /**
   * Usuwa mapowanie PIN-u (przy usuwaniu gry)
   */
  private removePinMapping(gamePin: string): void {
    this.pinToGame.delete(gamePin);
  }
}
