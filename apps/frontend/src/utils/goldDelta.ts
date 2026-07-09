import { NarrativeEvent } from '@/types/websocket';

export const getGoldDeltaForEvent = (event: NarrativeEvent): number | null => {
  switch (event.type) {
    case 'build':
      return -((event.data?.cost as number) ?? 0);
    case 'lucky':
      return (event.data?.goldGained as number) ?? 2;
    default:
      return null;
  }
};

export const formatGoldDelta = (amount: number): string => {
  if (amount > 0) return `+${amount}`;
  return String(amount);
};
