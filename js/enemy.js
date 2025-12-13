let activeAttackers = 0;
const MAX_ATTACKERS = 2;

import {TILE_SIZE} from "./world.js";
import {player} from "./player.js";
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


export class Enemy {
    constructor(tileX, tileY) {
        this.x = tileX * TILE_SIZE + TILE_SIZE / 2;
        this.y = tileY * TILE_SIZE + TILE_SIZE / 2;

        this.targetX = this.x;
        this.targetY = this.y;

        this.size = 28;
        this.color = "#ff0000";
        this.speed = 60;
        this.health = 3;
        this.alive = true;
        this.state = ENEMY_STATE.PATROL;
        this.visionRange = 200;

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
        this.meleeRange = 32; // distance to stop from player
        this.meleeBuffer = 4; // prevents jitter
        
        // Anti-stacking
        this.separationRadius = this.size * 1.6; // how close is "too close"
        this.separationStrength = 40;      // push force


        // Attack system
        this.attackRange = this.meleeRange; // reuse spacing
        this.attackWindup = 0.35; // seconds before hit
        this.attackCooldown = 0; // seconds between attacks
        this.attackDelay = 0.8;

        this.attackTimer = 0;
        this.isWindingUp = false;

        // Circling behavior
        this.circleStrength = 35;     // sideways force
        this.circleDirection = Math.random() < 0.5 ? -1 : 1;
        this.circleSwitchTimer = 0;

        // Hesitation
        this.hesitationTimer = 0;

        // Courage / fear
        this.courage = Math.random() * 0.5 + 0.75; // 0.75–1.25

        // Retreat
        this.retreatHealthThreshold = 1;

        // Flanking
        this.flankBias = Math.random() < 0.5 ? -1 : 1;
    }

    update(dt, player) {
        if (!this.alive) return;

        /*   this._debugTimer = (this._debugTimer || 0) + dt;
           if (this._debugTimer > 1) {
               console.log(
                   "[Enemy]",
                   "state:", this.state,
                   "enemy:", this.x?.toFixed?.(1), this.y?.toFixed?.(1),
                   "player:", player?.x, player?.y,
                   "dist:", Math.hypot(player?.x - this.x, player?.y - this.y),
                   "vision:", this.visionRange
               );
                this._debugTimer = 0;
           } */


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
                this.lastSeen = {
                    x: player.x,
                    y: player.y
                };

                if (this.state !== ENEMY_STATE.CHASE) {
                    this.state = ENEMY_STATE.CHASE;
                    this.chaseTimer = 0;
                    this.pathTimer = 0;

                    // 🔔 Group aggro (fires once)
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

                // ============================
                // HESITATION
                // ============================
                if (this.hesitationTimer > 0) {
                    this.hesitationTimer -= dt;
                    break;
                }

                // Random hesitation before advancing
                if (Math.random() < 0.005 * this.courage) {
                    this.hesitationTimer = 0.3 + Math.random() * 0.3;
                    break;
                }

                // ============================
                // TIMERS
                // ============================
                this.chaseTimer += dt;
                this.pathTimer -= dt;
                this.attackTimer -= dt;

                // ============================
                // DISTANCE CALCS
                // ============================
                const enemyRadius = this.size / 2;
                const playerRadius = player.size ? player.size / 2 : 14;

                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.hypot(dx, dy) || 1;

                // Edge-to-edge combat distance
                const combatDist = dist - enemyRadius - playerRadius;

                // ============================
                // MEMORY
                // ============================
                if (seesPlayer) {
                    this.lastSeen = { x: player.x, y: player.y };
                }

                // ============================
                // LOW-HEALTH RETREAT
                // ============================
                if (this.health <= this.retreatHealthThreshold) {
                    this.state = ENEMY_STATE.SEARCH;
                    this.searchTimer = 2 + Math.random();
                    break;
                }


                // ============================
                // ATTACK START (SLOT-GATED)
                // ============================
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

                const alliesAttacking = activeAttackers;
                const fearFactor = alliesAttacking >= MAX_ATTACKERS ? 0.5 : 1;

                // ============================
                // ATTACK WIND-UP / HIT
                // ============================
                if (this.isWindingUp) {
                    if (this.attackTimer <= 0) {
                        if (combatDist <= 4) {
                            console.log("Enemy attack HIT");
                            player.damage?.(1, this.x, this.y);
                        }

                        this.isWindingUp = false;
                        this.attackTimer = this.attackCooldown;
                        activeAttackers = Math.max(0, activeAttackers - 1);
                    }
                    break; // no movement during attack
                }

                // ============================
                // PATHFINDING (MELEE-OFFSET GOAL)
                // ============================
                const needsRepath =
                    this.pathTimer <= 0 ||
                    !this.path ||
                    this.pathIndex >= this.path.length;

                if (needsRepath && this.lastSeen) {
                    const start = worldToTile(this.x, this.y);

                    // Flank offset (perpendicular)
                    const perpX = -dy / dist;
                    const perpY = dx / dist;

                    const flankOffset = this.flankBias * this.size * 0.75;

                    const goalX = this.lastSeen.x - (dx / dist) * this.meleeRange + perpX * flankOffset;

                    const goalY = this.lastSeen.y - (dy / dist) * this.meleeRange + perpY * flankOffset;

                    const goal = worldToTile(goalX, goalY);

                    if (!this.lastGoal || goal.x !== this.lastGoal.x || goal.y !== this.lastGoal.y) {
                        const newPath = findPath(start, goal);

                        if (newPath && newPath.length > 0) {
                            this.path = newPath;
                            this.pathIndex = 0;
                            this.lastGoal = goal;
                        } else {
                            // Path failed — fall back to direct movement
                            this.path = null;
                        }

                        this.pathIndex = 0;
                        this.lastGoal = goal;
                    }

                    this.pathTimer = 0.3;
                }

                // ============================
                // MOVEMENT
                // ============================
                if (combatDist > 0) {

                    // Primary movement
                    if (this.path && this.pathIndex < this.path.length) {
                        this.followPath(dt, true);
                    } else {
                        this.x += (dx / dist) * this.speed * dt;
                        this.y += (dy / dist) * this.speed * dt;
                    }

                    // Anti-stacking
                    this.applySeparation(dt);

                    // ============================
                    // CIRCLING (non-attacking)
                    // ============================
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

                    dx = wx - this.x;
                    dy = wy - this.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist > 2) {
                        this.x += (dx / dist) * this.speed * dt;
                        this.y += (dy / dist) * this.speed * dt;
                    } else {
                        this.searchPathIndex++;
                    }
                }

                // Reached last known position
                if (this.searchPathIndex >= (this.searchPath?.length || 0)) {
                    this.lastSeen = null;
                    this.searchPath = null;
                    this.state = ENEMY_STATE.IDLE;
                }

                break;
            }

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

        if (this.state === ENEMY_STATE.CHASE) {
            ctx.strokeStyle = "rgba(255,0,0,0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2);
            ctx.stroke();
        }
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