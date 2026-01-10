import { ELEMENT_SKILLS } from "./skills.js";

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

export function unlockElement(elementKey) {
  var element = ELEMENTS[elementKey];
  if (!element) {
    console.warn("⚠ Unknown element:", elementKey);
    return;
  }

  element.unlocked = true;

  // 🔗 SYNC WITH SKILL TREE
  if (ELEMENT_SKILLS[elementKey]) {
    ELEMENT_SKILLS[elementKey].unlocked = true;
  }

  console.log("✨ ELEMENT STATE:", ELEMENTS);
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

export function getActiveElements() {
  return Object.entries(ELEMENTS)
    .filter(([_, e]) => e.unlocked)
    .map(([key]) => key);
}

