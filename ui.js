// js/UI.js
// Handles UI: mission panel, hint button, mission selection overlay.

let currentMissionIndex = -1;

/*-------------------------------------------------------
    INITIALIZE UI
-------------------------------------------------------*/
function UI_init() {
  UI_setupHintButton();
  UI_setupMissionSelect();

  const box = document.getElementById("missionText");
  if (box) {
    box.innerHTML = "<em>No mission active.</em>";
  }
}

/*-------------------------------------------------------
    UPDATE THE MISSION TEXT
-------------------------------------------------------*/
function UI_updateMissionBox(mission) {
  const box = document.getElementById("missionText");
  if (!box) return;

  if (!mission) {
    box.innerHTML = "<em>No mission active.</em>";
    return;
  }
  box.textContent = mission.description;
}

/*-------------------------------------------------------
    START A MISSION (called when a button is clicked)
-------------------------------------------------------*/
function UI_startMission(id) {
  const missions = window.MISSIONS || [];
  const mission = missions.find(m => m.id === id);

  if (!mission) {
    console.error("Mission not found:", id);
    return;
  }

  currentMissionIndex = missions.indexOf(mission);
  window.currentMissionIndex = currentMissionIndex;

  UI_updateMissionBox(mission);

  // AI intro line
  if (window.AI && typeof window.AI.missionStart === "function") {
    window.AI.missionStart(mission);
  }

  // Notify main.js to start mission logic
  if (typeof window.startMissionLogic === "function") {
    window.startMissionLogic(mission);
  }

  // Hide mission overlay
  const screen = document.getElementById("missionSelectScreen");
  if (screen) screen.style.display = "none";
}

/*-------------------------------------------------------
    HINT BUTTON
-------------------------------------------------------*/
function UI_setupHintButton() {
  const btn = document.getElementById("hintButton");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const missions = window.MISSIONS || [];

    if (currentMissionIndex === -1) {
      window.AI && window.AI.say("No mission active.");
      return;
    }

    const mission = missions[currentMissionIndex];
    if (mission && mission.hintAI) {
      window.AI && window.AI.hint(mission.hintAI);
    } else {
      window.AI && window.AI.say("No hint available for this mission.");
    }
  });
}

/*-------------------------------------------------------
    MISSION SELECTION OVERLAY
-------------------------------------------------------*/
function UI_setupMissionSelect() {
  const container = document.getElementById("missionSelectScreen");
  if (!container) return;

  const missions = window.MISSIONS || [];

  // Build UI
  container.innerHTML = "<h2>Select a Mission</h2>";

  missions.forEach(mission => {
    const btn = document.createElement("button");
    btn.textContent = mission.title;
    btn.className = "mission-btn";

    btn.addEventListener("click", () => {
      UI_startMission(mission.id);
    });

    container.appendChild(btn);
  });

  // Show overlay at start
  container.style.display = "flex";
}

/*-------------------------------------------------------
    SUCCESS / FAIL (called by main.js)
-------------------------------------------------------*/
function UI_missionSuccess() {
  const missions = window.MISSIONS || [];
  const mission = missions[currentMissionIndex];

  if (window.AI && typeof window.AI.missionSuccess === "function") {
    window.AI.missionSuccess(mission);
  }

  const box = document.getElementById("missionText");
  if (box) {
    box.textContent = `MISSION COMPLETE: ${mission ? mission.title : ""}`;
  }

  // 🔁 After a short delay, re-open mission select so player can pick another
  const screen = document.getElementById("missionSelectScreen");
  if (screen) {
    setTimeout(() => {
      screen.style.display = "flex";
      if (box) {
        box.innerHTML = "<em>No mission active.</em>";
      }
      currentMissionIndex = -1;
      window.currentMissionIndex = -1;
    }, 3000); // 3 seconds so they can see the success message
  }
}

function UI_missionFail() {
  const missions = window.MISSIONS || [];
  const mission = missions[currentMissionIndex];

  if (window.AI && typeof window.AI.missionFail === "function") {
    window.AI.missionFail(mission);
  }

  const box = document.getElementById("missionText");
  if (box) {
    box.textContent = `MISSION FAILED: ${mission ? mission.title : ""}`;
  }

  // 🔁 After a short delay, let the player choose a new mission
  const screen = document.getElementById("missionSelectScreen");
  if (screen) {
    setTimeout(() => {
      screen.style.display = "flex";
      if (box) {
        box.innerHTML = "<em>No mission active.</em>";
      }
      currentMissionIndex = -1;
      window.currentMissionIndex = -1;
    }, 3000);
  }
}


// expose globally
window.UI_init = UI_init;
window.UI_startMission = UI_startMission;
window.UI_missionSuccess = UI_missionSuccess;
window.UI_missionFail = UI_missionFail;
window.UI_updateMissionBox = UI_updateMissionBox;
