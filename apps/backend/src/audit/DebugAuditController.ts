import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AuditReadService } from './AuditReadService';

/**
 * Cienki REST nad AuditReadService — zero logiki biznesowej.
 */
@ApiTags('debug-audit')
@Controller('debug/games')
export class DebugAuditController {
  constructor(private readonly auditRead: AuditReadService) { }

  @Get()
  @ApiOperation({ summary: 'Lista gier z audytu (summary)' })
  listGames() {
    return this.auditRead.listGames();
  }

  @Get(':gameId')
  @ApiOperation({ summary: 'Pełny raport audytu gry' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  getGameReport(@Param('gameId') gameId: string) {
    return this.auditRead.getGameReport(gameId);
  }

  @Get(':gameId/summary')
  @ApiOperation({ summary: 'Skrócony summary gry' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  getGameSummary(@Param('gameId') gameId: string) {
    return this.auditRead.getGameSummary(gameId);
  }

  @Get(':gameId/rounds/:round')
  @ApiOperation({ summary: 'Analiza jednej rundy' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiParam({ name: 'round', description: 'Numer rundy' })
  getRoundAnalysis(
    @Param('gameId') gameId: string,
    @Param('round', ParseIntPipe) round: number,
  ) {
    return this.auditRead.getRoundAnalysis(gameId, round);
  }

  @Get(':gameId/events/:eventId')
  @ApiOperation({ summary: 'Kontekst pojedynczego eventu' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiParam({ name: 'eventId', description: 'ID eventu w audycie' })
  getEventContext(
    @Param('gameId') gameId: string,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    try {
      return this.auditRead.getEventContext(gameId, eventId);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw err;
    }
  }

  @Get(':gameId/players/:playerId')
  @ApiOperation({ summary: 'Timeline gracza' })
  @ApiParam({ name: 'gameId', description: 'ID gry' })
  @ApiParam({ name: 'playerId', description: 'ID gracza' })
  getPlayerTimeline(
    @Param('gameId') gameId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.auditRead.getPlayerTimeline(gameId, playerId);
  }
}
