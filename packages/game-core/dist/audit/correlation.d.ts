import type { EventCorrelationLink } from './types';
/** Unikalny identyfikator zdarzenia audytowego (nie mylić z events.id w SQLite). */
export type EventUid = string;
/**
 * Łańcuch korelacji: grupuje eventy jednej operacji silnika.
 *
 * Przykład budowy:
 *   beginOperation('build') → BUILD_BOOSTED → BUILDING_FINISHED → TAX_APPLIED → endOperation()
 *
 * Każdy event dostaje eventUid; parentEventUid wskazuje poprzedni w łańcuchu;
 * correlationId jest wspólny dla całej operacji.
 */
export declare class EventCorrelation {
    private static activeCorrelationId;
    private static lastEventUid;
    static beginOperation(_label?: string): string;
    static endOperation(): void;
    static isActive(): boolean;
    /** Następny event w bieżącej operacji lub standalone. */
    static nextLink(): EventCorrelationLink;
}
