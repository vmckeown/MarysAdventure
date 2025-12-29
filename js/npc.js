import { getVillagerDialogue, startDialogue } from "./dialogue.js";

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


