import { useQuery } from '@tanstack/react-query';
import { AuditApiError, auditApi } from '@/src/services/audit-api';
import { applyGameListFilters } from '@/src/debug/utils/filters';
import type { GameListFilters } from '@/src/types/audit';

export const auditQueryKeys = {
  games: (filters?: GameListFilters) => ['audit', 'games', filters] as const,
  gameReport: (gameId: string) => ['audit', 'game', gameId, 'report'] as const,
  gameSummary: (gameId: string) => ['audit', 'game', gameId, 'summary'] as const,
  roundAnalysis: (gameId: string, round: number) =>
    ['audit', 'game', gameId, 'round', round] as const,
  eventContext: (gameId: string, eventId: number) =>
    ['audit', 'game', gameId, 'event', eventId] as const,
  playerTimeline: (gameId: string, playerId: string) =>
    ['audit', 'game', gameId, 'player', playerId] as const,
};

const queryDefaults = {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
};

export const useGameList = (filters: GameListFilters = {}) => {
  const query = useQuery({
    queryKey: auditQueryKeys.games(filters),
    queryFn: async () => {
      const games = await auditApi.listGames(filters);
      return applyGameListFilters(games, filters);
    },
    ...queryDefaults,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

export const useGameReport = (gameId: string) => {
  const query = useQuery({
    queryKey: auditQueryKeys.gameReport(gameId),
    queryFn: () => auditApi.getGameReport(gameId),
    enabled: Boolean(gameId),
    ...queryDefaults,
  });

  const notFound =
    query.isError && query.error instanceof AuditApiError && query.error.status === 404;

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError && !notFound,
    notFound,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useGameSummary = (gameId: string) => {
  const query = useQuery({
    queryKey: auditQueryKeys.gameSummary(gameId),
    queryFn: () => auditApi.getGameSummary(gameId),
    enabled: Boolean(gameId),
    ...queryDefaults,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

export const useRoundAnalysis = (gameId: string, round: number) => {
  const query = useQuery({
    queryKey: auditQueryKeys.roundAnalysis(gameId, round),
    queryFn: () => auditApi.getRoundAnalysis(gameId, round),
    enabled: Boolean(gameId) && round > 0,
    ...queryDefaults,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useEventContext = (gameId: string, eventId: number | null) => {
  const query = useQuery({
    queryKey: auditQueryKeys.eventContext(gameId, eventId ?? 0),
    queryFn: () => auditApi.getEventContext(gameId, eventId!),
    enabled: Boolean(gameId) && eventId != null && eventId > 0,
    ...queryDefaults,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

export const usePlayerTimeline = (gameId: string, playerId: string) => {
  const query = useQuery({
    queryKey: auditQueryKeys.playerTimeline(gameId, playerId),
    queryFn: () => auditApi.getPlayerTimeline(gameId, playerId),
    enabled: Boolean(gameId) && Boolean(playerId),
    ...queryDefaults,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
