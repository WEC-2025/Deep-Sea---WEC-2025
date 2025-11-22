// js/assistant.js
// Handles the AI assistant text displayed to the player

const AI = {

  panel: null,          // the UI element that shows messages
  queue: [],            // future messages if multiple fire at once
  isSpeaking: false,    // prevents overlap

  init() {
    this.panel = document.getElementById("aiPanel");
  },

  say(message, duration = 3000) {
    if (!message) return;

    // Add message to queue
    this.queue.push({ text: message, duration });

    // If assistant is not currently speaking, speak immediately
    if (!this.isSpeaking) {
      this._next();
    }
  },

  _next() {
    if (this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this.isSpeaking = true;

    const { text, duration } = this.queue.shift();
    this._displayMessage(text);

    setTimeout(() => {
      this._clearMessage();
      this._next();
    }, duration);
  },

  _displayMessage(text) {
    if (this.panel) {
      this.panel.textContent = text;
      this.panel.classList.add("visible");
    }
  },

  _clearMessage() {
    if (this.panel) {
      this.panel.classList.remove("visible");
      this.panel.textContent = "";
    }
  },

  // Mission-based helper functions
  missionStart(mission) {
    if (mission && mission.introAI) {
      this.say(mission.introAI, 5000);
    }
  },

  missionSuccess(mission) {
    if (mission && mission.successAI) {
      this.say(mission.successAI, 5000);
    }
  },

  missionFail(mission) {
    if (mission && mission.failureAI) {
      this.say(mission.failureAI, 5000);
    }
  },

  hint(hintText) {
    this.say(hintText, 4000);
  },

  hazardWarning(type) {
    this.say(`Warning: ${type} detected. Proceed with caution.`, 4000);
  },

  predatorWarning() {
    this.say("Predator movement detected nearby.", 4000);
  }
};

// expose globally
window.AI = AI;
