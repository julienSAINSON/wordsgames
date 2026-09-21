export const difficultyLevels = {
  1: {
    level: 1,
    wordLength: { min: 2, max: 3 },
    distractorCount: 1,
    responseTimeSeconds: null,
    repeatWordAllowed: true,
    gameRules: {
      racing: { laneCount: 2, speed: 0.18, letterScale: 1.2 },
      bubbles: { proposalCount: 2, speed: 24, radius: 62, drift: 8 },
      hurdles: { proposalCount: 2, runnerSpeed: 0.17, approachStart: 0.38, jumpAt: 0.77, lateAt: 0.94, letterSize: 44 },
      space: { stoneCount: 3, worldWidth: 1500, gravity: 16, thrust: 105, rotationSpeed: 2.7, grappleRange: 310, stoneSpacing: 230 },
    },
  },
  2: {
    level: 2,
    wordLength: { min: 4, max: 5 },
    distractorCount: 2,
    responseTimeSeconds: 10,
    repeatWordAllowed: true,
    gameRules: {
      racing: { laneCount: 3, speed: 0.25, letterScale: 1 },
      bubbles: { proposalCount: 3, speed: 35, radius: 52, drift: 15 },
      hurdles: { proposalCount: 3, runnerSpeed: 0.24, approachStart: 0.45, jumpAt: 0.76, lateAt: 0.9, letterSize: 40 },
      space: { stoneCount: 4, worldWidth: 2200, gravity: 23, thrust: 110, rotationSpeed: 2.8, grappleRange: 96, stoneSpacing: 380 },
    },
  },
  3: {
    level: 3,
    wordLength: { min: 6, max: 12 },
    distractorCount: 3,
    responseTimeSeconds: 7,
    repeatWordAllowed: false,
    gameRules: {
      racing: { laneCount: 4, speed: 0.32, letterScale: 0.86 },
      bubbles: { proposalCount: 4, speed: 48, radius: 43, drift: 23 },
      hurdles: { proposalCount: 4, runnerSpeed: 0.32, approachStart: 0.5, jumpAt: 0.75, lateAt: 0.86, letterSize: 35 },
      space: { stoneCount: 5, worldWidth: 3000, gravity: 31, thrust: 118, rotationSpeed: 3, grappleRange: 82, stoneSpacing: 520 },
    },
  },
};

export function getAllowedErrors(wordLength) {
  if (wordLength <= 3) return 1;
  if (wordLength <= 5) return 2;
  return 3;
}