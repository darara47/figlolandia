import type { Building, Card } from '@figlolandia/game-core';
import type {
  BuildingValueChange,
  GameLevelDiff,
  PlayerStateDiff,
  SerializedGameState,
  StateDiffResult,
  StateScalarChange,
} from './AuditTypes';

const byId = <T extends { id: string }>(items: T[]): Map<string, T> =>
  new Map(items.map((item) => [item.id, item]));

const cardLabel = (card: Card): string =>
  `${card.name} (${card.buildingValue})`;

const buildingLabel = (building: Building): string =>
  `${building.type} (v${building.value}${building.pending ? ', pending' : ''})`;

/**
 * Porównuje dwa snapshoty stanu gry i zwraca tylko rzeczywiste zmiany.
 * Bez surowych JSON-ów — gotowe pod timeline i dashboard (DevTools-style).
 */
export class StateDiff {
  static diff(
    before: SerializedGameState,
    after: SerializedGameState,
  ): StateDiffResult {
    const gameLevel = StateDiff.diffGameLevel(before, after);
    const players = StateDiff.diffPlayers(before, after);
    const summary = StateDiff.buildSummary(gameLevel, players);
    return { gameLevel, players, summary };
  }

  private static diffGameLevel(
    before: SerializedGameState,
    after: SerializedGameState,
  ): GameLevelDiff {
    const diff: GameLevelDiff = {};
    if (before.phase !== after.phase) {
      diff.phase = { before: before.phase, after: after.phase };
    }
    if (before.round !== after.round) {
      diff.round = { before: before.round, after: after.round };
    }
    if (before.taxedCategory !== after.taxedCategory) {
      diff.taxedCategory = {
        before: before.taxedCategory,
        after: after.taxedCategory,
      };
    }
    if (before.winner !== after.winner) {
      diff.winner = { before: before.winner, after: after.winner };
    }
    return diff;
  }

  private static diffPlayers(
    before: SerializedGameState,
    after: SerializedGameState,
  ): PlayerStateDiff[] {
    const beforeById = new Map(before.players.map((p) => [p.id, p]));
    const afterById = new Map(after.players.map((p) => [p.id, p]));
    const allIds = new Set([...beforeById.keys(), ...afterById.keys()]);
    const result: PlayerStateDiff[] = [];

    for (const playerId of allIds) {
      const b = beforeById.get(playerId);
      const a = afterById.get(playerId);
      if (!b || !a) continue;

      const playerDiff: PlayerStateDiff = {
        playerId,
        playerName: a.name,
      };
      let hasChange = false;

      if (b.gold !== a.gold) {
        playerDiff.gold = { before: b.gold, after: a.gold };
        hasChange = true;
      }

      if (b.profession !== a.profession) {
        playerDiff.profession = {
          before: b.profession,
          after: a.profession,
        };
        hasChange = true;
      }

      const cards = StateDiff.diffCards(b.cards, a.cards);
      if (cards.added.length > 0 || cards.removed.length > 0) {
        playerDiff.cards = cards;
        hasChange = true;
      }

      const buildings = StateDiff.diffBuildings(b.buildings, a.buildings);
      if (
        buildings.added.length > 0 ||
        buildings.removed.length > 0 ||
        buildings.valueChanges.length > 0
      ) {
        playerDiff.buildings = buildings;
        hasChange = true;
      }

      const flags = StateDiff.diffPlayerFlags(b, a);
      if (flags.length > 0) {
        playerDiff.flags = flags;
        hasChange = true;
      }

      if (hasChange) {
        result.push(playerDiff);
      }
    }

    return result;
  }

  private static diffCards(
    before: Card[],
    after: Card[],
  ): { added: Card[]; removed: Card[] } {
    const beforeMap = byId(before);
    const afterMap = byId(after);
    const added = after.filter((c) => !beforeMap.has(c.id));
    const removed = before.filter((c) => !afterMap.has(c.id));
    return { added, removed };
  }

