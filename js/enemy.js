let activeAttackers = 0;
const MAX_ATTACKERS = 2;

const goblinImage = new Image();
goblinImage.src = "./pics/Goblin.png";

const orcimage = new Image();
orcimage.src = "./pics/orc.png";

const orcBruteImage = new Image();
orcBruteImage.src = "./pics/OrcBrute.png";

import {
  TILE_SIZE,
  worldToTile,
  getTile,
  SOLID_TILES,
  WORLD_COLS,
  WORLD_ROWS
} from "./world.js";

import { findPath } from "./pathfinding.js";
import { items, Item } from "./items.js";
import { startDialogue, closeDialogue, isDialogueActive } from "./dialogue.js";
import { completeStep } from "./quests.js";
import { gainSkillXp } from "./skills.js";
import { objects, triggerScreenShake } from "./main.js";

export const enemies = [];

export const ENEMY_STATE = {
  IDLE: "idle",
  PATROL: "patrol",
  CHASE: "chase",
  WINDUP: "windup",
  SEARCH: "search",
  ATTACK: "attack",
  DEAD: "dead"
};

const GOBLIN_TAUNTS = {
  spotted: [
    "Hey! You lost?",
    "This road mine now!",
    "Big feet make loud noise!",
    "Hehehe… easy meal!"
  ],
  hit: [
    "HEY!",
    "That hurt!",
    "Stop that!",
    "No fair!"
  ],
  death: [
    "Boss… won’t like this…",
    "I was almost promoted…",
    "Ugh..."
  ]
};

function randomGoblinTaunt(type) {
  const list = GOBLIN_TAUNTS[type] || ["..."];
  return list[Math.floor(Math.random() * list.length)];
}

function isTileSolid(tx, ty) {
  const tile = getTile(tx, ty);
  return SOLID_TILES.includes(tile);
}

// tx/ty are TILE coordinates (not world)
function isClearSpawnArea(tx, ty, radius = 2, maxSolid = 2) {
  let solidCount = 0;

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const nx = tx + x;
      const ny = ty + y;

      if (
        nx < 0 ||
        ny < 0 ||
        nx >= WORLD_COLS ||
        ny >= WORLD_ROWS
      ) {
        solidCount++;
        if (solidCount > maxSolid) return false;
        continue;
      }

      if (isTileSolid(nx, ny)) {
        solidCount++;
        if (solidCount > maxSolid) return false;
      }
    }
  }

  return true;
}

// Returns a TILE COORD target {x, y}
function findRandomWalkableTileNearTile(originTx, originTy, radius = 6) {
  if (!Number.isFinite(originTx) || !Number.isFinite(originTy)) {
    console.warn("Invalid origin passed to findRandomWalkableTileNearTile", originTx, originTy);
    return { x: 0, y: 0 };
  }

  for (let i = 0; i < 25; i++) {
    const tileX = originTx + (Math.floor(Math.random() * (radius * 2 + 1)) - radius);
    const tileY = originTy + (Math.floor(Math.random() * (radius * 2 + 1)) - radius);

    // Bounds check
    if (tileX < 0 || tileY < 0 || tileX >= WORLD_COLS || tileY >= WORLD_ROWS) continue;

    // Solid tile check
    if (isTileSolid(tileX, tileY)) continue;

    // “area is clear” check (tile coords)
    if (isClearSpawnArea(tileX, tileY, 2, 2)) {
      return { x: tileX, y: tileY };
    }
  }

  // Fallback: stay where you are
  return { x: originTx, y: originTy };
}



