import { Graphics } from "./graphics.js";
import {worldToTile} from "./world.js";
import {findPath} from "./pathfinding.js";
const npcImage = new Image();
npcImage.src = "./pics/NPCs.png";

  export class NPC {
    constructor({ x, y, size = 32, name, dialogue, speed = 20, dir = 1, idleTimer = 0 }) {
      this.x = x;
      this.y = y;

      this.size = size;
      this.name = name;
      this.dialogue = dialogue;

      // movement defaults (CRITICAL)
      this.speed = speed;
      this.dir = dir;
      this.idleTimer = idleTimer;

      this.facing = "south";
      this.nextIdleTime = 2 + Math.random() * 6;

      this.path = [];
      this.pathIndex = 0;
    }

  followPath(dt) {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) return;

    const TILE_SIZE = 32;
    const next = this.path[this.pathIndex];
    const targetX = next.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = next.y * TILE_SIZE + TILE_SIZE / 2;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) {
      this.pathIndex++;
    } else {
      const move = Math.min(this.speed * dt, dist);
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;

      // Update facing direction
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = dx > 0 ? "right" : "left";
      } else {
        this.facing = dy > 0 ? "down" : "up";
      }
    }
  }

  draw(ctx) {
      const frameSize = 32;
      let frameX = 0;
      let frameY = 0;
      console.log("NPC at", this.x, this.y);


      // Determine frameY based on direction
      switch (this.facing) {
          case "up": frameY = 0; break;      // North
          case "left": frameY = 1; break;    // West
          case "down": frameY = 2; break;    // South
          case "right": frameY = 3; break;   // East
      }

      if (!npcImage.complete) return;

      ctx.drawImage(
          npcImage,
          frameX * frameSize, frameY * frameSize, // Source X, Y
          frameSize, frameSize,                  // Source Width, Height
          this.x - frameSize / 2, this.y - frameSize / 2, // Destination X, Y
          frameSize, frameSize                   // Destination Width, Height
      );
  }
}

export function setupNPCs(getDialogue) {
  return [
    new NPC({
      x: 1000,
      y: 600,
      size: 32,
      name: "Villager",
      dialogue: getDialogue
    })
  ];
}
