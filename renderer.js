// js/renderer.js
// Renders the full grid into #game-container and updates tiles
// with biome color, hazards, POIs, predator icon, submarine position,
// and fog-of-war using a visibility grid.

export function initRenderer(world, metadata, stats, options = {}) {
  const { playerState, visibility, onCellSelected } = options;

  const container = document.getElementById("game-container");
  container.innerHTML = ""; // clear whatever was there

  const rows = metadata.grid.rows;
  const cols = metadata.grid.cols;

  // store DOM references for each tile
  const tiles = [];

  for (let r = 0; r < rows; r++) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "map-row";
    container.appendChild(rowDiv);

    const rowTiles = [];

    for (let c = 0; c < cols; c++) {
      const tileDiv = document.createElement("div");
      tileDiv.className = "map-tile";
      tileDiv.dataset.row = r;
      tileDiv.dataset.col = c;

      // optional click handler to inspect a cell
      if (typeof onCellSelected === "function") {
        tileDiv.addEventListener("click", () => {
          const cell = world[r][c];
          onCellSelected(cell, r, c);
        });
      }

      rowDiv.appendChild(tileDiv);
      rowTiles.push(tileDiv);
    }

    tiles.push(rowTiles);
  }

  function updateTile(r, c) {
    const tile = tiles[r][c];
    const cell = world[r][c];

    const vis =
      visibility && visibility[r] && visibility[r][c]
        ? visibility[r][c]
        : null;

    tile.className = "map-tile";
    tile.innerHTML = "";

    // --------------------------------
    // FOG OF WAR HANDLING
    // --------------------------------
    if (vis && !vis.discovered) {
      // Never seen: pure black box, no info
      tile.classList.add("fog-unknown");
      return;
    }

    const isShadowed = vis && !vis.visible;
    const canShowIcons = !isShadowed;

    if (!cell) return;

    // -----------------------
    // Biome background color
    // -----------------------
    if (cell.biome) {
      const biomeName = String(cell.biome).toLowerCase();

      if (biomeName.includes("plain")) {
        tile.classList.add("biome-plain");
      } else if (biomeName.includes("slope")) {
        tile.classList.add("biome-slope");
      } else if (biomeName.includes("seamount") || biomeName.includes("ridge")) {
        tile.classList.add("biome-seamount");
      } else if (biomeName.includes("trench")) {
        tile.classList.add("biome-trench");
      } else if (biomeName.includes("hydro")) {
        tile.classList.add("biome-hydrothermal");
      }
    }

    // If this tile is "seen but not currently visible", darken it
    if (isShadowed) {
      tile.classList.add("fog-seen");
    }

    // -----------------------
    // Hazards (red border)
    // -----------------------
    if (cell.hazards && cell.hazards.length > 0) {
      tile.classList.add("hazard");
    }

    // -----------------------
    // POI marker (📍 bottom-right)
    // -----------------------
    if (canShowIcons && cell.poi && cell.poi.length > 0) {
      const poiSpan = document.createElement("span");
      poiSpan.className = "icon";
      poiSpan.textContent = "📍";
      tile.appendChild(poiSpan);
    }

    // -----------------------
    // Predator icon (🦈 top-left)
    // threat_level >= 3 from life.csv
    // -----------------------
    if (
      canShowIcons &&
      cell.life &&
      cell.life.some((sp) => Number(sp.threat_level) >= 3)
    ) {
      const predatorSpan = document.createElement("span");
      predatorSpan.className = "predator-icon";
      predatorSpan.textContent = "🦈";
      tile.appendChild(predatorSpan);
    }

    // -----------------------
    // Submarine (centered)
    // -----------------------
    if (playerState && r === playerState.row && c === playerState.col) {
      const subDiv = document.createElement("div");
      subDiv.className = "submarine";
      subDiv.textContent = "🚢";
      tile.appendChild(subDiv);
    }
  }

  function redrawAll() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        updateTile(r, c);
      }
    }
  }

  function setPlayerPosition(row, col) {
    // main.js updates playerState & visibility; we just redraw
    redrawAll();
  }

  // initial draw
  redrawAll();

  return {
    setPlayerPosition,
  };
}
