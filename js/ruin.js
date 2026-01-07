// ruin.js
import { TILE_SIZE } from "./world.js";
import { unlockElement, ELEMENTS } from "./elements.js";

import { startDialogue, DIALOGUE } from "./dialogue.js";

const ruinImage = new Image();
ruinImage.src = "./pics/ruins.png";

export class Ruin {
  constructor(x, y, element = ELEMENTS.AIR) {
    this.x = x;
    this.y = y;
    this.element = element;

    // Your sprite is wider than a tile
    this.width = 96;   // adjust to match image
    this.height = 80;

    this.activated = false;
  }

  isNear(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.hypot(dx, dy) < 60;
  }

  interact(player) {
    if (this.activated) return;

    this.activated = true;
    unlockElement(this.element);
    startDialogue(
      ["The air stirs around you.", "You feel something awaken in the ruins..."],
      null,
      true // FORCE it even if something is already active
    );
  }


  getCollisionBox() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  draw(ctx) {
    ctx.drawImage(
      ruinImage,
      Math.floor(this.x - this.width / 2),
      Math.floor(this.y - this.height / 2),
      this.width,
      this.height
    );
  }
}
