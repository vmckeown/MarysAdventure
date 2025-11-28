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
        this.facingDir = facingDir;
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
        this.spawnFrames = [0, 1];        // spawn
        this.hitFrames = [6, 7];          // burst
        this.mode = "spawn";

        this.frameWidth = 32;
        this.frameHeight = 33;
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
        const frameWidth = this.frameWidth;
        const frameHeight = this.frameHeight;

        const sx = this.frame * frameWidth;
        const sy = this.rowIndex * frameHeight;

        ctx.drawImage(
            playerImage,
            sx, sy,
            frameWidth, frameHeight,
            this.x - frameWidth / 2,
            this.y - frameHeight / 2,
            frameWidth, frameHeight
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

        this.fireSlashTimer = 0;  // time left for empowered slash

        // Ability cooldowns
        this.cooldowns = {
            dash: 0,
            echoSense: 0,
            spiritPulse: 0,
            frostPulse: 0,
            windStep: 0
        };

        // Visual timers
        this.frostPulseActive = 0;

        // Animation
        this.frame = 0;
        this.frameTimer = 0;
        this.frameInterval = 0.1;
        this.animating = false;
        this.isMoving = false;
        this.frameWidth = 32;
        this.frameHeight = 33;

        // Potions
        this.potions = 3;
        this.potionHeal = 2;
        this.potionCooldown = 0;
        this.potionCooldownTime = 1.5;

        // Wind Step (double-tap) state
        this.time = 0;
        this.lastTapTime = {
            up: -999,
            down: -999,
            left: -999,
            right: -999
        };
        this.windStepInvuln = 0;
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
        console.log("DASH");
        const dashSpeed = 450;
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

        particles.push(
            new Particle(
                this.x,
                this.y,
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200,
                0.2,
                "rgba(255,255,255,ALPHA)",
                6
            )
        );
    }

    // ======================================================
    // POTION
    // ======================================================

    usePotion() {
        if (this.potionCooldown > 0) return false;
        if (this.potions <= 0) return false;
        if (this.health >= this.maxHealth) return false;

        this.potions--;
        this.potionCooldown = this.potionCooldownTime;

        this.health = Math.min(this.maxHealth, this.health + this.potionHeal);

        // particle effect still okay here
        particles.push(
            new Particle(this.x, this.y - 20, 0, -30, 0.5, "rgba(100,255,100,ALPHA)", 4)
        );

        return true; // Inform the game we used a potion
    }

    // ======================================================
    // WIND STEP (Double-tap dodge)
