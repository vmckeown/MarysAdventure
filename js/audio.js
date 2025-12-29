const sounds = {};

export function loadSound(name, src, volume = 1) {
  const audio = new Audio(src);
  audio.volume = volume;
  sounds[name] = audio;
}

export function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;

  // clone so overlapping sounds work
  const instance = sound.cloneNode();
  instance.volume = sound.volume;
  instance.play();
}
