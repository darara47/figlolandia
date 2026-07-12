import { getBackendUrl } from '@/constants/Config';
import type {
  AuditEventContextDto,
  AuditGameReportDto,
  AuditGameSummaryDto,
  AuditPlayerTimelineDto,
  AuditRoundAnalysisDto,
  GameListFilters,
} from '@/src/types/audit';

export class AuditApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuditApiError';
  }
}

const fetchAudit = async <T>(path: string): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}${path}`);
  } catch {
    throw new AuditApiError('Backend niedostępny', 0);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Błąd serwera' }));
    throw new AuditApiError(error.message || 'Błąd serwera', response.status);
  }

  return response.json();
};

const buildGameListQuery = (filters?: GameListFilters): string => {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.suspiciousOnly) params.set('suspiciousOnly', 'true');
  if (filters.validationFailed) params.set('validationFailed', 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const auditApi = {
  listGames: (filters?: GameListFilters) =>
    fetchAudit<AuditGameSummaryDto[]>(`/debug/games${buildGameListQuery(filters)}`),

  getGameReport: (gameId: string) =>
    fetchAudit<AuditGameReportDto>(`/debug/games/${gameId}`),

  getGameSummary: (gameId: string) =>
    fetchAudit<AuditGameSummaryDto>(`/debug/games/${gameId}/summary`),

  getRoundAnalysis: (gameId: string, round: number) =>
    fetchAudit<AuditRoundAnalysisDto>(`/debug/games/${gameId}/rounds/${round}`),

  getEventContext: (gameId: string, eventId: number) =>
    fetchAudit<AuditEventContextDto>(`/debug/games/${gameId}/events/${eventId}`),

  getPlayerTimeline: (gameId: string, playerId: string) =>
    fetchAudit<AuditPlayerTimelineDto>(`/debug/games/${gameId}/players/${playerId}`),
};
