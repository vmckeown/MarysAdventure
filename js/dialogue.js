const portraitImage = new Image();
portraitImage.src = "./pics/portraits.png"; // make sure this exists

import { quests, QUEST_STATE } from "./quests.js";

let activeDialogue = null;
let dialogueFinishedCallback = null;


export function startDialogue(lines, portrait = null, force = false) {
  if (!force && activeDialogue) return;
  if (!lines || lines.length === 0) return;

  activeDialogue = {
    lines,
    index: 0,
    portrait,
    alpha: 1
  };
}

export function onDialogueFinished(callback) {
  dialogueFinishedCallback = callback;
}

export function advanceDialogue() {
  if (!activeDialogue) return;

  activeDialogue.index++;

  if (activeDialogue.index >= activeDialogue.lines.length) {
    activeDialogue = null;

    if (dialogueFinishedCallback) {
      dialogueFinishedCallback();
      dialogueFinishedCallback = null;
    }
  }
}


export function drawDialogue(ctx, canvas) {
  if (!activeDialogue) return;

  const padding = 10;
  const width = 460;
  const height = 56;
  const x = canvas.width / 2 - width / 2;
  const y = canvas.height - 70; // LOWER ON SCREEN

  ctx.save();
  ctx.globalAlpha = activeDialogue.alpha;

  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#aaa";
  ctx.strokeRect(x, y, width, height);

  // Portrait (optional)
  if (activeDialogue.portrait && portraitImage.complete) {
    const PORTRAIT_SIZE = 64;

    ctx.drawImage(
      portraitImage,
      activeDialogue.portrait.x,
      activeDialogue.portrait.y,
      PORTRAIT_SIZE,
      PORTRAIT_SIZE,
      x + padding,
      y + padding,
      48,
      48
    );
  }

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.textAlign = "left";
  ctx.fillText(
    activeDialogue.lines[activeDialogue.index],
    x + 65,
    y + 36
  );

  ctx.restore();
}

// ---------- Dialogue Providers ----------
export function getVillagerDialogue() {
  const quest = quests["shore_intro"];

  // Before quest
  if (!quest || quest.state === "inactive") {
    return [
      "You look like you washed ashore.",
      "We’ve had trouble lately...",
      "There’s a goblin nearby."
    ];
  }

  // Quest active — goblin not yet killed
  if (quest.state === "active" && quest.currentStep === 0) {
    return [
      "The goblin should be nearby.",
      "Be careful — it’s dangerous."
    ];
  }

  // Goblin killed, return step
  if (quest.state === "active" && quest.currentStep === 1) {
    return [
      "You’re back!",
      "Did you take care of the goblin?",
      "Thank you — the village can breathe again."
    ];
  }

  // Quest complete
  if (quest.state === "complete") {
    return [
      "You’ve done us a great service.",
      "If you’re heading out, be careful.",
      "There are worse things than goblins..."
    ];
  }

  return ["..."];
}


export function getGoblinTaunt() {
  const taunts = [
    "Heh! Soft traveler!",
    "You picked the wrong road!",
    "Gold or blood!"
  ];
  return [taunts[Math.floor(Math.random() * taunts.length)]];
}

export function isDialogueActive() {
  return activeDialogue !== null;
}

export function closeDialogue() {
  activeDialogue = null;
}

export function hasDialogue() {
  return !!activeDialogue;
}
