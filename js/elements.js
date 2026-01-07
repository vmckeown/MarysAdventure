// elements.js
export const ELEMENTS = {
  air: {
    unlocked: false,
    level: 0,
    pointsSpent: 0
  },
  water: {
    unlocked: false,
    level: 0,
    pointsSpent: 0
  },
  fire: {
    unlocked: false,
    level: 0,
    pointsSpent: 0
  },
  nature: {
    unlocked: false,
    level: 0,
    pointsSpent: 0
  }
};

export let elementPoints = 0;

export function unlockElement(name) {
  const el = ELEMENTS[name];
  if (!el || el.unlocked) return;

  el.unlocked = true;
  console.log(`🌟 Element discovered: ${name.toUpperCase()}`);
}

export function gainElementPoint() {
  elementPoints++;
  console.log(`✨ Gained an Element Point (${elementPoints})`);
}

export function spendElementPoint(name) {
  const el = ELEMENTS[name];
  if (!el || !el.unlocked) return false;
  if (elementPoints <= 0) return false;

  elementPoints--;
  el.level++;
  el.pointsSpent++;

  console.log(`⬆ ${name.toUpperCase()} leveled to ${el.level}`);
  return true;
}
