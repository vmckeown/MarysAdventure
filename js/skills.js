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
