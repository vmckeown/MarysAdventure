import { quests, QUEST_STATE } from "./quests.js";

export const FIRST_QUEST_ID = "shore_intro";

quests[FIRST_QUEST_ID] = {
  id: FIRST_QUEST_ID,
  title: "Stranded",
  description: "Find out where you are.",
  state: QUEST_STATE.INACTIVE,
  currentStep: 0,

  reward: "+50 XP",

  steps: [
    { id: "talk_to_villager", description: "Talk to the villager." },
    { id: "kill_goblin", description: "Defeat the goblin nearby." },
    { id: "return_to_villager", description: "Return to the villager." }
  ]
};

