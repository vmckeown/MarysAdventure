import { unlockAudio } from "./audio.js";

export const keys = {};
const previousKeys = {};

let audioUnlocked = false;

export function setupInput() {
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;

    if (!audioUnlocked) {
      unlockAudio();
      audioUnlocked = true;
    }
  });

  window.addEventListener("mousedown", () => {
    if (!audioUnlocked) {
      unlockAudio();
      audioUnlocked = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });
}

export function wasKeyPressed(key) {
  const pressed = keys[key] && !previousKeys[key];
  previousKeys[key] = keys[key];
  return pressed;
}
