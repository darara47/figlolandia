import type {
  AuditEventInput,
  AuditEventType,
  AuditGoldChangeInput,
  AuditSink,
  AuditSnapshotInput,
  EventCorrelationLink,
} from './types';
import { EventCorrelation } from './correlation';

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
    EventCorrelation.endOperation();
  }

  /** Rozpoczyna łańcuch powiązanych eventów (np. build → tax). */
  static beginOperation(label?: string): string {
    return EventCorrelation.beginOperation(label);
  }

  static endOperation(): void {
    EventCorrelation.endOperation();
  }

  private static correlationLink(): EventCorrelationLink {
    return EventCorrelation.nextLink();
  }

  static event<T extends AuditEventType>(input: AuditEventInput<T>): void {
    if (!AuditEmitter.sink) return;
    const link = AuditEmitter.correlationLink();
    AuditEmitter.sink.event({
      ...input,
      ...link,
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
    const link = AuditEmitter.correlationLink();
    AuditEmitter.sink.goldChange({
      ...input,
      ...link,
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
