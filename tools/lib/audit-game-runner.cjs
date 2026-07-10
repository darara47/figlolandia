/**
 * Wspólna logika uruchamiania gry dla smoke / benchmark / golden games.
 */

const pickAbilityAction = (player, others) => {
  const target = others[0].id;
  switch (player.profession) {
    case 'thief':
      return {
        type: 'use_profession',
        professionAbility: true,
        target,
        theftTarget: 'gold',
      };
    case 'vandal':
    case 'saboteur':
    case 'inspector':
      return { type: 'use_profession', professionAbility: true, target };
    case 'politician':
      return {
        type: 'use_profession',
        professionAbility: true,
        taxedCategory: 'education',
      };
    default:
      return null;
  }
};

const defaultBuildAction = (player) => {
  const card = [...player.cards].sort(
    (a, b) => a.buildingValue - b.buildingValue,
  )[0];
  if (!card) return [];
  return [{
    type: 'build',
    cardId: card.id,
    buildingType: card.buildingType,
    buildingValue: card.buildingValue,
  }];
};

const runDefaultGameLoop = async (game, gameId, maxIterations = 10) => {
  let guard = 0;
  while (guard++ < maxIterations) {
    const state = game.getGameState(gameId);
    if (!state || state.phase === 'END') break;

    if (state.phase === 'PREP') {
      game.enterPlanningPhase(gameId);
      continue;
    }

    if (state.phase === 'PLANNING') {
      for (const player of state.players) {
        game.confirmBuild(gameId, player.id, defaultBuildAction(player));

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
    }
  }
};

const waitForAuditFlush = async () => {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 100));
};

const setupThreePlayerLobby = (lobby, options = {}) => {
  const hostId = options.hostId ?? 'player-anna';
  const state0 = lobby.createGame({
    hostId,
    hostName: options.hostName ?? 'Anna',
    seed: options.seed,
  });
  const gameId = state0.gameId;
  lobby.joinGame({
    gameId,
    playerId: options.playerBId ?? 'player-bartek',
    playerName: options.playerBName ?? 'Bartek',
  });
  lobby.joinGame({
    gameId,
    playerId: options.playerCId ?? 'player-celina',
    playerName: options.playerCName ?? 'Celina',
  });
  return { gameId, hostId };
};

const startGameWithConfig = (game, gameId, config = {}) => {
  game.startGame(gameId, {
    maxRounds: config.maxRounds ?? 3,
    victoryThreshold: config.victoryThreshold ?? 50,
    eventFrequency: config.eventFrequency ?? 50,
    ...config,
  });
};

module.exports = {
  pickAbilityAction,
  defaultBuildAction,
  runDefaultGameLoop,
  waitForAuditFlush,
  setupThreePlayerLobby,
  startGameWithConfig,
};
