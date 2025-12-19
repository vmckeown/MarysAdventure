export function drawInventory(ctx, canvas, player) {
  const panelWidth = 360;
  const panelHeight = 260;
  const x = canvas.width / 2 - panelWidth / 2;
  const y = canvas.height / 2 - panelHeight / 2;

  ctx.save();

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = "#aaa";
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText("Inventory", x + 10, y + 24);

  // Slots
  const slotSize = 48;
  const cols = 4;
  const padding = 10;

  for (let i = 0; i < player.inventory.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const sx = x + 20 + col * (slotSize + padding);
    const sy = y + 40 + row * (slotSize + padding);

    ctx.strokeStyle = "#666";
    ctx.strokeRect(sx, sy, slotSize, slotSize);

    const item = player.inventory[i];
    if (item) {
      ctx.fillStyle = "#ccc";
      ctx.fillText(item.name[0], sx + 18, sy + 30); // placeholder
    }
  }

  ctx.restore();
}
