// items.js
import { TILE_SIZE } from "./world.js";

export const itemSprite = new Image();
itemSprite.src = "./pics/itemDrops.png"; 


export const items = [];

export const ITEM_ROWS = {
  stamina: 0,
  health: 1,
  spirit: 2,
  gold: 3,
  buffCrystal: 4
};

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
            "spirit": 2,
            "gold": 3,
            "buffCrystal": 4
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

export const ITEM_DEFS = {
  health: {
    name: "Health Potion",
    description: "Restores a small amount of health.",
    spriteRow: ITEM_ROWS.health,
    use(player) {
      const healAmount = 3;
      player.health = Math.min(
        player.maxHealth,
        player.health + healAmount
      );
      return true;
    }
  },

  stamina: {
    name: "Stamina Potion",
    description: "Replenishes stamina used for movement and combat.",
    spriteRow: ITEM_ROWS.stamina,
    use(player) {
      const amount = 10;
      player.stamina = Math.min(
        player.maxStamina,
        player.stamina + amount
      );
      return true;
    }
  },

  spirit: {
    name: "Spirit Potion",
    description: "Restores spirit energy for magical abilities.",
    spriteRow: ITEM_ROWS.spirit,
    use(player) {
      const amount = 10;
      player.spirit = Math.min(
        player.maxSpirit,
        player.spirit + amount
      );
      return true;
    }
  },

  gold: {
    name: "Gold",
    description: "A small amount of currency used for trade.",
    spriteRow: ITEM_ROWS.gold,
    use(player) {
      player.gold = (player.gold || 0) + 1;
      return true;
    }
  },

  buffCrystal: {
    name: "Buff Crystal",
    description: "Permanently increases maximum health.",
    spriteRow: ITEM_ROWS.buffCrystal,
    use(player) {
      player.maxHealth += 1;
      player.health = player.maxHealth;
      return true;
    }
  }
};

