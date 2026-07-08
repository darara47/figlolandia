import { NarrativeEvent } from '@/types/websocket';
import { PROFESSION_DATA } from '@figlolandia/game-core';

export const getNarrativeEventKey = (event: NarrativeEvent): string =>
  `${event.timestamp}-${event.playerId}-${event.type}`;

export const mergeNarrativeEvents = (
  existing: NarrativeEvent[],
  incoming: NarrativeEvent[] | undefined,
): NarrativeEvent[] => {
  if (!incoming || incoming.length === 0) {
    return existing;
  }

  const seen = new Set(existing.map(getNarrativeEventKey));
  const merged = [...existing];

  for (const event of incoming) {
    const key = getNarrativeEventKey(event);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(event);
    }
  }

  return merged.sort((a, b) => a.timestamp - b.timestamp);
};

const getCategoryName = (category: string): string => {
  const names: Record<string, string> = {
    education: 'edukacja',
    health: 'zdrowie',
    finance: 'finanse',
    administration: 'administracja',
    entertainment: 'rozrywka',
  };
  return names[category] || category;
};

export const translateNarrativeEvent = (event: NarrativeEvent): string => {
  const professionName = event.profession
    ? PROFESSION_DATA[event.profession as keyof typeof PROFESSION_DATA]?.name ||
    event.data?.professionName ||
    event.profession
    : event.data?.professionName || '';

  switch (event.type) {
    case 'build': {
      const buildingName = event.data?.buildingName || event.data?.buildingType || 'budynek';
      const cost = event.data?.cost ?? 0;
      return `Gracz <b>${event.playerName}</b>${professionName ? ` jest <b>${professionName.toLowerCase()}</b>` : ''}. Buduje ${buildingName} za ${cost} ${cost === 1 ? 'monetę' : 'monet'}.`;
    }

    case 'architect_change_category': {
      const buildingName = event.data?.buildingName || event.data?.buildingType || 'budynek';
      const oldCategoryName = getCategoryName(event.data?.oldCategory || '');
      const newCategoryName = getCategoryName(event.data?.newCategory || '');
      const cost = event.data?.cost ?? 0;
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Buduje ${buildingName} za ${cost} ${cost === 1 ? 'monetę' : 'monet'}. Korzysta z zdolności specjalnej i zmienia kategorie budynku ${buildingName} z ${oldCategoryName} na ${newCategoryName}.`;
    }

    case 'theft': {
      const theftType = event.data?.theftType === 'card' ? 'kartę' : '2 monety';
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Kradnie ${theftType} graczowi <b>${event.data?.targetName}</b>.`;
    }

    case 'vandal':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Niszczy wartość budynku gracza <b>${event.data?.targetName}</b> o 2.`;

    case 'saboteur':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Blokuje zdolność zawodową gracza <b>${event.data?.targetName}</b>.`;

    case 'politician_cheaper_category': {
      const categoryName = getCategoryName(event.data?.category || '');
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Ustanawia kategorię ${categoryName} jako tańszą o 1 monetę w tej rundzie.`;
    }

    case 'spy':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Podgląda rękę gracza <b>${event.data?.targetName}</b>.`;

    case 'inspector':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Opóźnia budynki gracza <b>${event.data?.targetName}</b> do następnej rundy.`;

    case 'profession_ability':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Korzysta z zdolności specjalnej${event.data?.professionName ? ` (${event.data.professionName})` : ''}.`;

    default: {
      const details = event.data
        ? Object.entries(event.data)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
        : '';
      return `Gracz <b>${event.playerName}</b>${professionName ? ` jest <b>${professionName.toLowerCase()}</b>` : ''} wykonuje akcję (${event.type}${details ? ` — ${details}` : ''}).`;
    }
  }
};
