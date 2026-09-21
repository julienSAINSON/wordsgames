export function createSoundService() {
  let audioContext;

  function playTone(frequency, duration, type, volume) {
    try {
      audioContext ??= new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Audio is optional when browser playback is unavailable.
    }
  }

  return Object.freeze({
    playPop: () => playTone(620, 0.12, "sine", 0.06),
    playError: () => playTone(150, 0.18, "triangle", 0.05),
    playSuccess: () => playTone(880, 0.25, "sine", 0.07),
    playRun: () => playTone(210, 0.06, "triangle", 0.025),
    playApproach: () => playTone(480, 0.09, "sine", 0.045),
    playJump: () => playTone(360, 0.14, "sine", 0.05),
  });
}