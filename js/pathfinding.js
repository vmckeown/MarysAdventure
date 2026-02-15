import { getTile, SOLID_TILES, WORLD_COLS, WORLD_ROWS, isTileBlockedByObject } from "./world.js";

// ===== PATHFINDING (A*) =====
// IMPORTANT: pass `objects` in from enemy/main — do NOT import objects from main.js
export function findPath(start, goal, objects = []) {
  if (!start || !goal) return [];

  // start/goal must be walkable
  if (
    isTileSolid(start.x, start.y) ||
    isTileSolid(goal.x, goal.y) ||
    isTileBlockedByObject(start.x, start.y, objects) ||
    isTileBlockedByObject(goal.x, goal.y, objects)
  ) {
    return [];
  }

  const openSet = [start];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();
  const closedSet = new Set();

  const key = (p) => `${p.x},${p.y}`;
  const h = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan

  gScore.set(key(start), 0);
  fScore.set(key(start), h(start, goal));

  let loopCount = 0;
  const LOOP_LIMIT = 4000;

  while (openSet.length > 0) {
    loopCount++;
    if (loopCount > LOOP_LIMIT) {
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

    for (const neighbor of getNeighbors(current)) {
      const nKey = key(neighbor);

      // bounds
      if (
        neighbor.x < 0 ||
        neighbor.y < 0 ||
        neighbor.x >= WORLD_COLS ||
        neighbor.y >= WORLD_ROWS
      ) continue;

      // blocked?
      if (
        isTileSolid(neighbor.x, neighbor.y) ||
        isTileBlockedByObject(neighbor.x, neighbor.y, objects)
      ) continue;

      if (closedSet.has(nKey)) continue;

      const tentativeG = (gScore.get(currKey) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + h(neighbor, goal));

        if (!openSet.some((p) => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return [];
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(`${current.x},${current.y}`)) {
    current = cameFrom.get(`${current.x},${current.y}`);
    path.unshift(current);
  }
  return path;
}

function getNeighbors(tile) {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ];
}

export function isTileSolid(tx, ty) {
  const tile = getTile(tx, ty);
  return tile !== null && SOLID_TILES.includes(tile);
}
