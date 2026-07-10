import { Injectable } from '@nestjs/common';
import {
  BUILDING_DATA,
  type AuditEventPayloadMap,
  type AuditEventType,
} from '@figlolandia/game-core';
import type {
  AuditEventDto,
  AuditGoldEntryDto,
  AuditSnapshotDto,
  ValidationResultInsert,
  ValidationStatus,
} from './AuditTypes';
import { AuditQueries } from './AuditQueries';
import { AuditStorage } from './AuditStorage';

/** Zwraca payload zdarzenia zawężony do konkretnego typu (albo null). */
const payloadOf = <T extends AuditEventType>(
  event: AuditEventDto | undefined,
  type: T,
): AuditEventPayloadMap[T] | null => {
  if (!event || event.type !== type || event.payload === null) return null;
  return event.payload as AuditEventPayloadMap[T];
};

interface CheckContext {
  gameId: string;
  round: number;
  events: AuditEventDto[];
  eventsById: Map<number, AuditEventDto>;
  ledger: AuditGoldEntryDto[];
  ledgerAll: AuditGoldEntryDto[];
  afterPrep: AuditSnapshotDto | undefined;
  endRound: AuditSnapshotDto | undefined;
}

type CheckOutcome = {
  status: ValidationStatus;
  details: unknown;
};

type CheckFn = (ctx: CheckContext) => CheckOutcome;

const ok = (details: unknown = null): CheckOutcome => ({
  status: 'OK',
  details,
});
const fail = (details: unknown): CheckOutcome => ({
  status: 'FAIL',
  details,
});
const warn = (details: unknown): CheckOutcome => ({
  status: 'WARN',
  details,
});

const fromFailures = (failures: unknown[]): CheckOutcome =>
  failures.length === 0 ? ok() : fail(failures);

// ---------------------------------------------------------------------------
// Checki
// ---------------------------------------------------------------------------

/** before + delta = after w każdym wierszu ledgera. */
const checkLedgerArithmetic: CheckFn = (ctx) =>
  fromFailures(
    ctx.ledger
      .filter((row) => row.before + row.delta !== row.after)
      .map((row) => ({
        ledgerId: row.id,
        playerId: row.playerId,
        before: row.before,
        delta: row.delta,
        after: row.after,
        reason: row.reason,
      })),
  );

/** after wiersza N = before wiersza N+1 per gracz (łącznie z granicą rund). */
const checkLedgerContinuity: CheckFn = (ctx) => {
  const failures: unknown[] = [];
  const byPlayer = new Map<string, AuditGoldEntryDto[]>();
  for (const row of ctx.ledgerAll) {
    if (row.round > ctx.round) continue;
    const rows = byPlayer.get(row.playerId) ?? [];
    rows.push(row);
    byPlayer.set(row.playerId, rows);
  }
  for (const rows of byPlayer.values()) {
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const next = rows[i];
      if (next.round !== ctx.round) continue;
      if (prev.after !== next.before) {
        failures.push({
          playerId: next.playerId,
          prevLedgerId: prev.id,
          nextLedgerId: next.id,
          prevAfter: prev.after,
          nextBefore: next.before,
          reason: next.reason,
        });
      }
    }
  }
  return fromFailures(failures);
};

/** Złoto nigdy nie schodzi poniżej zera. */
const checkNoNegativeGold: CheckFn = (ctx) =>
  fromFailures(
    ctx.ledger
      .filter((row) => row.after < 0 || row.before < 0)
      .map((row) => ({
        ledgerId: row.id,
        playerId: row.playerId,
        before: row.before,
        after: row.after,
        reason: row.reason,
      })),
  );

