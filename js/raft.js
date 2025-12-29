import { TILE_SIZE } from "./world.js";

const raftImage = new Image();
raftImage.src = "./pics/background.png";

export class Raft {
  constructor(x, y, spriteX, spriteY) {
    this.x = x;
    this.y = y;
    this.spriteX = spriteX;
    this.spriteY = spriteY;
    this.size = 32;

    this.interactionRadius = 36;
    console.log(this.x, this.y)
  }

  isNear(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.hypot(dx, dy) < this.interactionRadius;
  }

  draw(ctx) {

    if (!raftImage.complete) return;

    ctx.drawImage(
      raftImage,
      this.spriteX * TILE_SIZE,
      this.spriteY * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
      this.x - TILE_SIZE / 2,
      this.y - TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE
    );
  }
}
