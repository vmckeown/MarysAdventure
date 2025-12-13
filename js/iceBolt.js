
const iceImage = new Image();
iceImage.src = "./pics/Mary.png";

import { TILE_SIZE, isColliding } from "./world.js";
import { enemies } from "./enemy.js";


export const iceBolts = [];

export class IceBolt {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;

    const speed = 300;
    this.vx = dir.x * speed;
    this.vy = dir.y * speed;

    this.size = 12;
    this.life = 1.2; // seconds
  }

  update(dt, npcs, objects) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // Hit enemies
    for (const e of enemies) {
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (Math.hypot(dx, dy) < this.size + e.size / 2) {
        e.damage?.(1);
        this.life = 0;
      }
    }

    // Walls
    if (isColliding(this.x, this.y, this.size, npcs, objects)) {
      this.life = 0;
    }
  }

  draw(ctx) {
    ctx.drawImage(
      iceImage,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
  }
}

export function spawnIceBolt(player) {
  const dir = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  }[player.facing];

  iceBolts.push(new IceBolt(player.x, player.y, dir));
}

export function updateIceBolts(dt, npcs, objects) {
  for (let i = iceBolts.length - 1; i >= 0; i--) {
    iceBolts[i].update(dt, npcs, objects);
    if (iceBolts[i].life <= 0) iceBolts.splice(i, 1);
  }
}

export function drawIceBolts(ctx) {
  for (const b of iceBolts) b.draw(ctx);
}
