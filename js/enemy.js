import { TILE_SIZE } from "./world.js";
import { player } from "./player.js";
import { findPath } from "./pathfinding.js";
import { worldToTile } from "./world.js";

export const enemies = [];

export const ENEMY_STATE = {
  IDLE: "idle",
  PATROL: "patrol",
  CHASE: "chase",
  SEARCH: "search",
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

    // Vision
    this.visionRange = 200;

    // AI polish
    this.alertDelay = 0.35;
    this.alertTimer = 0;

    this.minChaseTime = 1.2;
    this.chaseTimer = 0;

    this.lastSeen = null;
    this.lastGoal = null;

    // Pathfinding
    this.path = [];
    this.pathIndex = 0;
    this.pathTimer = 0;

    // Patrol
    this.targetX = this.x;
    this.targetY = this.y;

    // Search
    this.searchTimer = 0;
  }

  update(dt, player) {
    if (!this.alive) return;

    // =====================================
    // PERCEPTION
    // =====================================
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const playerDist = Math.hypot(dx, dy);

    const seesPlayer = playerDist < this.visionRange;

    if (seesPlayer) {
      this.alertTimer += dt;

      if (this.alertTimer >= this.alertDelay) {
        this.lastSeen = { x: player.x, y: player.y };

        if (this.state !== ENEMY_STATE.CHASE) {
          this.state = ENEMY_STATE.CHASE;
          this.chaseTimer = 0;
          this.pathTimer = 0;
        }
      }
    } else {
      this.alertTimer = 0;
    }

    // =====================================
    // STATE TRANSITIONS
    // =====================================
    if (
      this.state === ENEMY_STATE.CHASE &&
      this.chaseTimer > this.minChaseTime &&
      (!seesPlayer || playerDist > this.visionRange * 1.5)
    ) {
      this.state = ENEMY_STATE.SEARCH;
      this.searchTimer = 2.5;
    }

    // =====================================
    // STATE BEHAVIOR
    // =====================================
    switch (this.state) {

      case ENEMY_STATE.IDLE:
        if (Math.random() < 0.005) {
          this.state = ENEMY_STATE.PATROL;
          this.targetX = this.x + (Math.random() - 0.5) * 200;
          this.targetY = this.y + (Math.random() - 0.5) * 200;
        }
        break;

      case ENEMY_STATE.PATROL:
        this.moveToward(this.targetX, this.targetY, dt);

        if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < 10) {
          this.state = ENEMY_STATE.IDLE;
        }
        break;

      case ENEMY_STATE.CHASE: {
        this.chaseTimer += dt;
        this.pathTimer -= dt;

        // Update memory while visible
        if (seesPlayer) {
          this.lastSeen = { x: player.x, y: player.y };
        }

        const needsRepath =
          this.pathTimer <= 0 ||
          !this.path ||
          this.pathIndex >= this.path.length;

        if (needsRepath && this.lastSeen) {
          const start = worldToTile(this.x, this.y);
          const goal = worldToTile(this.lastSeen.x, this.lastSeen.y);

          if (
            !this.lastGoal ||
            goal.x !== this.lastGoal.x ||
            goal.y !== this.lastGoal.y
          ) {
            this.path = findPath(start, goal);
            this.pathIndex = 0;
            this.lastGoal = goal;
          }

          this.pathTimer = 0.3;
        }

        this.followPath(dt, true);
        break;
      }

      case ENEMY_STATE.SEARCH:
        if (this.lastSeen) {
          this.moveToward(this.lastSeen.x, this.lastSeen.y, dt);
          this.searchTimer -= dt;

          if (this.searchTimer <= 0) {
            this.lastSeen = null;
            this.state = ENEMY_STATE.IDLE;
          }
        }
        break;
    }

    // =====================================
    // DEATH
    // =====================================
    if (this.health <= 0) {
      this.die();
    }
  }

  // =====================================
  // MOVEMENT HELPERS
  // =====================================
  moveToward(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  followPath(dt, aggressive = false) {
    if (!this.path || this.pathIndex >= this.path.length) return;

    const next = this.path[this.pathIndex];
    const wx = next.x * TILE_SIZE + TILE_SIZE / 2;
    const wy = next.y * TILE_SIZE + TILE_SIZE / 2;

    const dx = wx - this.x;
    const dy = wy - this.y;
    const dist = Math.hypot(dx, dy);

    const speed = aggressive ? this.speed * 1.15 : this.speed;

    if (dist > 2) {
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    } else {
      this.pathIndex++;
    }
  }

  // =====================================
  // COMBAT / LIFECYCLE
  // =====================================
  damage(amount) {
    this.health -= amount;
  }

  die() {
    this.alive = false;
    this.state = ENEMY_STATE.DEAD;
    player.gainXP(10);
  }

  // =====================================
  // RENDERING
  // =====================================
  draw(ctx) {
    if (!this.alive) return;

    ctx.fillStyle =
      this.state === ENEMY_STATE.CHASE ? "#ff5555" :
      this.state === ENEMY_STATE.PATROL ? "#ffaa00" :
      "#888888";

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Debug: draw path
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

    // Debug: state label
    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(this.state, this.x - 14, this.y - 18);
  }
}

// =====================================
// ENEMY MANAGER
// =====================================
export function spawnEnemy(tileX, tileY) {
  enemies.push(new Enemy(tileX, tileY));
}

export function updateEnemies(dt) {
  for (const e of enemies) e.update(dt, player);
}

export function drawEnemies(ctx) {
  for (const e of enemies) e.draw(ctx);
}
