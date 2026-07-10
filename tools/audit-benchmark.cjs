/**
 * Benchmark pipeline audytu: czasy gry, getGameReport, replayRound.
 *
 * Uruchomienie: pnpm audit:benchmark
 */
const { writeFileSync, statSync } = require('fs');
const { join } = require('path');
const { performance } = require('perf_hooks');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/backend/dist/app.module');
const { LobbyService } = require('../apps/backend/dist/game/lobby.service');
const { GameService } = require('../apps/backend/dist/game/game.service');
const { AuditReadService } = require('../apps/backend/dist/audit/AuditReadService');
const { ReplayEngine } = require('../apps/backend/dist/audit/ReplayEngine');
const {
  runDefaultGameLoop,
  waitForAuditFlush,
  setupThreePlayerLobby,
  startGameWithConfig,
} = require('./lib/audit-game-runner.cjs');

const GAME_COUNT = Number(process.env.AUDIT_BENCH_GAMES ?? 5);
const BENCH_SEED = 9001;

const measure = async (label, fn) => {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  return { label, ms, result };
};

const runSingleGame = async (app, index) => {
  const lobby = app.get(LobbyService);
  const game = app.get(GameService);
  const auditRead = app.get(AuditReadService);
  const replay = app.get(ReplayEngine);

  const timings = [];

  const gameRun = await measure(`game_${index}`, async () => {
    const { gameId } = setupThreePlayerLobby(lobby, {
      seed: BENCH_SEED + index,
      hostId: `bench-host-${index}`,
      playerBId: `bench-b-${index}`,
      playerCId: `bench-c-${index}`,
    });
    startGameWithConfig(game, gameId, {
      maxRounds: 3,
      victoryThreshold: 50,
      eventFrequency: 50,
    });
    await runDefaultGameLoop(game, gameId);
    await waitForAuditFlush();
    return gameId;
  });
  timings.push({ label: gameRun.label, ms: gameRun.ms });

  const gameId = gameRun.result;

  const reportRun = await measure(`getGameReport_${index}`, () =>
    auditRead.getGameReport(gameId),
  );
  timings.push({ label: reportRun.label, ms: reportRun.ms });

  const report = reportRun.result;
  for (const roundAnalysis of report.rounds) {
    const round = roundAnalysis.detail.round?.roundNumber;
    if (round === undefined) continue;
    const replayRun = await measure(`replayRound_${index}_r${round}`, () =>
      replay.replayRound(gameId, round),
    );
    timings.push({ label: replayRun.label, ms: replayRun.ms });
  }

  let dbSizeBytes = null;
  const dbPath = process.env.AUDIT_DB_PATH;
  if (dbPath) {
    try {
      dbSizeBytes = statSync(dbPath).size;
    } catch {
      dbSizeBytes = null;
    }
  }

  return { gameId, timings, dbSizeBytes, health: report.health };
};

const summarize = (runs) => {
  const byLabel = new Map();
  for (const run of runs) {
    for (const t of run.timings) {
      const list = byLabel.get(t.label) ?? [];
      list.push(t.ms);
      byLabel.set(t.label, list);
    }
  }
  const summary = {};
  for (const [label, values] of byLabel.entries()) {
    const total = values.reduce((a, b) => a + b, 0);
    summary[label] = {
      count: values.length,
      totalMs: total,
      avgMs: total / values.length,
      minMs: Math.min(...values),
      maxMs: Math.max(...values),
    };
  }
  return summary;
};

const main = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const runs = [];
  for (let i = 0; i < GAME_COUNT; i++) {
    runs.push(await runSingleGame(app, i + 1));
  }

  const result = {
    generatedAt: new Date().toISOString(),
    gameCount: GAME_COUNT,
    seed: BENCH_SEED,
    auditDbPath: process.env.AUDIT_DB_PATH ?? null,
    runs,
    summary: summarize(runs),
  };

  console.log(JSON.stringify(result, null, 2));

  const outPath = join(process.cwd(), 'logs', 'benchmark-latest.json');
  try {
    writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.error(`\nWrote ${outPath}`);
  } catch (err) {
    console.error('Could not write benchmark-latest.json:', err.message);
  }

  await app.close();
};

main().catch((err) => {
  console.error('BENCHMARK FAILED:', err);
  process.exit(1);
});
