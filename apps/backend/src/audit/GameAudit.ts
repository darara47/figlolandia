import { Injectable } from '@nestjs/common';
import {
  AuditEmitter,
  BUILDING_DATA,
  PROFESSION_DATA,
  type AuditEventInput,
  type AuditEventPayloadMap,
  type AuditEventRecord,
  type AuditEventType,
  type AuditGoldChangeInput,
  type AuditGoldChangeRecord,
  type AuditSink,
  type AuditSnapshotRecord,
  type BuildingCategory,
  type GamePhase,
  type GameState,
  type SnapshotLabel,
} from '@figlolandia/game-core';
import { AuditConsole } from './AuditConsole';
import { AuditRecorder } from './AuditRecorder';
import { AuditStorage } from './AuditStorage';
import { AuditValidator } from './AuditValidator';

/** JSON.stringify z konwersją Map -> obiekt (GameState zawiera Mapy). */
const mapReplacer = (_key: string, value: unknown): unknown =>
  value instanceof Map ? Object.fromEntries(value) : value;

const serializeState = (state: GameState): string =>
  JSON.stringify(state, mapReplacer);

interface ConsoleLine {
  label: string;
  dedupeKey?: string;
  problem?: boolean;
}

/**
 * Fasada Game Audit System.
 *
 * - implementuje AuditSink i rejestruje się w AuditEmitter (zdarzenia
 *   z RoundEngine w game-core),
 * - udostępnia API dla serwisów backendu (eventy, ledger, snapshoty,
 *   cykl życia gry i rundy),
 * - po każdej rundzie uruchamia walidację i wypisuje krótkie podsumowanie.
 */
@Injectable()
export class GameAudit implements AuditSink {
  /** gameId -> playerId -> nazwa (do czytelnych linii konsoli). */
  private readonly playerNames = new Map<string, Map<string, string>>();

  constructor(
    private readonly recorder: AuditRecorder,
    private readonly storage: AuditStorage,
    private readonly validator: AuditValidator,
    private readonly auditConsole: AuditConsole,
  ) {
    AuditEmitter.setSink(this);
  }

  // ---------------------------------------------------------------------
  // Cykl życia gry i rundy
  // ---------------------------------------------------------------------

  gameCreated(state: GameState): void {
    this.storage.insertGame({
      gameId: state.gameId,
      gamePin: state.gamePin,
      seed: state.seed,
      configJson: JSON.stringify(state.config),
      playersJson: JSON.stringify(
        state.players.map((p) => ({ id: p.id, name: p.name })),
      ),
      createdAt: Date.now(),
    });
    state.players.forEach((p) => this.registerPlayer(state.gameId, p.id, p.name));

    const host = state.players[0];
    this.event({
      gameId: state.gameId,
      round: 0,
      type: 'GAME_CREATED',
      phase: 'LOBBY',
      step: 'lobby.create',
      playerId: host?.id ?? null,
      message: `Utworzono grę ${state.gameId} (PIN ${state.gamePin})`,
      payload: {
        gamePin: state.gamePin,
        hostId: host?.id ?? '',
        hostName: host?.name ?? '',
        config: state.config,
      },
    });
  }

  playerJoined(state: GameState, playerId: string, playerName: string): void {
    this.registerPlayer(state.gameId, playerId, playerName);
    this.storage.updateGamePlayers(
      state.gameId,
      JSON.stringify(state.players.map((p) => ({ id: p.id, name: p.name }))),
    );
    const player = state.players.find((p) => p.id === playerId);
    this.event({
      gameId: state.gameId,
      round: 0,
      type: 'PLAYER_JOINED',
      phase: 'LOBBY',
      step: 'lobby.join',
      playerId,
      message: `${playerName} dołączył do gry`,
      payload: { playerName, joinOrder: player?.joinOrder ?? -1 },
    });
  }

  gameStarted(state: GameState): void {
    this.storage.markGameStarted(
      state.gameId,
      JSON.stringify(state.config),
      JSON.stringify(state.players.map((p) => ({ id: p.id, name: p.name }))),
      Date.now(),
    );
    this.auditConsole.gameHeader(state.gameId, state.gamePin);
    this.event({
      gameId: state.gameId,
      round: 0,
      type: 'GAME_STARTED',
      phase: 'PREP',
      step: 'game.start',
      message: `Start gry ${state.gameId} (${state.players.length} graczy)`,
      payload: {
        config: state.config,
        players: state.players.map((p) => ({ id: p.id, name: p.name })),
      },
    });
  }

  /** Początek rundy (faza PREP) — wiersz w rounds + kontekst emittera. */
  beginRound(state: GameState): void {
    this.storage.insertRound(state.gameId, state.round, Date.now());
    AuditEmitter.configure(state.gameId, state.round);
    this.auditConsole.roundHeader(state.gameId, state.round);

    this.event({
      gameId: state.gameId,
      round: state.round,
      type: 'ROUND_STARTED',
      phase: 'PREP',
      step: 'start',
      message: `Przygotowanie rundy ${state.round}`,
      payload: {
        players: state.players.map((p) => ({
          id: p.id,
          name: p.name,
          gold: p.gold,
          profession: p.profession,
          deferredBuilds: p.deferredBuildActions.length,
        })),
      },
    });

    this.snapshot({
      gameId: state.gameId,
      round: state.round,
      phase: 'PREP',
      label: 'BEFORE_PREPARATION',
      state,
    });
  }

