import { Injectable } from '@nestjs/common';
import type {
  AuditEventDto,
  RuleEvaluationDto,
  RuleInspectionEntry,
  RuleInspectionRoundResult,
} from './AuditTypes';
import { AuditQueries } from './AuditQueries';

const parseDecision = (rules: RuleEvaluationDto[]): string | null => {
  const decisionRule = rules.find((r) => r.rule === 'Decision');
  if (decisionRule) {
    const details = decisionRule.details as { decision?: string } | null;
    return details?.decision ?? decisionRule.actual;
  }
  return null;
};

/**
 * Rule Inspector — drzewo decyzji silnika powiązane z eventami audytowymi.
 *
 * Replay pokazuje *co* się wydarzyło, State Diff *co* się zmieniło,
 * Validator *czy* dane są spójne — Rule Inspector odpowiada *dlaczego*.
 */
@Injectable()
export class RuleInspector {
  constructor(private readonly queries: AuditQueries) { }

  getRulesForEvent(eventId: number): RuleEvaluationDto[] {
    return this.queries.getRuleEvaluationsForEvent(eventId);
  }

  inspectEvent(
    gameId: string,
    eventId: number,
  ): RuleInspectionEntry | null {
    const event = this.queries
      .getEvents(gameId)
      .find((e) => e.id === eventId);
    if (!event) return null;
    return this.buildEntry(event);
  }

  /** Pełna inspekcja rundy: każdy event z regułami (jeśli są). */
  inspectRound(gameId: string, round: number): RuleInspectionRoundResult {
    const events = this.queries.getEvents(gameId, { round });
    const rulesByEvent = this.queries.getRuleEvaluationsByEventIds(
      events.map((e) => e.id),
    );

    const entries: RuleInspectionEntry[] = events
      .filter((e) => (rulesByEvent.get(e.id)?.length ?? 0) > 0)
      .map((event) => {
        const rules = rulesByEvent.get(event.id) ?? [];
        return {
          event,
          rules,
          decision: parseDecision(rules),
          allPassed: rules.every((r) => r.passed),
        };
      });

    const failedRules = entries
      .flatMap((e) => e.rules)
      .filter((r) => !r.passed);

    return { gameId, round, entries, failedRules };
  }

  /** Eventy z regułami dla danego gracza w rundzie. */
  inspectPlayerRound(
    gameId: string,
    round: number,
    playerId: string,
  ): RuleInspectionEntry[] {
    const events = this.queries.getEvents(gameId, { round, playerId });
    const rulesByEvent = this.queries.getRuleEvaluationsByEventIds(
      events.map((e) => e.id),
    );

    return events
      .filter((e) => (rulesByEvent.get(e.id)?.length ?? 0) > 0)
      .map((event) => {
        const rules = rulesByEvent.get(event.id) ?? [];
        return {
          event,
          rules,
          decision: parseDecision(rules),
          allPassed: rules.every((r) => r.passed),
        };
      });
  }

  private buildEntry(event: AuditEventDto): RuleInspectionEntry {
    const rules = this.queries.getRuleEvaluationsForEvent(event.id);
    return {
      event,
      rules,
      decision: parseDecision(rules),
      allPassed: rules.every((r) => r.passed),
    };
  }
}
