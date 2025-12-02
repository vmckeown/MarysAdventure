// items.js
import { TILE_SIZE } from "./world.js";

export const itemSprite = new Image();
itemSprite.src = "./pics/itemDrops.png"; 


export const items = [];

export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;

        this.frame = 0;
        this.frameTimer = 0;
        this.frameInterval = 0.15;

        this.alive = true;

        const itemRows = {
            "stamina": 0,
            "health": 1,
            "spirit": 2
        };

        this.row = itemRows[type] || 0;
        this.size = 2;
    }

    update(dt) {
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            this.frame = (this.frame + 1) % 4; // assume 4-frame item sparkle
        }
    }

    draw(ctx) {
        const sx = this.frame * 32;
        const sy = this.row * 33;

        ctx.drawImage(
            itemSprite,
            sx, sy, 32, 32,
            this.x - 16,
            this.y - 16,
            32, 32
        );
    }
}
