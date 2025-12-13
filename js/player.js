// player.js
import { isColliding, TILE_SIZE } from "./world.js";
import { keys, wasKeyPressed } from "./input.js";
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
    
    this.hp = 10;
    this.maxHp = 10;

    this.stamina = 50;
    this.maxStamina = 50;

    this.spirit = 50;
    this.maxSpirit = 50;

  }

  update(dt, npcs, objects) {
    // 🔑 INPUT FIRST
    if (this.state === PLAYER_STATE.NORMAL && wasKeyPressed("e")) {
      this.startIceBolt();
    }

    if (this.state === PLAYER_STATE.CASTING_ICE) {
      this.updateIceBolt(dt);
    }

    this.handleMovement(dt, npcs, objects);
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

  handleMovement(dt, npcs, objects) {
    let mx = 0, my = 0;

    if (keys["w"]) { my = -1; this.facing = "up"; }
    if (keys["s"]) { my = 1;  this.facing = "down"; }
    if (keys["a"]) { mx = -1; this.facing = "left"; }
    if (keys["d"]) { mx = 1;  this.facing = "right"; }

    this.isMoving = mx || my;

    if (mx && my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
    }

    const nx = this.x + mx * this.speed * dt;
    const ny = this.y + my * this.speed * dt;

    if (!isColliding(nx, this.y, this.size, npcs, objects)) this.x = nx;
    if (!isColliding(this.x, ny, this.size, npcs, objects)) this.y = ny;
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

export const player = new Player(5, 5);
