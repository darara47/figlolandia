"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEmitter = void 0;
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
    }
    static event(input) {
        if (!AuditEmitter.sink)
            return;
        AuditEmitter.sink.event({
            ...input,
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
        AuditEmitter.sink.goldChange({
            ...input,
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
