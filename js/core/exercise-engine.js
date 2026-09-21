import { createExerciseSession } from "./exercise-session.js";

export function createExerciseEngine({ eventBus, ttsService, progressStore }) {
  return Object.freeze({
    start(exercise) {
      const session = createExerciseSession(exercise, eventBus);
      session.start();
      ttsService.speak(exercise.word, { language: exercise.language });
      return session;
    },
    repeatWord(exercise) {
      ttsService.speak(exercise.word, { language: exercise.language });
    },
    finish(exercise, result, onOutcome) {
      if (result.completed) {
        progressStore.recordSuccess(exercise);
        ttsService.speak(exercise.word, { language: exercise.language });
      }
      if (result.failed) ttsService.speak(exercise.word, { language: exercise.language });
      if (result.completed || result.failed) onOutcome?.({ completed: result.completed, word: exercise.word });
    },
  });
}