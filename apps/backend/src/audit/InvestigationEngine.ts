import { Injectable } from '@nestjs/common';
import type { AuditEventPayloadMap } from '@figlolandia/game-core';
import type {
  AuditEventDto,
  AuditGamePlayerBrief,
  AuditGoldEntryDto,
  AuditSnapshotDto,
  InvestigationFindingInsert,
  InvestigationGameResult,
  InvestigationIssueType,
  InvestigationRoundResult,
  InvestigationSeverity,
} from './AuditTypes';
import { AuditQueries } from './AuditQueries';
import { AuditStorage } from './AuditStorage';

interface InvestigationContext {
  gameId: string;
  players: AuditGamePlayerBrief[];
  playerNames: Map<string, string>;
  events: AuditEventDto[];
  eventsByRound: Map<number, AuditEventDto[]>;
  ledger: AuditGoldEntryDto[];
  ledgerByRound: Map<number, AuditGoldEntryDto[]>;
  endSnapshots: Map<number, AuditSnapshotDto>;
  rounds: number[];
}

type InvestigatorFn = (ctx: InvestigationContext) => InvestigationFindingInsert[];

const LARGE_GOLD_SWING_THRESHOLD = 8;
const GOLD_EXPLOSION_NET = 10;
const BLOCKED_ACTIONS_THRESHOLD = 2;
const BUILD_SKIP_THRESHOLD = 2;
const PROFESSION_SKIP_ROUNDS = 2;
const LUCKY_ROUNDS_WITHOUT_BONUS = 2;

const nameOf = (
  ctx: InvestigationContext,
  playerId: string | null | undefined,
): string | null =>
  playerId ? (ctx.playerNames.get(playerId) ?? playerId) : null;

const mkFinding = (
  ctx: InvestigationContext,
  input: {
    issueType: InvestigationIssueType;
    severity: InvestigationSeverity;
    confidence: number;
    round: number | null;
    playerId?: string | null;
    summary: string;
    reason: string;
    evidence: unknown;
  },
): InvestigationFindingInsert => ({
  gameId: ctx.gameId,
  round: input.round,
  issueType: input.issueType,
  severity: input.severity,
  confidence: Math.min(100, Math.max(0, Math.round(input.confidence))),
  playerId: input.playerId ?? null,
  playerName: nameOf(ctx, input.playerId),
  summary: input.summary,
  reason: input.reason,
  evidenceJson:
    input.evidence === null || input.evidence === undefined
      ? null
      : JSON.stringify(input.evidence),
});

const roundEvents = (ctx: InvestigationContext, round: number): AuditEventDto[] =>
  ctx.eventsByRound.get(round) ?? [];

const roundLedger = (
  ctx: InvestigationContext,
  round: number,
): AuditGoldEntryDto[] => ctx.ledgerByRound.get(round) ?? [];

const goldNetByPlayer = (
  ctx: InvestigationContext,
  round: number,
): Map<string, number> => {
  const nets = new Map<string, number>();
  for (const row of roundLedger(ctx, round)) {
    nets.set(row.playerId, (nets.get(row.playerId) ?? 0) + row.delta);
  }
  return nets;
};

const investigateLargeGoldSwing: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const round of ctx.rounds) {
    const nets = goldNetByPlayer(ctx, round);
    const magnitudes = [...nets.values()].map(Math.abs);
    if (magnitudes.length === 0) continue;
    const avg = magnitudes.reduce((s, v) => s + v, 0) / magnitudes.length;

    for (const [playerId, net] of nets) {
      const absNet = Math.abs(net);
      if (absNet < LARGE_GOLD_SWING_THRESHOLD) continue;
      const aboveAvg = avg > 0 ? absNet / avg : absNet;
      if (aboveAvg < 1.8 && absNet < GOLD_EXPLOSION_NET) continue;

      out.push(
        mkFinding(ctx, {
          issueType: 'LargeGoldSwing',
          severity: absNet >= GOLD_EXPLOSION_NET ? 'WARNING' : 'INFO',
          confidence: Math.min(95, 55 + aboveAvg * 15),
          round,
          playerId,
          summary: `${nameOf(ctx, playerId)}: ${net >= 0 ? '+' : ''}${net} gold w rundzie ${round}`,
          reason: 'Wyższe niż przeciętna zmiana złota w tej rundzie',
          evidence: {
            net,
            roundAverage: avg,
            timeline: roundLedger(ctx, round)
              .filter((r) => r.playerId === playerId)
              .map((r) => ({
                before: r.before,
                delta: r.delta,
                after: r.after,
                reason: r.reason,
              })),
          },
        }),
      );
    }
  }
  return out;
};

