import { getVillagerDialogue, startDialogue, isDialogueActive } from "./dialogue.js";


const npcImage = new Image();
npcImage.src = "./pics/NPCs.png";

export class NPC {
  constructor({ x, y, size = 32, name = "Villager" }) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.name = name;

    this.facing = "down";

    // ✅ REQUIRED for updateNPCs()
    this.dir = 1;
    this.speed = 20;
    this.idleTimer = 0;
  }


  draw(ctx) {
    if (!npcImage.complete) return;

    const frameSize = 32;
    let frameY = 2;

    switch (this.facing) {
      case "up": frameY = 0; break;
      case "left": frameY = 1; break;
      case "down": frameY = 2; break;
      case "right": frameY = 3; break;
    }

    ctx.drawImage(
      npcImage,
      0,
      frameY * frameSize,
      frameSize,
      frameSize,
      this.x - frameSize / 2,
      this.y - frameSize / 2,
      frameSize,
      frameSize
    );

    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 48 && !isDialogueActive()) {
      ctx.save();
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(this.x - 30, this.y - 36, 60, 18);

      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("[E] Talk", this.x, this.y - 22);
      ctx.restore();

    }
  }
}

// Factory
export function setupNPCs() {
  return [
    new NPC({
      x: 1000,
      y: 600,
      name: "Villager"
    })
  ];
}


