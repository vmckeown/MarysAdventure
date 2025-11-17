// input.js
export const keys = {};
const previousKeys = {};

export function setupInput() {
  window.addEventListener("keydown", (e) => (keys[e.key] = true));
  window.addEventListener("keyup", (e) => (keys[e.key] = false));
}

export function wasKeyPressed(key) {
  const pressed = keys[key] && !previousKeys[key];
  previousKeys[key] = keys[key];
  return pressed;
}
