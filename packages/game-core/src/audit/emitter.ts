import type {
  AuditEventInput,
  AuditEventType,
  AuditGoldChangeInput,
  AuditSink,
  AuditSnapshotInput,
} from './types';

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
export class AuditEmitter {
  private static sink: AuditSink | null = null;
  private static gameId = '';
  private static round = 0;

  static setSink(sink: AuditSink | null): void {
    AuditEmitter.sink = sink;
  }

  static configure(gameId: string, round: number): void {
    AuditEmitter.gameId = gameId;
    AuditEmitter.round = round;
  }

  static event<T extends AuditEventType>(input: AuditEventInput<T>): void {
    if (!AuditEmitter.sink) return;
    AuditEmitter.sink.event({
      ...input,
      gameId: AuditEmitter.gameId,
      round: AuditEmitter.round,
    });
  }

  static goldChange<T extends AuditEventType>(
    input: AuditGoldChangeInput<T>,
  ): void {
    if (!AuditEmitter.sink) return;
    const delta = input.after - input.before;
    if (delta === 0) return;
    AuditEmitter.sink.goldChange({
      ...input,
      gameId: AuditEmitter.gameId,
      round: AuditEmitter.round,
      delta,
    });
  }

  static snapshot(input: AuditSnapshotInput): void {
    if (!AuditEmitter.sink) return;
    AuditEmitter.sink.snapshot({
      ...input,
      gameId: AuditEmitter.gameId,
      round: AuditEmitter.round,
    });
  }
}
