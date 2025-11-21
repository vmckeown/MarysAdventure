import { Graphics } from "./graphics.js";

export const TILE_SIZE = 32;
export const WORLD_COLS = 25;
export const WORLD_ROWS = 19;
export const BACKGROUND_COLOR = "#333";
const TILES_PER_ROW = 4;

export const tileImage = new Image();
    tileImage.src = "./pics/background.png";
    tileImage.onload = () => {
    console.log("✅ Tile image loaded");
};

export const backgroundImage = new Image();
backgroundImage.src = "./pics/background.png";
let isImageLoaded = false;
backgroundImage.onload = () => {
    isImageLoaded = true;
};


export const world = []

const TILE_INDEX = {
    TL_CORNER: 0,
    TR_CORNER: 1,
    VERTICAL: 2,
    BL_CORNER: 3,
    HORIZONTAL: 4,
    BR_CORNER: 5,
    H_LEFT_END: 6,
    H_RIGHT_END: 7,
    GRASS0: 8,
    GRASS1: 9,
    GRASS2: 10,
    GRASS3: 11,
};

export const SOLID_TILES = [0, 1, 2, 3, 4, 5, 6, 7]; 

export const worldMap = [
    [0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1],
    [2,8,8,8,8,8,2,8,8,8,8,8,8,8,8,8,2,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,2,8,8,8,8,8,8,8,8,8,2,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,9,2,8,8,8,8,8,2,8,8,8,2,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,2,8,8,8,8,8,2,8,8,8,2,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,2,8,8,8,8,8,2,8,8,8,2,8,8,8,8,8,8,8,2],
    [2,4,4,8,8,4,5,8,8,4,4,4,5,4,4,4,5,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,0,4,4,8,8,4,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2,8,8,8,8,8,2],
    [2,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,2,8,8,8,8,8,2],
    [3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,5],
];

/*export function setupWorld() {
    world.length = 0;

    for (let y = 0; y < WORLD_ROWS; y++) {
        const row = [];
        for (let x = 0; x < WORLD_COLS; x++) {
            if (y === 0 || y === WORLD_ROWS - 1 || x === 0 || x === WORLD_COLS - 1) {
                row.push(1); // wall tile
            } else {
                row.push(0); // ground tile
            }
        }
        world.push(row);
    }
}*/

export function drawWorld(ctx, camera) {
    const startCol = Math.floor(camera.x / TILE_SIZE);
    const endCol   = Math.ceil((camera.x + camera.width) / TILE_SIZE);
    const startRow = Math.floor(camera.y / TILE_SIZE);
    const endRow   = Math.ceil((camera.y + camera.height) / TILE_SIZE);
    if (!isImageLoaded) return; // skip drawing if image isn't ready

    for (let row = 0; row < WORLD_ROWS; row++) {
            for (let col = 0; col < WORLD_COLS; col++) {
                const tile = worldMap[row][col];
                const sx = (tile % TILES_PER_ROW) * TILE_SIZE;
                const sy = Math.floor(tile / TILES_PER_ROW) * TILE_SIZE;
                const dx = col * TILE_SIZE;
                const dy = row * TILE_SIZE;

                ctx.drawImage(tileImage, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, TILE_SIZE, TILE_SIZE);
            }
        }

    }

export function isColliding(x, y, entity, npcs = [], objects = []) {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    const tile = getTile(tx, ty);
    if (SOLID_TILES.includes(tile)) return true;
    return false;
}

export function getTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= WORLD_COLS || ty >= WORLD_ROWS) return 1;
    return worldMap[ty][tx];
}

export function worldToTile(wx, wy) {
    return { x: Math.floor(wx / TILE_SIZE), y: Math.floor(wy / TILE_SIZE) };
}
