// js/facts.js
// Educational facts the AI can speak based on biome / hazards.

const FACTS = {
  vent: [
    "Hydrothermal vents can exceed 400°C, yet the surrounding water stays liquid due to immense pressure.",
    "Vent ecosystems rely on chemosynthesis, not sunlight — bacteria convert chemicals into energy.",
    "Tube worms near vents can grow over 2 meters long and have no mouths or digestive systems.",
    "Vent fields often form along mid-ocean ridges where tectonic plates pull apart."
  ],
  predator: [
    "Apex predators in the deep sea often hunt using vibrations or faint electrical signals.",
    "Some deep predators have extendable jaws to swallow prey nearly their own size.",
    "Low-light environments give predators the advantage — most ambush their prey.",
    "Large predators often follow nutrient-rich currents that carry smaller organisms."
  ],
  coral: [
    "Deep-sea corals grow extremely slowly — sometimes less than 1 cm per year.",
    "Unlike shallow corals, deep corals do not rely on sunlight and survive in total darkness.",
    "Coral forests provide shelter for countless species, acting like underwater cities.",
    "Deep corals are sensitive to temperature and chemical changes — they are indicators of ocean health."
  ],
  trench: [
    "Ocean trenches can exceed 8,000 meters in depth, with pressures over 1,000 atmospheres.",
    "Trench ecosystems rely on marine snow — organic matter falling from upper waters.",
    "Some trench creatures have transparent skin and gelatinous bodies to survive pressure.",
    "Temperatures in trenches can drop close to freezing, slowing metabolic activity."
  ],
  current: [
    "Deep-sea currents move slowly but steadily, shaping entire ecosystems over centuries.",
    "Unstable currents create turbulence that can damage fragile organisms.",
    "Many animals migrate by following temperature gradients created by currents.",
    "Strong currents often transport nutrients, making them hotspots for biodiversity."
  ],
  methane: [
    "Methane seeps support unique life that survives on methane-eating bacteria.",
    "Methane bubbles can create localized acidity, harmful to most fish species.",
    "Methane pockets are often found near sediment slides or decaying organic material."
  ],
  slope: [
    "Continental slopes mark the transition from shallow seas to the deep ocean.",
    "Slopes are biodiversity hotspots — many species feed on falling organic material here.",
    "Underwater landslides on slopes can reshape entire coastlines."
  ],
  general: [
    "Less than 5% of Earth's ocean has been explored — most of it remains a mystery.",
    "Deep-sea pressure can crush metal but is survivable for animals with fluid-filled bodies.",
    "Many deep creatures produce bioluminescence to communicate or distract predators.",
    "Some deep animals have evolved antifreeze proteins to survive near-freezing temperatures."
  ]
};

function AI_fact(type) {
  const AI = window.AI;
  let list = FACTS[type];
  if (!list) list = FACTS.general;

  const fact = list[Math.floor(Math.random() * list.length)];
  AI.say(fact, 6000);
}

/**
 * Called whenever the sub moves; sometimes speak a biome fact.
 */
function checkBiomeFacts(world, row, col) {
  const cell = world[row] && world[row][col];
  if (!cell || !cell.biome) return;

  if (Math.random() < 0.15) {
    AI_fact(cell.biome.toLowerCase());
  }
}

window.FACTS = FACTS;
window.AI_fact = AI_fact;
window.checkBiomeFacts = checkBiomeFacts;
