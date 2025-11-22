import { Graphics } from "./graphics.js";
const npcImage = new Image();
npcImage.src = "./pics/NPCs.png";

export class NPC {
  constructor({ x, y, size, color, name, dialogue, speed, dir, idleTimer }) {
    Object.assign(this, { x, y, size, color, name, dialogue, speed, dir, idleTimer });
    this.facing = "south";
    this.nextIdleTime = 2 + Math.random() * 6;
  }

  update(dt) {
    this.idleTimer += dt;
    if (this.idleTimer > this.nextIdleTime) {
      const directions = ["up", "down", "left", "right"];
      this.facing = directions[Math.floor(Math.random() * directions.length)];
      this.dir = {
        up: -1,
        down: 1,
        left: -1,
        right: 1
      }[this.facing];
      this.idleTimer = 0;
      this.nextIdleTime = 2 + Math.random() * 6; // Random between 2 and 8
    }

    // Move according to direction
    if (this.facing === "up" || this.facing === "down") {
      this.y += this.dir * this.speed * dt;
    } else {
      this.x += this.dir * this.speed * dt;
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
