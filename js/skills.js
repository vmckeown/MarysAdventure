// skills.js
export const SKILLS = {
  melee: { level: 1, xp: 0 },
  ranged: { level: 1, xp: 0 },
  defense: { level: 1, xp: 0 },
};

export function skillXpForNextLevel(level) {
  return Math.floor(20 + level * 10);
}

export function gainSkillXp(skillName, amount) {
  const skill = SKILLS[skillName];
  if (!skill) return;

  skill.xp += amount;

  const needed = skillXpForNextLevel(skill.level);
  if (skill.xp >= needed) {
    skill.xp -= needed;
    skill.level++;

    console.log(`⬆ ${skillName.toUpperCase()} leveled to ${skill.level}`);

    // hook: overall level XP
    gainPlayerXp(5); // small global XP bump
  }
}

export const ELEMENT_SKILLS = {
  air: {
    unlocked: false,
    pointsSpent: 0,
    nodes: {
      swift_step: {
        name: "Swift Step",
        description: "Move 5% faster.",
        cost: 1,
        unlocked: false,
      },
      light_footing: {
        name: "Light Footing",
        description: "Stamina regenerates 10% faster.",
        cost: 1,
        unlocked: false,
        requires: ["swift_step"],
      },
      wind_sense: {
        name: "Wind Sense",
        description: "Slightly increased awareness.",
        cost: 1,
        unlocked: false,
        requires: ["swift_step"],
      },
    }
  }
};

export const AIR_SKILLS = [
  {
    id: "swift_step",
    tier: 1,
    cost: 1,
    onUnlock(player) {
      player.hasSwiftStep = true;
    }
  },
  {
    id: "light_footed",
    tier: 1,
    cost: 1,
    onUnlock(player) {
      player.hasLightFooted = true;
    }
  }
];


