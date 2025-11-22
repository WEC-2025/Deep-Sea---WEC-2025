// js/main.js
//
// Loads world data, initializes renderer, handles movement,
// HUD updates, AI assistant, biome facts, and mission logic with currents.

import { loadWorld } from "./worldLoader.js";
import { getCell, computeWorldStats } from "./worldApi.js";
import { initRenderer } from "./renderer.js";

// HUD elements
const depthEl = document.getElementById("hud-depth");
const pressureEl = document.getElementById("hud-pressure");
const tempEl = document.getElementById("hud-temp");
const healthEl = document.getElementById("hud-health");
const hungerEl = document.getElementById("hud-hunger");

// Debug log
const logEl = document.getElementById("log");
function log(msg) {
  if (logEl) logEl.textContent += msg + "\n";
  else console.log(msg);
}

// Globals from non-module scripts
const AI = window.AI;
const MISSIONS = window.MISSIONS || [];
const UI_init = window.UI_init;
const UI_missionSuccess = window.UI_missionSuccess;
const UI_missionFail = window.UI_missionFail;
const checkBiomeFacts = window.checkBiomeFacts;

// Game state
let world = null;
let metadata = null;
let stats = null;
let renderer = null;

const playerState = {
  row: 0,
  col: 0,
  health: 100,
  hunger: 100,
};

// Mission runtime state
let activeMission = null;
let missionTimerId = null;
let missionTimeRemaining = 0;

// Game over state
let gameOver = false;

// Visibility grid for fog of war / sonar
let visibility = null;

/**
 * Initialize the visibility grid: [rows][cols] with discovered/visible flags.
 */
function initVisibility(rows, cols) {
  visibility = new Array(rows);
  for (let r = 0; r < rows; r++) {
    visibility[r] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      visibility[r][c] = {
        discovered: false, // has this tile ever been in sonar?
        visible: false,    // currently in sonar radius?
      };
    }
  }
}

/**
 * Update which tiles are visible based on the submarine's position.
 * Sonar reveals a radius around the sub and remembers tiles as "discovered".
 */
function updateVisibilityAroundPlayer() {
  if (!metadata || !visibility) return;

  const rows = metadata.grid.rows;
  const cols = metadata.grid.cols;
  const radius = 5; // sonar radius in tiles (tweak if needed)

  // First: mark everything as not currently visible
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      visibility[r][c].visible = false;
    }
  }

  // Then reveal a circle around the sub
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const rr = playerState.row + dr;
      const cc = playerState.col + dc;

      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;

      const dist = Math.sqrt(dr * dr + dc * dc);
      if (dist <= radius) {
        visibility[rr][cc].visible = true;
        visibility[rr][cc].discovered = true;
      }
    }
  }
}

/**
 * Show the game over overlay and stop further movement.
 */
function triggerGameOver(source = "unknown") {
  if (gameOver) return; // already triggered

  gameOver = true;

  const overlay = document.getElementById("game-over-overlay");
  const msgEl = document.getElementById("game-over-message");

  if (msgEl) {
    msgEl.textContent = `Hull integrity reached 0%. Mission failed (${source}).`;
  }
  if (overlay) {
    overlay.style.display = "flex";
  }

  if (AI && AI.say) {
    AI.say("Hull integrity critical. Mission terminated.", 5000);
  }

  log(`GAME OVER triggered by: ${source}`);
}

/*-------------------------------------------
  Helper: format nicely for HUD
-------------------------------------------*/
function fmt(value, decimals = 2, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return `N/A${suffix}`;
  }
  return `${Number(value).toFixed(decimals)}${suffix}`;
}

/*-------------------------------------------
  HUD update based on current cell
-------------------------------------------*/
function updateHUDFromCell(cell) {
  depthEl.textContent = fmt(cell.depth_m, 1, " m");
  pressureEl.textContent = fmt(cell.pressure_atm, 1, " atm");
  tempEl.textContent = fmt(cell.temperature_c, 2, " °C");

  healthEl.textContent = `${playerState.health}%`;
  hungerEl.textContent = `${playerState.hunger}%`;
}

/*-------------------------------------------
  PREDATOR/HAZARDS: warn via AI, DAMAGE HULL INTEGRITY 
-------------------------------------------*/
function handlePredators(cell) {
  if (!cell || !cell.life || cell.life.length === 0) return;

  // Find the highest threat_level in this cell
  let maxThreat = 0;
  cell.life.forEach((s) => {
    const t = Number(s.threat_level) || 0;
    if (t > maxThreat) maxThreat = t;
  });

  // Only apply damage for moderate/high threats
  if (maxThreat < 2) {
    return; // harmless / low-threat fauna
  }

  // Example damage scale:
  // threat 2 → 4% damage, threat 3 → 7% damage
  let damage = 0;
  if (maxThreat === 2) damage = 4;
  if (maxThreat >= 3) damage = 7;

  // Apply damage
  playerState.health -= damage;
  if (playerState.health < 0) playerState.health = 0;

  // Update HUD
  healthEl.textContent = `${playerState.health}%`;

  // AI warnings
  if (AI && AI.predatorWarning) {
    AI.predatorWarning();
  }

  if (playerState.health <= 0) {
    triggerGameOver("predator attack");
  } else if (playerState.health < 30) {
    if (AI && AI.say) {
      AI.say("Warning: Predator activity detected. Hull integrity below 30%.", 4000);
    }
  }
}

