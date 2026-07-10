import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import type {
  AuditBufferEntry,
  EventRow,
  GameRow,
  GameStatus,
  GoldLedgerRow,
  RoundRow,
  InvestigationFindingInsert,
  InvestigationFindingRow,
  RuleEvaluationRow,
  SnapshotRow,
  ValidationResultInsert,
  ValidationResultRow,
} from './AuditTypes';

/**
 * Znajduje katalog główny repo (zawierający pnpm-workspace.yaml),
 * żeby baza trafiała zawsze do <repo>/logs/game-audit.sqlite,
 * niezależnie od cwd (dev: apps/backend, prod: PM2).
 */
const resolveAuditDbPath = (): string => {
  const override = process.env.AUDIT_DB_PATH;
  if (override) {
    return resolve(override);
  }

  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return join(dir, 'logs', 'game-audit.sqlite');
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return resolve(process.cwd(), 'logs', 'game-audit.sqlite');
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  game_pin TEXT NOT NULL,
  seed INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  players_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED',
  winner_player_id TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  turn_order_json TEXT,
  taxed_category TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  UNIQUE (game_id, round_number)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  phase TEXT NOT NULL,
  step TEXT NOT NULL,
  type TEXT NOT NULL,
  player_id TEXT,
  message TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL,
  event_uid TEXT,
  parent_event_uid TEXT,
  correlation_id TEXT
);

CREATE TABLE IF NOT EXISTS gold_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id),
  game_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  phase TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  gold_before INTEGER NOT NULL,
  gold_delta INTEGER NOT NULL,
  gold_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  label TEXT NOT NULL,
  state_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  events_through_id INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS validation_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL,
  details_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rule_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id),
  game_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  phase TEXT NOT NULL,
  rule TEXT NOT NULL,
  condition TEXT NOT NULL,
  expected TEXT NOT NULL,
  actual TEXT NOT NULL,
  passed INTEGER NOT NULL,
  details_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rounds_game ON rounds (game_id);
