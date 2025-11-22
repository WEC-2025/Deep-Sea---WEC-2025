// js/worldLoader.js
// Loads all CSV data and builds a 2D "world" array of cells,
// each cell enriched with hazards, POIs, resources, life, corals, and currents.

async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status}`);
  }
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");

    const obj = {};
    headers.forEach((h, idx) => {
      const raw = parts[idx] !== undefined ? parts[idx].trim() : "";
      // Try to parse numbers, otherwise keep string
      const num = Number(raw);
      obj[h] = raw === "" || Number.isNaN(num) ? raw : num;
    });

    rows.push(obj);
  }
  return rows;
}

/**
 * Build an empty 2D grid [rows][cols]
 */
function createEmptyWorld(rows, cols) {
  const world = new Array(rows);
  for (let r = 0; r < rows; r++) {
    world[r] = new Array(cols).fill(null);
  }
  return world;
}

/**
 * Attach base cell data from cells.csv
 */
function applyCells(world, cellsData) {
  for (const c of cellsData) {
    const row = Number(c.row);
    const col = Number(c.col);
    if (!world[row] || col < 0 || col >= world[row].length) continue;

    world[row][col] = {
      row,
      col,
      x_km: c.x_km,
      y_km: c.y_km,
      lat: c.lat,
      lon: c.lon,
      depth_m: c.depth_m,
      pressure_atm: c.pressure_atm,
      biome: c.biome,
      temperature_c: c.temperature_c,
      light_intensity: c.light_intensity,
      terrain_roughness: c.terrain_roughness,

      // Collections we’ll fill from other CSVs:
      hazards: [],
      poi: [],
      resources: [],
      life: [],
      corals: null,

      // Currents (will be filled later)
      u_mps: 0,
      v_mps: 0,
      speed_mps: 0,
      current_stability: null,
      flow_direction: null,
    };
  }
}

/**
 * Attach hazards from hazards.csv
 */
function applyHazards(world, hazardsData) {
  for (const h of hazardsData) {
    const row = Number(h.row);
    const col = Number(h.col);
    const cell = world[row] && world[row][col];
    if (!cell) continue;

    cell.hazards.push({
      type: h.type,
      severity: h.severity,
      notes: h.notes,
    });
  }
}

/**
 * Attach POIs from poi.csv
 */
function applyPOI(world, poiData) {
  for (const p of poiData) {
    const row = Number(p.row);
    const col = Number(p.col);
    const cell = world[row] && world[row][col];
    if (!cell) continue;

    cell.poi.push({
      id: p.id,
      category: p.category,
      label: p.label,
      description: p.description,
      research_value: p.research_value,
    });
  }
}

/**
 * Attach resources from resources.csv
 */
function applyResources(world, resourcesData) {
  for (const r of resourcesData) {
    const row = Number(r.row);
    const col = Number(r.col);
    const cell = world[row] && world[row][col];
    if (!cell) continue;

    cell.resources.push({
      type: r.type,
      family: r.family,
      abundance: r.abundance,
      purity: r.purity,
      extraction_difficulty: r.extraction_difficulty,
      environmental_impact: r.environmental_impact,
      economic_value: r.economic_value,
      description: r.description,
    });
  }
}

/**
 * Attach life from life.csv
 */
function applyLife(world, lifeData) {
  for (const l of lifeData) {
    const row = Number(l.row);
    const col = Number(l.col);
    const cell = world[row] && world[row][col];
    if (!cell) continue;

    cell.life.push({
      species: l.species,
      avg_depth_m: l.avg_depth_m,
      density: l.density,
      threat_level: l.threat_level,
      behavior: l.behavior,
      trophic_level: l.trophic_level,
      prey_species: l.prey_species,
    });
  }
}

/**
 * Attach coral info from corals.csv
 */
function applyCorals(world, coralData) {
  for (const c of coralData) {
    const row = Number(c.row);
    const col = Number(c.col);
    const cell = world[row] && world[row][col];
    if (!cell) continue;

    cell.corals = {
      coral_cover_pct: c.coral_cover_pct,
      health_index: c.health_index,
      bleaching_risk: c.bleaching_risk,
      biodiversity_index: c.biodiversity_index,
    };
  }
}

/**
 * 🔹 Attach currents from currents.csv
 *    (THIS is what makes currents work in the game)
 */
function applyCurrents(world, currentData) {
  for (const c of currentData) {
    const row = Number(c.row);
    const col = Number(c.col);
    const cell = world[row] && world[row][col];
    if (!cell) continue;

    const u = Number(c.u_mps) || 0;
    const v = Number(c.v_mps) || 0;
    const speed = Number(c.speed_mps) || 0;
    const stability = c.stability || "unknown";
    const dir = c.flow_direction || "none";

    // store raw fields
    cell.u_mps = u;
    cell.v_mps = v;
    cell.speed_mps = speed;
    cell.current_stability = stability;
    cell.flow_direction = dir;

    // 🔥 Create the object YOUR API expects:
    cell.current = {
      u_mps: u,
      v_mps: v,
      speed_mps: speed,
      stability: stability,
      flow_direction: dir,
    };
  }
}

/**
 * MAIN ENTRYPOINT
 */
export async function loadWorld() {
  // Load metadata
  const metaRes = await fetch("data/metadata.json");
  if (!metaRes.ok) {
    throw new Error(`Failed to load metadata.json: ${metaRes.status}`);
  }
  const metadata = await metaRes.json();
  const rows = metadata.grid.rows;
  const cols = metadata.grid.cols;

  // Load all CSVs in parallel
  const [
    cellsData,
    hazardsData,
    poiData,
    currentsData,
    resourcesData,
    lifeData,
    coralData,
  ] = await Promise.all([
    loadCSV("data/cells.csv"),
    loadCSV("data/hazards.csv"),
    loadCSV("data/poi.csv"),
    loadCSV("data/currents.csv"),
    loadCSV("data/resources.csv"),
    loadCSV("data/life.csv"),
    loadCSV("data/corals.csv"),
  ]);

  // Build world grid and enrich it
  const world = createEmptyWorld(rows, cols);
  applyCells(world, cellsData);
  applyHazards(world, hazardsData);
  applyPOI(world, poiData);
  applyResources(world, resourcesData);
  applyLife(world, lifeData);
  applyCorals(world, coralData);
  applyCurrents(world, currentsData);   // 🔥 currents wired in here

  return { world, metadata };
}
