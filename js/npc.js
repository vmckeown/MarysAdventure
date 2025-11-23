import { Graphics } from "./graphics.js";
import {worldToTile} from "./world.js";
import {findPath} from "./pathfinding.js";
const npcImage = new Image();
npcImage.src = "./pics/NPCs.png";

export class NPC {
  constructor({ x, y, size, color, name, dialogue, speed, dir, idleTimer }) {
    Object.assign(this, { x, y, size, color, name, dialogue, speed, dir, idleTimer });
    this.facing = "south";
    this.nextIdleTime = 2 + Math.random() * 6;

    this.bounds = { xMin: x - 64, xMax: x + 64, yMin: y - 64, yMax: y + 64 }; // 4x tile range
    this.path = [];
    this.pathIndex = 0;
  }

  update(dt, pathfinder) {
    this.idleTimer += dt;
    if (this.idleTimer > this.nextIdleTime || this.path.length === 0) {
      const destX = Math.floor(this.bounds.xMin + Math.random() * (this.bounds.xMax - this.bounds.xMin));
      const destY = Math.floor(this.bounds.yMin + Math.random() * (this.bounds.yMax - this.bounds.yMin));
      const start = worldToTile(this.x, this.y);
      const goal = worldToTile(destX, destY);
      this.path = findPath(start, goal);
      this.pathIndex = 0;
      this.idleTimer = 0;
      this.nextIdleTime = 2 + Math.random() * 6;
    }

    this.followPath(dt);
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

// Initial list of data
const npcData = [
  {
    x: 500,
    y: 450,
    size: 32,
    color: "#00ffff",
    name: "Guard",
    dialogue: [
      "Stay safe out there, traveler.",
      "The woods are dangerous at night!",
      "They say monsters come from the old ruins to the east..."
    ],
    speed: 30,
    dir: 1,
    idleTimer: 0,
  },
  {
    x: 400,
    y: 450,
    size: 28,
    color: "#ff69b4",
    name: "Villager",
    dialogue: [
      "The harvest has been good this year.",
      "But the storm last week washed away part of the road.",
      "You might want to visit the blacksmith — he’s been repairing tools all day."
    ],
    speed: 20,
    dir: -1,
    idleTimer: 0,
  }
];

export function setupNPCs() {
  return npcData.map(n => new NPC(n));
}
