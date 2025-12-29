import { startDialogue, getVillagerDialogue } from "./dialogue.js";
import { quests, startQuest, completeStep } from "./quests.js";
import { triggerQuestUI } from "./questUI.js";

export function handleInteractions({ player, npcs, rafts, qPressed }) {
  // raft interaction
  for (const raft of rafts) {
    if (raft.isNear(player.x, player.y) && qPressed) {
      startDialogue([
        "The raft is badly damaged.",
        "It looks like it washed ashore during the storm.",
        "You won’t be sailing anywhere with this… not yet."
      ]);
      return;
    }
  }

  // NPC interaction
  for (const npc of npcs) {
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const dist = Math.hypot(dx, dy);
   
    if (dist < 50 && qPressed) {
      const quest = quests["shore_intro"];

      npc.facing =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0 ? "left" : "right"
          : dy > 0 ? "up" : "down";

      if (quest && quest.state === "inactive") {
        startQuest("shore_intro");
      }

      if (quest?.state === "active" && quest.currentStep === 1) {
        completeStep("shore_intro");
      }

      startDialogue(getVillagerDialogue());
      return;
    }
  }
}
