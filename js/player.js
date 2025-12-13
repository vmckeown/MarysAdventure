import { isColliding, TILE_SIZE } from "./world.js";
import { keys, wasKeyPressed } from "./input.js";
import { Graphics } from "./graphics.js";
import { enemies } from "./enemy.js";

function handleInteractions() {
  if (wasKeyPressed("e")) {
    if (!activeDialogue) {
      const nearby = getNearbyNPC();
      if (nearby) {
        activeDialogue = nearby;
        dialogueIndex = 0;
      }
    } else {
      // Advance to next line
      dialogueIndex++;
      if (dialogueIndex >= activeDialogue.dialogue.length) {
        // End conversation
        activeDialogue = null;
        dialogueIndex = 0;
      }
    }
  }
}

function getNearbyNPC() {
  for (const npc of npcs) {
    const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (dist < 60) return npc;
  }
  return null;
}

export class Player {
  constructor(tileX, tileY) {
    this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
    this.size = 32;
    this.color = "#ffff00";
    this.speed = 150;
    this.facing = "down";
    this.moved = false;

    // Stats
    this.health = 5;
    this.maxHealth = 5;
    this.invulnTimer = 0;
    this.stamina = this.maxStamina = 50;
    this.strength = 5;
    this.agility = 5;
    this.focus = 5;
    this.spirit = this.maxSpirit = 50;

    // Regeneration rates
    this.staminaRegenRate = 10; // per second
    this.spiritRegenRate = 5; // per second
    this.regenDelay = 1.5; // time after action before regen resumes
    this.regenTimer = 0;

    this.inCombat = false;

    // Knockback
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.knockbackTimer = 0;

    // Player progression
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;
    this.levelUpTimer = 0; // tracks level-up flash duration

    // === Cooldowns ===
    this.cooldowns = {
      dash: 0,
      echoSense: 0,
      spiritPulse: 0,
    };

    // Dash state
    this.dashVelocity = { x: 0, y: 0 };
    this.dashTimer = 0;
  }

  useDash(ctx) {
    if (this.cooldowns.dash > 0 || this.stamina < 15) return;

    this.cooldowns.dash = 1.5;
    this.stamina -= 15;
    this.regenTimer = 0;

    const dashSpeed = 400;
    let dx = 0,
      dy = 0;

    switch (this.facing) {
      case "up":
        dy = -1;
        break;
      case "down":
        dy = 1;
        break;
      case "left":
        dx = -1;
        break;
      case "right":
        dx = 1;
        break;
    }

    // Set dash velocity; actual movement happens over time in update()
    this.dashVelocity = { x: dx * dashSpeed, y: dy * dashSpeed };
    this.dashTimer = 0.1;

    // Simple visual cue at the start position
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    console.log("Mary dashed!");
  }

  useEchoSense(ctx) {
    if (this.cooldowns.echoSense > 0 || this.spirit < 20) return;
    this.regenTimer = 0;

    // NOTE: this assumes a global 'objects' array exists.
    for (const obj of objects) {
      if (Math.hypot(this.x - obj.x, this.y - obj.y) < 150) {
        obj.revealed = true;
      }
    }

    this.cooldowns.echoSense = 8;
    this.spirit -= 20;

    console.log("Mary used Echo Sense!");

    // Example effect (expand as needed)
    this.echoSenseTimer = 5; // lasts 5 seconds
  }

  useSpiritPulse(ctx) {
    if (this.cooldowns.spiritPulse > 0 || this.spirit < 25) return;
    this.regenTimer = 0;

    this.cooldowns.spiritPulse = 6;
    this.spirit -= 25;

    console.log("Mary used Spirit Pulse!");

    // Push nearby enemies
    for (const enemy of enemies) {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 100) {
        const knockback = 150;
        enemy.x += (dx / dist) * knockback;
        enemy.y += (dy / dist) * knockback;
        enemy.hitTimer = 0.2;
      }
    }

