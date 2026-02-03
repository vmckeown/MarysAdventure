import { backgroundImage } from "./world.js"; 

export const TREE_TYPES = {
  PineTree1: {
    spriteX: 0,
    spriteY: 99,
    width: 32,
    height: 66,
    collisionWidth: 14,
    collisionHeight: 10
  },

  PineTree2: {
    spriteX: 32,
    spriteY: 99,
    width: 32,
    height: 66,
    collisionWidth: 18,
    collisionHeight: 12
  }
};

export class Tree {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;

    this.spriteX = type.spriteX;
    this.spriteY = type.spriteY;
    this.width = type.width;
    this.height = type.height;

    this.collisionWidth = type.collisionWidth;
    this.collisionHeight = type.collisionHeight;

    this.collisionX = this.x - this.collisionWidth / 2;
    this.collisionY = this.y - this.collisionHeight;
    this.blocksMovement = true;  
  }

  getCollisionBox() {
    return {
      x: this.collisionX,
      y: this.collisionY,
      width: this.collisionWidth,
      height: this.collisionHeight
    };
  }

  draw(ctx) {
    ctx.drawImage(
      backgroundImage,
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
}


 