/** Koszt budowy zgodny z wartością bazową (i zniżką Łowcy okazji). */
const checkBuildCost: CheckFn = (ctx) => {
  const failures: unknown[] = [];
  const buildRows = ctx.ledger.filter(
    (row) => row.reason === 'build_cost' || row.reason === 'delayed_build_cost',
  );
  for (const row of buildRows) {
    const event = ctx.eventsById.get(row.eventId);
    const payload =
      payloadOf(event, 'BUILDING_FINISHED') ??
      payloadOf(event, 'BUILDING_STARTED');
    if (!payload) {
      failures.push({ ledgerId: row.id, problem: 'missing_build_event' });
      continue;
    }
    const expectedCost = payload.opportunityHunter
      ? Math.max(0, payload.baseValue - 2)
      : payload.baseValue;
    const range = BUILDING_DATA[payload.buildingType]?.valueRange;
    const problems: string[] = [];
    if (-row.delta !== payload.cost) problems.push('delta_ne_cost');
    if (payload.cost !== expectedCost) problems.push('cost_ne_expected');
    if (range && (payload.baseValue < range[0] || payload.baseValue > range[1])) {
      problems.push('base_value_out_of_range');
    }
    if (problems.length > 0) {
      failures.push({
        ledgerId: row.id,
        playerId: row.playerId,
        buildingType: payload.buildingType,
        delta: row.delta,
        cost: payload.cost,
        expectedCost,
        baseValue: payload.baseValue,
        problems,
      });
    }
  }
  return fromFailures(failures);
};

/** Podatek Polityka: +1 dla polityka za każdy budynek innych w opodatkowanej kategorii. */
const checkTaxCorrectness: CheckFn = (ctx) => {
  const taxSetEvent = ctx.events.find((e) => e.type === 'TAX_CATEGORY_SET');
  const taxedCategory = payloadOf(taxSetEvent, 'TAX_CATEGORY_SET')?.taxedCategory ?? null;
  const politicianId = taxSetEvent?.playerId ?? null;
  const taxEvents = ctx.events.filter((e) => e.type === 'TAX_APPLIED');

  const failures: unknown[] = [];

  if (!taxedCategory && taxEvents.length > 0) {
    failures.push({ problem: 'tax_applied_without_category', count: taxEvents.length });
  }

  for (const event of taxEvents) {
    const payload = payloadOf(event, 'TAX_APPLIED');
    const ledgerRow = ctx.ledger.find((row) => row.eventId === event.id);
    const problems: string[] = [];
    if (!payload) problems.push('missing_payload');
    if (payload && taxedCategory && payload.taxedCategory !== taxedCategory) {
      problems.push('category_mismatch');
    }
    if (payload && politicianId && payload.builderId === politicianId) {
      problems.push('politician_taxed_self');
    }
    if (!ledgerRow || ledgerRow.delta !== 1) problems.push('ledger_delta_ne_1');
    if (problems.length > 0) {
      failures.push({ eventId: event.id, problems });
    }
  }

  if (taxedCategory && politicianId) {
    const expected = ctx.events.filter((e) => {
      if (e.type !== 'BUILDING_FINISHED' || e.playerId === politicianId) {
        return false;
      }
      const payload = payloadOf(e, 'BUILDING_FINISHED');
      return payload?.buildingCategory === taxedCategory;
    }).length;
    if (expected !== taxEvents.length) {
      failures.push({
        problem: 'tax_count_mismatch',
        expected,
        actual: taxEvents.length,
        taxedCategory,
      });
    }
  }

  return fromFailures(failures);
};

/** Kradzież złota bilansuje się do zera; kradzież karty ma parę REMOVED/DRAWN. */
const checkTheftBalance: CheckFn = (ctx) => {
  const failures: unknown[] = [];
  const victimRows = ctx.ledger.filter((r) => r.reason === 'theft_gold_victim');
  const thiefRows = ctx.ledger.filter((r) => r.reason === 'theft_gold_thief');

  const victimSum = victimRows.reduce((sum, r) => sum + r.delta, 0);
  const thiefSum = thiefRows.reduce((sum, r) => sum + r.delta, 0);
  if (victimSum + thiefSum !== 0) {
    failures.push({ problem: 'gold_not_balanced', victimSum, thiefSum });
  }
  for (const row of [...victimRows, ...thiefRows]) {
    if (Math.abs(row.delta) > 2) {
      failures.push({ problem: 'theft_over_limit', ledgerId: row.id, delta: row.delta });
    }
  }

  const cardThefts = ctx.events.filter((e) => {
    const payload = payloadOf(e, 'THEFT');
    return payload?.mode === 'card' && payload.role === 'summary';
  });
  for (const theft of cardThefts) {
    const payload = payloadOf(theft, 'THEFT');
    const cardId = payload?.cardId;
    const removed = ctx.events.some((e) => {
      const p = payloadOf(e, 'CARD_REMOVED');
      return p?.cardId === cardId && p.reason === 'stolen';
    });
    const drawn = ctx.events.some((e) => {
      const p = payloadOf(e, 'CARD_DRAWN');
      return p?.cardId === cardId && p.source === 'theft';
    });
    if (!removed || !drawn) {
      failures.push({ problem: 'card_theft_pair_missing', eventId: theft.id, cardId });
    }
  }

  return fromFailures(failures);
};

