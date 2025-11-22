// js/missions.js
// 5 missions, all based on movement & environment. No scanning actions needed.

const MISSIONS = [
  {
    id: 1,
    title: "First Contact",
    description: "Reach any Point of Interest (📍) within 60 seconds.",
    type: "reach_poi",
    targetCount: 1,
    timeLimit: 60,

    introAI: "Mission 1 active. Reach any Point of Interest beacon before time runs out.",
    successAI: "Target reached. Telemetry from the beacon looks excellent.",
    failureAI: "Mission failed. No beacon was reached in time.",
    hintAI: "Head toward regions with fewer hazards and watch for 📍 markers on the grid."
  },

  {
    id: 2,
    title: "Survey the Abyss",
    description: "Visit 3 different Points of Interest anywhere on the map.",
    type: "multi_poi",
    targetCount: 3,
    timeLimit: 200,

    introAI: "Mission 2 active. We need a broader survey. Visit three unique Points of Interest.",
    successAI: "Survey complete. We've mapped a valuable section of the abyssal terrain.",
    failureAI: "Mission failed. Insufficient Points of Interest were reached in time.",
    hintAI: "After reaching one POI, adjust your course laterally or by depth to find others."
  },

  {
    id: 3,
    title: "Deep Dive",
    description: "Reach a depth of at least 6000 meters.",
    type: "reach_depth",
    targetDepth: 6000,
    timeLimit: 180,

    introAI: "Mission 3 active. Take the sub down to 6000 meters. Monitor hull integrity closely.",
    successAI: "Depth target achieved. These deep readings are invaluable.",
    failureAI: "Mission failed. We never reached the requested depth window.",
    hintAI: "Look for darker, trench-like regions. Depth increases as you head toward the lowest basins."
  },

  {
    id: 4,
    title: "Pressure Test",
    description: "Reach a region where pressure exceeds 500 atmospheres.",
    type: "reach_pressure",
    targetPressure: 500,
    timeLimit: 180,

    introAI: "Mission 4 active. We need high-pressure data. Find a region where pressure exceeds 500 atmospheres.",
    successAI: "Pressure threshold met. Hull telemetry confirms structural resilience.",
    failureAI: "Mission failed. The sub never encountered sufficient pressure.",
    hintAI: "Depth and pressure are linked — deeper zones will show higher pressure in your HUD."
  },

  {
    id: 5,
    title: "Hazard Run",
    description: "Enter 3 different hazard tiles (outlined in red) without being destroyed.",
    type: "visit_hazards",
    targetCount: 3,
    timeLimit: 220,

    introAI: "Mission 5 active. Approach three distinct hazard zones to assess their risk profile. Stay alert.",
    successAI: "Hazard traversal successful. Your path will help future pilots avoid the worst zones.",
    failureAI: "Mission failed. The hazard run could not be completed.",
    hintAI: "Hazard zones are outlined in red. Move carefully; each unique hazard tile counts once."
  }
];

// expose globally so UI.js and main.js can use it
window.MISSIONS = MISSIONS;