const investigateGoldExplosion: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const round of ctx.rounds) {
    for (const [playerId, net] of goldNetByPlayer(ctx, round)) {
      if (net < GOLD_EXPLOSION_NET) continue;
      out.push(
        mkFinding(ctx, {
          issueType: 'GoldExplosion',
          severity: 'WARNING',
          confidence: Math.min(99, 70 + net * 2),
          round,
          playerId,
          summary: `${nameOf(ctx, playerId)}: +${net} gold netto w rundzie ${round}`,
          reason: 'Nietypowo wysoki przyrost złota w jednej rundzie',
          evidence: { net },
        }),
      );
    }
  }
  return out;
};

const investigateRepeatedBuildFailure: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const round of ctx.rounds) {
    const byPlayer = new Map<string, number>();
    for (const event of roundEvents(ctx, round)) {
      if (event.type !== 'BUILD_SKIPPED' || !event.playerId) continue;
      const payload = event.payload as AuditEventPayloadMap['BUILD_SKIPPED'];
      if (payload.reason !== 'insufficient_gold') continue;
      byPlayer.set(event.playerId, (byPlayer.get(event.playerId) ?? 0) + 1);
    }
    for (const [playerId, count] of byPlayer) {
      if (count < BUILD_SKIP_THRESHOLD) continue;
      out.push(
        mkFinding(ctx, {
          issueType: 'RepeatedBuildFailure',
          severity: 'WARNING',
          confidence: 60 + count * 15,
          round,
          playerId,
          summary: `${nameOf(ctx, playerId)}: ${count}× pominięta budowa (runda ${round})`,
          reason: 'Wielokrotne BUILD_SKIPPED (insufficient_gold)',
          evidence: { count, round },
        }),
      );
    }
  }
  return out;
};

const investigateTooManyBlockedActions: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const round of ctx.rounds) {
    const blocked = roundEvents(ctx, round).filter((e) => {
      if (e.type !== 'PROFESSION_SKIPPED') return false;
      return (
        (e.payload as AuditEventPayloadMap['PROFESSION_SKIPPED']).reason ===
        'ability_blocked'
      );
    });
    if (blocked.length < BLOCKED_ACTIONS_THRESHOLD) continue;
    out.push(
      mkFinding(ctx, {
        issueType: 'TooManyBlockedActions',
        severity: 'WARNING',
        confidence: Math.min(92, 50 + blocked.length * 12),
        round,
        summary: `Runda ${round}: ${blocked.length} zablokowanych zawodów`,
        reason: 'Wielu graczy z professionAbilityUsed przed swoją turą zawodową',
        evidence: {
          count: blocked.length,
          players: blocked.map((e) => e.playerId),
        },
      }),
    );
  }
  return out;
};

const investigateBuildingCostMismatchTrend: InvestigatorFn = (ctx) => {
  const byPlayer = new Map<string, number>();
  for (const event of ctx.events) {
    if (event.type !== 'BUILD_SKIPPED' || !event.playerId) continue;
    byPlayer.set(event.playerId, (byPlayer.get(event.playerId) ?? 0) + 1);
  }
  return [...byPlayer.entries()]
    .filter(([, count]) => count >= BUILD_SKIP_THRESHOLD)
    .map(([playerId, count]) =>
      mkFinding(ctx, {
        issueType: 'BuildingCostMismatchTrend',
        severity: 'INFO',
        confidence: 55 + count * 10,
        round: null,
        playerId,
        summary: `${nameOf(ctx, playerId)}: ${count}× BUILD_SKIPPED w grze`,
        reason: 'Trend niewystarczającego złota na budowę',
        evidence: { totalSkips: count },
      }),
    );
};

