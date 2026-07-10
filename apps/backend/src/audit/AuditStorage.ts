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
  created_at INTEGER NOT NULL
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
  created_at INTEGER NOT NULL
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

CREATE INDEX IF NOT EXISTS idx_rounds_game ON rounds (game_id);
CREATE INDEX IF NOT EXISTS idx_events_game_round ON events (game_id, round);
CREATE INDEX IF NOT EXISTS idx_events_game_player ON events (game_id, player_id);
CREATE INDEX IF NOT EXISTS idx_events_game_type ON events (game_id, type);
CREATE INDEX IF NOT EXISTS idx_gold_game_round ON gold_ledger (game_id, round);
CREATE INDEX IF NOT EXISTS idx_gold_game_player ON gold_ledger (game_id, player_id);
CREATE INDEX IF NOT EXISTS idx_gold_event ON gold_ledger (event_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_game_round ON snapshots (game_id, round);
CREATE INDEX IF NOT EXISTS idx_validation_game_round ON validation_results (game_id, round);
`;

const EVENT_SELECT = `
  SELECT id, game_id AS gameId, round, phase, step, type,
         player_id AS playerId, message, payload_json AS payloadJson,
         created_at AS createdAt
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
         created_at AS createdAt
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
  private readonly writeEntriesTx: Database.Transaction<
    (entries: AuditBufferEntry[]) => void
  >;
  private readonly writeValidationTx: Database.Transaction<
    (rows: ValidationResultInsert[]) => void
  >;

  constructor() {
    const dbPath = resolveAuditDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);

    this.insertEventStmt = this.db.prepare(`
      INSERT INTO events (game_id, round, phase, step, type, player_id, message, payload_json, created_at)
      VALUES (@gameId, @round, @phase, @step, @type, @playerId, @message, @payloadJson, @createdAt)
    `);
    this.insertGoldStmt = this.db.prepare(`
      INSERT INTO gold_ledger (event_id, game_id, round, phase, player_id, player_name, gold_before, gold_delta, gold_after, reason, created_at)
      VALUES (@eventId, @gameId, @round, @phase, @playerId, @playerName, @goldBefore, @goldDelta, @goldAfter, @reason, @createdAt)
    `);
    this.insertSnapshotStmt = this.db.prepare(`
      INSERT INTO snapshots (game_id, round, label, state_json, created_at)
      VALUES (@gameId, @round, @label, @stateJson, @createdAt)
    `);
    this.insertValidationStmt = this.db.prepare(`
      INSERT INTO validation_results (game_id, round, check_name, status, details_json, created_at)
      VALUES (@gameId, @round, @checkName, @status, @detailsJson, @createdAt)
    `);

    this.writeEntriesTx = this.db.transaction(
      (entries: AuditBufferEntry[]) => {
        for (const entry of entries) {
          if (entry.kind === 'snapshot') {
            this.insertSnapshotStmt.run(entry.snapshot);
            continue;
          }
          const result = this.insertEventStmt.run(entry.event);
          if (entry.kind === 'event_with_gold') {
            this.insertGoldStmt.run({
              ...entry.gold,
              eventId: Number(result.lastInsertRowid),
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

    this.logger.log(`Audit DB: ${dbPath}`);
  }

  onModuleDestroy(): void {
    this.db.close();
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
}
