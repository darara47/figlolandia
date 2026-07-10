import type { EventCorrelationLink } from './types';

/** Unikalny identyfikator zdarzenia audytowego (nie mylić z events.id w SQLite). */
export type EventUid = string;

const generateUid = (): EventUid => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

/**
 * Łańcuch korelacji: grupuje eventy jednej operacji silnika.
 *
 * Przykład budowy:
 *   beginOperation('build') → BUILD_BOOSTED → BUILDING_FINISHED → TAX_APPLIED → endOperation()
 *
 * Każdy event dostaje eventUid; parentEventUid wskazuje poprzedni w łańcuchu;
 * correlationId jest wspólny dla całej operacji.
 */
export class EventCorrelation {
  private static activeCorrelationId: string | null = null;
  private static lastEventUid: EventUid | null = null;

  static beginOperation(_label?: string): string {
    EventCorrelation.activeCorrelationId = generateUid();
    EventCorrelation.lastEventUid = null;
    return EventCorrelation.activeCorrelationId;
  }

  static endOperation(): void {
    EventCorrelation.activeCorrelationId = null;
    EventCorrelation.lastEventUid = null;
  }

  static isActive(): boolean {
    return EventCorrelation.activeCorrelationId !== null;
  }

  /** Następny event w bieżącej operacji lub standalone. */
  static nextLink(): EventCorrelationLink {
    const eventUid = generateUid();
    if (!EventCorrelation.activeCorrelationId) {
      EventCorrelation.lastEventUid = eventUid;
      return { eventUid, parentEventUid: null, correlationId: null };
    }
    const link: EventCorrelationLink = {
      eventUid,
      parentEventUid: EventCorrelation.lastEventUid,
      correlationId: EventCorrelation.activeCorrelationId,
    };
    EventCorrelation.lastEventUid = eventUid;
    return link;
  }
}
