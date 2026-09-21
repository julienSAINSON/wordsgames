export function createTtsService() {
  function speak(text, { language = "fr-FR", rate = 0.78, pitch = 1, volume = 1 } = {}) {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  return Object.freeze({
    speak,
    stop() {
      window.speechSynthesis?.cancel();
    },
  });
}