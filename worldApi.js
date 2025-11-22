// js/worldApi.js

// Bounds check
export function isInBounds(world, row, col) {
  const rows = world.length;
  const cols = world[0].length;
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

// Safe access
export function getCell(world, row, col) {
  if (!isInBounds(world, row, col)) return null;
  return world[row][col];
}

// Danger score for gameplay / coloring
export function getDangerScore(cell) {
  if (!cell) return 0;
  let score = 0;

  // Hazards
  if (cell.hazards && cell.hazards.length > 0) {
    const maxSeverity = Math.max(...cell.hazards.map(h => h.severity || 0));
    score += maxSeverity * 2;
  }

  // Currents
  if (cell.current) {
    const s = cell.current.speed_mps || 0;
    if (s > 0.5) score += 1;
    if (s > 1.0) score += 1;
    if (cell.current.stability === "low") score += 2;
    if (cell.current.stability === "medium") score += 1;
  }

  // Depth / pressure
  if (cell.depth_m > 4000) score += 1;
  if (cell.depth_m > 6000) score += 1;

  // Predators
  if (cell.life && cell.life.length > 0) {
    const maxThreat = Math.max(...cell.life.map(s => s.threat_level || 0));
    if (maxThreat >= 2) score += maxThreat; // 2 or 3
  }

  return score;
}

// Short summary for HUD / debugging
export function summarizeCell(cell) {
  return {
    biome: cell.biome,
    depth_m: cell.depth_m,
    temperature_c: cell.temperature_c,
    pressure_atm: cell.pressure_atm,
    light_intensity: cell.light_intensity,
    terrain_roughness: cell.terrain_roughness,
    hasCorals: !!cell.corals,
    hazardCount: cell.hazards?.length || 0,
    resourcesCount: cell.resources?.length || 0,
    lifeCount: cell.life?.length || 0,
    poiCount: cell.poi?.length || 0,
    dangerScore: getDangerScore(cell),
  };
}
// Compute global stats for scaling colors, missions, etc.
export function computeWorldStats(world) {
  const stats = {
    depth: { min: Infinity, max: -Infinity },
    temperature: { min: Infinity, max: -Infinity },
    biomes: {},            // biome -> count
    hazardsByType: {},     // type -> count
    predatorsCells: 0,
    totalCells: 0,
  };

  for (let r = 0; r < world.length; r++) {
    for (let c = 0; c < world[0].length; c++) {
      const cell = world[r][c];
      stats.totalCells++;

      // depth & temp
      if (Number.isFinite(cell.depth_m)) {
        stats.depth.min = Math.min(stats.depth.min, cell.depth_m);
        stats.depth.max = Math.max(stats.depth.max, cell.depth_m);
      }
      if (Number.isFinite(cell.temperature_c)) {
        stats.temperature.min = Math.min(stats.temperature.min, cell.temperature_c);
        stats.temperature.max = Math.max(stats.temperature.max, cell.temperature_c);
      }

      // biome
      const b = cell.biome || "unknown";
      stats.biomes[b] = (stats.biomes[b] || 0) + 1;

      // hazards
      if (cell.hazards && cell.hazards.length > 0) {
        for (const h of cell.hazards) {
          const t = h.type || "unknown";
          stats.hazardsByType[t] = (stats.hazardsByType[t] || 0) + 1;
        }
      }

      // predators (threat_level 3)
      if (cell.life && cell.life.some(s => s.threat_level >= 3)) {
        stats.predatorsCells++;
      }
    }
  }

  return stats;
}