const ENEMY_ARCHETYPES = {
  brute: {
    speed: 55,
    courage: 1.2,
    hesitationChance: 0.002,
    retreatHealthThreshold: 0,
    attackCooldown: 0.6,
    meleeRange: 36,
    maxHealth: 10,
    color: "#005511"
  },
  skirmisher: {
    speed: 65,
    courage: 1.0,
    hesitationChance: 0.005,
    retreatHealthThreshold: 1,
    attackCooldown: 0.8,
    meleeRange: 32,
    maxHealth: 6,
    color: "#555555"
  },
  coward: {
    speed: 70,
    courage: 0.6,
    hesitationChance: 0.01,
    retreatHealthThreshold: 2,
    attackCooldown: 1.2,
    meleeRange: 28,
    maxHealth: 3,
    color: "#ff0000"
  }
};

export class Enemy {
  constructor(tileX, tileY, type = "skirmisher") {
    this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = tileY * TILE_SIZE + TILE_SIZE / 2;

    const a = ENEMY_ARCHETYPES[type];
    this.type = type;
    this.sprite = null;
    this.hasTaunted = false;

    if (this.type === "coward") this.sprite = goblinImage;
    if (this.type === "skirmisher") this.sprite = orcimage;
    if (this.type === "brute") this.sprite = orcBruteImage;

    this.idleTimer = Math.random() * 1.5 + 0.5;
    this.hasPlayedDeathDialogue = false;

    this.speed = a.speed;
    this.courage = a.courage;
    this.retreatHealthThreshold = a.retreatHealthThreshold;
    this.attackCooldown = a.attackCooldown;
    this.meleeRange = a.meleeRange;
    this.maxHealth = a.maxHealth;
    this.hesitationChance = a.hesitationChance;
    this.enabled = true;

    this.windupTimer = 0;
    this.windupDuration = 0.4;

    this.size = 28;
    this.color = a.color;
    this.health = this.maxHealth;
    this.alive = true;
    this.state = ENEMY_STATE.PATROL;
    this.visionRange = 200;

    this.showHealthBarTimer = 0;
    this.healthBarDuration = 1.5;

    this.alertDelay = 0.35;
    this.alertTimer = 0;

    this.minChaseTime = 1.2;
    this.chaseTimer = 0;

    this.lastSeen = null;
    this.lastGoal = null;

    this.lostSightGrace = 0.75;
    this.lostSightTimer = 0;

    this.path = null;
    this.pathIndex = 0;
    this.pathTimer = 0;

    this.searchTimer = 0;
    this.searchPath = null;
    this.searchPathIndex = 0;

    this.aggroRadius = 160;
    this.aggroCooldown = 0;

    this.meleeBuffer = 4;

    this.separationRadius = this.size * 1.6;
    this.separationStrength = 40;

    this.attackRange = this.meleeRange;
    this.attackWindup = 0.35;

    this.attackTimer = 0;
    this.isWindingUp = false;

    this.circleStrength = 35;
    this.circleDirection = Math.random() < 0.5 ? -1 : 1;
    this.circleSwitchTimer = 0;

    this.hesitationTimer = 0;
    this.flankBias = Math.random() < 0.5 ? -1 : 1;

    this.deathTimer = 0;
    this.deathDuration = 0.6;
    this.fadeAlpha = 1;
    this.knockbackX = 0;
    this.knockbackY = 0;

    this.hitStunTimer = 0;
    this.hitStunDuration = 0.15;
    this.hitKnockbackX = 0;
    this.hitKnockbackY = 0;

    this.tauntCooldown = 0;
    this.target = null;
  }

