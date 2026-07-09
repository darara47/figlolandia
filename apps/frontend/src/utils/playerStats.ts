interface PlayerWithBuildings {
  gold: number;
  buildings: { value: number }[];
}

export const getPlayerStats = (player: PlayerWithBuildings) => {
  const buildingValue = player.buildings.reduce((sum, building) => sum + building.value, 0);
  return {
    gold: player.gold,
    buildingValue,
    points: player.gold + buildingValue,
  };
};
