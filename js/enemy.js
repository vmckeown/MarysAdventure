import { TILE_SIZE } from "./world.js";
import { player } from "./player.js";
import { findPath, isTileSolid } from "./pathfinding.js";
import { worldToTile } from "./world.js";

export const enemies = [];

export const ENEMY_STATE = {
  IDLE: "idle",
  PATROL: "patrol",
  CHASE: "chase",
  SEARCH: "search",
  RETURN: "return",
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
    this.visionRadius = 150;
    this.visionAngle = Math.PI / 2; // 90 degrees
    this.direction = { x: 1, y: 0 }; // Default facing right
    this.path = [];
    this.pathIndex = 0;
    this.pathTimer = 0;
    this.lastSeen = null;
    this.searchTimer = 0;
    this.patrolStartX = this.x;
    this.patrolStartY = this.y;
    this.waypoints = [];        // Array of {x, y} world positions
    this.currentWaypoint = 0;   // Index tracker
    this.patrolLoop = true;     // Optional loop toggle


  }

  update(dt, player, world, pathfinder) {
    if (!this.alive) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const playerDist = Math.hypot(dx, dy);

    // Update facing direction
    this.direction = {
      x: dx / playerDist || 1,
      y: dy / playerDist || 0,
    };

    if (this.state !== ENEMY_STATE.CHASE && this.isPlayerInFOV(player) && this.hasLineOfSightToPlayer(player, world, pathfinder)) {
      this.state = ENEMY_STATE.CHASE;
      this.lastSeen = { x: player.x, y: player.y };
    }

    if (this.state === ENEMY_STATE.CHASE && (playerDist > this.visionRadius * 1.2 || !this.isPlayerInFOV(player))) {
      this.state = ENEMY_STATE.SEARCH;
      this.searchTimer = 3;
    }

    switch (this.state) {
      case ENEMY_STATE.IDLE:
        if (Math.random() < 0.005) {
          this.state = ENEMY_STATE.PATROL;
          this.targetX = this.x + (Math.random() - 0.5) * 200;
          this.targetY = this.y + (Math.random() - 0.5) * 200;
        }
        break;
     case ENEMY_STATE.PATROL:
      if (this.waypoints.length === 0) {
        this.state = ENEMY_STATE.IDLE;
        console.log(`Patrolling: Enemy at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) moving to (${wp.x}, ${wp.y})`);
        console.log(`Enemy at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) patrolling to (${wp.x}, ${wp.y})`);
        break;
      }

      const wp = this.waypoints[this.currentWaypoint];
      if (!this.path || this.path.length === 0 || this.pathIndex >= this.path.length) {
        const start = worldToTile(this.x, this.y);
        const goal = worldToTile(wp.x, wp.y);
        this.path = findPath(start, goal);
        this.pathIndex = 0;
      }

      if (this.path && this.path.length > 0 && this.pathIndex < this.path.length) {
        const next = this.path[this.pathIndex];
        const wx = next.x * TILE_SIZE + TILE_SIZE / 2;
        const wy = next.y * TILE_SIZE + TILE_SIZE / 2;
        const dx = wx - this.x;
        const dy = wy - this.y;
        const distToNext = Math.hypot(dx, dy);

        if (distToNext > 2) {
          this.x += (dx / distToNext) * this.speed * dt;
          this.y += (dy / distToNext) * this.speed * dt;
        } else {
          this.pathIndex++;
        }

        // If reached final path node (i.e., waypoint)
        if (this.pathIndex >= this.path.length) {
          this.currentWaypoint++;
          if (this.currentWaypoint >= this.waypoints.length) {
            this.currentWaypoint = this.patrolLoop ? 0 : this.waypoints.length - 1;
          }
        }
      }

      const wpDist = Math.hypot(wp.x - this.x, wp.y - this.y);
      if (wpDist < 5) {
        this.currentWaypoint++;
        if (this.currentWaypoint >= this.waypoints.length) {
          this.currentWaypoint = this.patrolLoop ? 0 : this.waypoints.length - 1;
        }
      }
      break;

        wp = this.waypoints[this.currentWaypoint];
        this.moveToward(wp.x, wp.y, dt);

        const dist = Math.hypot(wp.x - this.x, wp.y - this.y);
        if (dist < 5) {
          this.currentWaypoint++;
          if (this.currentWaypoint >= this.waypoints.length) {
            this.currentWaypoint = this.patrolLoop ? 0 : this.waypoints.length - 1;
          }
        }
        break;
      case ENEMY_STATE.CHASE:
        this.pathTimer -= dt;
        if (this.pathTimer <= 0) {
          const start = worldToTile(this.x, this.y);
          const goal = worldToTile(player.x, player.y);
          this.path = findPath(start, goal);
          this.pathIndex = 0;
          this.pathTimer = .3; 
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

        if (playerDist > this.visionRange * 1.5) {
          this.state = ENEMY_STATE.SEARCH;
          this.searchTimer = 2;
        }
        break;
      case ENEMY_STATE.SEARCH:
        if (this.lastSeen) {
          this.moveToward(this.lastSeen.x, this.lastSeen.y, dt);
          const dx = this.lastSeen.x - this.x;
          const dy = this.lastSeen.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 10) this.searchTimer -= dt;
          if (this.searchTimer <= 0) {
            this.state = ENEMY_STATE.RETURN;
            this.returnX = this.patrolStartX || this.x;
            this.returnY = this.patrolStartY || this.y;
          }
        }
        break;
      case ENEMY_STATE.RETURN:
        this.moveToward(this.patrolStartX, this.patrolStartY, dt);
        if (Math.hypot(this.patrolStartX - this.x, this.patrolStartY - this.y) < 10) {
          this.state = ENEMY_STATE.PATROL;
        }
        break;

    if (this.health <= 0) {
      this.die();
    }
  }
}

  setWaypoints(waypoints) {
    this.waypoints = waypoints;
    this.currentWaypoint = 0;
    console.log(`Waypoints set: ${waypoints.length} for enemy at (${this.x}, ${this.y})`);
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

  isPlayerInFOV(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > this.visionRadius) return false;

    const enemyDir = Math.atan2(this.direction.y, this.direction.x);
    const toPlayer = Math.atan2(dy, dx);

    let angleDiff = Math.abs(enemyDir - toPlayer);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    return angleDiff < this.visionAngle / 2;
  }

  hasLineOfSightToPlayer(player, world, pathfinder) {
    const steps = Math.ceil(this.visionRadius);
    
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = this.x + (player.x - this.x) * t;
      const y = this.y + (player.y - this.y) * t;

      const tileX = Math.floor(x / TILE_SIZE);
      const tileY = Math.floor(y / TILE_SIZE);

      if (isNaN(tileX) || isNaN(tileY)) return false;

      if (pathfinder.isTileSolid(tileX, tileY)) return false;
    }

    return true;
  }


  die() {
    console.log(`Enemy died at (${this.x}, ${this.y})`);
    this.alive = false;
    this.state = ENEMY_STATE.DEAD;
    player.gainXP(10);
  }

  draw(ctx) {
    if (!this.alive) return;

    // Body
    ctx.fillStyle =
      ctx.fillStyle =
        this.state === ENEMY_STATE.CHASE ? "#ff5555" :
        this.state === ENEMY_STATE.SEARCH ? "#dddd33" :
        this.state === ENEMY_STATE.RETURN ? "#00ffff" :
        this.state === ENEMY_STATE.PATROL ? "#ffaa00" :
        "#888888";

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Optional: Draw vision cone (debug)
    /*
    const angle = Math.atan2(this.direction.y, this.direction.x);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, this.visionRadius, angle - this.visionAngle / 2, angle + this.visionAngle / 2);
    ctx.closePath();
    ctx.stroke();
    */

    // Draw path 
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

    if (this.waypoints.length > 1) {
      ctx.strokeStyle = "rgba(0,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
      for (let i = 1; i < this.waypoints.length; i++) {
        ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
      }
      ctx.stroke();
    }
  }

  damage(amount) {
    this.health -= amount;
  }
}

// Enemy Manager
export function spawnEnemy(tileX, tileY) {
  const enemy = new Enemy(tileX, tileY);
  enemies.push(enemy);
  console.log(`Spawned enemy at (${tileX}, ${tileY}) - Total: ${enemies.length}`);
  return enemy;
}

export function updateEnemies(dt, player, world, pathfinder) {
  for (const e of enemies) e.update(dt, player, world, pathfinder);
}

export function drawEnemies(ctx) {
  for (const e of enemies) e.draw(ctx);
}
