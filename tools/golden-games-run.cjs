/**
 * Golden Games runner — regresja silnika + spójności audytu.
 *
 * Uruchomienie:
 *   pnpm audit:golden
 *   node tools/golden-games-run.cjs --update-snapshots
 */
const { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');
const { performance } = require('perf_hooks');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/backend/dist/app.module');
const { LobbyService } = require('../apps/backend/dist/game/lobby.service');
const { GameService } = require('../apps/backend/dist/game/game.service');
const { AuditReadService } = require('../apps/backend/dist/audit/AuditReadService');
const {
  runDefaultGameLoop,
  waitForAuditFlush,
  setupThreePlayerLobby,
  startGameWithConfig,
} = require('./lib/audit-game-runner.cjs');
const {
  canonicalEndRoundSnapshots,
  hashCanonical,
  assertExpectations,
} = require('./lib/audit-expectations.cjs');

const ROOT = join(__dirname, 'golden-games');
const SCENARIOS_DIR = join(ROOT, 'scenarios');
const EXPECTATIONS_DIR = join(ROOT, 'expectations');

const args = process.argv.slice(2);
const updateSnapshots = args.includes('--update-snapshots');
const snapshotsOnly = args.includes('--snapshots-only');
const filterArg = args.find((a) => a.startsWith('--scenario='));
const scenarioFilter = filterArg ? filterArg.split('=')[1] : null;

const loadManifest = () => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, 'manifest.json'), 'utf8'),
  );
  return manifest.scenarios;
};

const loadScenario = (name) =>
  JSON.parse(readFileSync(join(SCENARIOS_DIR, `${name}.json`), 'utf8'));

const runScenario = async (scenario) => {
  const dbPath = join(tmpdir(), `audit-golden-${scenario.name}.sqlite`);
  if (existsSync(dbPath)) unlinkSync(dbPath);
  process.env.AUDIT_DB_PATH = dbPath;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const lobby = app.get(LobbyService);
  const game = app.get(GameService);
  const auditRead = app.get(AuditReadService);

  const start = performance.now();
  const { gameId } = setupThreePlayerLobby(lobby, {
    ...scenario.players,
    seed: scenario.seed,
  });
  startGameWithConfig(game, gameId, scenario.config ?? {});
  await runDefaultGameLoop(game, gameId);
  await waitForAuditFlush();
  const elapsedMs = performance.now() - start;

  const report = auditRead.getGameReport(gameId);
  await app.close();

  if (existsSync(dbPath)) unlinkSync(dbPath);

  return { gameId, report, elapsedMs };
};

const loadSnapshotExpectation = (scenarioName) => {
  const path = join(EXPECTATIONS_DIR, `${scenarioName}-snapshots.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
};

const saveSnapshotExpectation = (scenarioName, canonical, hash) => {
  mkdirSync(EXPECTATIONS_DIR, { recursive: true });
  const path = join(EXPECTATIONS_DIR, `${scenarioName}-snapshots.json`);
  writeFileSync(
    path,
    JSON.stringify({ scenario: scenarioName, hash, canonical }, null, 2),
    'utf8',
  );
  return path;
};

const assertSnapshotCompatibility = (scenarioName, report) => {
  const canonical = canonicalEndRoundSnapshots(report);
  const hash = hashCanonical(canonical);
  const expected = loadSnapshotExpectation(scenarioName);

  if (!expected) {
    return [`${scenarioName}: missing snapshot expectation file`];
  }
  if (expected.hash !== hash) {
    return [
      `${scenarioName}: snapshot hash mismatch expected ${expected.hash}, got ${hash}`,
    ];
  }
  return [];
};

const main = async () => {
  const names = loadManifest().filter(
    (n) => !scenarioFilter || n === scenarioFilter,
  );
  const results = [];
  const allErrors = [];

  for (const name of names) {
    const scenario = loadScenario(name);
    console.error(`\n--- Golden: ${name} ---`);
    const { report, elapsedMs, gameId } = await runScenario(scenario);
    const canonical = canonicalEndRoundSnapshots(report);
    const hash = hashCanonical(canonical);

    if (updateSnapshots) {
      const path = saveSnapshotExpectation(name, canonical, hash);
      console.error(`Updated snapshots: ${path}`);
    }

    let errors = [];
    if (!snapshotsOnly) {
      errors = assertExpectations(report, scenario.expect ?? {}, name);
    }
    if (!updateSnapshots) {
      errors.push(...assertSnapshotCompatibility(name, report));
    }

    if (errors.length > 0) {
      allErrors.push(...errors);
      console.error('FAIL');
      for (const err of errors) console.error(`  ! ${err}`);
    } else {
      console.error(`OK (${elapsedMs.toFixed(1)}ms, gameId=${gameId})`);
    }

    results.push({
      scenario: name,
      gameId,
      elapsedMs,
      health: report.health,
      hash,
      errors,
    });
  }

  console.log(JSON.stringify({ results, passed: allErrors.length === 0 }, null, 2));

  if (allErrors.length > 0) {
    process.exit(1);
  }
};

main().catch((err) => {
  console.error('GOLDEN GAMES FAILED:', err);
  process.exit(1);
});
