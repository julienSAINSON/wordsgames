import { difficultyLevels, getAllowedErrors } from "../data/difficulties.js";

export function getDifficulty(level) {
  return difficultyLevels[level] ?? difficultyLevels[1];
}

export function getExerciseRules(exercise) {
  const wordLength = Array.from(exercise.word).length;
  return {
    difficulty: getDifficulty(exercise.difficulty),
    wordLength,
    allowedErrors: getAllowedErrors(wordLength),
  };
}