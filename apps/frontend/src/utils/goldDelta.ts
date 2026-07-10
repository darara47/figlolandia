import { NarrativeEvent } from '@/types/websocket';

export interface GoldFloatTarget {
  playerId: string;
  amount: number;
}

export const getGoldDeltaForEvent = (event: NarrativeEvent): number | null => {
  const floats = getGoldFloatsForEvent(event);
  if (floats.length === 0) return null;
  return floats[0].amount;
};

export const getGoldFloatsForEvent = (event: NarrativeEvent): GoldFloatTarget[] => {
  switch (event.type) {
    case 'build':
    case 'build_delayed': {
      const cost = (event.data?.cost as number) ?? 0;
      if (cost <= 0) return [];
      return [{ playerId: event.playerId, amount: -cost }];
    }
    case 'lucky': {
      const gained = (event.data?.goldGained as number) ?? 2;
      return [{ playerId: event.playerId, amount: gained }];
    }
    case 'theft': {
      if (event.data?.theftType === 'card') return [];
      const stolen = (event.data?.stolen as number) ?? 0;
      if (stolen <= 0) return [];
      const targetId = event.data?.targetId as string | undefined;
      if (!targetId) return [{ playerId: event.playerId, amount: stolen }];
      return [
        { playerId: targetId, amount: -stolen },
        { playerId: event.playerId, amount: stolen },
      ];
    }
    default:
      return [];
  }
};

export const formatGoldDelta = (amount: number): string => {
  if (amount > 0) return `+${amount}`;
  return String(amount);
};
