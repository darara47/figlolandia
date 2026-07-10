/**
 * Smoke test Game Audit System: pełna gra 3 graczy przez realne serwisy
 * backendu, potem odczyt audytu przez AuditReadService.getGameReport.
 *
 * Uruchomienie: pnpm audit:smoke
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/backend/dist/app.module');
const { LobbyService } = require('../apps/backend/dist/game/lobby.service');
const { GameService } = require('../apps/backend/dist/game/game.service');
const { AuditReadService } = require('../apps/backend/dist/audit/AuditReadService');
const { CorrelationExplorer } = require('../apps/backend/dist/audit/CorrelationExplorer');
const {
  runDefaultGameLoop,
  waitForAuditFlush,
  setupThreePlayerLobby,
  startGameWithConfig,
} = require('./lib/audit-game-runner.cjs');

const main = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const lobby = app.get(LobbyService);
  const game = app.get(GameService);
  const auditRead = app.get(AuditReadService);
  const correlation = app.get(CorrelationExplorer);

  const { gameId } = setupThreePlayerLobby(lobby);
  startGameWithConfig(game, gameId, {
    maxRounds: 3,
    victoryThreshold: 50,
    eventFrequency: 50,
  });
  await runDefaultGameLoop(game, gameId);
  await waitForAuditFlush();

  const report = auditRead.getGameReport(gameId);
  const { summary } = report;

  console.log('\n================ AUDIT SMOKE REPORT ================');
  console.log('GAME:', JSON.stringify({
    gameId: summary.game.gameId,
    status: summary.game.status,
    winner: summary.game.winnerPlayerId,
    players: summary.game.players,
  }, null, 2));

  console.log('\nROUNDS:', JSON.stringify(summary.rounds.map((r) => ({
    round: r.roundNumber,
    taxedCategory: r.taxedCategory,
    turnOrder: r.turnOrder?.map((o) => o.name).join(' > '),
    finished: !!r.finishedAt,
  })), null, 2));

  console.log('\nEVENTS BY TYPE:', JSON.stringify(report.eventCounts, null, 2));

  console.log('\nGOLD LEDGER (round 1):');
  const round1 = report.rounds.find((r) => r.detail.round?.roundNumber === 1);
  if (round1) {
    for (const row of round1.detail.goldLedger) {
      console.log(
        `  [${row.phase}] ${row.playerName}: ${row.before} -> ${row.after} (${row.delta >= 0 ? '+' : ''}${row.delta}) reason=${row.reason} eventId=${row.eventId}`,
      );
    }
  }

  const snapshots = report.rounds.flatMap((r) =>
    r.detail.snapshots.map((s) => `${s.round}:${s.label}`),
  );
  console.log('\nSNAPSHOTS:', snapshots.join(', '));

  console.log('\nVALIDATION:');
  for (const results of Object.values(summary.validation.byRound)) {
    for (const v of results) {
      console.log(
        `  round ${v.round} ${v.checkName}: ${v.status}${v.status !== 'OK' ? ' ' + JSON.stringify(v.details) : ''}`,
      );
    }
  }

  const firstPlayerId = summary.game.players[0]?.id;
  if (firstPlayerId) {
    const timeline = auditRead.getPlayerTimeline(gameId, firstPlayerId);
    console.log(
      `\nPLAYER HISTORY (${summary.game.players[0].name}): ${timeline.history.events.length} events, ${timeline.history.goldHistory.length} gold entries`,
    );
  }

  if (round1) {
    console.log(
      `ROUND 1 DETAIL: ${round1.detail.events.length} events, ${round1.detail.goldLedger.length} ledger, ${round1.detail.snapshots.length} snapshots, ${round1.detail.validationResults.length} checks`,
    );

    const buildDiff = round1.replay?.segments.find(
      (s) => s.from.label === 'AFTER_ABILITIES' && s.to.label === 'AFTER_BUILD',
    );
    if (buildDiff) {
      console.log('\nSTATE DIFF (AFTER_ABILITIES → AFTER_BUILD):');
      for (const line of buildDiff.diff.summary) {
        console.log(`  ${line}`);
      }
    }

    if (round1.replay) {
      console.log(
        `\nREPLAY ROUND 1: ${round1.replay.segments.length} segments, ${round1.replay.timeline.length} timeline entries`,
      );
      for (const seg of round1.replay.segments) {
        const ok = seg.verification.goldLedgerMatchesDiff ? 'OK' : 'MISMATCH';
        console.log(
          `  ${seg.from.label} → ${seg.to.label}: ${seg.events.length} events, ${seg.goldLedger.length} ledger rows, diff lines=${seg.diff.summary.length}, verify=${ok}`,
        );
        for (const issue of seg.verification.issues) {
          console.log(`    ! ${issue}`);
        }
      }
    }

    console.log(
      `\nRULE INSPECTOR ROUND 1: ${round1.rules.entries.length} decisions, ${round1.rules.failedRules.length} failed rules`,
    );
    const buildEntry = round1.rules.entries.find(
      (e) => e.event.type === 'BUILDING_FINISHED',
    );
    if (buildEntry) {
      console.log(`\nBUILD DECISION (${buildEntry.event.message}):`);
      for (const rule of buildEntry.rules) {
        const mark = rule.passed ? '✔' : '✘';
        console.log(
          `  ${mark} ${rule.rule}: expected=${rule.expected} actual=${rule.actual} (${rule.condition})`,
        );
      }
      if (buildEntry.decision) {
        console.log(`  → Decision: ${buildEntry.decision}`);
      }
    }

    const skipEntry = round1.rules.entries.find(
      (e) => e.event.type === 'PROFESSION_SKIPPED',
    );
    if (skipEntry) {
      console.log(`\nSKIPPED PROFESSION (${skipEntry.event.message.slice(0, 60)}...):`);
      for (const rule of skipEntry.rules.filter((r) => r.rule !== 'Decision')) {
        const mark = rule.passed ? '✔' : '✘';
        console.log(`  ${mark} ${rule.rule}: ${rule.actual} (${rule.condition})`);
      }
      const decision = skipEntry.rules.find((r) => r.rule === 'Decision');
      if (decision) {
        const reason = decision.details?.reason ?? '—';
        console.log(`  → ${decision.actual} (reason: ${reason})`);
      }
    }

    const buildChain = round1.correlations.find((c) =>
      c.events.some((e) => e.type === 'BUILDING_FINISHED'),
    );
    console.log(`\nCORRELATION CHAINS ROUND 1: ${round1.correlations.length} operations`);
    if (buildChain) {
      console.log(`\nBUILD CHAIN (${buildChain.correlationId.slice(0, 8)}…):`);
      for (const line of correlation.formatChain(buildChain)) {
        console.log(`  ${line}`);
      }
      const withParent = buildChain.events.filter((e) => e.parentEventUid);
      console.log(
        `  linked events: ${buildChain.events.length}, with parent: ${withParent.length}`,
      );
    }
  }

  const inv = summary.investigation;
  console.log(
    `\nINVESTIGATION GAME: ${inv.findings.length} findings, suspicious=${inv.suspicious}`,
  );
  console.log(
    `  by severity: INFO=${inv.bySeverity.INFO} WARNING=${inv.bySeverity.WARNING} ERROR=${inv.bySeverity.ERROR} CRITICAL=${inv.bySeverity.CRITICAL}`,
  );
  for (const f of inv.findings.filter((x) => x.severity !== 'INFO').slice(0, 5)) {
    console.log(`  [${f.severity}] ${f.issueType} (${f.confidence}%): ${f.summary}`);
    console.log(`    reason: ${f.reason}`);
  }

  console.log('\nHEALTH:', JSON.stringify(report.health, null, 2));
  console.log('====================================================\n');

  await app.close();
};

main().catch((err) => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});
