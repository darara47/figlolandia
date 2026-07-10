import { Injectable } from '@nestjs/common';
import type { SnapshotLabel } from '@figlolandia/game-core';
import type {
  AuditEventDto,
  AuditGoldEntryDto,
  AuditSnapshotDto,
  ReplayRoundResult,
  ReplaySegment,
  ReplaySegmentEndpoint,
  ReplaySegmentVerification,
  StateDiffResult,
  TimelineEntry,
} from './AuditTypes';
import { AuditQueries } from './AuditQueries';
import { StateDiff } from './StateDiff';

/** Kolejność snapshotów w rundzie — zgodna z emisją w RoundEngine + GameService. */
export const SNAPSHOT_LABEL_ORDER: SnapshotLabel[] = [
  'BEFORE_PREPARATION',
  'AFTER_PREPARATION',
  'AFTER_ABILITIES',
  'AFTER_BUILD',
  'AFTER_THEFT',
  'AFTER_END_ABILITIES',
  'END_ROUND',
];

const labelIndex = (label: SnapshotLabel): number =>
  SNAPSHOT_LABEL_ORDER.indexOf(label);

/**
 * Replay Engine — odtwarza przebieg rundy przez łańcuch:
 * snapshot → eventy → snapshot → …
 *
 * Nie mutuje prawdziwej gry. Porównuje kolejne snapshoty (StateDiff)
 * i wiąże zdarzenia + Gold Ledger z każdym segmentem.
 * Gotowe pod time-travel debug i przyszły dashboard (timeline).
 */
@Injectable()
export class ReplayEngine {
  constructor(private readonly queries: AuditQueries) { }

  /** Diff między dwoma etykietami snapshotów w tej samej rundzie. */
  diffSnapshots(
    gameId: string,
    round: number,
    fromLabel: SnapshotLabel,
    toLabel: SnapshotLabel,
  ): StateDiffResult | null {
    const from = this.queries.getSnapshotByLabel(gameId, round, fromLabel);
    const to = this.queries.getSnapshotByLabel(gameId, round, toLabel);
    if (!from || !to) return null;
    return StateDiff.diff(from.state, to.state);
  }

  /**
   * Pełny replay rundy: segmenty między kolejnymi snapshotami
   * + timeline (snapshot → eventy → diff → …).
   */
  replayRound(gameId: string, round: number): ReplayRoundResult | null {
    const snapshots = this.queries
      .getSnapshots(gameId, round)
      .slice()
      .sort(
        (a, b) =>
          labelIndex(a.label) - labelIndex(b.label) ||
          a.createdAt - b.createdAt,
      );

    if (snapshots.length === 0) return null;

    const segments = this.buildSegments(gameId, round, snapshots);
    const timeline = this.buildTimeline(snapshots, segments);

    return { gameId, round, segments, timeline };
  }

  /**
   * Time travel: od wskazanego snapshotu do końca rundy.
   * Np. loadSnapshot(round, AFTER_BUILD) + eventy aż do END_ROUND.
   */
  replayFrom(
    gameId: string,
    round: number,
    fromLabel: SnapshotLabel,
  ): ReplayRoundResult | null {
    const snapshots = this.queries
      .getSnapshots(gameId, round)
      .slice()
      .sort(
        (a, b) =>
          labelIndex(a.label) - labelIndex(b.label) ||
          a.createdAt - b.createdAt,
      );

    const startIdx = snapshots.findIndex((s) => s.label === fromLabel);
    if (startIdx === -1) return null;

    const slice = snapshots.slice(startIdx);
    const segments = this.buildSegments(gameId, round, slice);
    const timeline = this.buildTimeline(slice, segments);

    return { gameId, round, segments, timeline };
  }

  /** Replay od konkretnego wiersza snapshotu (po id z bazy). */
  replayFromSnapshotId(
    gameId: string,
    snapshotId: number,
  ): ReplayRoundResult | null {
    const snapshot = this.queries.getSnapshotById(gameId, snapshotId);
    if (!snapshot) return null;
    return this.replayFrom(gameId, snapshot.round, snapshot.label);
  }

  private buildSegments(
    gameId: string,
    round: number,
    orderedSnapshots: AuditSnapshotDto[],
  ): ReplaySegment[] {
    const segments: ReplaySegment[] = [];

    for (let i = 0; i < orderedSnapshots.length - 1; i++) {
      const fromSnap = orderedSnapshots[i];
      const toSnap = orderedSnapshots[i + 1];
      const { events, goldLedger } = this.queries.getSegmentData(
        gameId,
        round,
        fromSnap,
        toSnap,
      );
      const diff = StateDiff.diff(fromSnap.state, toSnap.state);
      const verification = this.verifySegment(diff, goldLedger);

      segments.push({
        from: this.toEndpoint(fromSnap),
        to: this.toEndpoint(toSnap),
        diff,
        events,
        goldLedger,
        verification,
      });
    }

    return segments;
  }

  private verifySegment(
    diff: StateDiffResult,
    ledger: AuditGoldEntryDto[],
  ): ReplaySegmentVerification {
    const issues: string[] = [];
    const ledgerByPlayer = new Map<string, number>();

    for (const row of ledger) {
      ledgerByPlayer.set(
        row.playerId,
        (ledgerByPlayer.get(row.playerId) ?? 0) + row.delta,
      );
    }

    for (const playerDiff of diff.players) {
      if (!playerDiff.gold) continue;
      const expectedDelta = playerDiff.gold.after - playerDiff.gold.before;
      const ledgerDelta = ledgerByPlayer.get(playerDiff.playerId) ?? 0;
      if (ledgerDelta !== expectedDelta) {
        issues.push(
          `${playerDiff.playerName}: diff gold Δ${expectedDelta}, ledger sum Δ${ledgerDelta}`,
        );
      }
    }

    return {
      goldLedgerMatchesDiff: issues.length === 0,
      issues,
    };
  }

  private buildTimeline(
    snapshots: AuditSnapshotDto[],
    segments: ReplaySegment[],
  ): TimelineEntry[] {
    const timeline: TimelineEntry[] = [];

    for (let i = 0; i < snapshots.length; i++) {
      const snap = snapshots[i];
      timeline.push({
        kind: 'snapshot',
        snapshotId: snap.id,
        label: snap.label,
        createdAt: snap.createdAt,
      });

      const segment = segments[i];
      if (!segment) continue;

      for (const event of segment.events) {
        timeline.push({ kind: 'event', event });
      }

      if (segment.diff.summary.length > 0) {
        timeline.push({
          kind: 'diff',
          fromLabel: segment.from.label,
          toLabel: segment.to.label,
          summary: segment.diff.summary,
        });
      }
    }

    return timeline;
  }

  private toEndpoint(snap: AuditSnapshotDto): ReplaySegmentEndpoint {
    return {
      snapshotId: snap.id,
      round: snap.round,
      label: snap.label,
      createdAt: snap.createdAt,
      eventsThroughId: snap.eventsThroughId,
    };
  }
}
