export class NPC {
  constructor({ x, y, size, color, name, dialogue, speed, dir, idleTimer }) {
    Object.assign(this, { x, y, size, color, name, dialogue, speed, dir, idleTimer });
  }

  update(dt) {
    this.idleTimer += dt;
    if (this.idleTimer > 2) {
      this.dir *= -1;
      this.idleTimer = 0;
    }
    this.y += this.dir * this.speed * dt;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText(this.name, this.x - this.size / 2, this.y - this.size);
  }
}

// Initial list of data
const npcData = [
  {
    x: 600,
    y: 450,
    size: 32,
    color: "#00ffff",
    name: "Guard",
    dialogue: [
      "Stay safe out there, traveler.",
      "The woods are dangerous at night!",
      "They say monsters come from the old ruins to the east..."
    ],
    speed: 30,
    dir: 1,
    idleTimer: 0,
  },
  {
    x: 800,
    y: 550,
    size: 28,
    color: "#ff69b4",
    name: "Villager",
    dialogue: [
      "The harvest has been good this year.",
      "But the storm last week washed away part of the road.",
      "You might want to visit the blacksmith — he’s been repairing tools all day."
    ],
    speed: 20,
    dir: -1,
    idleTimer: 0,
  }
];

export function setupNPCs() {
  return npcData.map(n => new NPC(n));
}
