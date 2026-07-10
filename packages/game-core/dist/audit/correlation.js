"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCorrelation = void 0;
const generateUid = () => {
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
class EventCorrelation {
    static beginOperation(_label) {
        EventCorrelation.activeCorrelationId = generateUid();
        EventCorrelation.lastEventUid = null;
        return EventCorrelation.activeCorrelationId;
    }
    static endOperation() {
        EventCorrelation.activeCorrelationId = null;
        EventCorrelation.lastEventUid = null;
    }
    static isActive() {
        return EventCorrelation.activeCorrelationId !== null;
    }
    /** Następny event w bieżącej operacji lub standalone. */
    static nextLink() {
        const eventUid = generateUid();
        if (!EventCorrelation.activeCorrelationId) {
            EventCorrelation.lastEventUid = eventUid;
            return { eventUid, parentEventUid: null, correlationId: null };
        }
        const link = {
            eventUid,
            parentEventUid: EventCorrelation.lastEventUid,
            correlationId: EventCorrelation.activeCorrelationId,
        };
        EventCorrelation.lastEventUid = eventUid;
        return link;
    }
}
exports.EventCorrelation = EventCorrelation;
EventCorrelation.activeCorrelationId = null;
EventCorrelation.lastEventUid = null;
