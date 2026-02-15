import { backgroundImage } from "./world.js"; 

export const TREE_TYPES = {
  PineTree1: {
    spriteX: 0,
    spriteY: 99,
    width: 32,
    height: 66,
    collisionWidth: 15,
    collisionHeight: 10,
    offsetX: 0,
    offsetY: -15
  },

  PineTree2: {
    spriteX: 32,
    spriteY: 99,
    width: 32,
    height: 66,
    collisionWidth: 15,
    collisionHeight: 10,
    offsetX: 0,
    offsetY: -15
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
    this.offsetX = type.offsetX;
    this.offsetY = type.offsetY;

    this.collisionX = this.x - this.collisionWidth / 2;
    this.collisionY = this.y - this.collisionHeight;
    this.blocksMovement = true;  
  }

getCollisionBox() {
  const TRUNK_WIDTH  = this.collisionWidth;
  const TRUNK_HEIGHT = this.collisionHeight;

  // Fine tuning offsets
  const OFFSET_X = this.offsetX;      // positive = move box right
  const OFFSET_Y = this.offsetY;      // positive = move box DOWN

  return {
    x: this.x - TRUNK_WIDTH / 2 + OFFSET_X,
    y: this.y - TRUNK_HEIGHT + OFFSET_Y,
    width: TRUNK_WIDTH,
    height: TRUNK_HEIGHT
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
      const box = this.getCollisionBox();
      ctx.save();
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.restore();
  }
}


 