  update(dt, player, objects = []) {
  if (!this.enabled) return 0;

  if (this.health <= 0 && !this.hasPlayedDeathDialogue) {
    this.hasPlayedDeathDialogue = true;
    startDialogue([randomGoblinTaunt("death")], { x: 0, y: 0 }, true);
    return this.die(player);
  }
    const dialogueOpen = isDialogueActive();

    this.tauntCooldown = Math.max(0, this.tauntCooldown - dt);

    // DEAD
    if (this.state === ENEMY_STATE.DEAD) {
      this.deathTimer -= dt;

      this.x += this.knockbackX * dt;
      this.y += this.knockbackY * dt;

      this.knockbackX *= 0.85;
      this.knockbackY *= 0.85;

      this.fadeAlpha = Math.max(0, this.deathTimer / this.deathDuration);

      if (this.deathTimer <= 0) {
        const index = enemies.indexOf(this);
        if (index !== -1) enemies.splice(index, 1);
      }

      return 0;
    }

    if (!this.alive) return 0;

    // HIT STUN
    if (this.showHealthBarTimer > 0) this.showHealthBarTimer -= dt;

    if (this.hitStunTimer > 0) {
      this.hitStunTimer -= dt;

      this.x += this.hitKnockbackX * dt;
      this.y += this.hitKnockbackY * dt;

      this.hitKnockbackX *= 0.8;
      this.hitKnockbackY *= 0.8;

      return 0;
    }

    // PERCEPTION
    const dxp = player.x - this.x;
    const dyp = player.y - this.y;
    const playerDist = Math.hypot(dxp, dyp);

    const seesPlayer = this.enabled && playerDist < this.visionRange;

    if (seesPlayer && this.state !== ENEMY_STATE.SEARCH) {
      this.alertTimer += dt;

      if (this.alertTimer >= this.alertDelay) {
        this.lastSeen = { x: player.x, y: player.y };

        if (this.state !== ENEMY_STATE.CHASE) {
          this.state = ENEMY_STATE.CHASE;
          this.chaseTimer = 0;
          this.pathTimer = 0;
          this.path = null;
          this.pathIndex = 0;
          this.alertNearbyEnemies();
        }
      }

      // taunt on first spot (but don't spam)
      if (this.tauntCooldown <= 0 && !this.hasTaunted) {
        if (!dialogueOpen) {
          startDialogue([randomGoblinTaunt("spotted")], { x: 0, y: 0 });
        }
        this.hasTaunted = true;
        this.tauntCooldown = 4;
      }
    } else if (!seesPlayer) {
      this.alertTimer = 0;
    }

    // CHASE -> SEARCH transition
    if (this.state === ENEMY_STATE.CHASE) {
      if (seesPlayer) {
        this.lostSightTimer = 0;
      } else {
        this.lostSightTimer += dt;

        if (
          this.lostSightTimer >= this.lostSightGrace &&
          this.chaseTimer > this.minChaseTime
        ) {
          this.state = ENEMY_STATE.SEARCH;
          this.searchTimer = 2.5;
          this.lostSightTimer = 0;
        }
      }
    }

    // BEHAVIOR
    switch (this.state) {
      case ENEMY_STATE.IDLE: {
        this.idleTimer -= dt;

        if (this.idleTimer <= 0) {
          this.state = ENEMY_STATE.PATROL;
          this.path = null;
          this.pathIndex = 0;
          this.idleTimer = Math.random() * 2 + 1;
        }
        break;
      }

      case ENEMY_STATE.ATTACK: {
        if (this.target && this.target.damage) {
          this.target.damage(1, this.x, this.y);
        }
        this.state = ENEMY_STATE.CHASE;
        return 0;
      }

      case ENEMY_STATE.PATROL: {
        if (!this.path || this.pathIndex >= this.path.length) {
          const start = { x: worldToTile(this.x), y: worldToTile(this.y) };

          // ✅ NOTE: target is TILE coords now
          const targetTile = findRandomWalkableTileNearTile(start.x, start.y, 6);

          // ✅ IMPORTANT: remove the comma bug (this was breaking your path!)
          this.path = findPath(start, targetTile, objects);
          this.pathIndex = 0;

          if (!this.path || this.path.length === 0) {
            this.state = ENEMY_STATE.IDLE;
            break;
          }
        }

        this.followPath(dt);

        if (this.pathIndex >= this.path.length) {
          this.state = ENEMY_STATE.IDLE;
        }

        break;
      }

      case ENEMY_STATE.CHASE: {
        if (this.hesitationTimer > 0) {
          this.hesitationTimer -= dt;
          break;
        }

        if (Math.random() < 0.005 * this.courage) {
          this.hesitationTimer = 0.3 + Math.random() * 0.3;
          break;
        }

        this.chaseTimer += dt;
        this.pathTimer -= dt;
        this.attackTimer -= dt;

        const enemyRadius = this.size / 2;
        const playerRadius = player.size ? player.size / 2 : 14;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;

        const combatDist = dist - enemyRadius - playerRadius;

        if (seesPlayer) this.lastSeen = { x: player.x, y: player.y };

        if (this.health <= this.retreatHealthThreshold) {
          this.state = ENEMY_STATE.SEARCH;
          this.searchTimer = 2 + Math.random();
          break;
        }

        // Start attack windup if close enough
        if (
          combatDist <= 0 &&
          this.attackTimer <= 0 &&
          !this.isWindingUp &&
          activeAttackers < MAX_ATTACKERS
        ) {
          this.isWindingUp = true;
          this.attackTimer = this.attackWindup;
          activeAttackers++;
          break;
        }

        if (this.isWindingUp) {
          if (this.attackTimer <= 0) {
            if (combatDist <= 4) {
              this.state = ENEMY_STATE.WINDUP;
              this.windupTimer = this.windupDuration;
              this.target = player;
            }

            this.isWindingUp = false;
            this.attackTimer = this.attackCooldown;
            activeAttackers = Math.max(0, activeAttackers - 1);
          }
          break;
        }

        // Repath occasionally toward lastSeen
        const needsRepath =
          this.pathTimer <= 0 ||
          !this.path ||
          this.pathIndex >= this.path.length;

        if (needsRepath && this.lastSeen) {
          const start = { x: worldToTile(this.x), y: worldToTile(this.y) };

          const perpX = -dy / dist;
          const perpY = dx / dist;
          const flankOffset = this.flankBias * this.size * 0.75;

          const goalX =
            this.lastSeen.x - (dx / dist) * this.meleeRange + perpX * flankOffset;
          const goalY =
            this.lastSeen.y - (dy / dist) * this.meleeRange + perpY * flankOffset;

          const goal = { x: worldToTile(goalX), y: worldToTile(goalY) };

          // clamp goal to world bounds
          goal.x = Math.max(0, Math.min(WORLD_COLS - 1, goal.x));
          goal.y = Math.max(0, Math.min(WORLD_ROWS - 1, goal.y));

          if (!this.lastGoal || goal.x !== this.lastGoal.x || goal.y !== this.lastGoal.y) {
            const newPath = findPath(start, goal, objects);
            console.log("[PATH]", this.type, this.state, "len:", this.path?.length, "objects:", objects?.length);
            this.path = newPath?.length ? newPath : null;
            this.pathIndex = 0;
            this.lastGoal = goal;
          }

          this.pathTimer = 0.3;
        }

        // Move toward player
        if (combatDist > 0) {
          if (this.path && this.pathIndex < this.path.length) {
            this.followPath(dt, true);
          } else {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
          }

          this.applySeparation(dt, player);

          if (combatDist < this.meleeRange * 1.5) {
            this.applyCircling(dt, dx, dy, dist);
          }
        }

        break;
      }

      case ENEMY_STATE.WINDUP: {
        this.windupTimer -= dt;
        if (this.windupTimer <= 0) {
          this.state = ENEMY_STATE.ATTACK;
        }
        return 0; // stop movement during windup
      }

      case ENEMY_STATE.SEARCH: {
        if (seesPlayer) {
          this.state = ENEMY_STATE.CHASE;
          this.path = null;
          this.pathIndex = 0;
          break;
        }

        this.searchTimer -= dt;

        if (!this.searchPath && this.lastSeen) {
          const start = { x: worldToTile(this.x), y: worldToTile(this.y) };
          const goal = { x: worldToTile(this.lastSeen.x), y: worldToTile(this.lastSeen.y) };

          goal.x = Math.max(0, Math.min(WORLD_COLS - 1, goal.x));
          goal.y = Math.max(0, Math.min(WORLD_ROWS - 1, goal.y));

          this.searchPath = findPath(start, goal, objects);
          this.searchPathIndex = 0;
        }

        if (this.searchPath && this.searchPathIndex < this.searchPath.length) {
          const next = this.searchPath[this.searchPathIndex];
          const wx = next.x * TILE_SIZE + TILE_SIZE / 2;
          const wy = next.y * TILE_SIZE + TILE_SIZE / 2;

          const sdx = wx - this.x;
          const sdy = wy - this.y;
          const dist = Math.hypot(sdx, sdy) || 1;

          if (dist > 2) {
            this.x += (sdx / dist) * this.speed * dt;
            this.y += (sdy / dist) * this.speed * dt;
          } else {
            this.searchPathIndex++;
          }
        }

        if (this.searchPathIndex >= (this.searchPath?.length || 0)) {
          this.lastSeen = null;
          this.searchPath = null;
          this.state = ENEMY_STATE.IDLE;
        }

        break;
      }
    }

    // DEATH CHECK
    if (this.health <= 0 && !this.hasPlayedDeathDialogue) {
      this.hasPlayedDeathDialogue = true;
      if (!dialogueOpen) {
        startDialogue([randomGoblinTaunt("death")], { x: 0, y: 0 }, true);
      }
      return this.die(player);
    }

    return 0;
  }

