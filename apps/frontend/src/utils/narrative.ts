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
      if (event.data?.completedFromPending) {
        return `Gracz <b>${event.playerName}</b> kończy budowę ${buildingName}. Budynek zyskuje pełną wartość (${event.data?.buildingValue ?? 0} ${(event.data?.buildingValue ?? 0) === 1 ? 'gwiazdka' : 'gwiazdki'}).`;
      }
      const cost = event.data?.cost ?? 0;
      return `Gracz <b>${event.playerName}</b>${professionName ? ` jest <b>${professionName.toLowerCase()}</b>` : ''}. Buduje ${buildingName} za ${cost} ${cost === 1 ? 'monetę' : 'monet'}.`;
    }

    case 'build_delayed': {
      const buildingName = event.data?.buildingName || event.data?.buildingType || 'budynek';
      const cost = event.data?.cost ?? 0;
      return `Gracz <b>${event.playerName}</b> rozpoczyna budowę ${buildingName} za ${cost} ${cost === 1 ? 'monetę' : 'monet'}, ale Inspektor opóźnia jej ukończenie do następnej rundy.`;
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

    case 'politician_tax_category': {
      const categoryName = getCategoryName(event.data?.category || '');
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Nakłada podatek na kategorię ${categoryName} – zyskuje 1 monetę za każdy budynek wybudowany w niej przez innych graczy w tej rundzie.`;
    }

    case 'spy':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Podgląda rękę gracza <b>${event.data?.targetName}</b>.`;

    case 'inspector':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Opóźnia budynki gracza <b>${event.data?.targetName}</b> do następnej rundy.`;

    case 'lucky':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Otrzymuje +${event.data?.goldGained ?? 2} złota.`;

    case 'diplomat':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Aktywuje ochronę przed negatywnymi efektami w tej rundzie.`;

    case 'urbanist':
      return `Gracz <b>${event.playerName}</b> jest <b>${professionName.toLowerCase()}</b>. Zwiększa wartość budynku${event.data?.buildingName ? ` ${event.data.buildingName}` : ''} o 1.`;

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
