import { isColliding, TILE_SIZE } from "./world.js";
import { keys, wasKeyPressed } from "./input.js";
import { enemies } from "./enemy.js";
import { particles, Particle, SlashParticle } from "./particles.js";
import { spawnDamageNumber } from "./damageNumbers.js";

const playerImage = new Image();
playerImage.src = "./pics/Mary.png";

// ======================================================
// SPIRIT DART SYSTEM
// ======================================================

export const spiritDarts = [];

class SpiritDart {
    constructor(x, y, dirX, dirY, facingDir) {
        this.x = x;
        this.y = y;

        const speed = 250;
        this.vx = dirX * speed;
        this.vy = dirY * speed;

        this.frameSize = 32;
        this.facingDir = facingDir
        const dirToRow = {
            up: 4,     // row 5
            left: 5,   // row 6
            down: 6,   // row 7
            right: 7   // row 8
        };
        this.rowIndex = dirToRow[this.facingDir];   
        this.frame = 0;
        this.frameTimer = 0;
        this.frameInterval = 0.06;

        this.alive = true;

        this.travelFrames = [2, 3, 4, 5]; // looping travel
        this.spawnFrames = [0, 1];       // spawn
        this.hitFrames = [6, 7];         // burst
        this.mode = "spawn";
    }

    update(dt) {
        if (!this.alive) return;

        this.frameTimer += dt;

        // FRAME ANIMATION LOGIC
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;

            if (this.mode === "spawn") {
                this.frame++;
                if (this.frame >= 2) {
                    this.mode = "travel";
                    this.frame = 2;
                }
            } else if (this.mode === "travel") {
                const i = this.travelFrames.indexOf(this.frame);
                const next = (i + 1) % this.travelFrames.length;
                this.frame = this.travelFrames[next];
            } else if (this.mode === "hit") {
                this.frame++;
                if (this.frame > 7) this.alive = false;
            }
        }

        // MOVEMENT
        if (this.mode !== "hit") {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

        // COLLISION WITH ENEMIES
        for (const enemy of enemies) {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < 20 && this.mode !== "hit") {
                // Knockback
                const push = 800;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const len = Math.hypot(dx, dy) || 1;

                enemy.x += (dx / len) * push * dt;
                enemy.y += (dy / len) * push * dt;

                // Optional small damage
                enemy.damage?.(1, this.x, this.y);

                this.mode = "hit";
                this.frame = 6;
            }
        }
    }

    draw(ctx) {
        const sx = this.frame * this.frameSize;
        const sy = this.rowIndex * this.frameSize;

        ctx.drawImage(
            playerImage,
            sx, sy,
            this.frameSize, this.frameSize,
            this.x - this.frameSize / 2,
            this.y - this.frameSize / 2,
            this.frameSize, this.frameSize
        );
    }
}

// ======================================================
// PLAYER CLASS
// ======================================================

export class Player {
    constructor(tileX, tileY) {
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;
        this.size = 32;

        this.speed = 150;
        this.facing = "down";

        // Stats
        this.health = 5;
        this.maxHealth = 5;
        this.invulnTimer = 0;

        this.stamina = this.maxStamina = 50;
        this.strength = 5;
        this.agility = 5;
        this.focus = 5;
        this.spirit = this.maxSpirit = 50;

        this.staminaRegenRate = 10;
        this.spiritRegenRate = 5;
        this.regenDelay = 1.5;
        this.regenTimer = 0;

        this.attackCooldown = 0;
        this.attackRange = 40;
        this.attackAngle = Math.PI / 4;
        this.attackDamage = 1;

        this.level = 1;
        this.xp = 0;
        this.xpToNext = 100;
        this.levelUpTimer = 0;

        this.knockbackX = 0;
        this.knockbackY = 0;
        this.knockbackTimer = 0;

        this.cooldowns = {
            dash: 0,
            echoSense: 0,
            spiritPulse: 0
        };
    }