/** Każdy gracz używa zdolności zawodowej najwyżej raz na rundę. */
const checkProfessionOnce: CheckFn = (ctx) => {
  const counts = new Map<string, number>();
  for (const event of ctx.events) {
    if (event.type !== 'PROFESSION_USED' || !event.playerId) continue;
    counts.set(event.playerId, (counts.get(event.playerId) ?? 0) + 1);
  }
  return fromFailures(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([playerId, count]) => ({ playerId, count })),
  );
};

/** Punkty zwycięstwa = złoto + suma wartości budynków (vs snapshot END_ROUND). */
const checkVictoryPoints: CheckFn = (ctx) => {
  if (!ctx.endRound) return warn({ problem: 'missing_end_round_snapshot' });
  const failures: unknown[] = [];
  const vpByPlayer = new Map<string, AuditEventPayloadMap['VICTORY_POINTS']>();
  for (const event of ctx.events) {
    const payload = payloadOf(event, 'VICTORY_POINTS');
    if (payload && event.playerId) vpByPlayer.set(event.playerId, payload);
  }
  for (const player of ctx.endRound.state.players) {
    const expected =
      player.gold + player.buildings.reduce((sum, b) => sum + b.value, 0);
    const reported = vpByPlayer.get(player.id);
    if (!reported) {
      failures.push({ playerId: player.id, problem: 'missing_vp_event' });
    } else if (reported.points !== expected) {
      failures.push({
        playerId: player.id,
        expected,
        reported: reported.points,
      });
    }
  }
  return fromFailures(failures);
};

/** Ręka na końcu rundy = ręka po przygotowaniu + dobrania − usunięcia (RESOLUTION). */
const checkCardConsistency: CheckFn = (ctx) => {
  if (!ctx.afterPrep || !ctx.endRound) {
    return warn({ problem: 'missing_snapshots' });
  }
  const failures: unknown[] = [];
  for (const player of ctx.endRound.state.players) {
    const prepPlayer = ctx.afterPrep.state.players.find(
      (p) => p.id === player.id,
    );
    if (!prepPlayer) continue;

    const expected = new Set(prepPlayer.cards.map((c) => c.id));
    for (const event of ctx.events) {
      if (event.phase !== 'RESOLUTION' || event.playerId !== player.id) {
        continue;
      }
      const drawn = payloadOf(event, 'CARD_DRAWN');
      if (drawn) expected.add(drawn.cardId);
      const removed = payloadOf(event, 'CARD_REMOVED');
      if (removed) expected.delete(removed.cardId);
    }

    const actual = new Set(player.cards.map((c) => c.id));
    const missing = [...expected].filter((id) => !actual.has(id));
    const extra = [...actual].filter((id) => !expected.has(id));
    if (missing.length > 0 || extra.length > 0) {
      failures.push({ playerId: player.id, missing, extra });
    }
  }
  return fromFailures(failures);
};

