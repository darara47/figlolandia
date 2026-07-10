import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { LobbyService } from './lobby.service';
import { GameStateManager } from './game.state';
import { NarrativeService } from './narrative.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Moduł gry - zawiera wszystkie serwisy, gateway i kontrolery związane z grą
 */
@Module({
  imports: [AuditModule],
  controllers: [GameController],
  providers: [GameGateway, GameService, LobbyService, GameStateManager, NarrativeService],
  exports: [GameService, LobbyService, GameStateManager, GameGateway],
})
export class GameModule { }

