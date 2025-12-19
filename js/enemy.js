let activeAttackers = 0;
const MAX_ATTACKERS = 2;
const goblinImage = new Image();
goblinImage.src = "./pics/Goblin.png";

const orcimage = new Image();
orcimage.src = "./pics/orc.png";

const orcBruteImage = new Image();
orcBruteImage.src = "./pics/OrcBrute.png";


import {TILE_SIZE} from "./world.js";
import {findPath} from "./pathfinding.js";
import {worldToTile} from "./world.js";


export const enemies = [];

export const ENEMY_STATE = {
    IDLE: "idle",
    PATROL: "patrol",
    CHASE: "chase",
    SEARCH: "search",
    DEAD: "dead"
};

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

        if (this.type === "coward") {
            this.sprite = goblinImage;
        }
        if (this.type === "skirmisher") {
            this.sprite = orcimage;
        }
        if (this.type === "brute") {
            this.sprite = orcBruteImage;
        }

        this.speed = a.speed;
        this.courage = a.courage;
        this.retreatHealthThreshold = a.retreatHealthThreshold;
        this.attackCooldown = a.attackCooldown;
        this.meleeRange = a.meleeRange;
        this.maxHealth = a.maxHealth;
        this.hesitationChance = a.hesitationChance;

        this.targetX = this.x;
        this.targetY = this.y;

        this.size = 28;
        this.color = a.color;
        this.health = this.maxHealth;
        this.alive = true;
        this.state = ENEMY_STATE.PATROL;
        this.visionRange = 200;

        // Health bar display
        this.showHealthBarTimer = 0;
        this.healthBarDuration = 1.5; // seconds visible after hit

        // AI polish
        this.alertDelay = 0.35;
        this.alertTimer = 0;

        this.minChaseTime = 1.2;
        this.chaseTimer = 0;

        this.lastSeen = null;
        this.lastGoal = null;

        this.targetX = this.x;
        this.targetY = this.y;

        // Chase commitment
        this.lostSightGrace = 0.75; // seconds enemy will keep chasing after LOS loss
        this.lostSightTimer = 0;

        // Pathfinding
        this.path = [];
        this.pathIndex = 0;
        this.pathTimer = 0;

        // Patrol
        this.targetX = this.x;
        this.targetY = this.y;

        // Search
        this.searchTimer = 0;
        this.searchPath = null;
        this.searchPathIndex = 0;

        // Group aggro
        this.aggroRadius = 160; // world units
        this.aggroCooldown = 0;

        // Melee spacing
        this.meleeBuffer = 4; // prevents jitter
        
        // Anti-stacking
        this.separationRadius = this.size * 1.6; // how close is "too close"
        this.separationStrength = 40;      // push force


        // Attack system
        this.attackRange = this.meleeRange; // reuse spacing
        this.attackWindup = 0.35; // seconds before hit
        this.attackDelay = 0.8;

        this.attackTimer = 0;
        this.isWindingUp = false;

        // Circling behavior
        this.circleStrength = 35;     // sideways force
        this.circleDirection = Math.random() < 0.5 ? -1 : 1;
        this.circleSwitchTimer = 0;

        // Hesitation
        this.hesitationTimer = 0;

        // Flanking
        this.flankBias = Math.random() < 0.5 ? -1 : 1;

        // Death handling
        this.deathTimer = 0;
        this.deathDuration = 0.6; // seconds before removal
        this.fadeAlpha = 1;
        this.knockbackX = 0;
        this.knockbackY = 0;

        // Hit reaction
        this.hitStunTimer = 0;
        this.hitStunDuration = 0.15;
        this.hitKnockbackX = 0;
        this.hitKnockbackY = 0;
    }

    update(dt, player) {
        // =====================================
        // DEAD STATE (fade + knockback)
        // =====================================
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

        // =====================================
        // HIT STUN (non-lethal stagger)
        // =====================================
        if (this.showHealthBarTimer > 0) {
            this.showHealthBarTimer -= dt;
        }

        if (this.hitStunTimer > 0) {
            this.hitStunTimer -= dt;

            this.x += this.hitKnockbackX * dt;
            this.y += this.hitKnockbackY * dt;

            this.hitKnockbackX *= 0.8;
            this.hitKnockbackY *= 0.8;

            return 0;
        }

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
                    this.alertNearbyEnemies();
                }
            }
        } else {
            this.alertTimer = 0;
        }

        // =====================================
        // STATE TRANSITIONS
        // =====================================
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

                if (seesPlayer) {
                    this.lastSeen = { x: player.x, y: player.y };
                }

                if (this.health <= this.retreatHealthThreshold) {
                    this.state = ENEMY_STATE.SEARCH;
                    this.searchTimer = 2 + Math.random();
                    break;
                }

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
                            player.damage?.(1, this.x, this.y);
                        }

                        this.isWindingUp = false;
                        this.attackTimer = this.attackCooldown;
                        activeAttackers = Math.max(0, activeAttackers - 1);
                    }
                    break;
                }

                const needsRepath =
                    this.pathTimer <= 0 ||
                    !this.path ||
                    this.pathIndex >= this.path.length;

                if (needsRepath && this.lastSeen) {
                    const start = worldToTile(this.x, this.y);

                    const perpX = -dy / dist;
                    const perpY = dx / dist;
                    const flankOffset = this.flankBias * this.size * 0.75;

                    const goalX =
                        this.lastSeen.x - (dx / dist) * this.meleeRange + perpX * flankOffset;
                    const goalY =
                        this.lastSeen.y - (dy / dist) * this.meleeRange + perpY * flankOffset;

                    const goal = worldToTile(goalX, goalY);

                    if (!this.lastGoal || goal.x !== this.lastGoal.x || goal.y !== this.lastGoal.y) {
                        const newPath = findPath(start, goal);
                        this.path = newPath?.length ? newPath : null;
                        this.pathIndex = 0;
                        this.lastGoal = goal;
                    }

                    this.pathTimer = 0.3;
                }

                if (combatDist > 0) {
                    if (this.path && this.pathIndex < this.path.length) {
                        this.followPath(dt, true);
                    } else {
                        this.x += (dx / dist) * this.speed * dt;
                        this.y += (dy / dist) * this.speed * dt;
                    }

                    this.applySeparation(dt);

                    if (combatDist < this.meleeRange * 1.5) {
                        this.applyCircling(dt, dx, dy, dist);
                    }
                }

                break;
            }

            case ENEMY_STATE.SEARCH: {
                this.searchTimer -= dt;

                if (!this.searchPath && this.lastSeen) {
                    const start = worldToTile(this.x, this.y);
                    const goal = worldToTile(this.lastSeen.x, this.lastSeen.y);
                    this.searchPath = findPath(start, goal);
                    this.searchPathIndex = 0;
                }

                if (this.searchPath && this.searchPathIndex < this.searchPath.length) {
                    const next = this.searchPath[this.searchPathIndex];
                    const wx = next.x * TILE_SIZE + TILE_SIZE / 2;
                    const wy = next.y * TILE_SIZE + TILE_SIZE / 2;

                    const sdx = wx - this.x;
                    const sdy = wy - this.y;
                    const dist = Math.hypot(sdx, sdy);

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

        // =====================================
        // DEATH CHECK (XP SOURCE)
        // =====================================
        if (this.health <= 0) {
            return this.die(); // 🔑 CRITICAL LINE
        }

        return 0;
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

    applySeparation(dt) {
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

            const proximityFactor = Math.max(
                0,
                1 - playerDist / this.visionRange
            );

            const push =
                ((this.separationRadius - dist) / this.separationRadius) *
                proximityFactor;

            this.x += (dx / dist) * push * this.separationStrength * dt;
            this.y += (dy / dist) * push * this.separationStrength * dt;
        }
    }

    applyCircling(dt, dx, dy, dist) {
        // Perpendicular direction (left/right of player)
        const perpX = -dy / dist;
        const perpY = dx / dist;

        this.x += perpX * this.circleDirection * this.circleStrength * dt;
        this.y += perpY * this.circleDirection * this.circleStrength * dt;

        // Occasionally switch circling direction
        this.circleSwitchTimer -= dt;
        if (this.circleSwitchTimer <= 0) {
            this.circleDirection *= -1;
            this.circleSwitchTimer = 1.5 + Math.random(); // 1.5–2.5s
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

    alertNearbyEnemies() {

        //console.log("🔔 GROUP AGGRO from", this.x.toFixed(1), this.y.toFixed(1));

        for (const other of enemies) {
            if (other === this) continue;
            if (!other.alive) continue;
            if (other.state === ENEMY_STATE.CHASE) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist <= this.aggroRadius) {
                other.lastSeen = {
                    ...this.lastSeen
                };
                other.state = ENEMY_STATE.CHASE;
                other.chaseTimer = 0;
                other.pathTimer = 0;
            }
        }
    }

    // =====================================
    // COMBAT / LIFECYCLE
    // =====================================

    damage(amount, sourceX, sourceY) {
    this.health -= amount;

    this.showHealthBarTimer = this.healthBarDuration;

    // Backward-compatible defaults:
    // if caller didn't pass source coords, fall back to player position
    if (!Number.isFinite(sourceX)) sourceX = player.x;
    if (!Number.isFinite(sourceY)) sourceY = player.y;

    const dx = this.x - sourceX;
    const dy = this.y - sourceY;
    const dist = Math.hypot(dx, dy) || 1;

    const force = 90;
    this.hitKnockbackX = (dx / dist) * force;
    this.hitKnockbackY = (dy / dist) * force;

    this.hitStunTimer = this.hitStunDuration;
    }

    die() {
        if (!this.alive) return 0;

        this.alive = false;
        this.state = ENEMY_STATE.DEAD;
        this.deathTimer = this.deathDuration;

        // Knockback away from player
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.hypot(dx, dy) || 1;

        const force = 80;
        this.knockbackX = (dx / dist) * force;
        this.knockbackY = (dy / dist) * force;

        return 10; // XP value
    }

    // =====================================
    // RENDERING
    // =====================================
    draw(ctx) {
        ctx.save();
            ctx.globalAlpha = this.fadeAlpha;


            ctx.fillStyle = this.color;

            if (this.state === ENEMY_STATE.CHASE) {
                ctx.strokeStyle = "#ff0000";
                ctx.lineWidth = 2;
                ctx.stroke();
            }


            if (this.sprite) {
                ctx.drawImage(this.sprite, Math.floor(this.x - 16), Math.floor(this.y - 16), 32, 32);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }

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

            if (this.isWindingUp) {
                ctx.strokeStyle = "#ffaa00";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size / 2 + 2, 0, Math.PI * 2);
                ctx.stroke();
            }

            // --- Enemy Health Bar ---
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

            // Debug: state label
            ctx.fillStyle = "#fff";
            ctx.font = "10px monospace";
            ctx.fillText(this.state, this.x - 14, this.y - 18);

            if (this.state === ENEMY_STATE.CHASE) {
                ctx.strokeStyle = "rgba(255,0,0,0.4)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2);
                ctx.stroke();
            }
        ctx.restore();

    }
}

// =====================================
// ENEMY MANAGER
// =====================================
export function spawnEnemy(tileX, tileY, type) {
    enemies.push(new Enemy(tileX, tileY, type));
}

export function updateEnemies(dt) {
    let xpGained = 0;

    for (const e of enemies) {
        const xp = e.update(dt, player);
        if (xp > 0) {
            xpGained += xp;
        }
    }

    return xpGained;
}


export function drawEnemies(ctx) {
    for (const e of enemies) e.draw(ctx);
}