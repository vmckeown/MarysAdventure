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
    if (item) {
      ctx.fillStyle = "#ccc";
      ctx.fillText(item.name[0], sx + 18, sy + 30);
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
}

