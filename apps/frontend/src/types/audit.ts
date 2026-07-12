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

export type SerializedGameState = Omit<GameState, 'pendingActions' | 'spiedHands'> & {
  pendingActions: Record<string, PlayerAction[]>;
  spiedHands?: Record<string, Card[]>;
};

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

export interface AuditPlayerHistoryDto {
  playerId: string;
  events: AuditEventDto[];
  goldHistory: AuditGoldEntryDto[];
}

export interface AuditRoundDetailDto {
  round: AuditRoundDto | null;
  events: AuditEventDto[];
  goldLedger: AuditGoldEntryDto[];
  snapshots: AuditSnapshotDto[];
  validationResults: AuditValidationDto[];
}

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
  taxedCategory?: { before: string | undefined; after: string | undefined };
  winner?: { before: string | null; after: string | null };
}

export interface StateDiffResult {
  gameLevel: GameLevelDiff;
  players: PlayerStateDiff[];
  summary: string[];
}

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
  | { kind: 'snapshot'; snapshotId: number; label: SnapshotLabel; createdAt: number }
  | { kind: 'event'; event: AuditEventDto }
  | { kind: 'diff'; fromLabel: SnapshotLabel; toLabel: SnapshotLabel; summary: string[] };

export interface ReplayRoundResult {
  gameId: string;
  round: number;
  segments: ReplaySegment[];
  timeline: TimelineEntry[];
}

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

export interface CorrelationChainDto {
  correlationId: string;
  gameId: string;
  round: number;
  events: AuditEventDto[];
  rootEventUid: string;
  leafEventUid: string;
}

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

export interface AuditValidationSummaryDto {
  total: number;
  failed: number;
  byRound: Record<number, AuditValidationDto[]>;
}

export interface AuditRoundHealthDto {
  replayOk: boolean;
  validationOk: boolean;
  suspicious: boolean;
}

export interface AuditGameSummaryDto {
  game: AuditGameDto;
  rounds: AuditRoundDto[];
  validation: AuditValidationSummaryDto;
  investigation: InvestigationGameResult;
}

export interface AuditRoundAnalysisDto {
  detail: AuditRoundDetailDto;
  replay: ReplayRoundResult | null;
  rules: RuleInspectionRoundResult;
  correlations: CorrelationChainDto[];
  investigation: InvestigationRoundResult;
  health: AuditRoundHealthDto;
}

export interface AuditGameHealthDto {
  validationOk: boolean;
  replayOk: boolean;
  suspicious: boolean;
}

export interface AuditGameReportDto {
  summary: AuditGameSummaryDto;
  rounds: AuditRoundAnalysisDto[];
  eventCounts: Record<string, number>;
  health: AuditGameHealthDto;
}

export interface AuditEventContextDto {
  event: AuditEventDto;
  rules: RuleEvaluationDto[];
  correlationChain: CorrelationChainDto | null;
  goldLedger: AuditGoldEntryDto[];
}

export interface AuditPlayerTimelineDto {
  playerId: string;
  history: AuditPlayerHistoryDto;
  findings: InvestigationFindingDto[];
}

export interface GameListFilters {
  status?: GameStatus;
  suspiciousOnly?: boolean;
  validationFailed?: boolean;
}