    // ======================================================
    // SPIRIT PULSE ABILITY
    // ======================================================
    useSpiritPulse(ctx) {
        if (this.cooldowns.spiritPulse > 0 || this.spirit < 25) return;
        this.cooldowns.spiritPulse = 6;
        this.spirit -= 25;
        this.regenTimer = 0;

        console.log("Mary used Spirit Pulse!");

        // Radial knockback
        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 100) {
                const push = 150;
                enemy.x += (dx / dist) * push;
                enemy.y += (dy / dist) * push;
                enemy.hitTimer = 0.2;
            }
        }

        // Spawn forward spirit dart
        const dirMap = {
            up: [0, -1],
            down: [0, 1],
            left: [-1, 0],
            right: [1, 0]
        };

        const [dx, dy] = dirMap[this.facing];
        spiritDarts.push(new SpiritDart(this.x, this.y, dx, dy, this.facing));

        // Visual flash
        ctx.beginPath();
        ctx.arc(this.x, this.y, 100, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 200, 0.4)";
        ctx.stroke();
    }

    // ======================================================
    // DASH
    // ======================================================
    useDash(ctx) {
        if (this.cooldowns.dash > 0 || this.stamina < 15) return;

        this.cooldowns.dash = 1.5;
        this.stamina -= 15;
        this.regenTimer = 0;

        const dashSpeed = 400;
        let dx = 0, dy = 0;

        if (this.facing === "up") dy = -1;
        if (this.facing === "down") dy = 1;
        if (this.facing === "left") dx = -1;
        if (this.facing === "right") dx = 1;

        this.dashVelocity = { x: dx * dashSpeed, y: dy * dashSpeed };
        this.dashTimer = 0.1;

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // ======================================================
    // UPDATE
    // ======================================================
    update(dt, keys, npcs, objects, ctx) {
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Movement facing
        if (keys["w"] || keys["ArrowUp"]) this.facing = "up";
        if (keys["s"] || keys["ArrowDown"]) this.facing = "down";
        if (keys["a"] || keys["ArrowLeft"]) this.facing = "left";
        if (keys["d"] || keys["ArrowRight"]) this.facing = "right";

        if (wasKeyPressed(" ")) this.attack();

        if (this.knockbackTimer > 0) {
            this.applyKnockback(dt);
            return;
        }

        this.handleMovement(dt, keys, npcs);

        if (this.levelUpTimer > 0) this.levelUpTimer -= dt;

        // ABILITIES
        if (keys["Shift"]) this.useDash(ctx);
        if (wasKeyPressed("e")) this.useEchoSense(ctx);
        if (wasKeyPressed("f")) this.useSpiritPulse(ctx);

        // Regeneration logic
        this.regenTimer += dt;
        if (this.regenTimer > this.regenDelay) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * dt);
            this.spirit = Math.min(this.maxSpirit, this.spirit + this.spiritRegenRate * dt);
        }

        // Cooldown reduction
        for (const k in this.cooldowns) {
            if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;
        }

        // Dash movement
        if (this.dashTimer > 0) {
            this.x += this.dashVelocity.x * dt;
            this.y += this.dashVelocity.y * dt;
            this.dashTimer -= dt;
        }
    }

    // ======================================================
    // MOVEMENT
    // ======================================================
    handleMovement(dt, keys, npcs) {
        let moveX = 0, moveY = 0;

        if (keys["w"] || keys["ArrowUp"]) moveY = -1;
        if (keys["s"] || keys["ArrowDown"]) moveY = 1;
        if (keys["a"] || keys["ArrowLeft"]) moveX = -1;
        if (keys["d"] || keys["ArrowRight"]) moveX = 1;

        if (moveX !== 0 && moveY !== 0) {
            const len = Math.hypot(moveX, moveY);
            moveX /= len;
            moveY /= len;
        }

        const nextX = this.x + moveX * this.speed * dt;
        const nextY = this.y + moveY * this.speed * dt;

        if (!isColliding(nextX, nextY, this, npcs)) this.x = nextX;
        if (!isColliding(nextX, nextY, this, npcs)) this.y = nextY;
    }

    // ======================================================
    // KNOCKBACK HANDLING
    // ======================================================
    applyKnockback(dt) {
        const nextX = this.x + this.knockbackX * dt;
        const nextY = this.y + this.knockbackY * dt;

        this.x = nextX;
        this.y = nextY;

        this.knockbackTimer -= dt;
        this.knockbackX *= 0.85;
        this.knockbackY *= 0.85;
    }

    // ======================================================
    // ATTACK
    // ======================================================
    attack() {
        if (this.attackCooldown > 0) return;
        this.attackCooldown = 0.5;

        const attackDir = {
            up: [0, -1],
            down: [0, 1],
            left: [-1, 0],
            right: [1, 0]
        }[this.facing];

        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > this.attackRange) continue;

            const dot = (dx * attackDir[0] + dy * attackDir[1]) / dist;
            if (dot < Math.cos(this.attackAngle)) continue;

            enemy.damage?.(this.attackDamage, this.x, this.y);
            spawnDamageNumber(enemy.x, enemy.y, this.attackDamage);

            // Blood particles
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 100;
                particles.push(
                    new Particle(enemy.x, enemy.y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        0.3,
                        "rgba(255,50,50,ALPHA)", 2)
                );
            }

            const angleMap = {
                up: -Math.PI / 2,
                down: Math.PI / 2,
                left: Math.PI,
                right: 0
            };

            particles.push(new SlashParticle(
                this.x, this.y,
                angleMap[this.facing],
                "rgba(255,255,255,ALPHA)",
                0.15
            ));
        }
    }

    // ======================================================
    // DRAW PLAYER
    // ======================================================
    draw(ctx) {
        const frameSize = 32;
        let frameX = 0;
        let frameY = 0;

        if (this.facing === "up") frameY = 0;
        if (this.facing === "left") frameY = 1;
        if (this.facing === "down") frameY = 2;
        if (this.facing === "right") frameY = 3;

        if (!playerImage.complete) return;

        ctx.drawImage(
            playerImage,
            frameX * frameSize, frameY * frameSize,
            frameSize, frameSize,
            this.x - frameSize / 2, this.y - frameSize / 2,
            frameSize, frameSize
        );
    }
}

export const player = new Player(5, 5);
