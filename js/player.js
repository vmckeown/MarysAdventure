// player.js
import { isColliding, TILE_SIZE } from "./world.js";
import { spawnIceBolt } from "./iceBolt.js";

const maryImage = new Image();
maryImage.src = "./pics/Mary.png";

const SPRITE = {
  width: 32,
  height: 33,
  frames: 8,
  speed: 0.12
};

const FACING_ROW = {
  up: 0,
  left: 1,
  down: 2,
  right: 3
};

const PLAYER_STATE = {
  NORMAL: "normal",
  CASTING_ICE: "casting_ice"
};

export class Player {
  constructor(tileX, tileY) {
    this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = tileY * TILE_SIZE + TILE_SIZE / 2;

    this.size = 32;
    this.facing = "down";
    this.speed = 150;

    this.animFrame = 0;
    this.animTimer = 0;
    this.isMoving = false;

    this.state = PLAYER_STATE.NORMAL;

    // Ice cast
    this.castTimer = 0;
    this.castDuration = 0.35;
    this.spawnedBolt = false;

    // Stats (restore for HUD)
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;
    this.health = 5;
    this.maxHealth = 5;
    this.displayXP = this.xp;

    this.isDead = false;
    this.deathTimer = 0;
    this.deathDuration = 1.2; // seconds before respawn
    this.respawnX = this.x;
    this.respawnY = this.y;


    this.stamina = 50;
    this.maxStamina = 50;

    this.spirit = 50;
    this.maxSpirit = 50;

    // Hit reaction
    this.hitStunTimer = 0;
    this.hitStunDuration = 0.25; // seconds
    this.knockbackX = 0;
    this.knockbackY = 0;

    this.inventory = [];
    this.inventorySize = 12; // 3x4 grid later
    this.isInventoryOpen = false;

    for (let i = 0; i < this.inventorySize; i++) {
      this.inventory.push(null);
    }
  }

  update(dt, npcs, objects) {
    if (this.isDead) {
      this.deathTimer -= dt;

      if (this.deathTimer <= 0) {
        this.respawn();
      }

      return; // skip movement, input, attacks
    }

    if (this.hitStunTimer > 0) {
      this.hitStunTimer -= dt;

      // Apply knockback
      this.x += this.knockbackX * dt;
      this.y += this.knockbackY * dt;

      // Decay knockback
      this.knockbackX *= 0.85;
      this.knockbackY *= 0.85;

      return; // skip input while stunned
    }

    if (this.state === PLAYER_STATE.CASTING_ICE) {
      this.updateIceBolt(dt);
    }

    this.updateAnimation(dt);
  }

  startIceBolt() {
    console.log("[Player] Ice cast started");
    this.castTimer = 0;
    this.spawnedBolt = false;
    spawnIceBolt(this);
  }

  updateIceBolt(dt) {
    this.castTimer += dt;

    // Spawn once, mid-cast
    if (!this.spawnedBolt && this.castTimer >= this.castDuration / 2) {
      spawnIceBolt(this.x, this.y, this.facing);
      this.spawnedBolt = true;
    }

    if (this.castTimer >= this.castDuration) {
      this.state = PLAYER_STATE.NORMAL;
    }
  }

  handleMovementInput(mx, my, dt, npcs, objects) {
    if (this.isDead || this.state !== PLAYER_STATE.NORMAL) return;

    this.isMoving = mx !== 0 || my !== 0;

    if (this.isMoving) {
      if (Math.abs(mx) > Math.abs(my)) {
        this.facing = mx > 0 ? "right" : "left";
      } else {
        this.facing = my > 0 ? "down" : "up";
      }
    }

    if (mx && my) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }

    const nx = this.x + mx * this.speed * dt;
    const ny = this.y + my * this.speed * dt;

    if (!isColliding(nx, this.y, this.size, npcs, objects)) this.x = nx;
    if (!isColliding(this.x, ny, this.size, npcs, objects)) this.y = ny;
  }

  startIceCast() {
    if (this.state !== PLAYER_STATE.NORMAL) return;

    this.state = PLAYER_STATE.CASTING_ICE;
    this.castTimer = 0;
    this.spawnedBolt = false;
  }

  addItem(item) {
    for (let i = 0; i < this.inventory.length; i++) {
      if (this.inventory[i] === null) {
        this.inventory[i] = item;
        return true;
      }
    }
    return false; // inventory full
  }

  useItem(slotIndex) {
    const item = this.inventory[slotIndex];
    if (!item) return false;

    if (typeof item.use === "function") {
      const consumed = item.use(this);
      if (consumed) {
        this.inventory[slotIndex] = null;
      }
      return true;
    }

    return false;
  }


  damage(amount, sourceX, sourceY) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);

    if (this.health <= 0) {
      this.die();
      return;
    }

    const dx = this.x - sourceX;
    const dy = this.y - sourceY;
    const dist = Math.hypot(dx, dy) || 1;

    const force = 140;
    this.knockbackX = (dx / dist) * force;
    this.knockbackY = (dy / dist) * force;

    this.hitStunTimer = this.hitStunDuration;
  }


  die() {
    this.isDead = true;
    this.deathTimer = this.deathDuration;

    // Stop movement
    this.velocityX = 0;
    this.velocityY = 0;

    console.log("Player died");
  }

  respawn() {
    this.isDead = false;
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.spirit = this.maxSpirit;

    this.x = this.respawnX;
    this.y = this.respawnY;

    console.log("Player respawned");
  }


  gainXP(amount) {
    this.xp += amount;

    // Level up check
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xpToNext = Math.floor(this.xpToNext * 1.35);
    levelFlashTimer = 0.8;

    // Basic stat growth
    this.maxHealth += 1;
    this.health = this.maxHealth;

    this.maxStamina += 5;
    this.stamina = this.maxStamina;
    this.displayXP = this.xp;

    console.log(`⬆️ Level Up! Now level ${this.level}`);
  }

  updateAnimation(dt) {
    if (!this.isMoving) {
      this.animFrame = 0;
      return;
    }

    this.animTimer += dt;
    if (this.animTimer >= SPRITE.speed) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % SPRITE.frames;
    }
  }

  draw(ctx) {
    const row = FACING_ROW[this.facing];

    ctx.drawImage(
      maryImage,
      this.animFrame * SPRITE.width,
      row * SPRITE.height,
      SPRITE.width,
      SPRITE.height,
      Math.floor(this.x - SPRITE.width / 2),
      Math.floor(this.y - SPRITE.height / 2),
      SPRITE.width,
      SPRITE.height
    );
  }
}

