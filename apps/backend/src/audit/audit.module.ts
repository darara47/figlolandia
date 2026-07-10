import { Module } from '@nestjs/common';
import { AuditConsole } from './AuditConsole';
import { AuditQueries } from './AuditQueries';
import { AuditRecorder } from './AuditRecorder';
import { AuditStorage } from './AuditStorage';
import { AuditValidator } from './AuditValidator';
import { GameAudit } from './GameAudit';
import { ReplayEngine } from './ReplayEngine';
import { RuleInspector } from './RuleInspector';
import { CorrelationExplorer } from './CorrelationExplorer';
import { InvestigationEngine } from './InvestigationEngine';
import { AuditReadService } from './AuditReadService';
import { DebugAuditController } from './DebugAuditController';

/**
 * Game Audit System.
 *
 * GameAudit — fasada zapisu (eventy, gold ledger, snapshoty, walidacja).
 * AuditQueries — surowy odczyt SQL.
 * AuditReadService — composite widoki dla REST / narzędzi / UI.
 * ReplayEngine + StateDiff — analiza: time-travel, timeline, diff snapshotów.
 * RuleInspector — drzewo decyzji silnika (dlaczego, nie tylko co).
 * CorrelationExplorer — łańcuchy powiązanych eventów (eventUid / parentEventUid).
 * InvestigationEngine — podejrzane wzorce zachowania gry.
 */
@Module({
  controllers: [DebugAuditController],
  providers: [
    AuditStorage,
    AuditRecorder,
    AuditConsole,
    AuditQueries,
    AuditValidator,
    GameAudit,
    ReplayEngine,
    RuleInspector,
    CorrelationExplorer,
    InvestigationEngine,
    AuditReadService,
  ],
  exports: [
    GameAudit,
    AuditQueries,
    AuditReadService,
    ReplayEngine,
    RuleInspector,
    CorrelationExplorer,
    InvestigationEngine,
  ],
})
export class AuditModule { }