/** Liczba budynków w snapshotach zgadza się ze zdarzeniami budowy. */
const checkBuildingCount: CheckFn = (ctx) => {
  if (!ctx.afterPrep || !ctx.endRound) {
    return warn({ problem: 'missing_snapshots' });
  }
  const failures: unknown[] = [];
  for (const player of ctx.endRound.state.players) {
    const prepPlayer = ctx.afterPrep.state.players.find(
      (p) => p.id === player.id,
    );
    if (!prepPlayer) continue;

    const newFinished = ctx.events.filter((e) => {
      if (e.playerId !== player.id) return false;
      const payload = payloadOf(e, 'BUILDING_FINISHED');
      return payload?.source === 'current';
    }).length;
    const newPending = ctx.events.filter(
      (e) => e.playerId === player.id && e.type === 'BUILDING_STARTED',
    ).length;

    const actualDelta = player.buildings.length - prepPlayer.buildings.length;
    const expectedDelta = newFinished + newPending;
    if (actualDelta !== expectedDelta) {
      failures.push({
        playerId: player.id,
        actualDelta,
        expectedDelta,
        newFinished,
        newPending,
      });
    }
  }
  return fromFailures(failures);
};

/** Złoto w snapshotcie END_ROUND = ostatnie `after` z ledgera per gracz. */
const checkSnapshotGoldMatch: CheckFn = (ctx) => {
  if (!ctx.endRound) return warn({ problem: 'missing_end_round_snapshot' });
  const failures: unknown[] = [];
  for (const player of ctx.endRound.state.players) {
    const rows = ctx.ledgerAll.filter(
      (r) => r.playerId === player.id && r.round <= ctx.round,
    );
    if (rows.length === 0) continue;
    const last = rows[rows.length - 1];
    if (last.after !== player.gold) {
      failures.push({
        playerId: player.id,
        ledgerAfter: last.after,
        snapshotGold: player.gold,
        ledgerId: last.id,
      });
    }
  }
  return fromFailures(failures);
};

const CHECKS: Record<string, CheckFn> = {
  LEDGER_ARITHMETIC: checkLedgerArithmetic,
  LEDGER_CONTINUITY: checkLedgerContinuity,
  NO_NEGATIVE_GOLD: checkNoNegativeGold,
  BUILD_COST: checkBuildCost,
  TAX_CORRECTNESS: checkTaxCorrectness,
  THEFT_BALANCE: checkTheftBalance,
  PROFESSION_ONCE: checkProfessionOnce,
  VICTORY_POINTS: checkVictoryPoints,
  CARD_CONSISTENCY: checkCardConsistency,
  BUILDING_COUNT: checkBuildingCount,
  SNAPSHOT_GOLD_MATCH: checkSnapshotGoldMatch,
};

/**
 * Automatyczna walidacja spójności danych po każdej rundzie.
 * Wyniki trafiają do tabeli validation_results.
 */
@Injectable()
export class AuditValidator {
  constructor(
    private readonly queries: AuditQueries,
    private readonly storage: AuditStorage,
  ) { }

  validateRound(gameId: string, round: number): ValidationResultInsert[] {
    const events = this.queries.getEvents(gameId, { round });
    const ledgerAll = this.queries.getGoldHistory(gameId);
    const snapshots = this.queries.getSnapshots(gameId, round);

    const ctx: CheckContext = {
      gameId,
      round,
      events,
      eventsById: new Map(events.map((e) => [e.id, e])),
      ledger: ledgerAll.filter((r) => r.round === round),
      ledgerAll,
      afterPrep: snapshots.find((s) => s.label === 'AFTER_PREPARATION'),
      endRound: snapshots.find((s) => s.label === 'END_ROUND'),
    };

    const results: ValidationResultInsert[] = Object.entries(CHECKS).map(
      ([checkName, check]) => {
        const outcome = this.runCheck(check, ctx);
        return {
          gameId,
          round,
          checkName,
          status: outcome.status,
          detailsJson:
            outcome.details === null ? null : JSON.stringify(outcome.details),
        };
      },
    );

    this.storage.writeValidationResults(results);
    return results;
  }

  private runCheck(check: CheckFn, ctx: CheckContext): CheckOutcome {
    try {
      return check(ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return fail({ problem: 'check_crashed', error: message });
    }
  }
}
