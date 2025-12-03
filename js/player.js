// player.js
import { isColliding, TILE_SIZE } from "./world.js";
import { keys, wasKeyPressed } from "./input.js";
import { enemies } from "./enemy.js";
import { particles, Particle, SlashParticle, FireSlashParticle, LightningDashParticle } from "./particles.js";
import { spawnDamageNumber } from "./damageNumbers.js";
import { items } from "./items.js";

// ======================================================
// SPRITES
// ======================================================
export const playerImage = new Image();
playerImage.src = "./pics/Mary.png";

// (Optional) generic slash row if your SlashParticle uses the sprite sheet
export const GENERIC_SLASH_ROW = 8;

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

        this.facingDir = facingDir;
        const dirToRow = {
            up: 4,    // row 5 of Mary.png
            left: 5,  // row 6
            down: 6,  // row 7
            right: 7  // row 8
        };
        this.rowIndex = dirToRow[this.facingDir];

        this.frame = 0;
        this.frameTimer = 0;
        this.frameInterval = 0.06;

        this.alive = true;

        this.travelFrames = [2, 3, 4, 5]; // looping travel
        this.spawnFrames  = [0, 1];       // spawn
        this.hitFrames    = [6, 7];       // burst
        this.mode = "spawn";

        this.frameWidth = 32;
        this.frameHeight = 33;
    }

    update(dt) {
        if (!this.alive) return;

        this.frameTimer += dt;

        // FRAME ANIMATION
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
                const push = 800;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const len = Math.hypot(dx, dy) || 1;

                enemy.x += (dx / len) * push * dt;
                enemy.y += (dy / len) * push * dt;

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
        this.spirit  = this.maxSpirit  = 50;
        this.strength = 5;
        this.agility  = 5;
        this.focus    = 5;

        this.staminaRegenRate = 10;
        this.spiritRegenRate  = 5;
        this.regenDelay = 1.5;
        this.regenTimer = 0;

        this.attackCooldown = 0;
        this.attackRange = 40;
        this.attackAngle = Math.PI / 4;
        this.attackDamage = 1;

        // XP / Level
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 100;
        this.levelUpTimer = 0;

        // Knockback
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.knockbackTimer = 0;

        // Fire Slash: "ready" buff + per-attack animation
        this.fireSlashReady = false;           // set by G
        this.fireSlashAttackTime = 0;          // current visual slash time
        this.fireSlashAttackDuration = 0.25;   // seconds
        this.fireSlashAttackFrame = 0;         // 0..3
        this.fireSlashAttackFacing = "down";   // direction used for sprite row

        // Cooldowns
        this.cooldowns = {
            dash: 0,
            echoSense: 0,
            spiritPulse: 0,
            frostPulse: 0,
            windStep: 0,
            lightningDash: 0
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
        this.sprite = playerImage;

        // Potions
        this.potions = 3;
        this.potionHeal = 2;
        this.potionCooldown = 0;
        this.potionCooldownTime = 1.5;

        // Wind Step (double-tap)
        this.time = 0;
        this.lastTapTime = {
            up: -999,
            down: -999,
            left: -999,
            right: -999
        };
        this.windStepInvuln = 0;

        // Dash
        this.dashTimer = 0;
        this.dashVelocity = { x: 0, y: 0 };
        this.dashTrailTimer = 0;
    }

    // ======================================================
    // SPIRIT PULSE
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

        // Forward spirit dart
        const dirMap = {
            up:    [0, -1],
            down:  [0,  1],
            left:  [-1, 0],
            right: [1,  0]
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

        if (this.facing === "up")    dy = -1;
        if (this.facing === "down")  dy =  1;
        if (this.facing === "left")  dx = -1;
        if (this.facing === "right") dx =  1;

        this.dashVelocity = { x: dx * dashSpeed, y: dy * dashSpeed };
        this.dashTimer = 0.1;
        this.dashTrailTimer = 0;

        // Simple flash circle
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Initial dash burst particle
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

    //---------------------------------------------------------
    // LIGHTNING DASH (Thunder Step)
    //---------------------------------------------------------
    useLightningDash() {
        if (this.cooldowns.lightningDash > 0) return;
        if (this.spirit < 20) return;

        this.spirit -= 20;
        this.regenTimer = 0;
        this.cooldowns.lightningDash = 4;

        console.log("⚡ Lightning Dash!");

        const dashDistance = 160;

        const dirMap = {
            up:    [0, -1],
            down:  [0, 1],
            left:  [-1, 0],
            right: [1, 0]
        };

        const [dx, dy] = dirMap[this.facing];

        // ─────────────────────────────
        //  LIGHTNING VFX PARTICLES
        // ─────────────────────────────
        for (let i = 0; i < 6; i++) {
            const spread = (Math.random() - 0.5) * 10;

            particles.push(new LightningDashParticle(
                this.x + dx * 10 + spread,
                this.y + dy * 10 + spread,
                this.facing
            ));
            console.log("Particles pushed")
        }

        // ─────────────────────────────
        //   Instant movement
        // ─────────────────────────────
        this.x += dx * dashDistance;
        this.y += dy * dashDistance;

        // Little spark at end
        particles.push(new LightningDashParticle(this.x, this.y, this.facing));
    }

    spawnLightningDashVFX() {
        const offsets = [
            {x: 0, y: -20},  // up
            {x: 0, y: 20},   // down
            {x: -20, y: 0},  // left
            {x: 20, y: 0},   // right
        ];

        let dirIndex = 0;
        if (this.facing === "up") dirIndex = 0;
        if (this.facing === "down") dirIndex = 1;
        if (this.facing === "left") dirIndex = 2;
        if (this.facing === "right") dirIndex = 3;

        const off = offsets[dirIndex];

        particles.push(new LightningDashParticle(
            this.x + off.x,
            this.y + off.y,
            this.facing
        ));
    }

    pickUpItem(item) {
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            const dist = Math.hypot(this.x - it.x, this.y - it.y);

            if (dist < 25) {
                if (it.type === "health") {
                    this.health = Math.min(this.maxHealth, this.health + 1);
                }
                if (it.type === "spirit") {
                    this.spirit = Math.min(this.maxSpirit, this.spirit + 10);
                }
                if (it.type === "stamina") {
                    this.stamina = Math.min(this.maxStamina, this.stamina + 10);
                }
                if (it.type === "gold") {
                    this.gold = this.gold + 5;
                }
                if (it.type === "buffCrystal") {
                  //  this.stamina = Math.min(this.maxStamina, this.stamina + 10);
                }

                it.alive = false;
                items.splice(i, 1);
                console.log("Picked up: " + it.type);
            }
        }
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

        particles.push(
            new Particle(
                this.x,
                this.y - 20,
                0,
                -30,
                0.5,
                "rgba(100,255,100,ALPHA)",
                4
            )
        );

        return true;
    }

    // ======================================================
    // WIND STEP (double-tap dodge)
    // ======================================================
    handleWindStep(ctx, npcs) {
        const window = 0.25; // seconds

        const now = this.time;
        const tap = (dirName, key, dx, dy) => {
            if (!wasKeyPressed(key)) return;

            const last = this.lastTapTime[dirName];
            if (now - last <= window) {
                this.performWindStep(dx, dy, ctx, npcs);
            }
            this.lastTapTime[dirName] = now;
        };

        tap("up",    "w",  0, -1);
        tap("down",  "s",  0,  1);
        tap("left",  "a", -1,  0);
        tap("right", "d",  1,  0);
    }

    performWindStep(dx, dy, ctx, npcs) {
        if (this.cooldowns.windStep > 0) return;
        if (this.spirit < 10) return;

        this.spirit -= 10;
        this.regenTimer = 0;
        this.cooldowns.windStep = 0.75;
        this.invulnTimer = Math.max(this.invulnTimer, 0.2);

        const distance = 60;
        const startX = this.x;
        const startY = this.y;

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

        // Start puff
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

        // End puff
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
        this.cooldowns.frostPulse = 6;
        this.frostPulseActive = 0.4;

        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 120) {
                enemy.slowTimer = 3.0;
                enemy.slowMultiplier = 0.45;

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
    // FIRE SLASH BUFF (G)
    // ======================================================
    useFireSlash() {
        if (this.spirit < 10) return;
        if (this.fireSlashReady) return; // don't stack

        this.spirit -= 10;
        this.regenTimer = 0;

        this.fireSlashReady = true;
        console.log("🔥 Fire Slash Ready!");
    }

    // ======================================================
    // XP / LEVEL
    // ======================================================
    gainXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.xpToNext = Math.floor(this.xpToNext * 1.25);
        this.levelUpTimer = 1.0;
        console.log(`⭐ Level Up! You are now level ${this.level}`);
    }

    // ======================================================
    // UPDATE
    // ======================================================
    update(dt, keys, npcs, objects, ctx) {
        this.time += dt;

        this.isMoving = false;
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.potionCooldown > 0) this.potionCooldown -= dt;

        // Movement facing
        if (keys["w"] || keys["ArrowUp"])   { this.facing = "up";    this.isMoving = true; }
        if (keys["s"] || keys["ArrowDown"]) { this.facing = "down";  this.isMoving = true; }
        if (keys["a"] || keys["ArrowLeft"]) { this.facing = "left";  this.isMoving = true; }
        if (keys["d"] || keys["ArrowRight"]){ this.facing = "right"; this.isMoving = true; }

        // ATTACK
        if (wasKeyPressed(" ")) this.attack(ctx);

        // Knockback
        if (this.knockbackTimer > 0) {
            this.applyKnockback(dt);
            return;
        }

        // Wind Step
        this.handleWindStep(ctx, npcs);

        // Normal movement
        this.handleMovement(dt, keys, npcs);

        if (this.levelUpTimer > 0) this.levelUpTimer -= dt;

        // Abilities
        if (keys["Shift"])  this.useDash(ctx);
        if (wasKeyPressed("f")) this.useSpiritPulse(ctx);
        if (wasKeyPressed("g")) this.useFireSlash();
        if (wasKeyPressed("r")) this.useFrostPulse();
        if (wasKeyPressed("e")) this.useLightningDash(ctx);


        // Regen
        this.regenTimer += dt;
        if (this.regenTimer > this.regenDelay) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * dt);
            this.spirit  = Math.min(this.maxSpirit,  this.spirit  + this.spiritRegenRate  * dt);
        }

        // Cooldowns
        for (const k in this.cooldowns) {
            if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;
        }

        if (this.frostPulseActive > 0) {
            this.frostPulseActive -= dt;
        }

        // Dash movement + afterimage trail
        if (this.dashTimer > 0) {
            this.dashTrailTimer -= dt;
            if (this.dashTrailTimer <= 0) {
                this.spawnDashAfterimage();
                this.dashTrailTimer = 0.04;
            }

            this.x += this.dashVelocity.x * dt;
            this.y += this.dashVelocity.y * dt;

            this.dashTimer -= dt;
        }

        // LIGHTNING DASH MOVEMENT
        if (this.lightningDashTimer > 0) {
            this.x += this.lightningDashVelocity.x * dt;
            this.y += this.lightningDashVelocity.y * dt;

            // Damage + paralyze enemies you pass through
            for (const enemy of enemies) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < 25) {
                    enemy.damage?.(3, this.x, this.y);
                    enemy.paralyzeTimer = 0.4;

                    // Lightning impact particle
                    particles.spawnLightningHit(enemy.x, enemy.y);
                }
            }

            // Trail VFX
            particles.spawnLightningTrail(this.x, this.y);

            this.lightningDashTimer -= dt;
            return; // skip normal movement during dash
        }


        // Fire Slash per-attack animation timer
        if (this.fireSlashAttackTime > 0) {
            this.fireSlashAttackTime -= dt;
            const t = 1 - (this.fireSlashAttackTime / this.fireSlashAttackDuration);
            const frames = 4;
            this.fireSlashAttackFrame = Math.min(frames - 1, Math.floor(t * frames));
            if (this.fireSlashAttackTime <= 0) {
                this.fireSlashAttackTime = 0;
            }
        }
    }

    // ======================================================
    // MOVEMENT
    // ======================================================
    handleMovement(dt, keys, npcs) {
        let moveX = 0, moveY = 0;

        if (keys["w"] || keys["ArrowUp"])    moveY = -1;
        if (keys["s"] || keys["ArrowDown"])  moveY =  1;
        if (keys["a"] || keys["ArrowLeft"])  moveX = -1;
        if (keys["d"] || keys["ArrowRight"]) moveX =  1;

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
    // ATTACK + FIRE SLASH
    // ======================================================
    attack(ctx) {
        if (this.attackCooldown > 0) return;
        this.attackCooldown = 0.5;

        const attackDir = {
            up: [0, -1],
            down: [0,  1],
            left: [-1, 0],
            right: [1,  0]
        }[this.facing];

        // Fire Slash: consume buff and start animation, EVEN IF WE MISS
        let usingFireSlash = false;
        if (this.fireSlashReady) {
            this.fireSlashReady = false;
            this.fireSlashAttackTime = this.fireSlashAttackDuration;
            this.fireSlashAttackFrame = 0;
            this.fireSlashAttackFacing = this.facing;
            usingFireSlash = true;
        }

        // Deal damage to enemies in front arc
        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > this.attackRange) continue;

            const dot = (dx * attackDir[0] + dy * attackDir[1]) / dist;
            if (dot < Math.cos(this.attackAngle)) continue;

            // Base hit
            enemy.damage?.(this.attackDamage, this.x, this.y);
            spawnDamageNumber(enemy.x, enemy.y, this.attackDamage);

            // Extra Fire Slash damage & burn if buff was active
            if (usingFireSlash) {
                enemy.damage?.(2, this.x, this.y);
                spawnDamageNumber(enemy.x, enemy.y, 2);

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
            }

            // Generic white slash swoosh in front of player
            const angleMap = {
                up:   -Math.PI / 2,
                down:  Math.PI / 2,
                left:  Math.PI,
                right: 0
            };

            particles.push(
                new SlashParticle(
                    this.x + attackDir[0] * 18,
                    this.y + attackDir[1] * 14,
                    angleMap[this.facing],
                    "rgba(255,255,255,ALPHA)",
                    0.2
                )
            );
        }
    }

    // ======================================================
    // DRAW PLAYER
    // ======================================================
    draw(ctx, dt) {
        let frameY = 0;
        if (this.facing === "up")    frameY = 0;
        if (this.facing === "left")  frameY = 1;
        if (this.facing === "down")  frameY = 2;
        if (this.facing === "right") frameY = 3;

        if (!playerImage.complete) return;

        if (this.isMoving) {
            this.animating = true;
            this.frameTimer += dt;
            if (this.frameTimer > this.frameInterval) {
                this.frame = (this.frame + 1) % 8;
                this.frameTimer = 0;
            }
        } else {
            this.animating = false;
            this.frame = 0;
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

        // Small aura when Fire Slash is ready
        if (this.fireSlashReady) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 120, 0, 0.5)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw Fire Slash animation if an empowered attack was just used
        if (this.fireSlashAttackTime > 0) {
            const rowMap = {
                up: 8,
                left: 9,
                down: 10,
                right: 11
            };
            const row = rowMap[this.fireSlashAttackFacing];

            const sx = this.fireSlashAttackFrame * 32;
            const sy = row * 33; 

            const offsetMap = {
                up:    { x: 0,   y: -20 },
                down:  { x: 0,   y: 20 },
                left:  { x: -20, y: 0 },
                right: { x: 20,  y: 0 }
            };
            const off = offsetMap[this.fireSlashAttackFacing];

            ctx.drawImage(
                playerImage,
                sx, sy, 32, 33,
                this.x - 16 + off.x,
                this.y - 16 + off.y,
                32, 33
            );
        }

        // Draw Mary herself
        ctx.drawImage(
            playerImage,
            this.frame * this.frameWidth, frameY * this.frameHeight,
            this.frameWidth, this.frameHeight,
            this.x - this.frameWidth / 2,
            this.y - this.frameHeight / 2,
            this.frameWidth, this.frameHeight
        );
    }

    // ======================================================
    // DASH AFTERIMAGE
    // ======================================================
    spawnDashAfterimage() {
        const p = new Particle(
            this.x,
            this.y,
            0,
            0,
            0.25,
            "rgba(255,255,255,ALPHA)",
            0
        );

        // Store the sprite frame + facing so Particle.draw()
        // renders a ghost of the player instead of a circle
        p.frame = this.frame;
        p.facing = this.facing;

        particles.push(p);
    }
}

export const player = new Player(5, 5);
