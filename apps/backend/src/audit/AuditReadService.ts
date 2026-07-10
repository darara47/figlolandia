import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuditEventContextDto,
  AuditGameReportDto,
  AuditGameSummaryDto,
  AuditPlayerTimelineDto,
  AuditRoundAnalysisDto,
  AuditValidationDto,
  InvestigationGameResult,
  InvestigationRoundResult,
  InvestigationSeverity,
} from './AuditTypes';
import { AuditQueries } from './AuditQueries';
import { ReplayEngine } from './ReplayEngine';
import { RuleInspector } from './RuleInspector';
import { CorrelationExplorer } from './CorrelationExplorer';

/**
 * Fasada odczytu audytu — składa istniejące warstwy w widoki dla konsumentów.
 * AuditQueries = surowy SQL; AuditReadService = raporty pod REST / narzędzia / UI.
 */
@Injectable()
export class AuditReadService {
  constructor(
    private readonly queries: AuditQueries,
    private readonly replay: ReplayEngine,
    private readonly rules: RuleInspector,
    private readonly correlation: CorrelationExplorer,
  ) { }

  getGameSummary(gameId: string): AuditGameSummaryDto {
    const game = this.requireGame(gameId);
    return {
      game,
      rounds: this.queries.getRounds(gameId),
      validation: this.buildValidationSummary(gameId),
      investigation: this.buildInvestigationGameResult(gameId),
    };
  }

  getRoundAnalysis(gameId: string, round: number): AuditRoundAnalysisDto {
    this.requireGame(gameId);
    const detail = this.queries.getRound(gameId, round);
    const replayResult = this.replay.replayRound(gameId, round);
    const rulesResult = this.rules.inspectRound(gameId, round);
    const correlations = this.correlation.getChainsForRound(gameId, round);
    const investigation = this.buildInvestigationRoundResult(gameId, round);

    return {
      detail,
      replay: replayResult,
      rules: rulesResult,
      correlations,
      investigation,
      health: {
        replayOk: replayResult
          ? replayResult.segments.every(
            (s) => s.verification.goldLedgerMatchesDiff,
          )
          : false,
        validationOk: detail.validationResults.every((v) => v.status === 'OK'),
        suspicious: investigation.suspicious,
      },
    };
  }

  getGameReport(gameId: string): AuditGameReportDto {
    const summary = this.getGameSummary(gameId);
    const roundNumbers = summary.rounds.map((r) => r.roundNumber);
    const rounds = roundNumbers.map((round) =>
      this.getRoundAnalysis(gameId, round),
    );

    const events = this.queries.getEvents(gameId);
    const eventCounts: Record<string, number> = {};
    for (const event of events) {
      eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
    }

    return {
      summary,
      rounds,
      eventCounts,
      health: {
        validationOk: summary.validation.failed === 0,
        replayOk: rounds.every((r) => r.health.replayOk),
        suspicious: summary.investigation.suspicious,
      },
    };
  }

  getEventContext(gameId: string, eventId: number): AuditEventContextDto {
    this.requireGame(gameId);
    const event = this.queries
      .getEvents(gameId)
      .find((e) => e.id === eventId);
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found in game ${gameId}`);
    }

    const rules = this.queries.getRuleEvaluationsForEvent(eventId);
    const correlationChain =
      event.correlationId !== null && event.correlationId !== undefined
        ? this.correlation.getChain(gameId, event.correlationId)
        : null;
    const goldLedger = this.queries
      .getGoldHistory(gameId, undefined, event.round)
      .filter((entry) => entry.eventId === eventId);

    return { event, rules, correlationChain, goldLedger };
  }

  getPlayerTimeline(
    gameId: string,
    playerId: string,
  ): AuditPlayerTimelineDto {
    this.requireGame(gameId);
    const history = this.queries.getPlayerHistory(gameId, playerId);
    const findings = this.queries
      .getInvestigationFindings(gameId)
      .filter((f) => f.playerId === playerId);

    return { playerId, history, findings };
  }

  listGames(): AuditGameSummaryDto[] {
    return this.queries.getGames().map((game) =>
      this.getGameSummary(game.gameId),
    );
  }

  private requireGame(gameId: string) {
    const game = this.queries.getGame(gameId);
    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found in audit`);
    }
    return game;
  }

  private buildValidationSummary(gameId: string) {
    const all = this.queries.getValidationResults(gameId);
    const byRound: Record<number, AuditValidationDto[]> = {};
    for (const result of all) {
      const list = byRound[result.round] ?? [];
      list.push(result);
      byRound[result.round] = list;
    }
    return {
      total: all.length,
      failed: all.filter((v) => v.status !== 'OK').length,
      byRound,
    };
  }

  private buildInvestigationRoundResult(
    gameId: string,
    round: number,
  ): InvestigationRoundResult {
    const findings = this.queries.getInvestigationFindings(gameId, round);
    return {
      gameId,
      round,
      findings,
      suspicious: findings.some((f) => f.severity !== 'INFO'),
    };
  }

  private buildInvestigationGameResult(
    gameId: string,
  ): InvestigationGameResult {
    const all = this.queries.getInvestigationFindings(gameId);
    const bySeverity: Record<InvestigationSeverity, number> = {
      INFO: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0,
    };
    for (const finding of all) {
      bySeverity[finding.severity]++;
    }
    return {
      gameId,
      findings: all,
      suspicious: all.some((f) => f.severity !== 'INFO'),
      bySeverity,
    };
  }
}
