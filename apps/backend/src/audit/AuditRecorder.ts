import { Injectable } from '@nestjs/common';
import type { AuditBufferEntry } from './AuditTypes';
import { AuditStorage } from './AuditStorage';

/**
 * Bufor zapisu per gra.
 *
 * Zdarzenia trafiają do pamięci i są zapisywane wsadowo w jednej transakcji:
 * - przy snapshotach i przekroczeniu progu — asynchronicznie (setImmediate),
 *   żeby nie blokować pętli gry,
 * - na koniec rundy / gry — synchronicznie (flushNow), żeby walidator
 *   widział komplet danych.
 *
 * Kolejność wpisów jest zachowana: bufor jest opróżniany do kolejki FIFO,
 * a zapis zawsze przetwarza całą kolejkę.
 */
@Injectable()
export class AuditRecorder {
  private static readonly FLUSH_THRESHOLD = 200;

  private readonly buffers = new Map<string, AuditBufferEntry[]>();
  private readonly pendingBatches = new Map<string, AuditBufferEntry[]>();
  private readonly scheduled = new Set<string>();

  constructor(private readonly storage: AuditStorage) { }

  record(gameId: string, entry: AuditBufferEntry): void {
    const buffer = this.buffers.get(gameId) ?? [];
    buffer.push(entry);
    this.buffers.set(gameId, buffer);

    if (
      entry.kind === 'snapshot' ||
      buffer.length >= AuditRecorder.FLUSH_THRESHOLD
    ) {
      this.scheduleFlush(gameId);
    }
  }

  /** Asynchroniczny zapis — nie blokuje bieżącej operacji gry. */
  scheduleFlush(gameId: string): void {
    this.drainBufferToPending(gameId);
    if (this.scheduled.has(gameId)) return;
    this.scheduled.add(gameId);
    setImmediate(() => this.writePending(gameId));
  }

  /** Synchroniczny zapis wszystkiego — używany przed walidacją rundy. */
  flushNow(gameId: string): void {
    this.drainBufferToPending(gameId);
    this.writePending(gameId);
  }

  private drainBufferToPending(gameId: string): void {
    const buffer = this.buffers.get(gameId);
    if (!buffer || buffer.length === 0) return;
    this.buffers.set(gameId, []);
    const pending = this.pendingBatches.get(gameId) ?? [];
    pending.push(...buffer);
    this.pendingBatches.set(gameId, pending);
  }

  private writePending(gameId: string): void {
    this.scheduled.delete(gameId);
    const pending = this.pendingBatches.get(gameId);
    if (!pending || pending.length === 0) return;
    this.pendingBatches.set(gameId, []);
    this.storage.writeEntries(pending);
  }
}
