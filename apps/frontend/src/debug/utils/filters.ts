import type { AuditGameSummaryDto, GameListFilters } from '@/src/types/audit';

export const applyGameListFilters = (
  games: AuditGameSummaryDto[],
  filters: GameListFilters,
): AuditGameSummaryDto[] =>
  games.filter((entry) => {
    if (filters.status && entry.game.status !== filters.status) return false;
    if (filters.suspiciousOnly && !entry.investigation.suspicious) return false;
    if (filters.validationFailed && entry.validation.failed === 0) return false;
    return true;
  });