  /** Kolejność rozstrzygania (po jej wylosowaniu w PREP). */
  turnOrderSet(state: GameState): void {
    const order = state.players
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ playerId: p.id, name: p.name, order: p.order }));

    this.storage.setRoundTurnOrder(
      state.gameId,
      state.round,
      JSON.stringify(order),
    );
    this.event({
      gameId: state.gameId,
      round: state.round,
      type: 'TURN_ORDER',
      phase: 'PREP',
      step: 'order',
      message: `Kolejność rozstrzygania: ${order.map((o) => o.name).join(' → ')}`,
      payload: { order },
    });
  }

  /**
   * Koniec rundy: domknięcie wiersza rounds, synchroniczny zapis bufora,
   * walidacja i krótkie podsumowanie na konsoli.
   */
  endRound(
    gameId: string,
    round: number,
    taxedCategory: BuildingCategory | null,
    winnerId: string | null,
  ): void {
    this.event({
      gameId,
      round,
      type: 'ROUND_FINISHED',
      phase: 'RESOLUTION',
      step: 'end',
      message: `Koniec rundy ${round}`,
      payload: { winnerId },
    });

    this.storage.finishRound(gameId, round, taxedCategory, Date.now());
    this.recorder.flushNow(gameId);

    const results = this.validator.validateRound(gameId, round);
    const failed = results
      .filter((r) => r.status === 'FAIL')
      .map((r) => r.checkName);
    this.auditConsole.validation(gameId, round, results.length, failed);
  }

  gameFinished(state: GameState, finishedRound: number): void {
    const winnerId = state.winner ?? '';
    const winner = state.players.find((p) => p.id === winnerId);
    const points = winner
      ? winner.gold + winner.buildings.reduce((sum, b) => sum + b.value, 0)
      : null;

    this.event({
      gameId: state.gameId,
      round: finishedRound,
      type: 'GAME_FINISHED',
      phase: 'END',
      step: 'game.end',
      playerId: winnerId || null,
      message: `Koniec gry — zwycięzca: ${winner?.name ?? winnerId}`,
      payload: {
        winnerId,
        winnerName: winner?.name ?? null,
        points,
        rounds: finishedRound,
      },
    });

    this.storage.markGameFinished(state.gameId, winnerId || null, Date.now());
    this.recorder.flushNow(state.gameId);
    this.auditConsole.gameFinished(state.gameId, winner?.name ?? null);
    this.playerNames.delete(state.gameId);
  }

  /** Odrzucona / nieprawidłowa akcja gracza (np. akcja w złej fazie). */
  invalidAction(
    gameId: string,
    round: number,
    phase: GamePhase,
    playerId: string | null,
    action: string,
    reason: string,
  ): void {
    this.event({
      gameId,
      round,
      type: 'INVALID_ACTION',
      phase,
      step: 'invalid_action',
      playerId,
      message: `Nieprawidłowa akcja ${action}: ${reason}`,
      payload: { action, reason },
    });
  }

  // ---------------------------------------------------------------------
  // AuditSink — wejście zdarzeń (z emittera game-core i z serwisów)
  // ---------------------------------------------------------------------

  event<T extends AuditEventType>(
    record: AuditEventInput<T> & { gameId: string; round: number },
  ): void {
    this.recorder.record(record.gameId, {
      kind: 'event',
      event: {
        gameId: record.gameId,
        round: record.round,
        phase: record.phase,
        step: record.step,
        type: record.type,
        playerId: record.playerId ?? null,
        message: record.message,
        payloadJson: JSON.stringify(record.payload, mapReplacer),
        createdAt: Date.now(),
      },
    });
    this.printEvent(record as AuditEventRecord);
  }

  goldChange<T extends AuditEventType>(
    record: AuditGoldChangeInput<T> & {
      gameId: string;
      round: number;
      delta: number;
    },
  ): void {
    this.registerPlayer(record.gameId, record.player.id, record.player.name);
    const sign = record.delta >= 0 ? '+' : '';
    const message =
      record.message ??
      `${record.player.name}: gold ${record.before}→${record.after} (${sign}${record.delta})`;

    this.recorder.record(record.gameId, {
      kind: 'event_with_gold',
      event: {
        gameId: record.gameId,
        round: record.round,
        phase: record.phase,
        step: record.step,
        type: record.type,
        playerId: record.player.id,
        message,
        payloadJson: JSON.stringify(record.payload, mapReplacer),
        createdAt: Date.now(),
      },
      gold: {
        gameId: record.gameId,
        round: record.round,
        phase: record.phase,
        playerId: record.player.id,
        playerName: record.player.name,
        goldBefore: record.before,
        goldDelta: record.delta,
        goldAfter: record.after,
        reason: record.reason,
        createdAt: Date.now(),
      },
    });
    this.printEvent({
      ...record,
      playerId: record.player.id,
      message,
    } as unknown as AuditEventRecord);
  }

  snapshot(record: AuditSnapshotRecord): void {
    this.recorder.record(record.gameId, {
      kind: 'snapshot',
      snapshot: {
        gameId: record.gameId,
        round: record.round,
        label: record.label,
        stateJson: serializeState(record.state),
        createdAt: Date.now(),
      },
    });
  }

  /** Wygodny helper dla serwisów backendu. */
  snapshotState(
    gameId: string,
    round: number,
    phase: GamePhase,
    label: SnapshotLabel,
    state: GameState,
  ): void {
    this.snapshot({ gameId, round, phase, label, state });
  }

  // ---------------------------------------------------------------------
  // Konsola
  // ---------------------------------------------------------------------

  private registerPlayer(gameId: string, playerId: string, name: string): void {
    const names = this.playerNames.get(gameId) ?? new Map<string, string>();
    names.set(playerId, name);
    this.playerNames.set(gameId, names);
  }

  private playerName(gameId: string, playerId: string | null | undefined): string {
    if (!playerId) return '?';
    return this.playerNames.get(gameId)?.get(playerId) ?? playerId;
  }

  private printEvent(record: AuditEventRecord): void {
    const line = this.consoleLineFor(record);
    if (!line) return;
    if (line.problem) {
      this.auditConsole.problem(record.gameId, line.label);
    } else {
      this.auditConsole.check(record.gameId, line.label, line.dedupeKey);
    }
  }

  private consoleLineFor(record: AuditEventRecord): ConsoleLine | null {
    const name = this.playerName(record.gameId, record.playerId);

    switch (record.type) {
      case 'PROFESSION_ASSIGNED':
        return { label: 'Professions assigned', dedupeKey: 'professions' };
      case 'BASE_INCOME':
        return { label: 'Base income +2', dedupeKey: 'base_income' };
      case 'LAST_IN_ORDER_BONUS': {
        const p = record.payload as AuditEventPayloadMap['LAST_IN_ORDER_BONUS'];
        return { label: `Last in order +${p.bonus} (${name})` };
      }
      case 'RANDOM_EVENT': {
        const p = record.payload as AuditEventPayloadMap['RANDOM_EVENT'];
        return p.bonus === null
          ? null
          : { label: `Random event +${p.bonus} (${name})` };
      }
      case 'CARD_DRAWN': {
        const p = record.payload as AuditEventPayloadMap['CARD_DRAWN'];
        return p.source === 'prep'
          ? { label: 'Cards drawn', dedupeKey: 'cards_drawn' }
          : null;
      }
      case 'PROFESSION_USED': {
        const p = record.payload as AuditEventPayloadMap['PROFESSION_USED'];
        const professionName = PROFESSION_DATA[p.profession]?.name ?? p.profession;
        if (p.profession === 'lucky') return { label: `Lucky +2 (${name})` };
        return { label: `${professionName} (${name})` };
      }
      case 'TAX_APPLIED':
        return { label: `Politician tax +1 (${name})` };
      case 'BUILDING_STARTED': {
        const p = record.payload as AuditEventPayloadMap['BUILDING_STARTED'];
        const buildingName = BUILDING_DATA[p.buildingType]?.name ?? p.buildingType;
        return { label: `Delayed build ${buildingName} (${name})` };
      }
      case 'BUILDING_FINISHED': {
        const p = record.payload as AuditEventPayloadMap['BUILDING_FINISHED'];
        const buildingName = BUILDING_DATA[p.buildingType]?.name ?? p.buildingType;
        return { label: `Build ${buildingName} (${name})` };
      }
      case 'BUILD_SKIPPED': {
        const p = record.payload as AuditEventPayloadMap['BUILD_SKIPPED'];
        return {
          label: `Build skipped ${p.buildingType ?? '?'} (${name}) — ${p.reason}`,
          problem: true,
        };
      }
      case 'VANDALISM': {
        const p = record.payload as AuditEventPayloadMap['VANDALISM'];
        const buildingName = BUILDING_DATA[p.buildingType]?.name ?? p.buildingType;
        return {
          label: `Vandalism ${buildingName} ${p.valueBefore}→${p.valueAfter} (${name} → ${p.targetName})`,
        };
      }
      case 'THEFT': {
        const p = record.payload as AuditEventPayloadMap['THEFT'];
        if (p.role === 'victim') return null;
        return {
          label:
            p.mode === 'gold'
              ? `Theft ${p.amount ?? 0} gold (${p.thiefName} → ${p.victimName})`
              : `Theft card (${p.thiefName} → ${p.victimName})`,
          dedupeKey: `theft:${p.thiefId}:${p.victimId}`,
        };
      }
      case 'PLANNING_TIMEOUT':
        return { label: 'Planning timeout', problem: true };
      case 'INVALID_ACTION': {
        const p = record.payload as AuditEventPayloadMap['INVALID_ACTION'];
        return { label: `Invalid action ${p.action} (${name})`, problem: true };
      }
      default:
        return null;
    }
  }
}
