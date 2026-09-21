export function createSpatialAudio(ttsService, announcement) {
  let lastAnnouncement = 0;

  return Object.freeze({
    announce({ distance, maximumDistance }) {
      const volume = Math.max(0, 1 - distance / maximumDistance);
      const now = performance.now();
      if (volume < 0.12 || now - lastAnnouncement < 7000) return;
      lastAnnouncement = now;
      ttsService.speak(announcement, { rate: 0.78, pitch: 0.72, volume });
    },
    stop() {
      lastAnnouncement = 0;
      ttsService.stop?.();
    },
  });
}