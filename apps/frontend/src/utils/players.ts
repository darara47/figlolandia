import { PlayerDto } from '@/src/types/api';

export const sortPlayersByJoinOrder = <T extends Pick<PlayerDto, 'joinOrder'>>(
  players: T[],
): T[] =>
  [...players].sort(
    (a, b) =>
      (a.joinOrder ?? Number.MAX_SAFE_INTEGER) - (b.joinOrder ?? Number.MAX_SAFE_INTEGER),
  );
