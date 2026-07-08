import { Injectable } from '@nestjs/common';
import { GameState, Player, PlayerAction, BUILDING_DATA, PROFESSION_DATA } from '@figlolandia/game-core';
import { NarrativeEvent } from '../websocket/ws.types';

/**
 * Serwis generujący wydarzenia narratora na podstawie rozstrzygniętych akcji
 */
@Injectable()
export class NarrativeService {
  /**
   * Generuje wydarzenia narratora na podstawie stanu przed i po rozstrzygnięciu
   */
  generateNarrativeEvents(
    beforeState: GameState,
    afterState: GameState,
    actions: Map<string, PlayerAction[]>
  ): NarrativeEvent[] {
    const events: NarrativeEvent[] = [];
    const timestamp = Date.now();

    // Sortuj graczy według kolejności rozstrzygania
    const sortedPlayers = [...afterState.players].sort((a, b) => a.order - b.order);

    for (const player of sortedPlayers) {
      const playerActions = actions.get(player.id) || [];
      const beforePlayer = beforeState.players.find((p) => p.id === player.id);
      if (!beforePlayer) continue;

      // Sprawdź budowy
      const buildActions = playerActions.filter((a) => a.type === 'build');
      for (const buildAction of buildActions) {
        if (buildAction.buildingType) {
          const buildingData = BUILDING_DATA[buildAction.buildingType];
          const afterBuilding = afterState.players
            .find((p) => p.id === player.id)
            ?.buildings.find((b) => b.type === buildAction.buildingType);

          if (afterBuilding) {
            // Oblicz koszt budowy
            const card = buildAction.cardId
              ? beforePlayer.cards.find((c) => c.id === buildAction.cardId)
              : null;
            const cost = buildAction.buildingValue ||
              (card ? card.buildingValue : null) ||
              buildingData.valueRange[0];

            // Sprawdź czy zastosowano zniżki
            let finalCost = cost;
            if (player.profession === 'opportunity_hunter') {
              finalCost = Math.max(0, finalCost - 2);
            }

            events.push({
              type: 'build',
              playerId: player.id,
              playerName: player.name,
              profession: player.profession || undefined,
              data: {
                buildingType: buildAction.buildingType,
                buildingName: buildingData.name,
                cost: finalCost,
                buildingId: afterBuilding.id,
              },
              timestamp: timestamp + events.length * 10, // Małe opóźnienie między wydarzeniami
            });
          }
        }
      }

      // Sprawdź użycie zdolności zawodowych
      const professionActions = playerActions.filter(
        (a) => a.type === 'use_profession' && a.professionAbility
      );
      for (const profAction of professionActions) {
        if (!player.profession) continue;

        const professionData = PROFESSION_DATA[player.profession];
        if (!professionData) continue;

        // Generuj wydarzenie w zależności od zawodu
        switch (player.profession) {
          case 'architect':
            if (profAction.buildingCategory && profAction.buildingType) {
              const buildingData = BUILDING_DATA[profAction.buildingType];
              events.push({
                type: 'architect_change_category',
                playerId: player.id,
                playerName: player.name,
                profession: player.profession,
                data: {
                  buildingType: profAction.buildingType,
                  buildingName: buildingData.name,
                  oldCategory: buildingData.category,
                  newCategory: profAction.buildingCategory,
                },
                timestamp: timestamp + events.length * 10,
              });
            }
            break;

          case 'thief':
            if (profAction.target) {
              const target = afterState.players.find((p) => p.id === profAction.target);
              if (target) {
                events.push({
                  type: 'theft',
                  playerId: player.id,
                  playerName: player.name,
                  profession: player.profession,
                  data: {
                    targetId: profAction.target,
                    targetName: target.name,
                    theftType: profAction.theftTarget || 'gold',
                  },
                  timestamp: timestamp + events.length * 10,
                });
              }
            }
            break;

          case 'vandal':
            if (profAction.target) {
              const target = afterState.players.find((p) => p.id === profAction.target);
              if (target) {
                events.push({
                  type: 'vandal',
                  playerId: player.id,
                  playerName: player.name,
                  profession: player.profession,
                  data: {
                    targetId: profAction.target,
                    targetName: target.name,
                  },
                  timestamp: timestamp + events.length * 10,
                });
              }
            }
            break;

          case 'inspector':
            if (profAction.target) {
              const target = afterState.players.find((p) => p.id === profAction.target);
              if (target && target.deferredBuildActions.length > 0) {
                events.push({
                  type: 'inspector',
                  playerId: player.id,
                  playerName: player.name,
                  profession: player.profession,
                  data: {
                    targetId: profAction.target,
                    targetName: target.name,
                  },
                  timestamp: timestamp + events.length * 10,
                });
              }
            }
            break;

          case 'lucky':
            if (afterState.players.find((p) => p.id === player.id)!.gold > beforePlayer.gold) {
              events.push({
                type: 'lucky',
                playerId: player.id,
                playerName: player.name,
                profession: player.profession,
                data: {
                  goldGained: afterState.players.find((p) => p.id === player.id)!.gold - beforePlayer.gold,
                },
                timestamp: timestamp + events.length * 10,
              });
            }
            break;

          case 'diplomat':
            events.push({
              type: 'diplomat',
              playerId: player.id,
              playerName: player.name,
              profession: player.profession,
              data: {},
              timestamp: timestamp + events.length * 10,
            });
            break;

          case 'urbanist': {
            const afterPlayer = afterState.players.find((p) => p.id === player.id);
            const boostedBuilding = afterPlayer?.buildings.find((afterBuilding) => {
              const beforeBuilding = beforePlayer.buildings.find((b) => b.id === afterBuilding.id);
              return beforeBuilding && afterBuilding.value > beforeBuilding.value;
            });
            const newBuildingWithBoost =
              afterPlayer &&
              afterPlayer.buildings.length > beforePlayer.buildings.length &&
              afterPlayer.buildings[afterPlayer.buildings.length - 1];

            events.push({
              type: 'urbanist',
              playerId: player.id,
              playerName: player.name,
              profession: player.profession,
              data: {
                buildingName: boostedBuilding
                  ? BUILDING_DATA[boostedBuilding.type].name
                  : newBuildingWithBoost
                    ? BUILDING_DATA[newBuildingWithBoost.type].name
                    : undefined,
              },
              timestamp: timestamp + events.length * 10,
            });
            break;
          }

          case 'saboteur':
            if (profAction.target) {
              const target = afterState.players.find((p) => p.id === profAction.target);
              if (target) {
                events.push({
                  type: 'saboteur',
                  playerId: player.id,
                  playerName: player.name,
                  profession: player.profession,
                  data: {
                    targetId: profAction.target,
                    targetName: target.name,
                  },
                  timestamp: timestamp + events.length * 10,
                });
              }
            }
            break;

          case 'politician':
            if (profAction.taxedCategory) {
              events.push({
                type: 'politician_tax_category',
                playerId: player.id,
                playerName: player.name,
                profession: player.profession,
                data: {
                  category: profAction.taxedCategory,
                },
                timestamp: timestamp + events.length * 10,
              });
            }
            break;

          case 'spy':
            if (profAction.target) {
              const target = afterState.players.find((p) => p.id === profAction.target);
              if (target) {
                events.push({
                  type: 'spy',
                  playerId: player.id,
                  playerName: player.name,
                  profession: player.profession,
                  data: {
                    targetId: profAction.target,
                    targetName: target.name,
                  },
                  timestamp: timestamp + events.length * 10,
                });
              }
            }
            break;

          default:
            events.push({
              type: 'profession_ability',
              playerId: player.id,
              playerName: player.name,
              profession: player.profession,
              data: {
                professionName: professionData.name,
              },
              timestamp: timestamp + events.length * 10,
            });
            break;
        }
      }
    }

    return events;
  }
}

