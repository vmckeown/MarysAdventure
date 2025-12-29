export const QUEST_STATE = {
  INACTIVE: "inactive",
  ACTIVE: "active",
  COMPLETE: "complete"
};

export const quests = {};

export function startQuest(id) {

  window.triggerQuestUI();

  const quest = quests[id];
  if (!quest) return;

  quest.state = QUEST_STATE.ACTIVE;
  quest.currentStep = 0;

  if (onQuestUpdated) onQuestUpdated(quest);
}

export function completeStep(id) {

  window.triggerQuestUI();
  
  const quest = quests[id];
  if (!quest) return;

  quest.currentStep++;

  if (quest.currentStep >= quest.steps.length) {
    quest.state = QUEST_STATE.COMPLETE;
  }

  if (onQuestUpdated) onQuestUpdated(quest);
}

export function getActiveQuest() {
  return Object.values(quests).find(q => q.state === QUEST_STATE.ACTIVE);
}

export let onQuestUpdated = null;

export function setQuestUpdateHandler(fn) {
  onQuestUpdated = fn;
}



