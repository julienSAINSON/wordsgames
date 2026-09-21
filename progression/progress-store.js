const storageKey = "atelier-des-mots.progress.v1";

function read() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey)) ?? { successes: [] };
  } catch {
    return { successes: [] };
  }
}

export function createProgressStore() {
  return Object.freeze({
    recordSuccess(exercise) {
      const progress = read();
      progress.successes.push({ id: exercise.id, at: new Date().toISOString() });
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    },
    getProgress() {
      return read();
    },
  });
}