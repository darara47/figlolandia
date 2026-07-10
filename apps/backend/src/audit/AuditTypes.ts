import type {
  AuditEventPayload,
  AuditEventType,
  Card,
  GameConfig,
  GamePhase,
  GameState,
  PlayerAction,
  SnapshotLabel,
} from '@figlolandia/game-core';

export type ValidationStatus = 'OK' | 'FAIL' | 'WARN';

export type GameStatus = 'CREATED' | 'IN_PROGRESS' | 'FINISHED';

/**
 * GameState po serializacji do JSON — Mapy zamienione na zwykłe obiekty.
 */
export type SerializedGameState = Omit<
  GameState,
  'pendingActions' | 'spiedHands'
> & {
  pendingActions: Record<string, PlayerAction[]>;
  spiedHands?: Record<string, Card[]>;
};

// ---------------------------------------------------------------------------
// Kształty INSERT (buforowane przez AuditRecorder)
// ---------------------------------------------------------------------------

export interface EventInsert {
  gameId: string;
  round: number;
  phase: GamePhase;
  step: string;
  type: AuditEventType;
  playerId: string | null;
  message: string;
  payloadJson: string | null;
  createdAt: number;
}

export interface GoldLedgerInsert {
  gameId: string;
  round: number;
  phase: GamePhase;
  playerId: string;
  playerName: string;
  goldBefore: number;
  goldDelta: number;
  goldAfter: number;
  reason: string;
  createdAt: number;
}

export interface SnapshotInsert {
  gameId: string;
  round: number;
  label: SnapshotLabel;
  stateJson: string;
  createdAt: number;
}

/**
 * Pojedynczy wpis w buforze audytu. Wariant `event_with_gold` gwarantuje,
 * że wiersz Gold Ledger zostanie powiązany (FK) z właśnie wstawionym eventem.
 */
export type AuditBufferEntry =
  | { kind: 'event'; event: EventInsert }
  | { kind: 'event_with_gold'; event: EventInsert; gold: GoldLedgerInsert }
  | { kind: 'snapshot'; snapshot: SnapshotInsert };

export interface ValidationResultInsert {
  gameId: string;
  round: number;
  checkName: string;
  status: ValidationStatus;
  detailsJson: string | null;
}

// ---------------------------------------------------------------------------
// Kształty wierszy (odczyt z bazy — aliasy camelCase w SELECT)
// ---------------------------------------------------------------------------

export interface GameRow {
  id: string;
  gamePin: string;
  seed: number;
  configJson: string;
  playersJson: string;
  status: GameStatus;
  winnerPlayerId: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface RoundRow {
  id: number;
  gameId: string;
  roundNumber: number;
  turnOrderJson: string | null;
  taxedCategory: string | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface EventRow {
  id: number;
  gameId: string;
  round: number;
  phase: GamePhase;
  step: string;
  type: AuditEventType;
  playerId: string | null;
  message: string;
  payloadJson: string | null;
  createdAt: number;
}

export interface GoldLedgerRow {
  id: number;
  eventId: number;
  gameId: string;
  round: number;
  phase: GamePhase;
  playerId: string;
  playerName: string;
  goldBefore: number;
  goldDelta: number;
  goldAfter: number;
  reason: string;
  createdAt: number;
}

export interface SnapshotRow {
  id: number;
  gameId: string;
  round: number;
  label: SnapshotLabel;
  stateJson: string;
  createdAt: number;
}

export interface ValidationResultRow {
  id: number;
  gameId: string;
  round: number;
  checkName: string;
  status: ValidationStatus;
  detailsJson: string | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// DTO (AuditQueries) — payloady i snapshoty już sparsowane
// ---------------------------------------------------------------------------

export interface AuditGamePlayerBrief {
  id: string;
  name: string;
}

export interface AuditGameDto {
  gameId: string;
  gamePin: string;
  seed: number;
  config: GameConfig | null;
  players: AuditGamePlayerBrief[];
  status: GameStatus;
  winnerPlayerId: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface AuditRoundDto {
  gameId: string;
  roundNumber: number;
  turnOrder: { playerId: string; name: string; order: number }[] | null;
  taxedCategory: string | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface AuditEventDto {
  id: number;
  gameId: string;
  round: number;
  phase: GamePhase;
  step: string;
  type: AuditEventType;
  playerId: string | null;
  message: string;
  payload: AuditEventPayload | null;
  createdAt: number;
}

export interface AuditGoldEntryDto {
  id: number;
  eventId: number;
  gameId: string;
  round: number;
  phase: GamePhase;
  playerId: string;
  playerName: string;
  before: number;
  delta: number;
  after: number;
  reason: string;
  createdAt: number;
}

export interface AuditSnapshotDto {
  id: number;
  gameId: string;
  round: number;
  label: SnapshotLabel;
  state: SerializedGameState;
  createdAt: number;
}

export interface AuditValidationDto {
  id: number;
  gameId: string;
  round: number;
  checkName: string;
  status: ValidationStatus;
  details: unknown;
  createdAt: number;
}

export interface AuditEventFilter {
  round?: number;
  playerId?: string;
  type?: AuditEventType;
}

export interface AuditPlayerHistoryDto {
  playerId: string;
  events: AuditEventDto[];
  goldHistory: AuditGoldEntryDto[];
}

/** Pełny widok jednej rundy — gotowy pod dashboard /debug/game/:gameId. */
export interface AuditRoundDetailDto {
  round: AuditRoundDto | null;
  events: AuditEventDto[];
  goldLedger: AuditGoldEntryDto[];
  snapshots: AuditSnapshotDto[];
  validationResults: AuditValidationDto[];
}