const investigateTaxNeverApplied: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const round of ctx.rounds) {
    const events = roundEvents(ctx, round);
    if (!events.some((e) => e.type === 'TAX_CATEGORY_SET')) continue;

    const category = (
      events.find((e) => e.type === 'TAX_CATEGORY_SET')!
        .payload as AuditEventPayloadMap['TAX_CATEGORY_SET']
    ).taxedCategory;
    const buildsInCategory = events.filter((e) => {
      if (e.type !== 'BUILDING_FINISHED') return false;
      return (
        (e.payload as AuditEventPayloadMap['BUILDING_FINISHED'])
          .buildingCategory === category
      );
    }).length;
    const taxApplied = events.filter((e) => e.type === 'TAX_APPLIED').length;

    if (buildsInCategory > 0 && taxApplied === 0) {
      out.push(
        mkFinding(ctx, {
          issueType: 'TaxNeverApplied',
          severity: 'WARNING',
          confidence: 99,
          round,
          summary: `Polityk: ${buildsInCategory} budów ${category}, 0 podatków`,
          reason: 'TAX_CATEGORY_SET bez TAX_APPLIED przy kwalifikujących budowach',
          evidence: { taxedCategory: category, buildsInCategory, taxApplied },
        }),
      );
      out.push(
        mkFinding(ctx, {
          issueType: 'PossibleLogicAnomaly',
          severity: 'WARNING',
          confidence: 95,
          round,
          summary: `Oczekiwano podatków (${category}), otrzymano 0`,
          reason: 'Possible logic anomaly — politician tax never applied',
          evidence: { expected: buildsInCategory, actual: taxApplied },
        }),
      );
    }
  }
  return out;
};

const investigateNoRandomEvents: InvestigatorFn = (ctx) => {
  const random = ctx.events.filter((e) => e.type === 'RANDOM_EVENT');
  const fired = random.filter(
    (e) =>
      (e.payload as AuditEventPayloadMap['RANDOM_EVENT']).bonus !== null,
  );
  if (ctx.rounds.length < 2 || random.length === 0 || fired.length > 0) {
    return [];
  }
  return [
    mkFinding(ctx, {
      issueType: 'NoRandomEvents',
      severity: 'INFO',
      confidence: 75,
      round: null,
      summary: `Brak aktywnych zdarzeń losowych w ${ctx.rounds.length} rundach`,
      reason: 'Wszystkie RANDOM_EVENT mają bonus=null',
      evidence: { rounds: ctx.rounds.length },
    }),
  ];
};

const investigateProfessionBonusNeverReceived: InvestigatorFn = (ctx) => {
  const luckyRounds = new Map<string, number>();
  const luckyBonus = new Map<string, number>();

  for (const round of ctx.rounds) {
    for (const event of roundEvents(ctx, round)) {
      if (event.type !== 'PROFESSION_ASSIGNED' || !event.playerId) continue;
      if (
        (event.payload as AuditEventPayloadMap['PROFESSION_ASSIGNED'])
          .profession !== 'lucky'
      ) {
        continue;
      }
      luckyRounds.set(
        event.playerId,
        (luckyRounds.get(event.playerId) ?? 0) + 1,
      );
    }
  }
  for (const row of ctx.ledger) {
    if (row.reason === 'lucky_bonus') {
      luckyBonus.set(row.playerId, (luckyBonus.get(row.playerId) ?? 0) + 1);
    }
  }

  return [...luckyRounds.entries()]
    .filter(([playerId, rounds]) => {
      return rounds >= LUCKY_ROUNDS_WITHOUT_BONUS && !luckyBonus.get(playerId);
    })
    .map(([playerId, rounds]) =>
      mkFinding(ctx, {
        issueType: 'ProfessionBonusNeverReceived',
        severity: 'WARNING',
        confidence: 88,
        round: null,
        playerId,
        summary: `${nameOf(ctx, playerId)}: Lucky ${rounds} rund, 0 bonusów +2`,
        reason: 'Zawód lucky bez lucky_bonus w ledgerze',
        evidence: { luckyRounds: rounds, bonuses: 0 },
      }),
    );
};

const investigateRepeatedProfessionSkip: InvestigatorFn = (ctx) => {
  const byPlayer = new Map<string, number[]>();
  for (const event of ctx.events) {
    if (event.type !== 'PROFESSION_SKIPPED' || !event.playerId) continue;
    if (
      (event.payload as AuditEventPayloadMap['PROFESSION_SKIPPED']).reason !==
      'ability_blocked'
    ) {
      continue;
    }
    const list = byPlayer.get(event.playerId) ?? [];
    list.push(event.round);
    byPlayer.set(event.playerId, list);
  }
  return [...byPlayer.entries()]
    .filter(([, rounds]) => rounds.length >= PROFESSION_SKIP_ROUNDS)
    .map(([playerId, rounds]) =>
      mkFinding(ctx, {
        issueType: 'RepeatedProfessionSkip',
        severity: 'WARNING',
        confidence: Math.min(90, 60 + rounds.length * 10),
        round: null,
        playerId,
        summary: `${nameOf(ctx, playerId)}: zawód zablokowany w ${rounds.length} rundach`,
        reason: 'Powtarzające się PROFESSION_SKIPPED (ability_blocked)',
        evidence: { rounds },
      }),
    );
};

