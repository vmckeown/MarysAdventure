import { getTile, TILE_SIZE, SOLID_TILES, WORLD_COLS,  WORLD_ROWS } from "./world.js";


// ===== PATHFINDING (A*) =====
export function findPath(start, goal) {
    // Prevent running if start or goal are invalid
    if (isTileSolid(start.x, start.y) || isTileSolid(goal.x, goal.y)) {
    //    console.warn("Invalid start or goal tile:", start, goal);
        return [];
    }

    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const closedSet = new Set(); // prevent reprocessing

    const key = (p) => `${p.x},${p.y}`;
    const h = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    gScore.set(key(start), 0);
    fScore.set(key(start), h(start, goal));

    let loopCount = 0;

    while (openSet.length > 0) {
        loopCount++;
        if (loopCount > 2000) { // prevent browser hang
            console.warn("⚠️ Pathfinding aborted — too many iterations");
            return [];
        }

        // Find the lowest fScore
        openSet.sort((a, b) => fScore.get(key(a)) - fScore.get(key(b)));
        const current = openSet.shift();
        const currKey = key(current);

        if (closedSet.has(currKey)) continue;
        closedSet.add(currKey);

        // ✅ Goal reached
        if (current.x === goal.x && current.y === goal.y) {
            return reconstructPath(cameFrom, current);
        }

        // Explore neighbors
        for (const neighbor of getNeighbors(current)) {
            const nKey = key(neighbor);

            // Ignore invalid or solid tiles
            if (
                neighbor.x < 0 ||
                neighbor.y < 0 ||
                neighbor.x >= WORLD_COLS ||
                neighbor.y >= WORLD_ROWS ||
                isTileSolid(neighbor.x, neighbor.y)
            ) continue;

            if (closedSet.has(nKey)) continue;

            const tentativeG = gScore.get(currKey) + 1;
            if (tentativeG < (gScore.get(nKey) || Infinity)) {
                cameFrom.set(nKey, current);
                gScore.set(nKey, tentativeG);
                fScore.set(nKey, tentativeG + h(neighbor, goal));

                // Only add if not already open
                if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    console.warn("No path found from", start, "to", goal);
    return [];
}


function reconstructPath(cameFrom, current) {
    const totalPath = [current];
    while (cameFrom.has(`${current.x},${current.y}`)) {
        current = cameFrom.get(`${current.x},${current.y}`);
        totalPath.unshift(current);
    }
    return totalPath;
}

function getNeighbors(tile) {
    const dirs = [{
            x: 1,
            y: 0
        },
        {
            x: -1,
            y: 0
        },
        {
            x: 0,
            y: 1
        },
        {
            x: 0,
            y: -1
        },
    ];

    const neighbors = [];
    for (const d of dirs) {
        const nx = tile.x + d.x;
        const ny = tile.y + d.y;
        if (nx >= 0 && ny >= 0 && nx < WORLD_COLS && ny < WORLD_ROWS) {
            neighbors.push({
                x: nx,
                y: ny
            });
        }
    }
    return neighbors;
}

export function isTileSolid(tx, ty) {
    const tile = getTile(tx, ty);
    return SOLID_TILES.includes(tile);
}

function handlePatrol(enemy, dt) {
    const target = enemy.patrolPoints[enemy.patrolIndex];
    moveAlongPath(enemy, target, dt);

    const tileX = Math.floor(enemy.x / TILE_SIZE);
    const tileY = Math.floor(enemy.y / TILE_SIZE);

    if (tileX === target.x && tileY === target.y) {
        enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
    }
}

function handleChase(enemy, dt) {
    if (enemy.pathTimer <= 0) {
        const start = {
            x: Math.floor(enemy.x / TILE_SIZE),
            y: Math.floor(enemy.y / TILE_SIZE)
        };
        const goal = {
            x: Math.floor(player.x / TILE_SIZE),
            y: Math.floor(player.y / TILE_SIZE)
        };
        enemy.path = findPath(start, goal);
        enemy.pathTimer = 0.8;

        if (!enemy.path || enemy.path.length === 0) {
            console.warn("Enemy could not find a path to player:", enemy);
            enemy.state = ENEMY_STATE.SEARCH; // fallback
            return;
        }
    }

    moveAlongPath(enemy, null, dt);

    const playerDist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (playerDist < 35 && player.invulnTimer <= 0) {
        player.damage(1, enemy.x, enemy.y);
    }
}

function handleSearch(enemy, dt) {
    if (enemy.pathTimer <= 0 && enemy.path.length === 0) {
        // wander near last known location
        const tileX = Math.floor(enemy.x / TILE_SIZE) + Math.floor(Math.random() * 3 - 1);
        const tileY = Math.floor(enemy.y / TILE_SIZE) + Math.floor(Math.random() * 3 - 1);
        enemy.path = findPath({
            x: Math.floor(enemy.x / TILE_SIZE),
            y: Math.floor(enemy.y / TILE_SIZE)
        }, {
            x: tileX,
            y: tileY
        });
        enemy.pathTimer = 1.5;
    }

    moveAlongPath(enemy, null, dt);
}

function moveAlongPath(enemy, target, dt) {
    if (enemy.pathTimer > 0) enemy.pathTimer -= dt;

    if (enemy.path && enemy.path.length > 1) {
        const next = enemy.path[1];
        const targetX = next.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = next.y * TILE_SIZE + TILE_SIZE / 2;

        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 60;

        if (dist > 1) {
            enemy.x += (dx / dist) * speed * dt;
            enemy.y += (dy / dist) * speed * dt;
            enemy.facingAngle = Math.atan2(dy, dx);
        } else {
            enemy.path.shift();
        }
    } else if (target) {
        // recalc path to target
        const start = {
            x: Math.floor(enemy.x / TILE_SIZE),
            y: Math.floor(enemy.y / TILE_SIZE)
        };
        enemy.path = findPath(start, target);
        enemy.pathTimer = 1.5;
    }
}



