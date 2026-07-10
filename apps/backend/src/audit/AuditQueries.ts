import { Injectable } from '@nestjs/common';
import type { AuditEventPayload, GameConfig } from '@figlolandia/game-core';
import type {
  AuditEventDto,
  AuditEventFilter,
  AuditGameDto,
  AuditGamePlayerBrief,
  AuditGoldEntryDto,
  AuditPlayerHistoryDto,
  AuditRoundDetailDto,
  AuditRoundDto,
  AuditSnapshotDto,
  AuditValidationDto,
  EventRow,
  GameRow,
  GoldLedgerRow,
  RoundRow,
  SerializedGameState,
  SnapshotRow,
  ValidationResultRow,
} from './AuditTypes';
import { AuditStorage } from './AuditStorage';

const parseJson = <T>(json: string | null): T | null => {
  if (json === null) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

/**
 * Jedyne API odczytu audytu — reszta projektu (walidator, przyszły
 * dashboard /debug/game/:gameId, eksporty CSV/JSON, REST) korzysta
 * wyłącznie z tych metod. Zero surowego SQL poza AuditStorage.
 */
@Injectable()
export class AuditQueries {
  constructor(private readonly storage: AuditStorage) { }

  getGame(gameId: string): AuditGameDto | null {
    const row = this.storage.getGame(gameId);
    return row ? this.toGameDto(row) : null;
  }

  getGames(): AuditGameDto[] {
    return this.storage.getGames().map((row) => this.toGameDto(row));
  }

  getRounds(gameId: string): AuditRoundDto[] {
    return this.storage.getRounds(gameId).map((row) => this.toRoundDto(row));
  }

  /** Pełny widok jednej rundy: metadane, eventy, ledger, snapshoty, walidacja. */
  getRound(gameId: string, round: number): AuditRoundDetailDto {
    const row = this.storage.getRound(gameId, round);
    return {
      round: row ? this.toRoundDto(row) : null,
      events: this.getEvents(gameId, { round }),
      goldLedger: this.getGoldHistory(gameId, undefined, round),
      snapshots: this.getSnapshots(gameId, round),
      validationResults: this.getValidationResults(gameId, round),
    };
  }

  getEvents(gameId: string, filter: AuditEventFilter = {}): AuditEventDto[] {
    return this.storage
      .getEvents(gameId, filter)
      .map((row) => this.toEventDto(row));
  }

  getPlayerHistory(gameId: string, playerId: string): AuditPlayerHistoryDto {
    return {
      playerId,
      events: this.getEvents(gameId, { playerId }),
      goldHistory: this.getGoldHistory(gameId, playerId),
    };
  }

  getGoldHistory(
    gameId: string,
    playerId?: string,
    round?: number,
  ): AuditGoldEntryDto[] {
    return this.storage
      .getGoldLedger(gameId, { playerId, round })
      .map((row) => this.toGoldDto(row));
  }

  getSnapshots(gameId: string, round?: number): AuditSnapshotDto[] {
    return this.storage
      .getSnapshots(gameId, round)
      .map((row) => this.toSnapshotDto(row))
      .filter((dto): dto is AuditSnapshotDto => dto !== null);
  }

  getValidationResults(gameId: string, round?: number): AuditValidationDto[] {
    return this.storage
      .getValidationResults(gameId, round)
      .map((row) => this.toValidationDto(row));
  }

  // -------------------------------------------------------------------------
  // Mapowanie wierszy na DTO
  // -------------------------------------------------------------------------

  private toGameDto(row: GameRow): AuditGameDto {
    return {
      gameId: row.id,
      gamePin: row.gamePin,
      seed: row.seed,
      config: parseJson<GameConfig>(row.configJson),
      players: parseJson<AuditGamePlayerBrief[]>(row.playersJson) ?? [],
      status: row.status,
      winnerPlayerId: row.winnerPlayerId,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
    };
  }

  private toRoundDto(row: RoundRow): AuditRoundDto {
    return {
      gameId: row.gameId,
      roundNumber: row.roundNumber,
      turnOrder:
        parseJson<{ playerId: string; name: string; order: number }[]>(
          row.turnOrderJson,
        ),
      taxedCategory: row.taxedCategory,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
    };
  }

  private toEventDto(row: EventRow): AuditEventDto {
    return {
      id: row.id,
      gameId: row.gameId,
      round: row.round,
      phase: row.phase,
      step: row.step,
      type: row.type,
      playerId: row.playerId,
      message: row.message,
      payload: parseJson<AuditEventPayload>(row.payloadJson),
      createdAt: row.createdAt,
    };
  }

  private toGoldDto(row: GoldLedgerRow): AuditGoldEntryDto {
    return {
      id: row.id,
      eventId: row.eventId,
      gameId: row.gameId,
      round: row.round,
      phase: row.phase,
      playerId: row.playerId,
      playerName: row.playerName,
      before: row.goldBefore,
      delta: row.goldDelta,
      after: row.goldAfter,
      reason: row.reason,
      createdAt: row.createdAt,
    };
  }

  private toSnapshotDto(row: SnapshotRow): AuditSnapshotDto | null {
    const state = parseJson<SerializedGameState>(row.stateJson);
    if (!state) return null;
    return {
      id: row.id,
      gameId: row.gameId,
      round: row.round,
      label: row.label,
      state,
      createdAt: row.createdAt,
    };
  }

  private toValidationDto(row: ValidationResultRow): AuditValidationDto {
    return {
      id: row.id,
      gameId: row.gameId,
      round: row.round,
      checkName: row.checkName,
      status: row.status,
      details: parseJson<unknown>(row.detailsJson),
      createdAt: row.createdAt,
    };
  }
}