const investigatePlayerNeverDraws: InvestigatorFn = (ctx) => {
  const draws = new Map<string, number>();
  for (const event of ctx.events) {
    if (event.type !== 'CARD_DRAWN' || !event.playerId) continue;
    const src = (event.payload as AuditEventPayloadMap['CARD_DRAWN']).source;
    if (src !== 'prep' && src !== 'lobby') continue;
    draws.set(event.playerId, (draws.get(event.playerId) ?? 0) + 1);
  }
  return ctx.players
    .filter((p) => (draws.get(p.id) ?? 0) < ctx.rounds.length)
    .map((p) =>
      mkFinding(ctx, {
        issueType: 'PlayerNeverDraws',
        severity: 'WARNING',
        confidence: 80,
        round: null,
        playerId: p.id,
        summary: `${p.name}: ${draws.get(p.id) ?? 0} dobrań na ${ctx.rounds.length} rund`,
        reason: 'Mniej CARD_DRAWN niż liczba rund',
        evidence: { draws: draws.get(p.id) ?? 0, rounds: ctx.rounds.length },
      }),
    );
};

const investigateUnusedProfession: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const round of ctx.rounds) {
    const events = roundEvents(ctx, round);
    const politicians = events.filter((e) => {
      if (e.type !== 'PROFESSION_ASSIGNED' || !e.playerId) return false;
      return (
        (e.payload as AuditEventPayloadMap['PROFESSION_ASSIGNED']).profession ===
        'politician'
      );
    });
    if (politicians.length === 0) continue;
    if (events.some((e) => e.type === 'TAX_CATEGORY_SET')) continue;
    for (const e of politicians) {
      out.push(
        mkFinding(ctx, {
          issueType: 'UnusedProfession',
          severity: 'INFO',
          confidence: 70,
          round,
          playerId: e.playerId,
          summary: `${nameOf(ctx, e.playerId)}: Polityk bez ustawienia kategorii (runda ${round})`,
          reason: 'PROFESSION_ASSIGNED politician bez TAX_CATEGORY_SET',
          evidence: { round },
        }),
      );
    }
  }
  return out;
};

