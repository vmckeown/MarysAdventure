let questSlideX = -340;
let questTargetX = -340;
let questVisibleTimer = 0;
let questFlashTimer = 0

const QUEST_PANEL_WIDTH = 360;
const QUEST_PANEL_HEIGHT = 64;
const QUEST_PANEL_MARGIN = 20;
const QUEST_FLASH_DURATION = 1.2;

const QUEST_UI_STATE = {
  HIDDEN: "hidden",
  SHOWN: "shown",
  FLASHING: "flashing"
};

export function triggerQuestUI(isComplete = false) {
  questTargetX = QUEST_PANEL_MARGIN;
  questVisibleTimer = isComplete ? 5 : 3;
  questFlashTimer = QUEST_FLASH_DURATION;
}


export function updateQuestUI(dt) {
  if (questFlashTimer > 0) questFlashTimer -= dt;

  if (questVisibleTimer > 0) {
    questVisibleTimer -= dt;
    questTargetX = QUEST_PANEL_MARGIN;
  } else {
    questTargetX = -(QUEST_PANEL_WIDTH + QUEST_PANEL_MARGIN);
  }

  questSlideX += (questTargetX - questSlideX) * Math.min(1, dt * 10);
}

export function drawQuestUI(ctx, quest) {
  if (!quest) return;

  const x = questSlideX;
  const y = 20;

  let flashAlpha = 0;
  if (questFlashTimer > 0) {
    flashAlpha =
      Math.sin((questFlashTimer / QUEST_FLASH_DURATION) * Math.PI) * 0.6;
  }

  if (flashAlpha > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(255,220,120,0.9)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = `rgba(255,220,120,${flashAlpha})`;
    ctx.fillRect(x - 4, y - 4, QUEST_PANEL_WIDTH + 8, QUEST_PANEL_HEIGHT + 8);
    ctx.restore();
  }

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(x, y, QUEST_PANEL_WIDTH, QUEST_PANEL_HEIGHT);

  ctx.strokeStyle = "#999";
  ctx.strokeRect(x, y, QUEST_PANEL_WIDTH, QUEST_PANEL_HEIGHT);

  ctx.fillStyle = "#fff";
  ctx.font = "14px monospace";
  ctx.fillText(quest.title, x + 12, y + 20);

  if (quest.state === "complete") {
    ctx.fillStyle = "#9fef9f";
    ctx.fillText("Quest Complete!", x + 12, y + 42);
  } else {
    const step = quest.steps[quest.currentStep];
    if (step) {
      ctx.fillStyle = "#ccc";
      ctx.fillText(step.description, x + 12, y + 42);
    }
  }

  ctx.fillStyle = "#888";
  ctx.fillText(
    `${quest.currentStep + 1}/${quest.steps.length}`,
    x + QUEST_PANEL_WIDTH - 50,
    y + 20
  );
}