function handleHazards(cell) {
  if (!cell || !cell.hazards || cell.hazards.length === 0) return;

  let maxSeverity = 0;

  // 1) Warn about hazards and find the worst severity
  cell.hazards.forEach((h) => {
    const type = h.type || h.hazard_type || "Hazard";
    const sev = Number(h.severity) || 1;

    if (sev > maxSeverity) maxSeverity = sev;

    if (AI && AI.hazardWarning) {
      AI.hazardWarning(type);
    }
  });

  // 2) Apply damage based on severity
  //    Example scale: severity 1 → 4 dmg, 2 → 6 dmg, 3 → 8 dmg, etc.
  const baseDamage = 2;
  const damage = baseDamage + maxSeverity * 2;

  playerState.health -= damage;
  if (playerState.health < 0) playerState.health = 0;

  healthEl.textContent = `${playerState.health}%`;

  if (playerState.health <= 0) {
    triggerGameOver("hazard exposure");
  } else if (playerState.health < 30) {
    if (AI && AI.say) {
      AI.say("Warning: Hull integrity below 30%. Exit hazard zone immediately.", 4000);
    }
  }
}


/*-------------------------------------------
  CURRENTS → gentle drift
-------------------------------------------*/
/**
 * Compute the extra tile movement caused by currents in the cell we are leaving.
 * Uses currents.csv fields (via loader):
 *   cell.current.u_mps (east/west), cell.current.v_mps (north/south)
 *
 * Convention:
 *  - row increases as you go DOWN
 *  - col increases as you go RIGHT
 *
 *  u_mps > 0 → push east  (right, col+1)
 *  u_mps < 0 → push west  (left, col-1)
 *  v_mps > 0 → push south (down, row+1)
 *  v_mps < 0 → push north (up, row-1)
 */
function getCurrentDelta(cell) {
  if (!cell || !cell.current) return { dRowExtra: 0, dColExtra: 0 };

  const u = Number(cell.current.u_mps) || 0;
  const v = Number(cell.current.v_mps) || 0;

  // Threshold so only stronger currents bend the path
  const threshold = 0.5;

  let dRowExtra = 0;
  let dColExtra = 0;

  if (v > threshold) dRowExtra = 1;      // push down
  if (v < -threshold) dRowExtra = -1;    // push up

  if (u > threshold) dColExtra = 1;      // push right
  if (u < -threshold) dColExtra = -1;    // push left

  return { dRowExtra, dColExtra };
}

/*-------------------------------------------
  MISSION ENGINE
-------------------------------------------*/
function startMissionLogic(mission) {
  activeMission = {
    ...mission,
    visitedPOIs: new Set(),     // for multi_poi
    visitedHazards: new Set(),  // for visit_hazards
    startTime: performance.now(),
  };

  if (missionTimerId) {
    clearInterval(missionTimerId);
    missionTimerId = null;
  }

  missionTimeRemaining = mission.timeLimit || 0;

  if (mission.timeLimit) {
    missionTimerId = setInterval(() => {
      missionTimeRemaining -= 1;
      if (missionTimeRemaining <= 0) {
        completeMission(false);
      }
    }, 1000);
  }

  log(`Mission started: ${mission.title}`);
}

function completeMission(success) {
  if (!activeMission) return;

  if (missionTimerId) {
    clearInterval(missionTimerId);
    missionTimerId = null;
  }

  if (success) {
    UI_missionSuccess && UI_missionSuccess();
  } else {
    UI_missionFail && UI_missionFail();
  }

  log(
    `Mission ${success ? "success" : "failed"}: ${activeMission.title}`
  );
  activeMission = null;
}

function posKey(row, col) {
  return `${row},${col}`;
}

function checkMissionProgress(cell) {
  if (!activeMission) return;

  switch (activeMission.type) {
    case "reach_poi": {
      if (cell.poi && cell.poi.length > 0) {
        completeMission(true);
      }
      break;
    }

    case "multi_poi": {
      const required = activeMission.targetCount || 3;
      if (cell.poi && cell.poi.length > 0) {
        const key = posKey(playerState.row, playerState.col);
        if (!activeMission.visitedPOIs.has(key)) {
          activeMission.visitedPOIs.add(key);
          log(
            `Visited POIs: ${activeMission.visitedPOIs.size}/${required}`
          );
          if (activeMission.visitedPOIs.size >= required) {
            completeMission(true);
          }
        }
      }
      break;
    }

    case "reach_depth": {
      const targetDepth = activeMission.targetDepth || 6000;
      if (cell.depth_m >= targetDepth) {
        completeMission(true);
      }
      break;
    }

    case "reach_pressure": {
      const targetPressure = activeMission.targetPressure || 500;
      if (cell.pressure_atm >= targetPressure) {
        completeMission(true);
      }
      break;
    }

    case "visit_hazards": {
      const requiredHazards = activeMission.targetCount || 3;
      if (cell.hazards && cell.hazards.length > 0) {
        const key = posKey(playerState.row, playerState.col);
        if (!activeMission.visitedHazards.has(key)) {
          activeMission.visitedHazards.add(key);
          log(
            `Visited hazards: ${activeMission.visitedHazards.size}/${requiredHazards}`
          );
          if (activeMission.visitedHazards.size >= requiredHazards) {
            completeMission(true);
          }
        }
      }
      break;
    }

    default:
      break;
  }
}

