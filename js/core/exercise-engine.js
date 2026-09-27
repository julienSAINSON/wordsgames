import { createExerciseSession } from "./exercise-session.js";

export function createExerciseEngine({ eventBus, ttsService, progressStore }) {
  function speakExercise(exercise) {
    ttsService.speak(exercise.originalWord ?? exercise.word, { language: exercise.language });
  }

  return Object.freeze({
    start(exercise) {
      const session = createExerciseSession(exercise, eventBus);
      session.start();
      speakExercise(exercise);
      return session;
    },
    repeatWord(exercise) {
      speakExercise(exercise);
    },
    finish(exercise, result, onOutcome) {
      if (result.completed) {
        progressStore.recordSuccess(exercise);
        speakExercise(exercise);
      }
      if (result.failed) speakExercise(exercise);
      if (result.completed || result.failed) onOutcome?.({ completed: result.completed, word: exercise.word });
    },
  });
}