CREATE INDEX IF NOT EXISTS idx_events_game_round ON events (game_id, round);
CREATE INDEX IF NOT EXISTS idx_events_game_player ON events (game_id, player_id);
CREATE INDEX IF NOT EXISTS idx_events_game_type ON events (game_id, type);
CREATE INDEX IF NOT EXISTS idx_gold_game_round ON gold_ledger (game_id, round);
CREATE INDEX IF NOT EXISTS idx_gold_game_player ON gold_ledger (game_id, player_id);
CREATE INDEX IF NOT EXISTS idx_gold_event ON gold_ledger (event_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_game_round ON snapshots (game_id, round);
CREATE INDEX IF NOT EXISTS idx_validation_game_round ON validation_results (game_id, round);
CREATE INDEX IF NOT EXISTS idx_rules_event ON rule_evaluations (event_id);
CREATE INDEX IF NOT EXISTS idx_rules_game_round ON rule_evaluations (game_id, round);

CREATE TABLE IF NOT EXISTS investigation_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  round INTEGER,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  player_id TEXT,
  player_name TEXT,
  summary TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investigation_game ON investigation_findings (game_id);
CREATE INDEX IF NOT EXISTS idx_investigation_game_round ON investigation_findings (game_id, round);
`;

const EVENT_SELECT = `
  SELECT id, game_id AS gameId, round, phase, step, type,
         player_id AS playerId, message, payload_json AS payloadJson,
         created_at AS createdAt, event_uid AS eventUid,
         parent_event_uid AS parentEventUid, correlation_id AS correlationId
  FROM events
`;

const GOLD_SELECT = `
  SELECT id, event_id AS eventId, game_id AS gameId, round, phase,
         player_id AS playerId, player_name AS playerName,
         gold_before AS goldBefore, gold_delta AS goldDelta,
         gold_after AS goldAfter, reason, created_at AS createdAt
  FROM gold_ledger
`;

const SNAPSHOT_SELECT = `
  SELECT id, game_id AS gameId, round, label, state_json AS stateJson,
         created_at AS createdAt, events_through_id AS eventsThroughId
  FROM snapshots
`;

const GAME_SELECT = `
  SELECT id, game_pin AS gamePin, seed, config_json AS configJson,
         players_json AS playersJson, status,
         winner_player_id AS winnerPlayerId, created_at AS createdAt,
         started_at AS startedAt, finished_at AS finishedAt
  FROM games
`;

const ROUND_SELECT = `
  SELECT id, game_id AS gameId, round_number AS roundNumber,
         turn_order_json AS turnOrderJson, taxed_category AS taxedCategory,
         started_at AS startedAt, finished_at AS finishedAt
  FROM rounds
`;

const VALIDATION_SELECT = `
  SELECT id, game_id AS gameId, round, check_name AS checkName, status,
         details_json AS detailsJson, created_at AS createdAt
  FROM validation_results
`;

const RULE_SELECT = `
  SELECT id, event_id AS eventId, game_id AS gameId, round, phase,
         rule, condition, expected, actual, passed,
         details_json AS detailsJson, created_at AS createdAt
  FROM rule_evaluations
`;

const INVESTIGATION_SELECT = `
  SELECT id, game_id AS gameId, round, issue_type AS issueType,
         severity, confidence, player_id AS playerId, player_name AS playerName,
         summary, reason, evidence_json AS evidenceJson, created_at AS createdAt
  FROM investigation_findings
`;

/**
 * Jedyna warstwa z surowym SQL w projekcie.
 * Jedno połączenie better-sqlite3 na cały proces, WAL, prepared statements,
 * wszystkie zapisy wsadowe w transakcjach.
 */
@Injectable()
export class AuditStorage implements OnModuleDestroy {
  private readonly logger = new Logger(AuditStorage.name);
  private readonly db: Database.Database;

  private readonly insertEventStmt: Database.Statement;
  private readonly insertGoldStmt: Database.Statement;
  private readonly insertSnapshotStmt: Database.Statement;
  private readonly insertValidationStmt: Database.Statement;
  private readonly insertRuleStmt: Database.Statement;
  private readonly insertInvestigationStmt: Database.Statement;
  private readonly writeEntriesTx: Database.Transaction<
    (entries: AuditBufferEntry[]) => void
  >;
  private readonly writeValidationTx: Database.Transaction<
    (rows: ValidationResultInsert[]) => void
  >;
  private readonly writeInvestigationTx: Database.Transaction<
    (rows: InvestigationFindingInsert[]) => void
  >;

  constructor() {
    const dbPath = resolveAuditDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);
    this.migrateSchema();

    this.insertEventStmt = this.db.prepare(`
      INSERT INTO events (game_id, round, phase, step, type, player_id, message, payload_json, created_at, event_uid, parent_event_uid, correlation_id)
      VALUES (@gameId, @round, @phase, @step, @type, @playerId, @message, @payloadJson, @createdAt, @eventUid, @parentEventUid, @correlationId)
    `);
    this.insertGoldStmt = this.db.prepare(`
      INSERT INTO gold_ledger (event_id, game_id, round, phase, player_id, player_name, gold_before, gold_delta, gold_after, reason, created_at)
      VALUES (@eventId, @gameId, @round, @phase, @playerId, @playerName, @goldBefore, @goldDelta, @goldAfter, @reason, @createdAt)
    `);
    this.insertSnapshotStmt = this.db.prepare(`
      INSERT INTO snapshots (game_id, round, label, state_json, created_at, events_through_id)
      VALUES (@gameId, @round, @label, @stateJson, @createdAt, @eventsThroughId)
    `);
    this.insertValidationStmt = this.db.prepare(`
      INSERT INTO validation_results (game_id, round, check_name, status, details_json, created_at)
      VALUES (@gameId, @round, @checkName, @status, @detailsJson, @createdAt)
    `);
    this.insertRuleStmt = this.db.prepare(`
      INSERT INTO rule_evaluations (event_id, game_id, round, phase, rule, condition, expected, actual, passed, details_json, created_at)
      VALUES (@eventId, @gameId, @round, @phase, @rule, @condition, @expected, @actual, @passed, @detailsJson, @createdAt)
    `);
    this.insertInvestigationStmt = this.db.prepare(`
      INSERT INTO investigation_findings (game_id, round, issue_type, severity, confidence, player_id, player_name, summary, reason, evidence_json, created_at)
      VALUES (@gameId, @round, @issueType, @severity, @confidence, @playerId, @playerName, @summary, @reason, @evidenceJson, @createdAt)
    `);

    this.writeEntriesTx = this.db.transaction(
      (entries: AuditBufferEntry[]) => {
        let lastEventId = 0;
        for (const entry of entries) {
          if (entry.kind === 'snapshot') {
            const eventsThroughId =
              lastEventId > 0
                ? lastEventId
                : this.getMaxEventIdForRound(
                  entry.snapshot.gameId,
                  entry.snapshot.round,
                );
            this.insertSnapshotStmt.run({
              ...entry.snapshot,
              eventsThroughId,
            });
            continue;
          }
          const result = this.insertEventStmt.run(entry.event);
          lastEventId = Number(result.lastInsertRowid);
          if (entry.rules && entry.rules.length > 0) {
            for (const rule of entry.rules) {
              this.insertRuleStmt.run({
                ...rule,
                eventId: lastEventId,
                passed: rule.passed ? 1 : 0,
              });
            }
          }
          if (entry.kind === 'event_with_gold') {
            this.insertGoldStmt.run({
              ...entry.gold,
              eventId: lastEventId,
            });
          }
        }
      },
    );

    this.writeValidationTx = this.db.transaction(
      (rows: ValidationResultInsert[]) => {
        const createdAt = Date.now();
        for (const row of rows) {
          this.insertValidationStmt.run({ ...row, createdAt });
        }
      },
    );

    this.writeInvestigationTx = this.db.transaction(
      (rows: InvestigationFindingInsert[]) => {
        const createdAt = Date.now();
        for (const row of rows) {
          this.insertInvestigationStmt.run({ ...row, createdAt });
        }
      },
    );

    this.logger.log(`Audit DB: ${dbPath}`);
  }

  onModuleDestroy(): void {
    this.db.close();
  }

  /** Migracje inkrementalne (CREATE TABLE IF NOT EXISTS nie dodaje kolumn). */
  private migrateSchema(): void {
    const columns = this.db
      .prepare(`PRAGMA table_info(snapshots)`)
      .all() as Array<{ name: string }>;
    if (!columns.some((c) => c.name === 'events_through_id')) {
      this.db.exec(
        `ALTER TABLE snapshots ADD COLUMN events_through_id INTEGER NOT NULL DEFAULT 0`,
      );
    }
    const ruleTable = this.db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='rule_evaluations'`,
      )
      .get() as { name: string } | undefined;
    if (!ruleTable) {
      this.db.exec(`
        CREATE TABLE rule_evaluations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL REFERENCES events(id),
          game_id TEXT NOT NULL,
          round INTEGER NOT NULL,
          phase TEXT NOT NULL,
          rule TEXT NOT NULL,
          condition TEXT NOT NULL,
          expected TEXT NOT NULL,
          actual TEXT NOT NULL,
          passed INTEGER NOT NULL,
          details_json TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_rules_event ON rule_evaluations (event_id);
        CREATE INDEX idx_rules_game_round ON rule_evaluations (game_id, round);
      `);
    }
    const eventColumns = this.db
      .prepare(`PRAGMA table_info(events)`)
      .all() as Array<{ name: string }>;
    if (!eventColumns.some((c) => c.name === 'event_uid')) {
      this.db.exec(`ALTER TABLE events ADD COLUMN event_uid TEXT`);
      this.db.exec(`ALTER TABLE events ADD COLUMN parent_event_uid TEXT`);
      this.db.exec(`ALTER TABLE events ADD COLUMN correlation_id TEXT`);
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_events_correlation ON events (correlation_id)`,
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_events_event_uid ON events (event_uid)`,
      );
    }
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_events_correlation ON events (correlation_id)`,
    );
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_events_event_uid ON events (event_uid)`,
    );
    const investigationTable = this.db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='investigation_findings'`,
      )
      .get() as { name: string } | undefined;
    if (!investigationTable) {
      this.db.exec(`
        CREATE TABLE investigation_findings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id TEXT NOT NULL,
          round INTEGER,
          issue_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          confidence INTEGER NOT NULL,
          player_id TEXT,
          player_name TEXT,
          summary TEXT NOT NULL,
          reason TEXT NOT NULL,
          evidence_json TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_investigation_game ON investigation_findings (game_id);
        CREATE INDEX idx_investigation_game_round ON investigation_findings (game_id, round);
      `);
    }
  }

  // -------------------------------------------------------------------------
  // Zapis
  // -------------------------------------------------------------------------

  writeEntries(entries: AuditBufferEntry[]): void {
    if (entries.length === 0) return;
    this.writeEntriesTx(entries);
  }

  writeValidationResults(rows: ValidationResultInsert[]): void {
    if (rows.length === 0) return;
    this.writeValidationTx(rows);
  }

  writeInvestigationFindings(rows: InvestigationFindingInsert[]): void {
    if (rows.length === 0) return;
    this.writeInvestigationTx(rows);
  }

  insertGame(row: {
    gameId: string;
    gamePin: string;
    seed: number;
    configJson: string;
    playersJson: string;
    createdAt: number;
  }): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO games (id, game_pin, seed, config_json, players_json, status, created_at)
         VALUES (@gameId, @gamePin, @seed, @configJson, @playersJson, 'CREATED', @createdAt)`,
      )
      .run(row);
  }

  updateGamePlayers(gameId: string, playersJson: string): void {
    this.db
      .prepare(`UPDATE games SET players_json = ? WHERE id = ?`)
      .run(playersJson, gameId);
  }

  markGameStarted(
    gameId: string,
    configJson: string,
    playersJson: string,
    startedAt: number,
  ): void {
    this.db
      .prepare(
        `UPDATE games SET status = 'IN_PROGRESS', config_json = ?, players_json = ?, started_at = ? WHERE id = ?`,
      )
      .run(configJson, playersJson, startedAt, gameId);
  }

  markGameFinished(
    gameId: string,
    winnerPlayerId: string | null,
    finishedAt: number,
  ): void {
    this.db
      .prepare(
        `UPDATE games SET status = 'FINISHED', winner_player_id = ?, finished_at = ? WHERE id = ?`,
      )
      .run(winnerPlayerId, finishedAt, gameId);
  }

  insertRound(gameId: string, roundNumber: number, startedAt: number): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO rounds (game_id, round_number, started_at) VALUES (?, ?, ?)`,
      )
      .run(gameId, roundNumber, startedAt);
  }

  setRoundTurnOrder(
    gameId: string,
    roundNumber: number,
    turnOrderJson: string,
  ): void {
    this.db
      .prepare(
        `UPDATE rounds SET turn_order_json = ? WHERE game_id = ? AND round_number = ?`,
      )
      .run(turnOrderJson, gameId, roundNumber);
  }

  finishRound(
    gameId: string,
    roundNumber: number,
    taxedCategory: string | null,
    finishedAt: number,
  ): void {
    this.db
      .prepare(
        `UPDATE rounds SET taxed_category = ?, finished_at = ? WHERE game_id = ? AND round_number = ?`,
      )
      .run(taxedCategory, finishedAt, gameId, roundNumber);
  }

  // -------------------------------------------------------------------------
  // Odczyt (używany wyłącznie przez AuditQueries)
  // -------------------------------------------------------------------------

  getGame(gameId: string): GameRow | undefined {
    return this.db
      .prepare<[string], GameRow>(`${GAME_SELECT} WHERE id = ?`)
      .get(gameId);
  }

  getGames(): GameRow[] {
    return this.db
      .prepare<[], GameRow>(`${GAME_SELECT} ORDER BY created_at DESC`)
      .all();
  }

  getRounds(gameId: string): RoundRow[] {
    return this.db
      .prepare<
        [string],
        RoundRow
      >(`${ROUND_SELECT} WHERE game_id = ? ORDER BY round_number ASC`)
      .all(gameId);
  }

  getRound(gameId: string, roundNumber: number): RoundRow | undefined {
    return this.db
      .prepare<
        [string, number],
        RoundRow
      >(`${ROUND_SELECT} WHERE game_id = ? AND round_number = ?`)
      .get(gameId, roundNumber);
  }

  getEvents(
    gameId: string,
    filter: { round?: number; playerId?: string; type?: string },
  ): EventRow[] {
    const conditions = ['game_id = @gameId'];
    const params: Record<string, string | number> = { gameId };
    if (filter.round !== undefined) {
      conditions.push('round = @round');
      params.round = filter.round;
    }
    if (filter.playerId !== undefined) {
      conditions.push('player_id = @playerId');
      params.playerId = filter.playerId;
    }
    if (filter.type !== undefined) {
      conditions.push('type = @type');
      params.type = filter.type;
    }
    return this.db
      .prepare<
        [Record<string, string | number>],
        EventRow
      >(`${EVENT_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY id ASC`)
      .all(params);
  }

  getGoldLedger(
    gameId: string,
    filter: { round?: number; playerId?: string },
  ): GoldLedgerRow[] {
    const conditions = ['game_id = @gameId'];
    const params: Record<string, string | number> = { gameId };
    if (filter.round !== undefined) {
      conditions.push('round = @round');
      params.round = filter.round;
    }
    if (filter.playerId !== undefined) {
      conditions.push('player_id = @playerId');
      params.playerId = filter.playerId;
    }
    return this.db
      .prepare<
        [Record<string, string | number>],
        GoldLedgerRow
      >(`${GOLD_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY id ASC`)
      .all(params);
  }

  getSnapshots(gameId: string, round?: number): SnapshotRow[] {
    if (round !== undefined) {
      return this.db
        .prepare<
          [string, number],
          SnapshotRow
        >(`${SNAPSHOT_SELECT} WHERE game_id = ? AND round = ? ORDER BY id ASC`)
        .all(gameId, round);
    }
    return this.db
      .prepare<
        [string],
        SnapshotRow
      >(`${SNAPSHOT_SELECT} WHERE game_id = ? ORDER BY id ASC`)
      .all(gameId);
  }

  getValidationResults(gameId: string, round?: number): ValidationResultRow[] {
    if (round !== undefined) {
      return this.db
        .prepare<
          [string, number],
          ValidationResultRow
        >(`${VALIDATION_SELECT} WHERE game_id = ? AND round = ? ORDER BY id ASC`)
        .all(gameId, round);
    }
    return this.db
      .prepare<
        [string],
        ValidationResultRow
      >(`${VALIDATION_SELECT} WHERE game_id = ? ORDER BY id ASC`)
      .all(gameId);
  }

  getSnapshotByLabel(
    gameId: string,
    round: number,
    label: string,
  ): SnapshotRow | undefined {
    return this.db
      .prepare<
        [string, number, string],
        SnapshotRow
      >(
        `${SNAPSHOT_SELECT} WHERE game_id = ? AND round = ? AND label = ? ORDER BY id ASC LIMIT 1`,
      )
      .get(gameId, round, label);
  }

  getSnapshotById(gameId: string, snapshotId: number): SnapshotRow | undefined {
    return this.db
      .prepare<[string, number], SnapshotRow>(
        `${SNAPSHOT_SELECT} WHERE game_id = ? AND id = ?`,
      )
      .get(gameId, snapshotId);
  }

  /** Zdarzenia w oknie czasowym (afterExclusive < created_at <= beforeInclusive). */
  getEventsBetweenCreatedAt(
    gameId: string,
    round: number,
    afterExclusive: number,
    beforeInclusive: number,
  ): EventRow[] {
    return this.db
      .prepare<[string, number, number, number], EventRow>(
        `${EVENT_SELECT}
         WHERE game_id = ? AND round = ?
           AND created_at > ? AND created_at <= ?
         ORDER BY id ASC`,
      )
      .all(gameId, round, afterExclusive, beforeInclusive);
  }

  /**
   * Zdarzenia między dwoma snapshotami — po monotonicznym id (niezawodniejsze niż createdAt).
   * (fromBoundaryId, toBoundaryId] gdzie boundary = max event id przy danym snapshotcie.
   */
  getEventsBetweenIds(
    gameId: string,
    round: number,
    afterEventId: number,
    beforeEventIdInclusive: number,
  ): EventRow[] {
    if (beforeEventIdInclusive <= afterEventId) return [];
    return this.db
      .prepare<[string, number, number, number], EventRow>(
        `${EVENT_SELECT}
         WHERE game_id = ? AND round = ?
           AND id > ? AND id <= ?
         ORDER BY id ASC`,
      )
      .all(gameId, round, afterEventId, beforeEventIdInclusive);
  }

  getMaxEventIdAtOrBefore(
    gameId: string,
    round: number,
    createdAt: number,
  ): number {
    const row = this.db
      .prepare<[string, number, number], { maxId: number | null }>(
        `SELECT MAX(id) AS maxId FROM events
         WHERE game_id = ? AND round = ? AND created_at <= ?`,
      )
      .get(gameId, round, createdAt);
    return row?.maxId ?? 0;
  }

  getMaxEventIdForRound(gameId: string, round: number): number {
    const row = this.db
      .prepare<[string, number], { maxId: number | null }>(
        `SELECT MAX(id) AS maxId FROM events WHERE game_id = ? AND round = ?`,
      )
      .get(gameId, round);
    return row?.maxId ?? 0;
  }

  getGoldLedgerForEventIds(eventIds: number[]): GoldLedgerRow[] {
    if (eventIds.length === 0) return [];
    const placeholders = eventIds.map(() => '?').join(',');
    return this.db
      .prepare<unknown[], GoldLedgerRow>(
        `${GOLD_SELECT} WHERE event_id IN (${placeholders}) ORDER BY id ASC`,
      )
      .all(...eventIds);
  }

  getGoldLedgerBetweenCreatedAt(
    gameId: string,
    round: number,
    afterExclusive: number,
    beforeInclusive: number,
  ): GoldLedgerRow[] {
    return this.db
      .prepare<[string, number, number, number], GoldLedgerRow>(
        `${GOLD_SELECT}
         WHERE game_id = ? AND round = ?
           AND created_at > ? AND created_at <= ?
         ORDER BY id ASC`,
      )
      .all(gameId, round, afterExclusive, beforeInclusive);
  }

  getRuleEvaluationsForEvent(eventId: number): RuleEvaluationRow[] {
    return this.db
      .prepare<[number], RuleEvaluationRow>(
        `${RULE_SELECT} WHERE event_id = ? ORDER BY id ASC`,
      )
      .all(eventId);
  }

  getRuleEvaluations(
    gameId: string,
    round?: number,
  ): RuleEvaluationRow[] {
    if (round !== undefined) {
      return this.db
        .prepare<[string, number], RuleEvaluationRow>(
          `${RULE_SELECT} WHERE game_id = ? AND round = ? ORDER BY id ASC`,
        )
        .all(gameId, round);
    }
    return this.db
      .prepare<[string], RuleEvaluationRow>(
        `${RULE_SELECT} WHERE game_id = ? ORDER BY id ASC`,
      )
      .all(gameId);
  }

  getRuleEvaluationsForEventIds(eventIds: number[]): RuleEvaluationRow[] {
    if (eventIds.length === 0) return [];
    const placeholders = eventIds.map(() => '?').join(',');
    return this.db
      .prepare<unknown[], RuleEvaluationRow>(
        `${RULE_SELECT} WHERE event_id IN (${placeholders}) ORDER BY id ASC`,
      )
      .all(...eventIds);
  }

  getEventsByCorrelationId(
    gameId: string,
    correlationId: string,
  ): EventRow[] {
    return this.db
      .prepare<[string, string], EventRow>(
        `${EVENT_SELECT} WHERE game_id = ? AND correlation_id = ? ORDER BY id ASC`,
      )
      .all(gameId, correlationId);
  }

  getCorrelationIdsForRound(gameId: string, round: number): string[] {
    const rows = this.db
      .prepare<[string, number], { correlationId: string }>(
        `SELECT correlation_id AS correlationId FROM events
         WHERE game_id = ? AND round = ? AND correlation_id IS NOT NULL
         GROUP BY correlation_id
         ORDER BY MIN(id) ASC`,
      )
      .all(gameId, round);
    return rows.map((r) => r.correlationId);
  }

  getEventByUid(gameId: string, eventUid: string): EventRow | undefined {
    return this.db
      .prepare<[string, string], EventRow>(
        `${EVENT_SELECT} WHERE game_id = ? AND event_uid = ?`,
      )
      .get(gameId, eventUid);
  }

  getInvestigationFindings(
    gameId: string,
    round?: number,
  ): InvestigationFindingRow[] {
    if (round !== undefined) {
      return this.db
        .prepare<[string, number], InvestigationFindingRow>(
          `${INVESTIGATION_SELECT} WHERE game_id = ? AND round = ? ORDER BY id ASC`,
        )
        .all(gameId, round);
    }
    return this.db
      .prepare<[string], InvestigationFindingRow>(
        `${INVESTIGATION_SELECT} WHERE game_id = ? ORDER BY id ASC`,
      )
      .all(gameId);
  }
}
