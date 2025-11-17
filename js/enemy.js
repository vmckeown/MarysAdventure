import { TILE_SIZE, isColliding } from "./world.js";
import { player } from "./player.js";
import { findPath } from "./pathfinding.js";
import { worldToTile, tileToWorld, getTile } from "./world.js";


export const enemies = [];

export const ENEMY_STATE = {
  IDLE: "idle",
  PATROL: "patrol",
  CHASE: "chase",
  DEAD: "dead"
};

export class Enemy {
  constructor(tileX, tileY) {
    this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
    this.size = 28;
    this.color = "#ff0000";
    this.speed = 60;
    this.health = 3;
    this.alive = true;
    this.state = ENEMY_STATE.PATROL;
    this.visionRange = 200;
    this.xp = 0;
  }

  update(dt, player) {
    if (!this.alive) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    switch (this.state) {
      case ENEMY_STATE.IDLE:
        if (Math.random() < 0.005) {
          this.state = ENEMY_STATE.PATROL;
          this.targetX = this.x + (Math.random() - 0.5) * 200;
          this.targetY = this.y + (Math.random() - 0.5) * 200;
        }
        if (dist < this.visionRange) this.state = ENEMY_STATE.CHASE;
        break;

      case ENEMY_STATE.PATROL:
        this.moveToward(this.targetX, this.targetY, dt);
        if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < 10)
          this.state = ENEMY_STATE.IDLE;
        if (dist < this.visionRange) this.state = ENEMY_STATE.CHASE;
        break;

      case ENEMY_STATE.CHASE:
        // 🔹 Pathfinding-based chase
        this.pathTimer = (this.pathTimer || 0) - dt;
        if (this.pathTimer <= 0) {
          const start = worldToTile(this.x, this.y);
          const goal = worldToTile(player.x, player.y);
          this.path = findPath(start, goal);
          this.pathIndex = 0;
          this.pathTimer = 1; // recalc every second
        }

        if (this.path && this.path.length > 0 && this.pathIndex < this.path.length) {
          const next = this.path[this.pathIndex];
          const wx = next.x * TILE_SIZE + TILE_SIZE / 2;
          const wy = next.y * TILE_SIZE + TILE_SIZE / 2;
          const dxp = wx - this.x;
          const dyp = wy - this.y;
          const distToNext = Math.hypot(dxp, dyp);

          if (distToNext > 2) {
            this.x += (dxp / distToNext) * this.speed * dt;
            this.y += (dyp / distToNext) * this.speed * dt;
          } else {
            this.pathIndex++;
          }
        }

        if (dist > this.visionRange * 1.5) {
          this.state = ENEMY_STATE.SEARCH;
          this.searchTimer = 2;
        }
        break;

      case ENEMY_STATE.SEARCH:
        this.searchTimer -= dt;
        if (this.searchTimer <= 0) this.state = ENEMY_STATE.IDLE;
        break;
    }

    if (this.health <= 0) {
      this.die()
    }
  }


  moveToward(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }


  patrol(dt, dx, dy, dist) {
    // If player is in range — start chasing
    if (dist < this.visionRange) {
      this.state = ENEMY_STATE.CHASE;
    }
  }

  chase(dt, dx, dy, dist) {
    // Follow player
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;

    // If player gets far away — return to patrol
    if (dist > this.visionRange * 1.2) {
      this.state = ENEMY_STATE.PATROL;
    }
  }

  die() {
    console.log(`Enemy died at (${this.x}, ${this.y})`);
    this.alive = false;
    this.state = ENEMY_STATE.DEAD;
    player.gainXP(10);
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.fillStyle =
      this.state === ENEMY_STATE.CHASE ? "#ff5555" :
      this.state === ENEMY_STATE.PATROL ? "#ffaa00" :
      "#888888";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    if (this.path && this.path.length > 0) {
      ctx.strokeStyle = "rgba(255,255,0,0.5)";
      ctx.beginPath();
      for (let i = 0; i < this.path.length; i++) {
        const wx = this.path[i].x * TILE_SIZE + TILE_SIZE / 2;
        const wy = this.path[i].y * TILE_SIZE + TILE_SIZE / 2;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }

  }

  damage(amount) {
    console.log(amount)
    this.health -= amount;
  }
}

// Enemy Manager
export function spawnEnemy(tileX, tileY) {
  const enemy = new Enemy(tileX, tileY);
  enemies.push(enemy);
}

export function updateEnemies(dt) {
  for (const e of enemies) e.update(dt);
}

export function drawEnemies(ctx) {
  for (const e of enemies) e.draw(ctx);
}
