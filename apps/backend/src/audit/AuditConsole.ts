import { Injectable } from '@nestjs/common';

/**
 * Krótki, czytelny output audytu na konsolę serwera.
 * Żadnych JSON-ów — pełne dane są w SQLite.
 *
 * Wyłączany przez AUDIT_CONSOLE=0.
 */
@Injectable()
export class AuditConsole {
  private readonly enabled = process.env.AUDIT_CONSOLE !== '0';

  /** Klucze linii wypisanych w bieżącej rundzie (dedup np. "Base income"). */
  private readonly printedKeys = new Map<string, Set<string>>();

  gameHeader(gameId: string, gamePin: string): void {
    if (!this.enabled) return;
    console.log(`\nGAME ${gameId} (PIN ${gamePin})`);
  }

  roundHeader(gameId: string, round: number): void {
    if (!this.enabled) return;
    this.printedKeys.set(gameId, new Set());
    console.log(`\nROUND ${round} — ${gameId}`);
  }

  /**
   * Pojedyncza linia audytu, np. "✔ Build Park (Anna)".
   * Podanie dedupeKey powoduje wypisanie linii tylko raz na rundę.
   */
  check(gameId: string, label: string, dedupeKey?: string): void {
    if (!this.enabled) return;
    if (dedupeKey) {
      const keys = this.printedKeys.get(gameId) ?? new Set<string>();
      if (keys.has(dedupeKey)) return;
      keys.add(dedupeKey);
      this.printedKeys.set(gameId, keys);
    }
    console.log(`  \u2714 ${label}`);
  }

  /** Linia problemu, np. odrzucona akcja albo pominięta budowa. */
  problem(gameId: string, label: string): void {
    if (!this.enabled) return;
    console.log(`  \u2718 ${label}`);
  }

  validation(
    gameId: string,
    round: number,
    okCount: number,
    failedChecks: string[],
  ): void {
    if (!this.enabled) return;
    if (failedChecks.length === 0) {
      console.log(`  \u2714 Validation OK (${okCount} checks)`);
    } else {
      console.log(
        `  \u2718 Validation FAILED [round ${round}]: ${failedChecks.join(', ')}`,
      );
    }
  }

  gameFinished(gameId: string, winnerName: string | null): void {
    if (!this.enabled) return;
    console.log(
      `\nGAME FINISHED ${gameId} — winner: ${winnerName ?? 'unknown'}\n`,
    );
  }
}
