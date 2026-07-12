export const formatTimestamp = (ms: number): string =>
  new Date(ms).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export const formatGameStatus = (status: string): string => {
  const labels: Record<string, string> = {
    CREATED: 'Utworzona',
    IN_PROGRESS: 'W trakcie',
    FINISHED: 'Zakończona',
  };
  return labels[status] ?? status;
};

export const playerNameById = (
  players: { id: string; name: string }[],
  playerId: string | null,
): string | null => {
  if (!playerId) return null;
  return players.find((p) => p.id === playerId)?.name ?? playerId;
};
