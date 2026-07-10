import type {
  AuditEventPayload,
  AuditEventType,
  Building,
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
  eventUid: string | null;
  parentEventUid: string | null;
  correlationId: string | null;
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
  /** Max event id w momencie zapisu snapshotu — granica segmentów replay. */
  eventsThroughId: number;
}

export interface RuleEvaluationInsert {
  gameId: string;
  round: number;
  phase: GamePhase;
  rule: string;
  condition: string;
  expected: string;
  actual: string;
  passed: boolean;
  detailsJson: string | null;
  createdAt: number;
}

/**
 * Pojedynczy wpis w buforze audytu. Wariant `event_with_gold` gwarantuje,
 * że wiersz Gold Ledger zostanie powiązany (FK) z właśnie wstawionym eventem.
 */
export type AuditBufferEntry =
  | { kind: 'event'; event: EventInsert; rules?: RuleEvaluationInsert[] }
  | {
    kind: 'event_with_gold';
    event: EventInsert;
    gold: GoldLedgerInsert;
    rules?: RuleEvaluationInsert[];
  }
  | { kind: 'snapshot'; snapshot: SnapshotInsert };

export interface ValidationResultInsert {
  gameId: string;
  round: number;
  checkName: string;
  status: ValidationStatus;
  detailsJson: string | null;
}

export type InvestigationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type InvestigationIssueType =
  | 'LargeGoldSwing'
  | 'RepeatedProfessionSkip'
  | 'RepeatedBuildFailure'
  | 'PlayerNeverDraws'
  | 'TaxNeverApplied'
  | 'NoRandomEvents'
  | 'RepeatedProtection'
  | 'GoldExplosion'
  | 'BuildingCostMismatchTrend'
  | 'UnusedProfession'
  | 'TooManyBlockedActions'
  | 'CardCountOscillation'
  | 'SnapshotDrift'
  | 'ProfessionBonusNeverReceived'
  | 'PossibleLogicAnomaly';

export interface InvestigationFindingInsert {
  gameId: string;
  round: number | null;
  issueType: InvestigationIssueType;
  severity: InvestigationSeverity;
  confidence: number;
  playerId: string | null;
  playerName: string | null;
  summary: string;
  reason: string;
  evidenceJson: string | null;
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
  eventUid: string | null;
  parentEventUid: string | null;
  correlationId: string | null;
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
  eventsThroughId: number;
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

export interface RuleEvaluationRow {
  id: number;
  eventId: number;
  gameId: string;
  round: number;
  phase: GamePhase;
  rule: string;
  condition: string;
  expected: string;
  actual: string;
  passed: number;
  detailsJson: string | null;
  createdAt: number;
}

export interface InvestigationFindingRow {
  id: number;
  gameId: string;
  round: number | null;
  issueType: InvestigationIssueType;
  severity: InvestigationSeverity;
  confidence: number;
  playerId: string | null;
  playerName: string | null;
  summary: string;
  reason: string;
  evidenceJson: string | null;
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
  eventUid: string | null;
  parentEventUid: string | null;
  correlationId: string | null;
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
  /** Ostatni event id w momencie snapshotu (0 = stary zapis, fallback po createdAt). */
  eventsThroughId: number;
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

// ---------------------------------------------------------------------------
// State Diff — porównanie dwóch snapshotów (bez surowych JSON-ów)
// ---------------------------------------------------------------------------

export interface StateScalarChange {
  path: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
}

export interface BuildingValueChange {
  buildingId: string;
  buildingType: string;
  before: number;
  after: number;
}

export interface PlayerStateDiff {
  playerId: string;
  playerName: string;
  gold?: { before: number; after: number };
  profession?: { before: string | null; after: string | null };
  cards?: { added: Card[]; removed: Card[] };
  buildings?: {
    added: Building[];
    removed: Building[];
    valueChanges: BuildingValueChange[];
  };
  flags?: StateScalarChange[];
}

export interface GameLevelDiff {
  phase?: { before: GamePhase; after: GamePhase };
  round?: { before: number; after: number };
  taxedCategory?: {
    before: string | undefined;
    after: string | undefined;
  };
  winner?: { before: string | null; after: string | null };
}

/** Czytelny wynik diff — gotowy pod timeline i dashboard. */
export interface StateDiffResult {
  gameLevel: GameLevelDiff;
  players: PlayerStateDiff[];
  /** Linie do wyświetlenia, np. "Bartek: gold 6 → 1" */
  summary: string[];
}

// ---------------------------------------------------------------------------
// Replay Engine — odtwarzanie rundy przez snapshot → eventy → snapshot
// ---------------------------------------------------------------------------

export interface ReplaySegmentEndpoint {
  snapshotId: number;
  round: number;
  label: SnapshotLabel;
  createdAt: number;
  eventsThroughId: number;
}

export interface ReplaySegmentVerification {
  goldLedgerMatchesDiff: boolean;
  issues: string[];
}

export interface ReplaySegment {
  from: ReplaySegmentEndpoint;
  to: ReplaySegmentEndpoint;
  diff: StateDiffResult;
  events: AuditEventDto[];
  goldLedger: AuditGoldEntryDto[];
  verification: ReplaySegmentVerification;
}

export type TimelineEntry =
  | {
    kind: 'snapshot';
    snapshotId: number;
    label: SnapshotLabel;
    createdAt: number;
  }
  | {
    kind: 'event';
    event: AuditEventDto;
  }
  | {
    kind: 'diff';
    fromLabel: SnapshotLabel;
    toLabel: SnapshotLabel;
    summary: string[];
  };

export interface ReplayRoundResult {
  gameId: string;
  round: number;
  segments: ReplaySegment[];
  timeline: TimelineEntry[];
}

// ---------------------------------------------------------------------------
// Rule Inspector — ocena reguł silnika powiązana z eventami
// ---------------------------------------------------------------------------

export interface RuleEvaluationDto {
  id: number;
  eventId: number;
  gameId: string;
  round: number;
  phase: GamePhase;
  rule: string;
  condition: string;
  expected: string;
  actual: string;
  passed: boolean;
  details: unknown;
  createdAt: number;
}

/** Event + drzewo decyzji — gotowe pod dashboard DevTools. */
export interface RuleInspectionEntry {
  event: AuditEventDto;
  rules: RuleEvaluationDto[];
  decision: string | null;
  allPassed: boolean;
}

export interface RuleInspectionRoundResult {
  gameId: string;
  round: number;
  entries: RuleInspectionEntry[];
  failedRules: RuleEvaluationDto[];
}

// ---------------------------------------------------------------------------
// Correlation — łańcuchy powiązanych eventów
// ---------------------------------------------------------------------------

export interface CorrelationChainDto {
  correlationId: string;
  gameId: string;
  round: number;
  events: AuditEventDto[];
  rootEventUid: string;
  leafEventUid: string;
}

// ---------------------------------------------------------------------------
// Investigation Engine — podejrzane wzorce zachowania gry
// ---------------------------------------------------------------------------

export interface InvestigationFindingDto {
  id: number;
  gameId: string;
  round: number | null;
  issueType: InvestigationIssueType;
  severity: InvestigationSeverity;
  confidence: number;
  playerId: string | null;
  playerName: string | null;
  summary: string;
  reason: string;
  evidence: unknown;
  createdAt: number;
}

export interface InvestigationRoundResult {
  gameId: string;
  round: number;
  findings: InvestigationFindingDto[];
  suspicious: boolean;
}

export interface InvestigationGameResult {
  gameId: string;
  findings: InvestigationFindingDto[];
  suspicious: boolean;
  bySeverity: Record<InvestigationSeverity, number>;
}