  private static diffBuildings(
    before: Building[],
    after: Building[],
  ): {
    added: Building[];
    removed: Building[];
    valueChanges: BuildingValueChange[];
  } {
    const beforeMap = byId(before);
    const afterMap = byId(after);
    const added = after.filter((b) => !beforeMap.has(b.id));
    const removed = before.filter((b) => !afterMap.has(b.id));
    const valueChanges: BuildingValueChange[] = [];

    for (const [id, afterBuilding] of afterMap) {
      const beforeBuilding = beforeMap.get(id);
      if (!beforeBuilding) continue;
      if (
        beforeBuilding.value !== afterBuilding.value ||
        beforeBuilding.pending !== afterBuilding.pending ||
        beforeBuilding.category !== afterBuilding.category
      ) {
        if (beforeBuilding.value !== afterBuilding.value) {
          valueChanges.push({
            buildingId: id,
            buildingType: afterBuilding.type,
            before: beforeBuilding.value,
            after: afterBuilding.value,
          });
        }
      }
    }

    return { added, removed, valueChanges };
  }

  private static diffPlayerFlags(
    before: SerializedGameState['players'][number],
    after: SerializedGameState['players'][number],
  ): StateScalarChange[] {
    const flags: Array<{
      key: keyof SerializedGameState['players'][number];
      label: string;
    }> = [
        { key: 'protected', label: 'protected' },
        { key: 'delayedBuildings', label: 'delayedBuildings' },
        { key: 'professionAbilityUsed', label: 'professionAbilityUsed' },
        { key: 'urbanistPendingBuildBoost', label: 'urbanistPendingBuildBoost' },
        { key: 'buildingsBuiltThisRound', label: 'buildingsBuiltThisRound' },
      ];

    return flags
      .filter(({ key }) => before[key] !== after[key])
      .map(({ key, label }) => ({
        path: label,
        before: before[key] as string | number | boolean | null,
        after: after[key] as string | number | boolean | null,
      }));
  }

  private static buildSummary(
    gameLevel: GameLevelDiff,
    players: PlayerStateDiff[],
  ): string[] {
    const lines: string[] = [];

    if (gameLevel.phase) {
      lines.push(`phase: ${gameLevel.phase.before} → ${gameLevel.phase.after}`);
    }
    if (gameLevel.taxedCategory) {
      lines.push(
        `taxedCategory: ${gameLevel.taxedCategory.before ?? '—'} → ${gameLevel.taxedCategory.after ?? '—'}`,
      );
    }
    if (gameLevel.winner) {
      lines.push(
        `winner: ${gameLevel.winner.before ?? '—'} → ${gameLevel.winner.after ?? '—'}`,
      );
    }

    for (const p of players) {
      if (p.gold) {
        lines.push(`${p.playerName}: gold ${p.gold.before} → ${p.gold.after}`);
      }
      if (p.profession) {
        lines.push(
          `${p.playerName}: profession ${p.profession.before ?? '—'} → ${p.profession.after ?? '—'}`,
        );
      }
      if (p.cards) {
        for (const card of p.cards.removed) {
          lines.push(`${p.playerName}: cards − ${cardLabel(card)}`);
        }
        for (const card of p.cards.added) {
          lines.push(`${p.playerName}: cards + ${cardLabel(card)}`);
        }
      }
      if (p.buildings) {
        for (const b of p.buildings.removed) {
          lines.push(`${p.playerName}: buildings − ${buildingLabel(b)}`);
        }
        for (const b of p.buildings.added) {
          lines.push(`${p.playerName}: buildings + ${buildingLabel(b)}`);
        }
        for (const vc of p.buildings.valueChanges) {
          lines.push(
            `${p.playerName}: ${vc.buildingType} value ${vc.before} → ${vc.after}`,
          );
        }
      }
      if (p.flags) {
        for (const f of p.flags) {
          lines.push(
            `${p.playerName}: ${f.path} ${String(f.before)} → ${String(f.after)}`,
          );
        }
      }
    }

    return lines;
  }
}
