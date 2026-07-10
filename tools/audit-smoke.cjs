/**
 * Smoke test Game Audit System: pełna gra 3 graczy przez realne serwisy
 * backendu (LobbyService, GameService), potem odczyt audytu przez AuditQueries.
 *
 * Uruchomienie: node tools/audit-smoke.cjs
 */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../apps/backend/dist/app.module');
const { LobbyService } = require('../apps/backend/dist/game/lobby.service');
const { GameService } = require('../apps/backend/dist/game/game.service');
const { AuditQueries } = require('../apps/backend/dist/audit/AuditQueries');

const pickAbilityAction = (player, others) => {
  const target = others[0].id;
  switch (player.profession) {
    case 'thief':
      return { type: 'use_profession', professionAbility: true, target, theftTarget: 'gold' };
    case 'vandal':
    case 'saboteur':
    case 'inspector':
      return { type: 'use_profession', professionAbility: true, target };
    case 'politician':
      return { type: 'use_profession', professionAbility: true, taxedCategory: 'education' };
    default:
      return null; // lucky/diplomat/urbanist są auto; reszta nie wymaga wyboru
  }
};

const main = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const lobby = app.get(LobbyService);
  const game = app.get(GameService);
  const queries = app.get(AuditQueries);

  // --- LOBBY ---
  const state0 = lobby.createGame({ hostName: 'Anna' });
  const gameId = state0.gameId;
  lobby.joinGame({ gameId, playerId: 'player-bartek', playerName: 'Bartek' });
  lobby.joinGame({ gameId, playerId: 'player-celina', playerName: 'Celina' });

  // --- START (3 rundy max, żeby zobaczyć GAME_FINISHED) ---
  game.startGame(gameId, { maxRounds: 3, victoryThreshold: 50, eventFrequency: 50 });

  let guard = 0;
  while (guard++ < 10) {
    const state = game.getGameState(gameId);
    if (!state || state.phase === 'END') break;
    if (state.phase === 'PREP') {
      game.enterPlanningPhase(gameId);
      continue;
    }
    if (state.phase === 'PLANNING') {
      for (const player of state.players) {
        // Budowa: najtańsza karta z ręki
        const card = [...player.cards].sort((a, b) => a.buildingValue - b.buildingValue)[0];
        const buildActions = card
          ? [{
            type: 'build',
            cardId: card.id,
            buildingType: card.buildingType,
            buildingValue: card.buildingValue,
          }]
          : [];
        game.confirmBuild(gameId, player.id, buildActions);

        const others = state.players.filter((p) => p.id !== player.id);
        const ability = pickAbilityAction(player, others);
        if (ability) {
          const current = game.getGameState(gameId);
          if (current && current.phase === 'PLANNING') {
            game.confirmAbility(gameId, player.id, ability);
          }
        }
      }
      continue;
    }
    if (state.phase === 'RESOLUTION') {
      game.advanceFromResolution(gameId);
      continue;
    }
  }

  // Poczekaj na asynchroniczne flushe recordera
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 100));

  // --- ODCZYT AUDYTU ---
  const gameDto = queries.getGame(gameId);
  const rounds = queries.getRounds(gameId);
  const events = queries.getEvents(gameId);
  const gold = queries.getGoldHistory(gameId);
  const snapshots = queries.getSnapshots(gameId);
  const validation = queries.getValidationResults(gameId);

  const byType = {};
  for (const e of events) byType[e.type] = (byType[e.type] || 0) + 1;

  console.log('\n================ AUDIT SMOKE REPORT ================');
  console.log('GAME:', JSON.stringify({
    gameId: gameDto.gameId,
    status: gameDto.status,
    winner: gameDto.winnerPlayerId,
    players: gameDto.players,
  }, null, 2));
  console.log('\nROUNDS:', JSON.stringify(rounds.map((r) => ({
    round: r.roundNumber,
    taxedCategory: r.taxedCategory,
    turnOrder: r.turnOrder?.map((o) => o.name).join(' > '),
    finished: !!r.finishedAt,
  })), null, 2));
  console.log('\nEVENTS BY TYPE:', JSON.stringify(byType, null, 2));
  console.log('\nGOLD LEDGER (rounds 1):');
  for (const row of gold.filter((g) => g.round === 1)) {
    console.log(
      `  [${row.phase}] ${row.playerName}: ${row.before} -> ${row.after} (${row.delta >= 0 ? '+' : ''}${row.delta}) reason=${row.reason} eventId=${row.eventId}`,
    );
  }
  console.log('\nSNAPSHOTS:', snapshots.map((s) => `${s.round}:${s.label}`).join(', '));
  console.log('\nVALIDATION:');
  for (const v of validation) {
    console.log(`  round ${v.round} ${v.checkName}: ${v.status}${v.status !== 'OK' ? ' ' + JSON.stringify(v.details) : ''}`);
  }

  const history = queries.getPlayerHistory(gameId, gameDto.players[0].id);
  console.log(`\nPLAYER HISTORY (${gameDto.players[0].name}): ${history.events.length} events, ${history.goldHistory.length} gold entries`);

  const roundDetail = queries.getRound(gameId, 1);
  console.log(`ROUND 1 DETAIL: ${roundDetail.events.length} events, ${roundDetail.goldLedger.length} ledger, ${roundDetail.snapshots.length} snapshots, ${roundDetail.validationResults.length} checks`);
  console.log('====================================================\n');

  await app.close();
};

main().catch((err) => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});
