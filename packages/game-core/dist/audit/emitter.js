"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEmitter = void 0;
const correlation_1 = require("./correlation");
/**
 * Most między silnikiem gry a systemem audytu.
 *
 * Silnik (RoundEngine) emituje typowane zdarzenia bez wiedzy o storage.
 * Backend rejestruje sink (GameAudit) przez `setSink`; bez sinka wszystkie
 * wywołania są no-op (np. gdy game-core jest zbundlowany na froncie).
 *
 * Kontekst (gameId, round) ustawiany jest raz przez `configure` — silnik
 * działa synchronicznie, więc konfiguracja per wywołanie jest bezpieczna.
 */
class AuditEmitter {
    static setSink(sink) {
        AuditEmitter.sink = sink;
    }
    static configure(gameId, round) {
        AuditEmitter.gameId = gameId;
        AuditEmitter.round = round;
        correlation_1.EventCorrelation.endOperation();
    }
    /** Rozpoczyna łańcuch powiązanych eventów (np. build → tax). */
    static beginOperation(label) {
        return correlation_1.EventCorrelation.beginOperation(label);
    }
    static endOperation() {
        correlation_1.EventCorrelation.endOperation();
    }
    static correlationLink() {
        return correlation_1.EventCorrelation.nextLink();
    }
    static event(input) {
        if (!AuditEmitter.sink)
            return;
        const link = AuditEmitter.correlationLink();
        AuditEmitter.sink.event({
            ...input,
            ...link,
            gameId: AuditEmitter.gameId,
            round: AuditEmitter.round,
        });
    }
    static goldChange(input) {
        if (!AuditEmitter.sink)
            return;
        const delta = input.after - input.before;
        if (delta === 0)
            return;
        const link = AuditEmitter.correlationLink();
        AuditEmitter.sink.goldChange({
            ...input,
            ...link,
            gameId: AuditEmitter.gameId,
            round: AuditEmitter.round,
            delta,
        });
    }
    static snapshot(input) {
        if (!AuditEmitter.sink)
            return;
        AuditEmitter.sink.snapshot({
            ...input,
            gameId: AuditEmitter.gameId,
            round: AuditEmitter.round,
        });
    }
}
exports.AuditEmitter = AuditEmitter;
AuditEmitter.sink = null;
AuditEmitter.gameId = '';
AuditEmitter.round = 0;
