// rocks.js
const rockImage = new Image();
rockImage.src = "./pics/background.png";

export class Rock {
  constructor(x, y, size = 32) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.solid = true;
  }

  draw(ctx) {
    if (!rockImage.complete) return;

    ctx.drawImage(
      rockImage,
      0, 7*32, 32, 32,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
  }

  getCollisionBox() {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size / 2,
      width: this.size,
      height: this.size
    };
  }
}
