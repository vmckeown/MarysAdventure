const sounds = {};
let audioContext;

export function loadSound(name, src, volume = 1) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.preload = "auto";
  sounds[name] = audio;
}

export function unlockAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const test = Object.values(sounds)[0];
  if (test) {
    test.play().catch(() => {});
    test.pause();
    test.currentTime = 0;
  }
}

export function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;

  sound.currentTime = 0;
  sound.play().catch(() => {});
}
