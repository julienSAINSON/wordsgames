function contentError(message) {
  return new Error(`Le fichier data/words.json est invalide : ${message}`);
}

function normalizeWord(word) {
  const original = word.trim();
  return Object.freeze({ original, normalized: original.toLocaleUpperCase("fr-FR") });
}

function validateContent(content) {
  if (!content || !Array.isArray(content.children)) throw contentError("children doit etre un tableau.");
  return content.children.map((child, childIndex) => {
    if (!child || typeof child.id !== "string" || !child.id || typeof child.name !== "string" || !child.name || !Array.isArray(child.series)) {
      throw contentError(`enfant ${childIndex + 1} doit avoir id, name et series.`);
    }
    return Object.freeze({
      id: child.id,
      name: child.name,
      series: Object.freeze(child.series.map((series, seriesIndex) => {
        if (!series || typeof series.id !== "string" || !series.id || typeof series.title !== "string" || !series.title || !Array.isArray(series.words)) {
          throw contentError(`serie ${seriesIndex + 1} de ${child.id} doit avoir id, title et words.`);
        }
        if (!series.words.length || series.words.some((word) => typeof word !== "string" || !word.trim())) {
          throw contentError(`words de ${child.id}/${series.id} doit contenir des chaines non vides.`);
        }
        return Object.freeze({ id: series.id, title: series.title, words: Object.freeze(series.words.map(normalizeWord)) });
      })),
    });
  });
}

export function createWordProvider(url = "./data/words.json") {
  let children = [];

  function getChild(childId) {
    return children.find((child) => child.id === childId);
  }

  function getSeries(childId, seriesId) {
    const child = getChild(childId);
    if (!child) return undefined;
    if (seriesId === undefined) return child.series;
    return child.series.find((series) => series.id === seriesId);
  }

  return Object.freeze({
    async load() {
      let response;
      try {
        response = await fetch(url);
      } catch {
        throw new Error("Impossible de charger data/words.json. Lancez l'application depuis un serveur statique.");
      }
      if (!response.ok) throw new Error(`Impossible de charger data/words.json (${response.status}).`);
      try {
        children = validateContent(await response.json());
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error("Le fichier data/words.json contient du JSON invalide.");
        throw error;
      }
      return children;
    },
    getChildren() {
      return children.map(({ id, name }) => Object.freeze({ id, name }));
    },
    getChild(childId) {
      return getChild(childId);
    },
    getSeries,
    getWords(childId, seriesId) {
      return getSeries(childId, seriesId)?.words.map((word) => word.original) ?? [];
    },
    getRandomWord(childId, seriesId) {
      const words = getSeries(childId, seriesId)?.words;
      if (!words?.length) throw new Error("Aucun mot disponible pour l'enfant et la serie selectionnes.");
      return words[Math.floor(Math.random() * words.length)];
    },
  });
}