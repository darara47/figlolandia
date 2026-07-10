import { Injectable } from '@nestjs/common';
import type { CorrelationChainDto } from './AuditTypes';
import { AuditQueries } from './AuditQueries';

/**
 * Correlation Explorer — odczyt łańcuchów powiązanych eventów.
 *
 * BUILDING_FINISHED → TAX_APPLIED dzielą correlationId;
 * parentEventUid wskazuje bezpośredniego poprzednika w łańcuchu.
 */
@Injectable()
export class CorrelationExplorer {
  constructor(private readonly queries: AuditQueries) { }

  getChain(
    gameId: string,
    correlationId: string,
  ): CorrelationChainDto | null {
    return this.queries.getCorrelationChain(gameId, correlationId);
  }

  getChainsForRound(gameId: string, round: number): CorrelationChainDto[] {
    return this.queries.getCorrelationChainsForRound(gameId, round);
  }

  /** Linie do timeline: root → … → leaf */
  formatChain(chain: CorrelationChainDto): string[] {
    return chain.events.map((event, index) => {
      const arrow = index === 0 ? '' : '  ↓\n';
      const parent =
        event.parentEventUid && index > 0
          ? ` (parent: ${event.parentEventUid.slice(0, 8)}…)`
          : '';
      return `${arrow}${event.type}${parent}`;
    });
  }
}
