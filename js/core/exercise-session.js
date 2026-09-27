import { getExerciseRules } from "./difficulty.js";

function normalizeLetter(letter) {
  const value = String(letter ?? "");
  return value === " " ? value : value.trim().toLocaleUpperCase("fr-FR");
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÄÇÉÈÊËÎÏÔ".split("");

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function createExerciseSession(exercise, eventBus) {
  const letters = Array.from(exercise.word.toLocaleUpperCase(exercise.language));
  const rules = getExerciseRules(exercise);
  let validatedCount = 0;
  let errorsUsed = 0;
  let state = "ready";
  let proposalSetCount = 0;

  function snapshot() {
    return Object.freeze({
      state,
      wordLength: rules.wordLength,
      validatedLetters: validatedCount,
      errorsRemaining: Math.max(0, rules.allowedErrors - errorsUsed),
      allowedErrors: rules.allowedErrors,
      completed: state === "completed",
      failed: state === "failed",
    });
  }

  function publish(type, detail) {
    eventBus.emit(type, { ...detail, session: snapshot() });
  }

  return Object.freeze({
    start() {
      if (state === "ready") {
        state = "active";
        publish("exercise:start", {});
      }
      return snapshot();
    },
    submitLetter(letter) {
      if (state !== "active") {
        return Object.freeze({ ...snapshot(), accepted: false, correct: false });
      }

      const proposal = normalizeLetter(letter);
      const correct = proposal === letters[validatedCount];
      if (correct) {
        validatedCount += 1;
        if (validatedCount === letters.length) {
          state = "completed";
          publish("exercise:success", { proposal });
        } else {
          publish("letter:correct", { proposal });
        }
      } else {
        errorsUsed += 1;
        if (errorsUsed >= rules.allowedErrors) {
          state = "failed";
          publish("exercise:failed", { proposal });
        } else {
          publish("letter:wrong", { proposal });
        }
      }

      return Object.freeze({ ...snapshot(), accepted: true, correct });
    },
    fail(reason = "timeout") {
      if (state !== "active") return snapshot();
      state = "failed";
      publish("exercise:failed", { reason });
      return snapshot();
    },
    createLetterField(distractorCount) {
      if (state !== "active" || !Number.isInteger(distractorCount) || distractorCount < 1) return Object.freeze([]);
      const values = shuffle([
        ...letters,
        ...Array.from({ length: distractorCount }, () => alphabet[Math.floor(Math.random() * alphabet.length)]),
      ]);
      const proposals = values.map((value, index) => Object.freeze({
        id: `field-${proposalSetCount}-${index}`,
        value,
      }));
      proposalSetCount += 1;
      eventBus.emit("proposals:created", { count: proposals.length, session: snapshot() });
      return Object.freeze(proposals);
    },
    createLetterProposals(count) {
      if (state !== "active" || !Number.isInteger(count) || count < 2) return Object.freeze([]);
      const expectedLetter = letters[validatedCount];
      const distractors = shuffle(alphabet.filter((letter) => letter !== expectedLetter)).slice(0, count - 1);
      const proposals = shuffle([expectedLetter, ...distractors]).map((value, index) => Object.freeze({
        id: `proposal-${proposalSetCount}-${index}`,
        value,
      }));
      proposalSetCount += 1;
      eventBus.emit("proposals:created", { count: proposals.length, session: snapshot() });
      return Object.freeze(proposals);
    },
    getState() {
      return snapshot();
    },
  });
}