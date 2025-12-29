const portraitImage = new Image();
portraitImage.src = "./pics/portraits.png"; // make sure this exists

import { quests, QUEST_STATE } from "./quests.js";

let activeDialogue = null;

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


export function advanceDialogue() {
  if (!activeDialogue) return;

  activeDialogue.index++;
  if (activeDialogue.index >= activeDialogue.lines.length) {
    activeDialogue = null;
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

  if (!quest || quest.state === "inactive") {
    return [
      "You look like you washed ashore.",
      "Be careful out there."
    ];
  }

  if (quest.state === "active") {
    if (quest.currentStep === 0) {
      return ["There’s a goblin nearby. Deal with it first."];
    }

    if (quest.currentStep === 1) {
      return [
        "You survived?",
        "That goblin had been stalking travelers.",
        "Thank you."
      ];
    }
  }

  if (quest.state === "complete") {
    return ["You’ve done well. More dangers lie ahead."];
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
