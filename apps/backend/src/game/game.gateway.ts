import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../websocket/ws-auth.guard';
import {
  ClientEvents,
  ServerEvents,
  JoinGamePayload,
  SubmitActionsPayload,
  ConfirmBuildPayload,
  ConfirmAbilityPayload,
  GameStateUpdatePayload,
  PhaseChangePayload,
  ErrorPayload,
} from '../websocket/ws.types';
import { LobbyService } from './lobby.service';
import { GameService } from './game.service';
import { GameStateManager } from './game.state';
import { generatePlayerId } from '@figlolandia/game-core';

/**
 * WebSocket Gateway dla gry
 * Obsługuje komunikację między klientami a serwerem
 */
@WebSocketGateway({
  cors: {
    origin: '*', // W MVP: pozwól wszystkim, w produkcji: ogranicz
  },
  namespace: '/game',
})
@UseGuards(WsAuthGuard)
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private clientToPlayer: Map<string, string> = new Map(); // clientId -> playerId
  private clientToGame: Map<string, string> = new Map(); // clientId -> gameId
  private clientToSocket: Map<string, Socket> = new Map(); // clientId -> Socket (cache socketów)
  private gameStartTimeouts: Map<string, NodeJS.Timeout> = new Map(); // gameId -> timeout
  private gamePlanningTimeouts: Map<string, NodeJS.Timeout> = new Map(); // gameId -> timeout (PREP -> PLANNING)
  private planningPhaseTimeouts: Map<string, NodeJS.Timeout> = new Map(); // gameId -> timeout (PLANNING -> RESOLUTION)

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly gameService: GameService,
    private readonly gameStateManager: GameStateManager,
  ) { }

  /**
   * Obsługa połączenia klienta
   */
  handleConnection(client: Socket) {
    this.logger.log(`Klient połączony: ${client.id}`);
    // Zapisz referencję do socketu
    this.clientToSocket.set(client.id, client);
  }

  /**
   * Obsługa rozłączenia klienta
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Klient rozłączony: ${client.id}`);

    const gameId = this.clientToGame.get(client.id);
    if (gameId) {
      // Opuść pokój gry
      client.leave(`game:${gameId}`);
      this.gameStateManager.removeClient(gameId, client.id);
      this.clientToGame.delete(client.id);
    }

    this.clientToPlayer.delete(client.id);
    this.clientToSocket.delete(client.id);
  }

  /**
   * Ustawia timeout dla fazy PLANNING.
   * Używa planningPhaseStartTime, żeby timer był spójny z klientem i działał po restarcie/reconnect.
   */
  public schedulePlanningPhaseTimeout(gameId: string): void {
    this.clearPlanningPhaseTimeout(gameId);

    const remainingMs = this.gameService.getPlanningPhaseRemainingMs(gameId);
    if (remainingMs === null) {
      return;
    }

    if (remainingMs <= 0) {
      this.handlePlanningPhaseTimeout(gameId);
      return;
    }

    const timeout = setTimeout(() => {
      this.planningPhaseTimeouts.delete(gameId);
      this.handlePlanningPhaseTimeout(gameId);
    }, remainingMs);

    this.planningPhaseTimeouts.set(gameId, timeout);
  }

  /**
   * Po upływie czasu PLANNING: pomija niezatwierdzonych graczy i kończy rundę.
   */
  private handlePlanningPhaseTimeout(gameId: string): void {
    this.logger.log(`Timeout fazy PLANNING dla gry ${gameId} - przechodzenie do RESOLUTION`);

    try {
      const instance = this.gameStateManager.getGame(gameId);
      if (!instance || instance.state.phase !== 'PLANNING') {
        return;
      }

      const resolvedState = this.gameService.enterResolutionPhase(gameId, {
        skipIncompletePlayers: true,
      });
      this.emitGameStateUpdate(gameId, resolvedState);
      this.emitPhaseChange(gameId, resolvedState.phase, resolvedState.round);

      if (resolvedState.phase === 'PREP') {
        if (!this.gamePlanningTimeouts.has(gameId)) {
          const prepTimeout = setTimeout(() => {
            this.gamePlanningTimeouts.delete(gameId);
            const currentInstance = this.gameStateManager.getGame(gameId);
            if (currentInstance && currentInstance.state.phase === 'PREP') {
              const planningState = this.gameService.enterPlanningPhase(gameId);
              this.emitGameStateUpdate(gameId, planningState);
              this.emitPhaseChange(gameId, planningState.phase, planningState.round);
              this.schedulePlanningPhaseTimeout(gameId);
            }
          }, 1000);
          this.gamePlanningTimeouts.set(gameId, prepTimeout);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Błąd timeout fazy PLANNING: ${errorMessage}`);
    }
  }

  /** @deprecated use schedulePlanningPhaseTimeout */
  private setPlanningPhaseTimeout(gameId: string): void {
    this.schedulePlanningPhaseTimeout(gameId);
  }

  /**
   * Usuwa timeout dla fazy PLANNING
   */
  private clearPlanningPhaseTimeout(gameId: string): void {
    const timeout = this.planningPhaseTimeouts.get(gameId);
    if (timeout) {
      clearTimeout(timeout);
      this.planningPhaseTimeouts.delete(gameId);
    }
  }

  /**
   * Czyści timeouty dla gry (przy usuwaniu gry)
   */
  private clearGameTimeouts(gameId: string): void {
    const startTimeout = this.gameStartTimeouts.get(gameId);
    if (startTimeout) {
      clearTimeout(startTimeout);
      this.gameStartTimeouts.delete(gameId);
    }

    const planningTimeout = this.gamePlanningTimeouts.get(gameId);
    if (planningTimeout) {
      clearTimeout(planningTimeout);
      this.gamePlanningTimeouts.delete(gameId);
    }

    this.clearPlanningPhaseTimeout(gameId);
  }

  /**
   * Obsługa JOIN_GAME
   * Klient dołącza do gry (lub tworzy nową jako host)
   */
  @SubscribeMessage(ClientEvents.JOIN_GAME)
  handleJoinGame(
    @MessageBody() payload: JoinGamePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `JOIN_GAME: ${payload.playerName} dołącza do ${payload.gameId || payload.gamePin || 'nowej gry'}`,
      );

      let gameState;
      let playerId = this.clientToPlayer.get(client.id);
      let gameId: string;

      // Sprawdź czy gra istnieje (po gameId lub gamePin)
      let existingState = payload.gameId
        ? this.lobbyService.getGameState(payload.gameId)
        : null;

      // Jeśli nie znaleziono po gameId, spróbuj po PIN
      if (!existingState && payload.gamePin) {
        const gameIdByPin = this.gameStateManager.getGameIdByPin(payload.gamePin);
        if (gameIdByPin) {
          existingState = this.lobbyService.getGameState(gameIdByPin);
          gameId = gameIdByPin;
        }
      } else if (existingState) {
        gameId = payload.gameId!;
      }

      if (!existingState) {
        // Tworzenie nowej gry (host)
        if (!playerId) {
          playerId = generatePlayerId();
          this.clientToPlayer.set(client.id, playerId);
        }

        gameState = this.lobbyService.createGame({
          hostId: playerId,
          hostName: payload.playerName,
        });
        gameId = gameState.gameId;
      } else {
        // Dołączanie do istniejącej gry
        // Sprawdź czy gracz już jest w grze (po playerId jeśli istnieje)
        if (playerId) {
          const existingPlayer = existingState.players.find((p) => p.id === playerId);
          if (existingPlayer) {
            this.logger.log(`Gracz ${playerId} już jest w grze, zwracam aktualny stan`);
            gameState = existingState;
            gameId = gameState.gameId;
          }
        }

        // Jeśli gracz nie został znaleziony po playerId, sprawdź czy gracz o tym samym imieniu już jest w grze
        if (!gameState) {
          const playerWithSameName = existingState.players.find(
            (p) => p.name === payload.playerName
          );

          if (playerWithSameName) {
            // Jeśli gracz o tym imieniu już istnieje, użyj jego playerId
            this.logger.log(`Gracz o imieniu ${payload.playerName} już jest w grze, używam istniejącego playerId: ${playerWithSameName.id}`);
            playerId = playerWithSameName.id;
            this.clientToPlayer.set(client.id, playerId);
            gameState = existingState;
            gameId = gameState.gameId;
          } else {
            // Jeśli gracz nie ma jeszcze playerId, wygeneruj nowy
            if (!playerId) {
              playerId = generatePlayerId();
              this.clientToPlayer.set(client.id, playerId);
            }

            // Dodaj nowego gracza
            gameState = this.lobbyService.joinGame({
              gameId: gameId,
              gamePin: payload.gamePin,
              playerId,
              playerName: payload.playerName,
            });
            gameId = gameState.gameId;
          }
        }
      }

      // Mapuj klienta do gry
      this.clientToGame.set(client.id, gameId);
      this.gameStateManager.addClient(gameId, client.id);

      // Dołącz klienta do pokoju gry (room) dla lepszego broadcastingu
      client.join(`game:${gameId}`);

      // Wyślij aktualny stan gry
      this.emitGameStateUpdate(gameId, gameState);

      // Przy reconnect w trakcie PLANNING upewnij się, że timer rundy jest aktywny
      if (gameState.phase === 'PLANNING') {
        this.schedulePlanningPhaseTimeout(gameId);
      }

      // Jeśli host i można rozpocząć, automatycznie rozpocznij
      if (
        gameState.phase === 'LOBBY' &&
        this.lobbyService.canStartGame(payload.gameId) &&
        gameState.players[0].id === playerId
      ) {
        // Host może rozpocząć grę (w MVP: automatycznie, w pełnej wersji: przez osobny event)
        // Sprawdź czy timeout już nie został ustawiony
        if (!this.gameStartTimeouts.has(gameId)) {
          const timeout = setTimeout(() => {
            this.gameStartTimeouts.delete(gameId);
            this.startGameIfReady(gameId);
          }, 2000); // 2 sekundy opóźnienia
          this.gameStartTimeouts.set(gameId, timeout);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Błąd JOIN_GAME: ${errorMessage}`, errorStack);
      this.emitError(client, errorMessage);
    }
  }

  /**
   * Obsługa SUBMIT_ACTIONS
   * Klient wysyła akcje w fazie PLANNING
   */
  @SubscribeMessage(ClientEvents.SUBMIT_ACTIONS)
  handleSubmitActions(
    @MessageBody() payload: SubmitActionsPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const playerId = this.clientToPlayer.get(client.id);
      if (!playerId) {
        throw new Error('Gracz nie jest zidentyfikowany');
      }

      // Sprawdź aktualną fazę przed próbą wysłania akcji
      const instance = this.gameStateManager.getGame(payload.gameId);
      if (!instance) {
        throw new Error('Gra nie istnieje');
      }

      // Sprawdź czy gra jest w fazie PLANNING
      if (instance.state.phase !== 'PLANNING') {
        this.logger.warn(
          `SUBMIT_ACTIONS: Gracz ${playerId} próbuje wysłać akcje w fazie ${instance.state.phase}, wymagana faza: PLANNING`,
        );
        throw new Error(`Nie można wysłać akcji w fazie ${instance.state.phase}. Wymagana faza: PLANNING`);
      }

      this.logger.log(
        `SUBMIT_ACTIONS: Gracz ${playerId} wysyła ${payload.actions.length} akcji, aktualna faza: ${instance.state.phase}`,
      );

      // Konwertuj akcje do formatu game-core
      const actions = payload.actions.map((a) => ({
        type: a.type as any,
        target: a.target,
        cardId: a.cardId,
        buildingType: a.buildingType as any,
        buildingCategory: a.buildingCategory as any,
        buildingValue: a.buildingValue,

        // Profession ability actions
        professionAbility: a.professionAbility,
        theftTarget: a.theftTarget,
        inspectTarget: a.inspectTarget,
        taxedCategory: a.taxedCategory as any,
        increasedValueBuildingId: a.increasedValueBuildingId,
      }));

      // Zapisuj akcje
      const gameState = this.gameService.submitActions(
        payload.gameId,
        playerId,
        actions,
      );

      // Wyślij zaktualizowany stan
      this.emitGameStateUpdate(payload.gameId, gameState);

      // Jeśli automatycznie przeszło do RESOLUTION (wszyscy zatwierdzili), wyczyść timeout
      if (gameState.phase === 'RESOLUTION' || gameState.phase === 'PREP' || gameState.phase === 'END') {
        this.clearPlanningPhaseTimeout(payload.gameId);
      }

      // Jeśli automatycznie przeszło do RESOLUTION (które od razu przechodzi do PREP/END)
      if (gameState.phase === 'PREP' || gameState.phase === 'END') {
        this.emitPhaseChange(payload.gameId, gameState.phase, gameState.round);

        // Jeśli przeszło do PREP (nowa runda), automatycznie przejdź do PLANNING
        if (gameState.phase === 'PREP') {
          // Automatycznie przejdź do PLANNING po krótkim opóźnieniu
          // Sprawdź czy timeout już nie został ustawiony
          if (!this.gamePlanningTimeouts.has(payload.gameId)) {
            const timeout = setTimeout(() => {
              this.gamePlanningTimeouts.delete(payload.gameId);
              // Sprawdź czy gra nadal istnieje i jest w fazie PREP
              const currentInstance = this.gameStateManager.getGame(payload.gameId);
              if (currentInstance && currentInstance.state.phase === 'PREP') {
                const updatedState = this.gameService.enterPlanningPhase(
                  payload.gameId,
                );
                this.emitGameStateUpdate(payload.gameId, updatedState);
                this.emitPhaseChange(
                  payload.gameId,
                  updatedState.phase,
                  updatedState.round,
                );
                // Ustaw timeout dla fazy PLANNING (10 minut)
                this.setPlanningPhaseTimeout(payload.gameId);
              }
            }, 1000);
            this.gamePlanningTimeouts.set(payload.gameId, timeout);
          }
        }
        // Jeśli END - gra się zakończyła, nie robimy nic więcej
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Błąd SUBMIT_ACTIONS: ${errorMessage}`, errorStack);
      this.emitError(client, errorMessage);
    }
  }

  /**
   * Obsługa CONFIRM_BUILD
   * Klient potwierdza wybór budowy (albo pominięcie budowy) w fazie PLANNING.
   */
  @SubscribeMessage(ClientEvents.CONFIRM_BUILD)
  handleConfirmBuild(
    @MessageBody() payload: ConfirmBuildPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const playerId = this.clientToPlayer.get(client.id);
      if (!playerId) {
        throw new Error('Gracz nie jest zidentyfikowany');
      }

      const instance = this.gameStateManager.getGame(payload.gameId);
      if (!instance) {
        throw new Error('Gra nie istnieje');
      }

      if (instance.state.phase !== 'PLANNING') {
        this.logger.warn(
          `CONFIRM_BUILD: Gracz ${playerId} próbuje wysłać akcje w fazie ${instance.state.phase}, wymagana faza: PLANNING`,
        );
        throw new Error(`Nie można wysłać budowy w fazie ${instance.state.phase}. Wymagana faza: PLANNING`);
      }

      const buildActions = (payload.passBuild ? [] : payload.actions).map((a) => ({
        type: a.type as any,
        target: undefined,
        cardId: a.cardId,
        buildingType: a.buildingType as any,
        buildingCategory: undefined,
        buildingValue: a.buildingValue,
        // Profession ability actions (brak)
        professionAbility: undefined,
        theftTarget: undefined,
        inspectTarget: undefined,
        taxedCategory: undefined,
        increasedValueBuildingId: undefined,
      }));

      const gameState = this.gameService.confirmBuild(
        payload.gameId,
        playerId,
        buildActions,
      );

      this.emitGameStateUpdate(payload.gameId, gameState);

      if (gameState.phase === 'RESOLUTION' || gameState.phase === 'PREP' || gameState.phase === 'END') {
        this.clearPlanningPhaseTimeout(payload.gameId);
      }

      if (gameState.phase === 'PREP' || gameState.phase === 'END') {
        this.emitPhaseChange(payload.gameId, gameState.phase, gameState.round);

        if (gameState.phase === 'PREP') {
          if (!this.gamePlanningTimeouts.has(payload.gameId)) {
            const timeout = setTimeout(() => {
              this.gamePlanningTimeouts.delete(payload.gameId);
              const currentInstance = this.gameStateManager.getGame(payload.gameId);
              if (currentInstance && currentInstance.state.phase === 'PREP') {
                const updatedState = this.gameService.enterPlanningPhase(payload.gameId);
                this.emitGameStateUpdate(payload.gameId, updatedState);
                this.emitPhaseChange(payload.gameId, updatedState.phase, updatedState.round);
                this.setPlanningPhaseTimeout(payload.gameId);
              }
            }, 1000);
            this.gamePlanningTimeouts.set(payload.gameId, timeout);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Błąd CONFIRM_BUILD: ${errorMessage}`, errorStack);
      this.emitError(client, errorMessage);
    }
  }

  /**
   * Obsługa CONFIRM_ABILITY
   * Klient potwierdza wybór zdolności specjalnej w fazie PLANNING.
   */
  @SubscribeMessage(ClientEvents.CONFIRM_ABILITY)
  handleConfirmAbility(
    @MessageBody() payload: ConfirmAbilityPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const playerId = this.clientToPlayer.get(client.id);
      if (!playerId) {
        throw new Error('Gracz nie jest zidentyfikowany');
      }

      const instance = this.gameStateManager.getGame(payload.gameId);
      if (!instance) {
        throw new Error('Gra nie istnieje');
      }

      if (instance.state.phase !== 'PLANNING') {
        this.logger.warn(
          `CONFIRM_ABILITY: Gracz ${playerId} próbuje wysłać akcje w fazie ${instance.state.phase}, wymagana faza: PLANNING`,
        );
        throw new Error(`Nie można wysłać zdolności w fazie ${instance.state.phase}. Wymagana faza: PLANNING`);
      }

      const { abilityAction: raw } = payload;
      const abilityAction = raw.professionAbility
        ? {
          type: raw.type as any,
          professionAbility: true as const,
          target: raw.target,
          cardId: raw.cardId,
          buildingType: raw.buildingType as any,
          buildingCategory: raw.buildingCategory as any,
          buildingValue: undefined,
          theftTarget: raw.theftTarget,
          inspectTarget: raw.inspectTarget,
          taxedCategory: raw.taxedCategory as any,
          increasedValueBuildingId: raw.increasedValueBuildingId,
        }
        : {
          type: raw.type as any,
          professionAbility: false as const,
          target: undefined,
          cardId: undefined,
          buildingType: undefined,
          buildingCategory: undefined,
          buildingValue: undefined,
          theftTarget: undefined,
          inspectTarget: undefined,
          taxedCategory: undefined,
          increasedValueBuildingId: undefined,
        };

      const gameState = this.gameService.confirmAbility(
        payload.gameId,
        playerId,
        abilityAction,
      );

      this.emitGameStateUpdate(payload.gameId, gameState);

      if (gameState.phase === 'RESOLUTION' || gameState.phase === 'PREP' || gameState.phase === 'END') {
        this.clearPlanningPhaseTimeout(payload.gameId);
      }

      if (gameState.phase === 'PREP' || gameState.phase === 'END') {
        this.emitPhaseChange(payload.gameId, gameState.phase, gameState.round);

        if (gameState.phase === 'PREP') {
          if (!this.gamePlanningTimeouts.has(payload.gameId)) {
            const timeout = setTimeout(() => {
              this.gamePlanningTimeouts.delete(payload.gameId);
              const currentInstance = this.gameStateManager.getGame(payload.gameId);
              if (currentInstance && currentInstance.state.phase === 'PREP') {
                const updatedState = this.gameService.enterPlanningPhase(payload.gameId);
                this.emitGameStateUpdate(payload.gameId, updatedState);
                this.emitPhaseChange(payload.gameId, updatedState.phase, updatedState.round);
                this.setPlanningPhaseTimeout(payload.gameId);
              }
            }, 1000);
            this.gamePlanningTimeouts.set(payload.gameId, timeout);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Błąd CONFIRM_ABILITY: ${errorMessage}`, errorStack);
      this.emitError(client, errorMessage);
    }
  }

  /**
   * Rozpoczyna grę jeśli jest gotowa
   */
  private startGameIfReady(gameId: string): void {
    // Sprawdź aktualny stan - może gra już się rozpoczęła
    const instance = this.gameStateManager.getGame(gameId);
    if (!instance) {
      return;
    }

    // Jeśli gra już się rozpoczęła, nie rób nic
    if (instance.state.phase !== 'LOBBY') {
      return;
    }

    if (!this.lobbyService.canStartGame(gameId)) {
      return;
    }

    try {
      const gameState = this.gameService.startGame(gameId);
      this.emitGameStateUpdate(gameId, gameState);
      this.emitPhaseChange(gameId, gameState.phase, gameState.round);

      // Automatycznie przejdź do PLANNING po PREP
      // Sprawdź czy timeout już nie został ustawiony
      if (!this.gamePlanningTimeouts.has(gameId)) {
        const timeout = setTimeout(() => {
          this.gamePlanningTimeouts.delete(gameId);
          // Sprawdź czy gra nadal istnieje i jest w fazie PREP
          const currentInstance = this.gameStateManager.getGame(gameId);
          if (currentInstance && currentInstance.state.phase === 'PREP') {
            const planningState = this.gameService.enterPlanningPhase(gameId);
            this.emitGameStateUpdate(gameId, planningState);
            this.emitPhaseChange(gameId, planningState.phase, planningState.round);
            // Ustaw timeout dla fazy PLANNING (10 minut)
            this.setPlanningPhaseTimeout(gameId);
          }
        }, 2000); // 2 sekundy na PREP
        this.gamePlanningTimeouts.set(gameId, timeout);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Błąd startGameIfReady: ${errorMessage}`);
    }
  }

  /**
   * Emituje GAME_STATE_UPDATE do wszystkich klientów w grze
   */
  public emitGameStateUpdate(gameId: string, state: any): void {
    // Utwórz mapę zatwierdzonych graczy (w fazie PLANNING)
    const planningStatus =
      state.phase === 'PLANNING' ? this.gameService.getPlanningStatus(gameId) : undefined;

    const submittedPlayers: string[] =
      state.phase === 'PLANNING'
        ? (state.players || [])
          .filter((p: any) => planningStatus?.[p.id]?.buildConfirmed && planningStatus?.[p.id]?.abilityConfirmed)
          .map((p: any) => p.id)
        : [];

    // W fazie PLANNING ukryj zawody innych graczy
    const shouldHideProfessions = state.phase === 'PLANNING';

    // Widok graczy: zawsze stabilnie po kolejności dołączenia
    const playersForView = Array.isArray(state.players)
      ? [...state.players].sort(
        (a: any, b: any) =>
          (a.joinOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.joinOrder ?? Number.MAX_SAFE_INTEGER),
      )
      : [];

    // Base payload (bez zawodów w PLANNING)
    const basePayload: GameStateUpdatePayload = {
      gameId: state.gameId,
      gamePin: state.gamePin,
      phase: state.phase,
      round: state.round,
      players: playersForView.map((p: any) => ({
        id: p.id,
        name: p.name,
        gold: p.gold,
        buildings: p.buildings,
        cards: p.cards,
        // W fazie PLANNING ukryj wszystkie zawody (będą pokazane osobno dla każdego gracza)
        profession: shouldHideProfessions ? null : p.profession,
        joinOrder: p.joinOrder ?? 0,
        order: p.order,
      })),
      winner: state.winner,
      config: {
        maxRounds: state.config.maxRounds,
        victoryThreshold: state.config.victoryThreshold,
        eventFrequency: state.config.eventFrequency,
      },
      submittedPlayers, // Lista ID graczy, którzy zatwierdzili swoje ruchy
      planningStatus,
      planningPhaseStartTime: state.phase === 'PLANNING'
        ? state.planningPhaseStartTime
        : undefined, // Timestamp rozpoczęcia fazy PLANNING (ze stanu gry)
      narrativeEvents: (state as any).narrativeEvents || [], // Wydarzenia narratora
    };

    // Jeśli jesteśmy w fazie PLANNING, wyślij spersonalizowane payloady
    if (shouldHideProfessions) {
      // Użyj GameStateManager do pobrania klientów zamiast adapter.rooms
      const clients = this.gameStateManager.getClients(gameId);
      if (clients && clients.size > 0) {
        // Wyślij spersonalizowaną wersję do każdego klienta
        clients.forEach((clientId) => {
          const playerId = this.clientToPlayer.get(clientId);
          // Użyj cache'owanej referencji do socketu
          const socket = this.clientToSocket.get(clientId);
          if (socket && playerId) {
            // Stwórz payload z zawodem tylko dla tego gracza
            const personalizedPayload: GameStateUpdatePayload = {
              ...basePayload,
              players: basePayload.players.map((p: any) => ({
                ...p,
                // Pokaż zawód tylko dla własnego gracza
                profession:
                  p.id === playerId
                    ? state.players.find((pl: any) => pl.id === playerId)?.profession ||
                    null
                    : null,
              })),
            };
            socket.emit(ServerEvents.GAME_STATE_UPDATE, personalizedPayload);
          }
        });
      } else {
        // Fallback: jeśli nie ma klientów w GameStateManager, użyj normalnego broadcastu
        this.server.to(`game:${gameId}`).emit(ServerEvents.GAME_STATE_UPDATE, basePayload);
      }
    } else {
      // Normalny broadcast (nie w fazie PLANNING)
      this.server.to(`game:${gameId}`).emit(ServerEvents.GAME_STATE_UPDATE, basePayload);
    }
  }

  /**
   * Emituje PHASE_CHANGE do wszystkich klientów w grze
   */
  public emitPhaseChange(gameId: string, phase: string, round: number): void {
    const payload: PhaseChangePayload = {
      gameId,
      phase,
      round,
    };

    // Użyj pokoju (room) dla bardziej efektywnego broadcastingu
    this.server.to(`game:${gameId}`).emit(ServerEvents.PHASE_CHANGE, payload);
  }

  /**
   * Emituje ERROR do klienta
   */
  private emitError(client: Socket, message: string, code?: string): void {
    const payload: ErrorPayload = {
      message,
      code,
    };

    client.emit(ServerEvents.ERROR, payload);
  }
}