    // Flash effect
    ctx.beginPath();
    ctx.arc(this.x, this.y, 100, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 200, 0.4)";
    ctx.stroke();
  }

  update(dt, keys, npcs, objects, ctx) {
    this._npcs = npcs;
    this._objects = objects;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Movement – facing only (actual movement in handleMovement)
    if (keys["w"] || keys["ArrowUp"]) this.facing = "up";
    if (keys["s"] || keys["ArrowDown"]) this.facing = "down";
    if (keys["a"] || keys["ArrowLeft"]) this.facing = "left";
    if (keys["d"] || keys["ArrowRight"]) this.facing = "right";

    // Knockback overrides control
    if (this.knockbackTimer > 0) {
      this.applyKnockback(dt);
      return;
    }

    // Normal movement
    this.handleMovement(dt, keys, npcs, objects);

    if (this.levelUpTimer > 0) {
      this.levelUpTimer -= dt;
    }

    // === Ability Input Handling ===
    if (keys["Shift"]) this.useDash(ctx);
    if (wasKeyPressed("e")) this.useEchoSense(ctx);
    if (wasKeyPressed("f")) this.useSpiritPulse(ctx);

    // Regenerate stamina & spirit (base regen)
    this.stamina = Math.min(this.maxStamina, this.stamina + 30 * dt);
    this.spirit = Math.min(this.maxSpirit, this.spirit + 10 * dt);

    // Reduce cooldowns
    for (const key in this.cooldowns) {
      if (this.cooldowns[key] > 0) this.cooldowns[key] -= dt;
    }

    // Dash movement over time (no extra instant snap)
    if (this.dashTimer > 0) {
      const nextX = this.x + this.dashVelocity.x * dt;
      const nextY = this.y + this.dashVelocity.y * dt;

      if (!isColliding(nextX, this.y, this.size, npcs, objects)) this.x = nextX;
      if (!isColliding(this.x, nextY, this.size, npcs, objects)) this.y = nextY;

      this.dashTimer -= dt;
    }

    // === Regeneration Logic with delay ===
    this.regenTimer += dt;

    if (this.regenTimer > this.regenDelay) {
      // Stamina regeneration
      if (this.stamina < this.maxStamina) {
        this.stamina = Math.min(
          this.maxStamina,
          this.stamina + this.staminaRegenRate * dt
        );
      }

      // Spirit regeneration
      if (this.spirit < this.maxSpirit) {
        this.spirit = Math.min(
          this.maxSpirit,
          this.spirit + this.spiritRegenRate * dt
        );
      }
    }
  }

  gainXP(amount) {
    this.xp += amount;
    console.log(`Mary gains ${amount} XP! (${this.xp}/${this.xpToNext})`);

    if (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }

  levelUp() {
    this.xp -= this.xpToNext;
    this.level++;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    this.levelUpTimer = 1.5; // effect lasts 1.5 seconds

    // Stat increases
    this.maxHealth += 100 + this.level * 10;
    this.maxStamina += 100 + this.level * 5;
    this.maxSpirit += 50 + this.level * 5;
    this.stamina = this.maxStamina;
    this.spirit = this.maxSpirit;
    this.strength += 1;
    this.agility += 1;
    this.focus += 1;
    this.health = this.maxHealth;

    // Flavor feedback
    console.log(`✨ Mary leveled up! She is now Level ${this.level}.`);
    const messages = [
      "Mary feels her confidence growing.",
      "Her curiosity sharpens into courage.",
      "The world feels just a bit less frightening.",
      "She senses something awakening inside...",
    ];
    console.log(messages[Math.floor(Math.random() * messages.length)]);
  }

  handleMovement(dt, keys, npcs, objects) {
    if (this.health <= 0) return;

    let moveX = 0,
      moveY = 0;
    if (keys["w"] || keys["ArrowUp"]) moveY = -1;
    if (keys["s"] || keys["ArrowDown"]) moveY = 1;
    if (keys["a"] || keys["ArrowLeft"]) moveX = -1;
    if (keys["d"] || keys["ArrowRight"]) moveX = 1;

    // Normalize diagonal
    if (moveX !== 0 && moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      moveX /= len;
      moveY /= len;
    }

    const nextX = this.x + moveX * this.speed * dt;
    const nextY = this.y + moveY * this.speed * dt;

    // Separate axis collision for smoother sliding
    if (!isColliding(nextX, this.y, this.size, npcs, objects)) this.x = nextX;
    if (!isColliding(this.x, nextY, this.size, npcs, objects)) this.y = nextY;
  }

  applyKnockback(dt) {
      const nextX = this.x + this.knockbackX * dt;
      const nextY = this.y + this.knockbackY * dt;

      if (!isColliding(nextX, nextY, this, this._npcs, this._objects)) {
          this.x = nextX;
      }

      if (!isColliding(nextX, nextY, this, this._npcs, this._objects)) {
          this.y = nextY;
      }

      this.knockbackTimer -= dt;
      this.knockbackX *= 0.85;
      this.knockbackY *= 0.85;
  }

  damage(amount, sourceX = null, sourceY = null) {
    if (this.invulnTimer > 0 || this.health <= 0) return;

    this.health -= amount;
    this.invulnTimer = 1.0;
    console.log(`💥 Player hit! HP: ${this.health}/${this.maxHealth}`);

    if (sourceX !== null && sourceY !== null) {
      const dx = this.x - sourceX;
      const dy = this.y - sourceY;
      const len = Math.hypot(dx, dy) || 1;
      this.knockbackX = (dx / len) * 200;
      this.knockbackY = (dy / len) * 200;
      this.knockbackTimer = 0.2;
    }

    if (this.health <= 0) {
      console.log("☠️ Player defeated!");
    }
  }

  draw(ctx) {
    Graphics.square(
      ctx,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.color
    );

    // Debug: show direction as a line
    const lineLen = 15;
    ctx.strokeStyle = "white";
    ctx.beginPath();
    switch (this.facing) {
      case "up":
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y - lineLen);
        break;
      case "down":
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + lineLen);
        break;
      case "left":
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - lineLen, this.y);
        break;
      case "right":
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + lineLen, this.y);
        break;
    }
    ctx.stroke();

    // Level-up glow
    if (this.levelUpTimer > 0) {
      const alpha = Math.min(this.levelUpTimer, 1); // fade out
      ctx.save();
      ctx.globalAlpha = alpha;
      const radius = this.size * (1.5 + (1 - alpha)); // expanding circle
      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        this.size / 2,
        this.x,
        this.y,
        radius
      );
      gradient.addColorStop(0, "rgba(255, 255, 150, 0.8)");
      gradient.addColorStop(0.5, "rgba(255, 255, 100, 0.4)");
      gradient.addColorStop(1, "rgba(255, 255, 50, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export const player = new Player(5, 5);
