import { Module } from '@nestjs/common';
import { AuditConsole } from './AuditConsole';
import { AuditQueries } from './AuditQueries';
import { AuditRecorder } from './AuditRecorder';
import { AuditStorage } from './AuditStorage';
import { AuditValidator } from './AuditValidator';
import { GameAudit } from './GameAudit';

/**
 * Game Audit System.
 *
 * GameAudit — fasada zapisu (eventy, gold ledger, snapshoty, walidacja).
 * AuditQueries — API odczytu, gotowe pod przyszły dashboard /debug/game/:gameId,
 * eksporty CSV/JSON i REST API.
 */
@Module({
  providers: [
    AuditStorage,
    AuditRecorder,
    AuditConsole,
    AuditQueries,
    AuditValidator,
    GameAudit,
  ],
  exports: [GameAudit, AuditQueries],
})
export class AuditModule { }
