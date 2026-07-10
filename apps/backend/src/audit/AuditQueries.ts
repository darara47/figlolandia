import { Injectable } from '@nestjs/common';
import type { AuditEventPayload, GameConfig, SnapshotLabel } from '@figlolandia/game-core';
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
  InvestigationFindingDto,
  InvestigationFindingRow,
  CorrelationChainDto,
  EventRow,
  GameRow,
  GoldLedgerRow,
  RuleEvaluationDto,
  RuleEvaluationRow,
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

  getSnapshotByLabel(
    gameId: string,
    round: number,
    label: SnapshotLabel,
  ): AuditSnapshotDto | null {
    const row = this.storage.getSnapshotByLabel(gameId, round, label);
    if (!row) return null;
    return this.toSnapshotDto(row);
  }

  getSnapshotById(
    gameId: string,
    snapshotId: number,
  ): AuditSnapshotDto | null {
    const row = this.storage.getSnapshotById(gameId, snapshotId);
    if (!row) return null;
    return this.toSnapshotDto(row);
  }

  /** Eventy między dwoma snapshotami (exclusive → inclusive po createdAt). */
  getEventsBetween(
    gameId: string,
    round: number,
    afterExclusive: number,
    beforeInclusive: number,
  ): AuditEventDto[] {
    return this.storage
      .getEventsBetweenCreatedAt(
        gameId,
        round,
        afterExclusive,
        beforeInclusive,
      )
      .map((row) => this.toEventDto(row));
  }

  getGoldLedgerBetween(
    gameId: string,
    round: number,
    afterExclusive: number,
    beforeInclusive: number,
  ): AuditGoldEntryDto[] {
    return this.storage
      .getGoldLedgerBetweenCreatedAt(
        gameId,
        round,
        afterExclusive,
        beforeInclusive,
      )
      .map((row) => this.toGoldDto(row));
  }

  /**
   * Eventy i ledger między dwoma snapshotami (granice po event.id — niezawodne przy buforowanym zapisie).
   */
  getSegmentData(
    gameId: string,
    round: number,
    fromSnapshot: AuditSnapshotDto,
    toSnapshot: AuditSnapshotDto,
  ): { events: AuditEventDto[]; goldLedger: AuditGoldEntryDto[] } {
    const fromBoundary = this.resolveEventBoundary(fromSnapshot);
    const toBoundary = this.resolveEventBoundary(toSnapshot);
    const eventRows = this.storage.getEventsBetweenIds(
      gameId,
      round,
      fromBoundary,
      toBoundary,
    );
    const events = eventRows.map((row) => this.toEventDto(row));
    const goldLedger = this.storage
      .getGoldLedgerForEventIds(eventRows.map((r) => r.id))
      .map((row) => this.toGoldDto(row));
    return { events, goldLedger };
  }

  private resolveEventBoundary(snapshot: AuditSnapshotDto): number {
    if (snapshot.eventsThroughId > 0) {
      return snapshot.eventsThroughId;
    }
    return this.storage.getMaxEventIdAtOrBefore(
      snapshot.gameId,
      snapshot.round,
      snapshot.createdAt,
    );
  }

  getRuleEvaluationsForEvent(eventId: number): RuleEvaluationDto[] {
    return this.storage
      .getRuleEvaluationsForEvent(eventId)
      .map((row) => this.toRuleDto(row));
  }

  getRuleEvaluations(gameId: string, round?: number): RuleEvaluationDto[] {
    return this.storage
      .getRuleEvaluations(gameId, round)
      .map((row) => this.toRuleDto(row));
  }

  getRuleEvaluationsByEventIds(
    eventIds: number[],
  ): Map<number, RuleEvaluationDto[]> {
    const rows = this.storage.getRuleEvaluationsForEventIds(eventIds);
    const map = new Map<number, RuleEvaluationDto[]>();
    for (const row of rows) {
      const dto = this.toRuleDto(row);
      const list = map.get(row.eventId) ?? [];
      list.push(dto);
      map.set(row.eventId, list);
    }
    return map;
  }

  getCorrelationChain(
    gameId: string,
    correlationId: string,
  ): CorrelationChainDto | null {
    const rows = this.storage.getEventsByCorrelationId(gameId, correlationId);
    if (rows.length === 0) return null;
    const events = rows.map((row) => this.toEventDto(row));
    return {
      correlationId,
      gameId,
      round: events[0].round,
      events,
      rootEventUid: events[0].eventUid ?? '',
      leafEventUid: events[events.length - 1].eventUid ?? '',
    };
  }

  getCorrelationChainsForRound(
    gameId: string,
    round: number,
  ): CorrelationChainDto[] {
    const ids = this.storage.getCorrelationIdsForRound(gameId, round);
    return ids
      .map((id) => this.getCorrelationChain(gameId, id))
      .filter((chain): chain is CorrelationChainDto => chain !== null);
  }

  getEventByUid(gameId: string, eventUid: string): AuditEventDto | null {
    const row = this.storage.getEventByUid(gameId, eventUid);
    return row ? this.toEventDto(row) : null;
  }

  getInvestigationFindings(
    gameId: string,
    round?: number,
  ): InvestigationFindingDto[] {
    return this.storage
      .getInvestigationFindings(gameId, round)
      .map((row) => this.toInvestigationDto(row));
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
      eventUid: row.eventUid,
      parentEventUid: row.parentEventUid,
      correlationId: row.correlationId,
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
      eventsThroughId: row.eventsThroughId,
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

  private toRuleDto(row: RuleEvaluationRow): RuleEvaluationDto {
    return {
      id: row.id,
      eventId: row.eventId,
      gameId: row.gameId,
      round: row.round,
      phase: row.phase,
      rule: row.rule,
      condition: row.condition,
      expected: row.expected,
      actual: row.actual,
      passed: !!row.passed,
      details: parseJson<unknown>(row.detailsJson),
      createdAt: row.createdAt,
    };
  }

  private toInvestigationDto(
    row: InvestigationFindingRow,
  ): InvestigationFindingDto {
    return {
      id: row.id,
      gameId: row.gameId,
      round: row.round,
      issueType: row.issueType,
      severity: row.severity,
      confidence: row.confidence,
      playerId: row.playerId,
      playerName: row.playerName,
      summary: row.summary,
      reason: row.reason,
      evidence: parseJson<unknown>(row.evidenceJson),
      createdAt: row.createdAt,
    };
  }
}
