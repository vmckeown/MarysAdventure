import { itemSprite } from "./items.js";

export let inventoryCursor = 0;

const GRID_COLS = 4;
const GRID_ROWS = 3;
const SLOT_COUNT = GRID_COLS * GRID_ROWS;

let moveCooldown = 0;
const MOVE_DELAY = 0.18; // seconds (slow, deliberate)

export function updateInventoryCursor(dt, input) {
  moveCooldown -= dt;
  if (moveCooldown > 0) return;

  let moved = false;

  if (input.left) {
    inventoryCursor--;
    moved = true;
  }
  if (input.right) {
    inventoryCursor++;
    moved = true;
  }
  if (input.up) {
    inventoryCursor -= GRID_COLS;
    moved = true;
  }
  if (input.down) {
    inventoryCursor += GRID_COLS;
    moved = true;
  }

  if (moved) {
    inventoryCursor = Math.max(
      0,
      Math.min(SLOT_COUNT - 1, inventoryCursor)
    );
    moveCooldown = MOVE_DELAY;
  }
}

export function drawInventory(ctx, canvas, player) {
  const panelWidth = 360;
  const panelHeight = 260;
  const x = canvas.width / 2 - panelWidth / 2;
  const y = canvas.height / 2 - panelHeight / 2;

  ctx.save();

  // =========================
  // Background Panel
  // =========================
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(x, y, panelWidth, panelHeight);

  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText("Inventory", x + 10, y + 24);

  // =========================
  // Slot Grid
  // =========================
  const slotSize = 48;
  const padding = 10;
  const cols = GRID_COLS;

  for (let i = 0; i < player.inventory.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const sx = x + 20 + col * (slotSize + padding);
    const sy = y + 40 + row * (slotSize + padding);

    // Slot border
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, slotSize, slotSize);

    // Item placeholder
    const item = player.inventory[i];
    if (item && item.spriteRow !== undefined) {
      ctx.drawImage(
        itemSprite,
        0,                       // frame 0 ONLY (no animation)
        item.spriteRow * 33,     // correct row from ITEM_DEFS
        32, 32,
        sx + 8,
        sy + 8,
        slotSize - 16,
        slotSize - 16
      );
    }
  }

  // =========================
  // Cursor (draw LAST)
  // =========================
  const cursorCol = inventoryCursor % GRID_COLS;
  const cursorRow = Math.floor(inventoryCursor / GRID_COLS);

  const cx = x + 20 + cursorCol * (slotSize + padding);
  const cy = y + 40 + cursorRow * (slotSize + padding);

  // Subtle highlight
  ctx.fillStyle = "rgba(255,255,0,0.1)";
  ctx.fillRect(cx, cy, slotSize, slotSize);

  // Cursor outline
  ctx.strokeStyle = "#ffff00";
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - 2, cy - 2, slotSize + 4, slotSize + 4);

  ctx.restore();

  const selectedItem = player.inventory[inventoryCursor];
  if (selectedItem && selectedItem.description) {
    const tooltipWidth = 220;

    let tooltipX = x + panelWidth + 10;
    let tooltipY = y + 40;

    // Clamp tooltip to screen
    if (tooltipX + tooltipWidth > canvas.width) {
      tooltipX = x - tooltipWidth - 10;
    }

    drawItemTooltip(ctx, tooltipX, tooltipY, selectedItem, canvas);
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line !== "") {
      lines.push(line.trim());
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }

  if (line) {
    lines.push(line.trim());
  }

  return lines;
}


function drawItemTooltip(ctx, x, y, item, canvas) {
  const padding = 8;
  const maxWidth = 240;
  const lineHeight = 16;

  ctx.font = "14px monospace";

  // Wrap description text
  const descriptionLines = wrapText(
    ctx,
    item.description,
    maxWidth - padding * 2
  );

  const lines = [
    { text: item.name, color: "#ffffaa" },
    ...descriptionLines.map(t => ({ text: t, color: "#ddd" }))
  ];

  const height =
    padding * 2 + lines.length * lineHeight;

  // Clamp Y (just in case)
  if (y + height > canvas.height) {
    y = canvas.height - height - 10;
  }

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.92)";
  ctx.fillRect(x, y, maxWidth, height);

  ctx.strokeStyle = "#aaa";
  ctx.strokeRect(x, y, maxWidth, height);

  // Text
  lines.forEach((line, i) => {
    ctx.fillStyle = line.color;
    ctx.fillText(
      line.text,
      x + padding+10,
      y + padding + lineHeight * (i + 1)
    );
  });
}



