// ===== PATHFINDING (A*) =====
import { getTile, SOLID_TILES, WORLD_COLS, WORLD_ROWS } from "./world.js";

// ===== PATHFINDING (A*) =====
export function findPath(start, goal, objects = []) {
  if (!start || !goal) return [];

  // reject invalid endpoints
  if (isBlocked(start.x, start.y, objects) || isBlocked(goal.x, goal.y, objects)) {
    return [];
  }

  const key = (p) => `${p.x},${p.y}`;
  const h = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const openSet = [start];
  const cameFrom = new Map();

  const gScore = new Map();
  const fScore = new Map();
  const closedSet = new Set();

  gScore.set(key(start), 0);
  fScore.set(key(start), h(start, goal));

  let loopCount = 0;

  while (openSet.length > 0) {
    loopCount++;
    if (loopCount > 4000) {
      console.warn("⚠️ Pathfinding aborted — too many iterations");
      return [];
    }

    openSet.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
    const current = openSet.shift();
    const currKey = key(current);

    if (closedSet.has(currKey)) continue;
    closedSet.add(currKey);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, current);
    }

    for (const neighbor of getNeighbors(current, objects)) {
      const nKey = key(neighbor);
      if (closedSet.has(nKey)) continue;

      const stepCost = (neighbor.x !== current.x && neighbor.y !== current.y) ? 1.414 : 1;
      const tentativeG = (gScore.get(currKey) ?? Infinity) + stepCost;

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + h(neighbor, goal));

        if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

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

// ✅ Diagonal neighbors with corner-cut prevention
function getNeighbors(tile, objects) {
  const dirs = [
    { x:  1, y:  0, cost: 1 },
    { x: -1, y:  0, cost: 1 },
    { x:  0, y:  1, cost: 1 },
    { x:  0, y: -1, cost: 1 },

    // diagonals
    { x:  1, y:  1, cost: 1.414 },
    { x:  1, y: -1, cost: 1.414 },
    { x: -1, y:  1, cost: 1.414 },
    { x: -1, y: -1, cost: 1.414 },
  ];

  const neighbors = [];

  for (const d of dirs) {
    const nx = tile.x + d.x;
    const ny = tile.y + d.y;

    if (nx < 0 || ny < 0 || nx >= WORLD_COLS || ny >= WORLD_ROWS) continue;
    if (isBlocked(nx, ny, objects)) continue;

    // corner cutting prevention for diagonals:
    if (d.x !== 0 && d.y !== 0) {
      const blockA = isBlocked(tile.x + d.x, tile.y, objects);
      const blockB = isBlocked(tile.x, tile.y + d.y, objects);
      if (blockA || blockB) continue;
    }

    neighbors.push({ x: nx, y: ny });
  }

  return neighbors;
}

function isBlocked(tx, ty, objects = []) {
  const tile = getTile(tx, ty);
  if (tile !== null && SOLID_TILES.includes(tile)) return true;

  // object blocking: treat objects with blocksMovement as solid tiles they overlap
  for (const obj of objects) {
    if (!obj || !obj.blocksMovement) continue;

    // Prefer collision box if available (tree trunk)
    const box = obj.getCollisionBox ? obj.getCollisionBox() : {
      x: obj.x,
      y: obj.y,
      width: obj.width ?? 0,
      height: obj.height ?? 0
    };

    const left   = Math.floor(box.x / 32);
    const top    = Math.floor(box.y / 32);
    const right  = Math.floor((box.x + box.width  - 1) / 32);
    const bottom = Math.floor((box.y + box.height - 1) / 32);

    if (tx >= left && tx <= right && ty >= top && ty <= bottom) return true;
  }

  return false;
}

export function isTileSolid(tx, ty) {
  const tile = getTile(tx, ty);
  return tile !== null && SOLID_TILES.includes(tile);
}