  applySeparation(dt, player) {
    for (const other of enemies) {
      if (other === this) continue;
      if (!other.alive) continue;
      if (other.state !== ENEMY_STATE.CHASE) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0 || dist > this.separationRadius) continue;

      // Stronger separation when closer to player
      const pdx = this.x - player.x;
      const pdy = this.y - player.y;
      const playerDist = Math.hypot(pdx, pdy) || 1;

      const proximityFactor = Math.max(0, 1 - playerDist / this.visionRange);

      const push =
        ((this.separationRadius - dist) / this.separationRadius) *
        proximityFactor;

      this.x += (dx / dist) * push * this.separationStrength * dt;
      this.y += (dy / dist) * push * this.separationStrength * dt;
    }
  }

  applyCircling(dt, dx, dy, dist) {
    const perpX = -dy / dist;
    const perpY = dx / dist;

    this.x += perpX * this.circleDirection * this.circleStrength * dt;
    this.y += perpY * this.circleDirection * this.circleStrength * dt;

    this.circleSwitchTimer -= dt;
    if (this.circleSwitchTimer <= 0) {
      this.circleDirection *= -1;
      this.circleSwitchTimer = 1.5 + Math.random();
    }
  }

  followPath(dt, aggressive = false) {
    if (!this.path || this.pathIndex >= this.path.length) return;

    const next = this.path[this.pathIndex];
    const wx = next.x * TILE_SIZE + TILE_SIZE / 2;
    const wy = next.y * TILE_SIZE + TILE_SIZE / 2;

    const dx = wx - this.x;
    const dy = wy - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    const speed = aggressive ? this.speed * 1.15 : this.speed;

    if (dist > 2) {
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    } else {
      this.pathIndex++;
    }
  }

  alertNearbyEnemies() {
    for (const other of enemies) {
      if (other === this) continue;
      if (!other.alive) continue;
      if (other.state === ENEMY_STATE.CHASE) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= this.aggroRadius) {
        other.lastSeen = { ...this.lastSeen };
        other.state = ENEMY_STATE.CHASE;
        other.chaseTimer = 0;
        other.pathTimer = 0;
      }
    }
  }

  damage(amount, sourceX, sourceY) {
    this.health -= amount;

    triggerScreenShake(2, 0.06);

    // ✅ Only show a "hit" taunt if dialogue isn't already open (prevents spam)
    if (this.tauntCooldown <= 0 && !isDialogueActive()) {
      startDialogue([randomGoblinTaunt("hit")], { x: 0, y: 0 }, true);
      this.tauntCooldown = 0.8;
    }

    gainSkillXp("melee", 1);

    this.showHealthBarTimer = this.healthBarDuration;

    // ✅ Never rely on a global `player` here
    if (!Number.isFinite(sourceX)) sourceX = this.x;
    if (!Number.isFinite(sourceY)) sourceY = this.y;

    const dx = this.x - sourceX;
    const dy = this.y - sourceY;
    const dist = Math.hypot(dx, dy) || 1;

    const force = 90;
    this.hitKnockbackX = (dx / dist) * force;
    this.hitKnockbackY = (dy / dist) * force;

    this.hitStunTimer = this.hitStunDuration;
  }

  die(player) {
    if (!this.alive) return 0;

    this.path = null;
    this.pathIndex = 0;
    this.searchPath = null;
    this.alive = false;
    this.state = ENEMY_STATE.DEAD;
    this.deathTimer = this.deathDuration;

    closeDialogue();
    completeStep("shore_intro");

    // Knockback away from player if available
    let dx = 0, dy = 0, dist = 1;
    if (player) {
      dx = this.x - player.x;
      dy = this.y - player.y;
      dist = Math.hypot(dx, dy) || 1;
    }

    const force = 80;
    this.knockbackX = (dx / dist) * force;
    this.knockbackY = (dy / dist) * force;

    if (Math.random() < 0.6) {
      items.push(new Item(this.x, this.y, "health"));
    }

    return 10;
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    if (this.sprite) {
      ctx.drawImage(
        this.sprite,
        Math.floor(this.x - 16),
        Math.floor(this.y - 16),
        32,
        32
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Debug path
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

    // Winding up ring
    if (this.isWindingUp) {
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Health bar
    if (this.showHealthBarTimer > 0 && this.health > 0) {
      const barWidth = this.size;
      const barHeight = 4;

      const x = this.x - barWidth / 2;
      const y = this.y - this.size / 2 - 10;

      ctx.save();
      ctx.globalAlpha = Math.min(1, this.showHealthBarTimer / 0.3);

      ctx.fillStyle = "#000";
      ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

      const healthRatio = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle =
        healthRatio > 0.5 ? "#00ff00" :
        healthRatio > 0.25 ? "#ffff00" :
        "#ff0000";

      ctx.fillRect(x, y, barWidth * healthRatio, barHeight);
      ctx.restore();
    }

    // Debug label
    ctx.fillStyle = "#fff";
    ctx.font = "10px monospace";
    ctx.fillText(this.state, this.x - 14, this.y - 18);

    ctx.restore();
  }
}

// ENEMY MANAGER
export function spawnEnemy(tileX, tileY, type) {
  let spawn = { x: tileX, y: tileY };

  if (
    isTileSolid(tileX, tileY) ||
    !isClearSpawnArea(tileX, tileY, 2, 2)
  ) {
    for (let i = 0; i < 30; i++) {
      const tx = tileX + Math.floor(Math.random() * 10) - 5;
      const ty = tileY + Math.floor(Math.random() * 10) - 5;

      if (
        tx >= 0 && ty >= 0 && tx < WORLD_COLS && ty < WORLD_ROWS &&
        !isTileSolid(tx, ty) &&
        isClearSpawnArea(tx, ty, 2, 2)
      ) {
        spawn = { x: tx, y: ty };
        break;
      }
    }
  }

  enemies.push(new Enemy(spawn.x, spawn.y, type));
}

// IMPORTANT: pass player in explicitly now
export function updateEnemies(dt, player, objects = []) {
  let xpGained = 0;

  for (const e of enemies) {
    const xp = e.update(dt, player, objects);
    if (xp > 0) xpGained += xp;
  }

  return xpGained;
}

export function drawEnemies(ctx) {
  for (const e of enemies) e.draw(ctx);
}
