"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundEngine = void 0;
exports.generateGameId = generateGameId;
exports.generatePlayerId = generatePlayerId;
class RoundEngine {
    static resolveRound(state, actions) {
        const newState = { ...state };
        const players = [...newState.players];
        const sortedPlayers = [...players].sort((a, b) => a.order - b.order);
        this.resolveEvents(sortedPlayers, actions, newState);
        this.resolveSabotage(sortedPlayers, actions, newState);
        this.resolveTheft(sortedPlayers, actions, newState);
        this.resolveDestruction(sortedPlayers, actions, newState);
        this.resolveBuildings(sortedPlayers, actions, newState);
        newState.players = sortedPlayers;
        return newState;
    }
    static resolveEvents(players, actions, state) {
        for (const player of players) {
            const playerActions = actions.get(player.id) || [];
            const eventAction = playerActions.find((a) => a.type === 'play_event');
            if (eventAction) {
            }
        }
    }
    static resolveSabotage(players, actions, state) {
        for (const player of players) {
            const playerActions = actions.get(player.id) || [];
            const sabotageAction = playerActions.find((a) => a.type === 'sabotage');
            if (sabotageAction && sabotageAction.target) {
                const target = players.find((p) => p.id === sabotageAction.target);
                if (target) {
                }
            }
        }
    }
    static resolveTheft(players, actions, state) {
        for (const player of players) {
            const playerActions = actions.get(player.id) || [];
            const theftAction = playerActions.find((a) => a.type === 'theft');
            if (theftAction && theftAction.target) {
                const target = players.find((p) => p.id === theftAction.target);
                if (target && target.gold > 0) {
                    const stolen = Math.min(target.gold, 5);
                    target.gold -= stolen;
                    player.gold += stolen;
                }
            }
        }
    }
    static resolveDestruction(players, actions, state) {
        for (const player of players) {
            const playerActions = actions.get(player.id) || [];
            const destroyAction = playerActions.find((a) => a.type === 'destroy');
            if (destroyAction && destroyAction.target) {
                const target = players.find((p) => p.id === destroyAction.target);
                if (target && target.buildings.length > 0) {
                    target.buildings.shift();
                }
            }
        }
    }
    static resolveBuildings(players, actions, state) {
        for (const player of players) {
            const playerActions = actions.get(player.id) || [];
            const buildAction = playerActions.find((a) => a.type === 'build');
            if (buildAction && buildAction.buildingType) {
                const cost = this.getBuildingCost(buildAction.buildingType);
                if (player.gold >= cost) {
                    player.gold -= cost;
                    player.buildings.push({
                        id: `building-${Date.now()}-${Math.random()}`,
                        type: buildAction.buildingType,
                        value: this.getBuildingValue(buildAction.buildingType),
                    });
                }
            }
        }
    }
    static getBuildingCost(type) {
        const costs = {
            house: 3,
            shop: 5,
            factory: 8,
            palace: 15,
        };
        return costs[type];
    }
    static getBuildingValue(type) {
        const values = {
            house: 1,
            shop: 2,
            factory: 3,
            palace: 5,
        };
        return values[type];
    }
    static checkVictory(state) {
        const { players, config } = state;
        for (const player of players) {
            const totalValue = player.gold +
                player.buildings.reduce((sum, b) => sum + b.value, 0);
            if (totalValue >= config.victoryThreshold) {
                return player.id;
            }
        }
        if (state.round >= config.maxRounds) {
            const winner = players.reduce((best, current) => {
                const currentValue = current.gold +
                    current.buildings.reduce((sum, b) => sum + b.value, 0);
                const bestValue = best.gold + best.buildings.reduce((sum, b) => sum + b.value, 0);
                return currentValue > bestValue ? current : best;
            });
            return winner.id;
        }
        return null;
    }
}
exports.RoundEngine = RoundEngine;
function generateGameId() {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function generatePlayerId() {
    return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
//# sourceMappingURL=index.js.map