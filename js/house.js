// house.js
import { houseImage } from "./world.js";

const HOUSE_SIZE = 7 * 32; // 224

export class House {
  constructor(x, y, config = {}) {
    this.x = x;
    this.y = y;

    this.width = 224;
    this.height = 224;

    // Sprite sheet position
    this.spriteX = config.spriteX ?? 0;
    this.spriteY = config.spriteY ?? 0;

    // Collision zone (only bottom portion blocks movement)
    this.collisionWidth = config.collisionWidth ?? 160;
    this.collisionHeight = config.collisionHeight ?? 64;

    this.collisionX = this.x - this.collisionWidth / 2;
    this.collisionY = this.y - this.collisionHeight;

    // Depth sorting helper
    this.depthOffset = this.height - this.collisionHeight;
  }

  draw(ctx) {
    ctx.drawImage(
      houseImage,
      this.spriteX,
      this.spriteY,
      this.width,
      this.height,
      Math.floor(this.x - this.width / 2),
      Math.floor(this.y - this.height),
      this.width,
      this.height
    );
  }

  getCollisionBox() {
    return {
      x: this.collisionX,
      y: this.collisionY,
      width: this.collisionWidth,
      height: this.collisionHeight
    };
  }
}