const investigateRepeatedProtection: InvestigatorFn = (ctx) => {
  const counts = new Map<string, number>();
  for (const event of ctx.events) {
    if (event.type !== 'PROTECTION' || !event.playerId) continue;
    counts.set(event.playerId, (counts.get(event.playerId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([playerId, count]) =>
      mkFinding(ctx, {
        issueType: 'RepeatedProtection',
        severity: 'INFO',
        confidence: 65,
        round: null,
        playerId,
        summary: `${nameOf(ctx, playerId)}: ochrona Dyplomaty ${count}×`,
        reason: 'Wielokrotne PROTECTION w jednej grze',
        evidence: { count },
      }),
    );
};

const investigateCardCountOscillation: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const player of ctx.players) {
    const timeline: { round: number; cards: number }[] = [];
    for (const round of ctx.rounds) {
      const snap = ctx.endSnapshots.get(round);
      const p = snap?.state.players.find((pl) => pl.id === player.id);
      if (p) timeline.push({ round, cards: p.cards.length });
    }
    if (timeline.length < 2) continue;
    let swings = 0;
    for (let i = 1; i < timeline.length; i++) {
      if (Math.abs(timeline[i].cards - timeline[i - 1].cards) >= 3) swings++;
    }
    if (swings < 2) continue;
    out.push(
      mkFinding(ctx, {
        issueType: 'CardCountOscillation',
        severity: 'INFO',
        confidence: 60,
        round: null,
        playerId: player.id,
        summary: `${player.name}: niestabilna liczba kart między rundami`,
        reason: 'Duże wahania card count w END_ROUND',
        evidence: { timeline, swings },
      }),
    );
  }
  return out;
};

const investigateSnapshotDrift: InvestigatorFn = (ctx) => {
  const out: InvestigationFindingInsert[] = [];
  for (const round of ctx.rounds) {
    const snap = ctx.endSnapshots.get(round);
    if (!snap) continue;
    for (const player of snap.state.players) {
      const rows = ctx.ledger.filter(
        (r) => r.playerId === player.id && r.round <= round,
      );
      if (rows.length === 0) continue;
      const last = rows[rows.length - 1];
      if (last.after === player.gold) continue;
      out.push(
        mkFinding(ctx, {
          issueType: 'SnapshotDrift',
          severity: 'ERROR',
          confidence: 92,
          round,
          playerId: player.id,
          summary: `${player.name}: snapshot ${player.gold} ≠ ledger ${last.after}`,
          reason: 'Rozjazd END_ROUND snapshot vs ostatni gold ledger do końca rundy',
          evidence: { snapshotGold: player.gold, ledgerGold: last.after },
        }),
      );
    }
  }
  return out;
};

const ROUND_INVESTIGATORS: InvestigatorFn[] = [
  investigateLargeGoldSwing,
  investigateGoldExplosion,
  investigateRepeatedBuildFailure,
  investigateTooManyBlockedActions,
];

const GAME_INVESTIGATORS: InvestigatorFn[] = [
  investigateTaxNeverApplied,
  investigateNoRandomEvents,
  investigateProfessionBonusNeverReceived,
  investigateRepeatedProfessionSkip,
  investigatePlayerNeverDraws,
  investigateUnusedProfession,
  investigateRepeatedProtection,
  investigateBuildingCostMismatchTrend,
  investigateCardCountOscillation,
  investigateSnapshotDrift,
];

/**
 * Investigation Engine — wykrywa podejrzane wzorce zachowania gry.
 * Validator: czy dane są spójne? Investigation: czy gra wygląda podejrzanie?
 */
@Injectable()
export class InvestigationEngine {
  constructor(
    private readonly queries: AuditQueries,
    private readonly storage: AuditStorage,
  ) { }

  investigateRound(gameId: string, round: number): InvestigationRoundResult {
    const ctx = this.buildContext(gameId, [round]);
    const inserts = ROUND_INVESTIGATORS.flatMap((fn) => fn(ctx));
    this.storage.writeInvestigationFindings(inserts);
    const findings = this.queries.getInvestigationFindings(gameId, round);
    return {
      gameId,
      round,
      findings,
      suspicious: findings.some((f) => f.severity !== 'INFO'),
    };
  }

  investigateGame(gameId: string): InvestigationGameResult {
    const ctx = this.buildContext(gameId);
    const inserts = GAME_INVESTIGATORS.flatMap((fn) => fn(ctx));
    this.storage.writeInvestigationFindings(inserts);
    const all = this.queries.getInvestigationFindings(gameId);
    const bySeverity: Record<InvestigationSeverity, number> = {
      INFO: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0,
    };
    for (const f of all) bySeverity[f.severity]++;
    return {
      gameId,
      findings: all,
      suspicious: all.some((f) => f.severity !== 'INFO'),
      bySeverity,
    };
  }

  private buildContext(
    gameId: string,
    roundFilter?: number[],
  ): InvestigationContext {
    const game = this.queries.getGame(gameId);
    const players = game?.players ?? [];
    const playerNames = new Map(players.map((p) => [p.id, p.name]));

    const events =
      roundFilter !== undefined
        ? roundFilter.flatMap((r) => this.queries.getEvents(gameId, { round: r }))
        : this.queries.getEvents(gameId);

    const rounds =
      roundFilter ?? [...new Set(events.map((e) => e.round))].sort((a, b) => a - b);

    const eventsByRound = new Map<number, AuditEventDto[]>();
    for (const event of events) {
      const list = eventsByRound.get(event.round) ?? [];
      list.push(event);
      eventsByRound.set(event.round, list);
    }

    const ledger = this.queries.getGoldHistory(gameId);
    const ledgerByRound = new Map<number, AuditGoldEntryDto[]>();
    for (const row of ledger) {
      const list = ledgerByRound.get(row.round) ?? [];
      list.push(row);
      ledgerByRound.set(row.round, list);
    }

    const endSnapshots = new Map<number, AuditSnapshotDto>();
    for (const snap of this.queries.getSnapshots(gameId)) {
      if (snap.label === 'END_ROUND') endSnapshots.set(snap.round, snap);
    }

    return {
      gameId,
      players,
      playerNames,
      events,
      eventsByRound,
      ledger,
      ledgerByRound,
      endSnapshots,
      rounds,
    };
  }
}