window.startMissionLogic = startMissionLogic;

/*-------------------------------------------
  MOVEMENT (with softened currents)
-------------------------------------------*/
function movePlayer(dRowInput, dColInput) {
  if (gameOver) return;
  if (!metadata) return;

  const currentCell = getCell(world, playerState.row, playerState.col);

  let dRow = dRowInput;
  let dCol = dColInput;

  const { dRowExtra, dColExtra } = getCurrentDelta(currentCell);

  // Only allow current to affect the axis the player is NOT controlling
  if (dRowInput !== 0 && dColInput === 0) {
    // vertical move → allow sideways push
    dCol += dColExtra;
  } else if (dColInput !== 0 && dRowInput === 0) {
    // horizontal move → allow vertical push
    dRow += dRowExtra;
  }
  // If diagonal or no input, ignore current

  let newRow = playerState.row + dRow;
  let newCol = playerState.col + dCol;

  // Clamp to bounds using metadata.grid
  if (newRow < 0) newRow = 0;
  if (newCol < 0) newCol = 0;
  if (newRow >= metadata.grid.rows) newRow = metadata.grid.rows - 1;
  if (newCol >= metadata.grid.cols) newCol = metadata.grid.cols - 1;

   playerState.row = newRow;
  playerState.col = newCol;

  // 🔹 Update sonar / fog-of-war
  updateVisibilityAroundPlayer();

  const cell = getCell(world, newRow, newCol);
  updateHUDFromCell(cell);
  renderer.setPlayerPosition(newRow, newCol);

  handleHazards(cell);
  handlePredators(cell);
  if (checkBiomeFacts) checkBiomeFacts(world, newRow, newCol);
  checkMissionProgress(cell);

}

/*-------------------------------------------
  MAIN STARTUP
-------------------------------------------*/
(async () => {
  try {
    // Init AI + UI
    AI.init();
    UI_init && UI_init();

    log("Loading Abyssal World...");
    const loaded = await loadWorld();
    world = loaded.world;
    metadata = loaded.metadata;

    stats = computeWorldStats(world);
    log("World loaded!");
    log(
      `Grid size: ${metadata.grid.rows} × ${metadata.grid.cols}`
    );

    // Start player in center
    const mid = Math.floor(metadata.grid.rows / 2);
    playerState.row = mid;
    playerState.col = mid;

    // 🔹 Initialize fog-of-war grid and do first sonar ping
    initVisibility(metadata.grid.rows, metadata.grid.cols);
    updateVisibilityAroundPlayer();

    // Init renderer (now with visibility)
    renderer = initRenderer(world, metadata, stats, {
      playerState,
      visibility,
      onCellSelected: (cell, row, col) => {
        playerState.row = row;
        playerState.col = col;
        updateVisibilityAroundPlayer();    // keep fog consistent on click
        updateHUDFromCell(cell);
        renderer.setPlayerPosition(row, col);
        handleHazards(cell);
        handlePredators(cell);
        if (checkBiomeFacts) checkBiomeFacts(world, row, col);
        checkMissionProgress(cell);
      },
    });


    const startCell = getCell(world, playerState.row, playerState.col);
    updateHUDFromCell(startCell);

    // Button controls
    document.getElementById("btn-up").addEventListener("click", () => {
      movePlayer(-1, 0);
    });
    document.getElementById("btn-down").addEventListener("click", () => {
      movePlayer(1, 0);
    });
    document.getElementById("btn-left").addEventListener("click", () => {
      movePlayer(0, -1);
    });
    document.getElementById("btn-right").addEventListener("click", () => {
      movePlayer(0, 1);
    });

    // Keyboard controls (arrows + WASD) + prevent page scroll
    window.addEventListener("keydown", (e) => {
      let moved = false;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        movePlayer(-1, 0);
        moved = true;
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        movePlayer(1, 0);
        moved = true;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        movePlayer(0, -1);
        moved = true;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        movePlayer(0, 1);
        moved = true;
      }

      if (moved) {
        e.preventDefault(); // stop arrow keys from scrolling the page
      }
    });
    // Restart button: reload the page to reset everything
    const restartBtn = document.getElementById("restartButton");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }

    // Mission select overlay is shown by UI_init (UI.js)

  } catch (err) {
    console.error(err);
    log("ERROR: " + err.message);
  }
})();
