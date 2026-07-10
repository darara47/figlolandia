import type { AuditEventInput, AuditEventType, AuditGoldChangeInput, AuditSink, AuditSnapshotInput } from './types';
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
export declare class AuditEmitter {
    private static sink;
    private static gameId;
    private static round;
    static setSink(sink: AuditSink | null): void;
    static configure(gameId: string, round: number): void;
    static event<T extends AuditEventType>(input: AuditEventInput<T>): void;
    static goldChange<T extends AuditEventType>(input: AuditGoldChangeInput<T>): void;
    static snapshot(input: AuditSnapshotInput): void;
}
