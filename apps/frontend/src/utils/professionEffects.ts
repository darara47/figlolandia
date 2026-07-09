import { PROFESSION_DATA, Profession } from '@figlolandia/game-core';
import { NarrativeEvent } from '@/types/websocket';

export type ProfessionEffectKind = 'economy' | 'build' | 'interaction' | 'defense' | 'none';

const categoryToEffect: Record<string, ProfessionEffectKind> = {
  Ekonomia: 'economy',
  Budowa: 'build',
  Interakcja: 'interaction',
  'Władza / Obrona': 'defense',
};

export const getProfessionEffectKind = (profession?: string): ProfessionEffectKind => {
  if (!profession) return 'none';
  const data = PROFESSION_DATA[profession as Profession];
  return categoryToEffect[data?.category ?? ''] ?? 'none';
};

export const getEventEffectKind = (event: NarrativeEvent): ProfessionEffectKind => {
  if (event.type === 'build' || event.type === 'architect_change_category') {
    return 'build';
  }
  if (event.type === 'lucky') return 'economy';
  if (event.type === 'diplomat') return 'defense';
  if (
    event.type === 'theft' ||
    event.type === 'vandal' ||
    event.type === 'saboteur' ||
    event.type === 'spy' ||
    event.type === 'politician_tax_category'
  ) {
    return 'interaction';
  }
  return getProfessionEffectKind(event.profession);
};

export const getTargetIdFromEvent = (event: NarrativeEvent): string | undefined =>
  event.data?.targetId as string | undefined;
