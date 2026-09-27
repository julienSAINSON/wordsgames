import { createTtsService } from "../audio/tts-service.js";
import { createSoundService } from "../audio/sound-service.js";
import { createSpatialAudio } from "../audio/spatial-audio.js";
import { createHomeScreen } from "./app/screens.js";
import { getDifficulty } from "./core/difficulty.js";
import { createExerciseEngine } from "./core/exercise-engine.js";
import { createEventBus } from "./core/event-bus.js";
import { createWordProvider } from "./core/word-provider.js";
import { createProgressStore } from "../progression/progress-store.js";
import { createDebugPanel } from "./ui/debug-panel.js";
import { createLabScreen } from "./ui/lab-screen.js";
import { createRacingGame } from "./games/racing/racing-game.js";
import { createBubblesGame } from "./games/bubbles/bubbles-game.js";
import { createHurdlesGame } from "./games/hurdles/hurdles-game.js";
import { createSpaceGame } from "./games/space/space-game.js";

const app = document.querySelector("#app");
const eventBus = createEventBus();
const engine = createExerciseEngine({
  eventBus,
  ttsService: createTtsService(),
  progressStore: createProgressStore(),
});
const soundService = createSoundService();
const spatialTtsService = createTtsService();
const wordProvider = createWordProvider();
let activeGame;

function createExercise(context, difficulty) {
  const selectedWord = wordProvider.getRandomWord(context.childId, context.seriesId);
  return {
    id: `reading-${context.childId}-${context.seriesId}-${selectedWord.normalized}`,
    domain: "reading",
    language: "fr-FR",
    word: selectedWord.normalized,
    originalWord: selectedWord.original,
    difficulty,
    context: Object.freeze({ childId: context.childId, seriesId: context.seriesId }),
  };
}

function startRacing(context, level = 1) {
  activeGame?.destroy();
  const exerciseForLevel = createExercise(context, level);
  const session = engine.start(exerciseForLevel);
  const racingGame = createRacingGame({
    session,
    racingRules: getDifficulty(level).gameRules.racing,
    repeatWord: () => engine.repeatWord(exerciseForLevel),
    finish: (result) => engine.finish(exerciseForLevel, result),
    nextWord: () => startRacing(context, level),
    onSelectLevel: (nextLevel) => startRacing(context, nextLevel),
  });
  activeGame = racingGame;
  racingGame.mount(app);
}
function startBubbles(context, level = 1) {
  activeGame?.destroy();
  const exerciseForLevel = createExercise(context, level);
  const session = engine.start(exerciseForLevel);
  const bubblesGame = createBubblesGame({
    session,
    bubbleRules: getDifficulty(level).gameRules.bubbles,
    repeatWord: () => engine.repeatWord(exerciseForLevel),
    finish: (result) => engine.finish(exerciseForLevel, result),
    nextWord: () => startBubbles(context, level),
    onSelectLevel: (nextLevel) => startBubbles(context, nextLevel),
    soundService,
  });
  activeGame = bubblesGame;
  bubblesGame.mount(app);
}
function startHurdles(context, level = 1) {
  activeGame?.destroy();
  const exerciseForLevel = createExercise(context, level);
  const session = engine.start(exerciseForLevel);
  const hurdlesGame = createHurdlesGame({
    session,
    hurdleRules: getDifficulty(level).gameRules.hurdles,
    repeatWord: () => engine.repeatWord(exerciseForLevel),
    finish: (result) => engine.finish(exerciseForLevel, result),
    nextWord: () => startHurdles(context, level),
    onSelectLevel: (nextLevel) => startHurdles(context, nextLevel),
    soundService,
  });
  activeGame = hurdlesGame;
  hurdlesGame.mount(app);
}
function startSpace(context, level = 1) {
  activeGame?.destroy();
  const exerciseForLevel = createExercise(context, level);
  const session = engine.start(exerciseForLevel);
  const spatialAudio = createSpatialAudio(spatialTtsService, exerciseForLevel.originalWord);
  const spaceGame = createSpaceGame({
    session,
    spaceRules: getDifficulty(level).gameRules.space,
    repeatWord: () => engine.repeatWord(exerciseForLevel),
    finish: (result) => engine.finish(exerciseForLevel, result, (outcome) => showOutcome(outcome)),
    nextWord: () => startSpace(context, level),
    onSelectLevel: (nextLevel) => startSpace(context, nextLevel),
    soundService,
    spatialAudio,
  });
  activeGame = spaceGame;
  spaceGame.mount(app);
}
function showOutcome({ completed, word }) {
  const outcome = document.createElement("div");
  outcome.className = "mission-outcome";
  outcome.textContent = completed ? `Mot trouve : ${word}` : `Mot correct : ${word}`;
  app.append(outcome);
  window.setTimeout(() => outcome.remove(), 3200);
}
function showStartupError(error) {
  app.innerHTML = `<section class="startup-error"><h1>Contenu indisponible</h1><p>${error.message}</p></section>`;
}

function enterGameFullscreen() {
  document.documentElement.requestFullscreen?.().catch(() => {});
}

let contentLoaded = true;
try {
  await wordProvider.load();
} catch (error) {
  contentLoaded = false;
  showStartupError(error);
}

if (contentLoaded) {
const home = createHomeScreen({ wordProvider, onSelectGame: (gameId, context) => {
  if (gameId !== "lab") enterGameFullscreen();
  if (gameId === "racing") {
    startRacing(context);
    return;
  }
  if (gameId === "bubbles") {
    startBubbles(context);
    return;
  }
  if (gameId === "hurdles") {
    startHurdles(context);
    return;
  }
  if (gameId === "space") {
    startSpace(context);
    return;
  }
  if (gameId !== "lab") return;
  activeGame?.destroy();
  activeGame = undefined;
  const exercise = createExercise(context, 1);
  const session = engine.start(exercise);
  app.append(createLabScreen({
    session,
    repeatWord: () => engine.repeatWord(exercise),
    finish: (result) => engine.finish(exercise, result),
  }));
}});
const debugPanel = createDebugPanel(eventBus);

home.querySelector("[data-debug]").addEventListener("click", (event) => {
  const visible = debugPanel.hidden;
  debugPanel.hidden = !visible;
  event.currentTarget.setAttribute("aria-pressed", String(visible));
});

app.append(home, debugPanel);
}