// ======================================================
    handleWindStep(ctx, npcs) {
        const window = 0.25; // seconds for double-tap

        const now = this.time;

        const tap = (dirName, key, dx, dy) => {
            if (!wasKeyPressed(key)) return;

            const last = this.lastTapTime[dirName];
            if (now - last <= window) {
                this.performWindStep(dx, dy, ctx, npcs);
            }
            this.lastTapTime[dirName] = now;
        };

        // WASD only for now
        tap("up", "w", 0, -1);
        tap("down", "s", 0, 1);
        tap("left", "a", -1, 0);
        tap("right", "d", 1, 0);
    }

    performWindStep(dx, dy, ctx, npcs) {
        if (this.cooldowns.windStep > 0) return;
        if (this.spirit < 10) return;

        this.spirit -= 10;
        this.regenTimer = 0;
        this.cooldowns.windStep = 0.75; // cooldown
        this.invulnTimer = Math.max(this.invulnTimer, 0.2); // short i-frames

        const distance = 60;

        const startX = this.x;
        const startY = this.y;

        // Step forward in a few increments, stopping at walls
        let finalX = this.x;
        let finalY = this.y;
        const steps = 3;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const testX = this.x + dx * distance * t;
            const testY = this.y + dy * distance * t;

            if (!isColliding(testX, testY, this, npcs)) {
                finalX = testX;
                finalY = testY;
            } else {
                break;
            }
        }

        // Visuals: small wind ring at start and end + ghost afterimage
        particles.push(
            new Particle(
                startX,
                startY,
                0,
                0,
                0.2,
                "rgba(255,255,255,ALPHA)",
                6
            )
        );

        this.x = finalX;
        this.y = finalY;

        particles.push(
            new Particle(
                this.x,
                this.y,
                0,
                0,
                0.25,
                "rgba(255,255,255,ALPHA)",
                6
            )
        );

        this.spawnDashAfterimage();

        console.log("🌬️ Wind Step!");
    }

    // ======================================================
    // FROST PULSE
    // ======================================================
    useFrostPulse() {
        if (this.cooldowns.frostPulse > 0) return;
        if (this.spirit < 25) return;

        this.spirit -= 25;
        this.regenTimer = 0;
        this.cooldowns.frostPulse = 6;  // cooldown in seconds
        this.frostPulseActive = 0.4;    // ring visual lasts 0.4s

        // Slow all nearby enemies
        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 120) {
                enemy.slowTimer = 3.0;         // slow lasts 3 seconds
                enemy.slowMultiplier = 0.45;   // move at 45% speed

                // Snowflake particle on enemy
                particles.push(
                    new Particle(
                        enemy.x,
                        enemy.y - 10,
                        (Math.random() - 0.5) * 40,
                        -50 - Math.random() * 40,
                        0.7,
                        "rgba(180,220,255,ALPHA)",
                        3
                    )
                );
            }
        }

        console.log("❄️ Frost Pulse!");
    }

    // ======================================================
    // UPDATE
    // ======================================================
    update(dt, keys, npcs, objects, ctx) {
        this.time += dt;

        this.isMoving = false;
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Movement facing
        if (keys["w"] || keys["ArrowUp"]) this.facing = "up", this.isMoving = true;
        if (keys["s"] || keys["ArrowDown"]) this.facing = "down", this.isMoving = true;
        if (keys["a"] || keys["ArrowLeft"]) this.facing = "left", this.isMoving = true;
        if (keys["d"] || keys["ArrowRight"]) this.facing = "right", this.isMoving = true;

        // ATTACK
        if (wasKeyPressed(" ")) this.attack();

        if (this.knockbackTimer > 0) {
            this.applyKnockback(dt);
            return;
        }

        // Wind Step (double-tap detection)
        this.handleWindStep(ctx, npcs);

        // Normal movement
        this.handleMovement(dt, keys, npcs);

        if (this.levelUpTimer > 0) this.levelUpTimer -= dt;

        // ABILITIES
        if (keys["Shift"]) this.useDash(ctx);
        if (wasKeyPressed("f")) this.useSpiritPulse(ctx);
        if (wasKeyPressed("g")) this.useFireSlash();
        if (wasKeyPressed("r")) this.useFrostPulse();

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

        if (this.frostPulseActive > 0) {
            this.frostPulseActive -= dt;
        }

        // Dash movement
        if (this.dashTimer > 0) {
            // Leave an afterimage every few frames
            if (!this.dashTrailTimer) this.dashTrailTimer = 0;
            this.dashTrailTimer -= dt;

            if (this.dashTrailTimer <= 0) {
                this.spawnDashAfterimage();
                this.dashTrailTimer = 0.04; // every ~40ms
            }

            // Dash movement
            this.x += this.dashVelocity.x * dt;
            this.y += this.dashVelocity.y * dt;

            this.dashTimer -= dt;
        }

        if (this.potionCooldown > 0) {
            this.potionCooldown -= dt;
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
    // KNOCKBACK
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
    // FIRE SLASH
    // ======================================================
    useFireSlash() {
        if (this.spirit < 10) return;

        this.spirit -= 10;
        this.regenTimer = 0;

        this.fireSlashTimer = 1.0; // lasts for 1 second (or 1 attack)

        console.log("🔥 Fire Slash Ready!");
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

            // Fire Slash bonus
            if (this.fireSlashTimer > 0) {

                // Bonus damage
                enemy.damage?.(2, this.x, this.y);
                spawnDamageNumber(enemy.x, enemy.y, 2);

                // Burn DoT
                enemy.burnTimer = 1.5;
                enemy.burnTick = 0;

                // Fire burst particles
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 40 + Math.random() * 80;

                    particles.push(
                        new Particle(
                            enemy.x,
                            enemy.y,
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed,
                            0.4,
                            "rgba(255,100,20,ALPHA)",
                            3
                        )
                    );
                }

                // This consumes Fire Slash
                this.fireSlashTimer = 0;
            }

            // Blood particles
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 100;
                particles.push(
                    new Particle(
                        enemy.x,
                        enemy.y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        0.3,
                        "rgba(255,50,50,ALPHA)",
                        2
                    )
                );
            }

            const angleMap = {
                up: -Math.PI / 2,
                down: Math.PI / 2,
                left: Math.PI,
                right: 0
            };

            particles.push(
                new SlashParticle(
                    this.x, this.y,
                    angleMap[this.facing],
                    "rgba(255,255,255,ALPHA)",
                    0.15
                )
            );
        }
    }

    // ======================================================
    // DRAW PLAYER
    // ======================================================
    draw(ctx, dt) {
        let frameY = 0;

        if (this.facing === "up") frameY = 0;
        if (this.facing === "left") frameY = 1;
        if (this.facing === "down") frameY = 2;
        if (this.facing === "right") frameY = 3;

        if (!playerImage.complete) return;

        if (this.isMoving) {
            this.animating = true;
            this.frameTimer += dt;
            if (this.frameTimer > this.frameInterval) {
                this.frame = (this.frame + 1) % 8; // 8 walking frames
                this.frameTimer = 0;
            }
        } else {
            this.animating = false;
            this.frame = 0; // idle frame
        }

        // Frost Pulse ring
        if (this.frostPulseActive > 0) {
            const alpha = this.frostPulseActive / 0.4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 120, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(150,200,255,${alpha})`;
            ctx.lineWidth = 6;
            ctx.stroke();
        }

        // Fire Slash aura
        if (this.fireSlashTimer > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 100, 0, 0.5)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.drawImage(
            playerImage,
            this.frame * this.frameWidth, frameY * this.frameHeight,
            this.frameWidth, this.frameHeight,
            this.x - this.frameWidth / 2, this.y - this.frameHeight / 2,
            this.frameWidth, this.frameHeight
        );
    }

    spawnDashAfterimage() {
        particles.push(
            new Particle(
                this.x,
                this.y,
                0,
                0,
                0.25, // lifespan
                "rgba(255,255,255,ALPHA)", // color fades to transparent
                0,
                this.frame,        // store player's frame
                this.facing        // store player's facing
            )
        );
    }
}

export const player = new Player(5, 5);
