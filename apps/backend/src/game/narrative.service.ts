import { Injectable } from '@nestjs/common';
import { GameState, Player, PlayerAction, BUILDING_DATA, PROFESSION_DATA, Profession } from '@figlolandia/game-core';
import { NarrativeEvent } from '../websocket/ws.types';

/** Zawody rozstrzygane przed budową — animowane na początku tury gracza. */
const PRE_BUILD_PROFESSIONS = new Set<Profession>([
  'lucky',
  'urbanist',
  'diplomat',
  'inspector',
  'spy',
  'politician',
]);

/** Zawody rozstrzygane po budowach — animowane na końcu tury gracza. */
const POST_BUILD_PROFESSIONS = new Set<Profession>([
  'thief',
  'vandal',
  'saboteur',
  'architect',
]);

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
    let timestamp = Date.now();

    const nextTimestamp = () => {
      timestamp += 10;
      return timestamp;
    };

    const sortedPlayers = [...afterState.players].sort((a, b) => a.order - b.order);

    for (const player of sortedPlayers) {
      const playerActions = actions.get(player.id) || [];
      const beforePlayer = beforeState.players.find((p) => p.id === player.id);
      if (!beforePlayer) continue;

      const playerEvents: NarrativeEvent[] = [];

      const professionActions = playerActions.filter(
        (a) => a.type === 'use_profession' && a.professionAbility,
      );

      for (const profAction of professionActions) {
        if (!player.profession || !PRE_BUILD_PROFESSIONS.has(player.profession)) continue;
        const event = this.createProfessionEvent(
          beforeState,
          player,
          beforePlayer,
          afterState,
          profAction,
          nextTimestamp(),
        );
        if (event) playerEvents.push(event);
      }

      const afterPlayer = afterState.players.find((p) => p.id === player.id);
      if (afterPlayer) {
        for (const afterBuilding of afterPlayer.buildings) {
          const beforeBuilding = beforePlayer.buildings.find((b) => b.id === afterBuilding.id);
          if (!beforeBuilding?.pending || afterBuilding.pending) continue;
          const buildingData = BUILDING_DATA[afterBuilding.type];
          playerEvents.push({
            type: 'build',
            playerId: player.id,
            playerName: player.name,
            profession: player.profession || undefined,
            data: {
              buildingType: afterBuilding.type,
              buildingName: buildingData.name,
              cost: 0,
              buildingId: afterBuilding.id,
              completedFromPending: true,
              buildingValue: afterBuilding.value,
            },
            timestamp: nextTimestamp(),
          });
        }
      }

      const buildActions = playerActions.filter((a) => a.type === 'build');
      for (const buildAction of buildActions) {
        const event = this.createBuildEvent(
          player,
          beforePlayer,
          afterState,
          buildAction,
          nextTimestamp(),
        );
        if (event) playerEvents.push(event);
      }

      for (const profAction of professionActions) {
        if (!player.profession || !POST_BUILD_PROFESSIONS.has(player.profession)) continue;
        const event = this.createProfessionEvent(
          beforeState,
          player,
          beforePlayer,
          afterState,
          profAction,
          nextTimestamp(),
        );
        if (event) playerEvents.push(event);
      }

      events.push(...playerEvents);
    }

    return events;
  }

  private createBuildEvent(
    player: Player,
    beforePlayer: Player,
    afterState: GameState,
    buildAction: PlayerAction,
    timestamp: number,
  ): NarrativeEvent | null {
    if (!buildAction.buildingType) return null;

    const buildingData = BUILDING_DATA[buildAction.buildingType];
    const afterPlayer = afterState.players.find((p) => p.id === player.id);
    if (!afterPlayer) return null;

    const pendingBuilding = afterPlayer.buildings.find(
      (b) =>
        b.type === buildAction.buildingType &&
        b.pending &&
        !beforePlayer.buildings.some((existing) => existing.id === b.id),
    );

    if (pendingBuilding) {
      const card = buildAction.cardId
        ? beforePlayer.cards.find((c) => c.id === buildAction.cardId)
        : null;
      const cost =
        buildAction.buildingValue ||
        (card ? card.buildingValue : null) ||
        buildingData.valueRange[0];
      let finalCost = cost;
      if (player.profession === 'opportunity_hunter') {
        finalCost = Math.max(0, finalCost - 2);
      }

      return {
        type: 'build_delayed',
        playerId: player.id,
        playerName: player.name,
        profession: player.profession || undefined,
        data: {
          buildingType: buildAction.buildingType,
          buildingName: buildingData.name,
          cost: finalCost,
          buildingId: pendingBuilding.id,
        },
        timestamp,
      };
    }

    const afterBuilding = afterPlayer.buildings.find(
      (b) =>
        !beforePlayer.buildings.some((existing) => existing.id === b.id) && !b.pending,
    );
    if (!afterBuilding) return null;

    const card = buildAction.cardId
      ? beforePlayer.cards.find((c) => c.id === buildAction.cardId)
      : null;
    const cost =
      buildAction.buildingValue ||
      (card ? card.buildingValue : null) ||
      buildingData.valueRange[0];

    let finalCost = cost;
    if (player.profession === 'opportunity_hunter') {
      finalCost = Math.max(0, finalCost - 2);
    }

    return {
      type: 'build',
      playerId: player.id,
      playerName: player.name,
      profession: player.profession || undefined,
      data: {
        buildingType: buildAction.buildingType,
        buildingName: buildingData.name,
        cost: finalCost,
        buildingId: afterBuilding.id,
        buildingValue: afterBuilding.value,
      },
      timestamp,
    };
  }

  private createProfessionEvent(
    beforeState: GameState,
    player: Player,
    beforePlayer: Player,
    afterState: GameState,
    profAction: PlayerAction,
    timestamp: number,
  ): NarrativeEvent | null {
    if (!player.profession) return null;

    const professionData = PROFESSION_DATA[player.profession];
    if (!professionData) return null;

    switch (player.profession) {
      case 'architect':
        if (profAction.buildingCategory && profAction.buildingType) {
          const buildingData = BUILDING_DATA[profAction.buildingType];
          return {
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
            timestamp,
          };
        }
        return null;

      case 'thief': {
        if (!profAction.target) return null;
        const beforeTarget = beforeState.players.find((p) => p.id === profAction.target);
        const target = afterState.players.find((p) => p.id === profAction.target);
        if (!target || !beforeTarget) return null;
        const theftType = profAction.theftTarget || 'gold';
        const stolen =
          theftType === 'gold' ? Math.max(0, beforeTarget.gold - target.gold) : undefined;
        const cardStolen =
          theftType === 'card' && target.cards.length < beforeTarget.cards.length;
        if (theftType === 'gold' && stolen === 0) return null;
        if (theftType === 'card' && !cardStolen) return null;
        return {
          type: 'theft',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: {
            targetId: profAction.target,
            targetName: target.name,
            theftType,
            stolen,
          },
          timestamp,
        };
      }

      case 'vandal': {
        if (!profAction.target) return null;
        const beforeTarget = beforeState.players.find((p) => p.id === profAction.target);
        const target = afterState.players.find((p) => p.id === profAction.target);
        if (!target || !beforeTarget) return null;

        const destructionHappened = beforeTarget.buildings.some((beforeBuilding) => {
          const afterBuilding = target.buildings.find((b) => b.id === beforeBuilding.id);
          return afterBuilding && afterBuilding.value < beforeBuilding.value;
        });
        if (!destructionHappened) return null;

        return {
          type: 'vandal',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: {
            targetId: profAction.target,
            targetName: target.name,
          },
          timestamp,
        };
      }

      case 'inspector': {
        if (!profAction.target) return null;
        const target = afterState.players.find((p) => p.id === profAction.target);
        if (!target || target.deferredBuildActions.length === 0) return null;
        return {
          type: 'inspector',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: {
            targetId: profAction.target,
            targetName: target.name,
          },
          timestamp,
        };
      }

      case 'lucky': {
        const afterPlayer = afterState.players.find((p) => p.id === player.id);
        const goldGranted = afterPlayer?.luckyGoldGranted;
        if (!goldGranted || goldGranted <= 0) return null;
        return {
          type: 'lucky',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: { goldGained: goldGranted },
          timestamp,
        };
      }

      case 'diplomat':
        return {
          type: 'diplomat',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: {},
          timestamp,
        };

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

        return {
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
          timestamp,
        };
      }

      case 'saboteur': {
        if (!profAction.target) return null;
        const target = afterState.players.find((p) => p.id === profAction.target);
        if (!target || target.protected || !target.professionAbilityUsed) return null;
        return {
          type: 'saboteur',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: {
            targetId: profAction.target,
            targetName: target.name,
          },
          timestamp,
        };
      }

      case 'politician':
        if (!profAction.taxedCategory) return null;
        return {
          type: 'politician_tax_category',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: { category: profAction.taxedCategory },
          timestamp,
        };

      case 'spy': {
        if (!profAction.target) return null;
        const target = afterState.players.find((p) => p.id === profAction.target);
        if (!target) return null;
        return {
          type: 'spy',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: {
            targetId: profAction.target,
            targetName: target.name,
          },
          timestamp,
        };
      }

      default:
        return {
          type: 'profession_ability',
          playerId: player.id,
          playerName: player.name,
          profession: player.profession,
          data: { professionName: professionData.name },
          timestamp,
        };
    }
  }
}
