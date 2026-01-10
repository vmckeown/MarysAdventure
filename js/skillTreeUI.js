import { ELEMENT_SKILLS } from "./skills.js";

let skillTreeOpen = false;
let selectedNode = "swift_step";
let selectedIndex = 0;

export function toggleSkillTree() {
  skillTreeOpen = !skillTreeOpen;
}

export function isSkillTreeOpen() {
  return skillTreeOpen;
}

export function drawSkillTree(ctx, canvas, player) {
  if (!skillTreeOpen) return;

  const air = ELEMENT_SKILLS.air;
  if (!air.unlocked) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(80, 60, canvas.width - 160, canvas.height - 120);

  ctx.fillStyle = "#66ccff";
  ctx.font = "bold 18px monospace";
  ctx.fillText("AIR", 120, 100);

  let y = 140;

  const nodes = Object.entries(air.nodes).map(([id, node]) => ({
    id,
    ...node
  }));


  nodes.forEach((node, index) => {
    const isSelected = index === selectedIndex;

    ctx.fillStyle = isSelected
      ? "#ffffff"
      : node.unlocked
      ? "#66ccff"
      : "#777";

    ctx.fillText(
      `${isSelected ? "> " : ""}${node.name} (${node.cost})`,
      140,
      y
    );

    ctx.fillStyle = "#ccc";
    ctx.font = "12px monospace";
    ctx.fillText(node.description, 160, y + 14);

    y += 50;
  });

  ctx.restore();
}

export function handleSkillTreeInput(player, wasKeyPressed) {
  if (!skillTreeOpen) return;

  const air = ELEMENT_SKILLS.air;
  const nodes = Object.values(air.nodes);

  // --- Navigation ---
  if (wasKeyPressed("ArrowDown")) {
    selectedIndex = (selectedIndex + 1) % nodes.length;
  }

  if (wasKeyPressed("ArrowUp")) {
    selectedIndex =
      (selectedIndex - 1 + nodes.length) % nodes.length;
  }

  selectedNode = nodes[selectedIndex].id;

  const node = nodes[selectedIndex];

  // --- Unlock ---
  if (
    wasKeyPressed("Enter") &&
    air.unlocked &&
    !node.unlocked &&
    player.skillPoints > 0
  ) {
    node.unlocked = true;
    air.pointsSpent++;
    player.skillPoints--;

    if (node.id === "swift_step") {
      player.speed *= 1.05;
    }

    console.log(`🌬 ${node.name} unlocked`);
    player.hasSwiftStep = true;
  }
}

export function getUnlockedAirPassives() {
  return Object.values(ELEMENT_SKILLS.air.nodes)
    .filter(n => n.unlocked)
    .map(n => n.name);
}

const swiftParticles = [];

export function spawnSwiftStepParticle(x, y) {
  swiftParticles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 40,
    vy: Math.random() * 20 + 10,
    life: 0.4
  });
}

export function drawSwiftStepParticles(ctx, dt) {
  for (const p of swiftParticles) {
    p.x -= p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = "#9fefff";
    ctx.fillRect(p.x - 2, p.y - 2, 3, 3);
    ctx.restore();
  }

  // cleanup
  for (let i = swiftParticles.length - 1; i >= 0; i--) {
    if (swiftParticles[i].life <= 0) {
      swiftParticles.splice(i, 1);
    }
  }
}

export function spawnAirPulse(x, y) {
  window.effects?.push({
    type: "airPulse",
    x,
    y,
    radius: 8,
    alpha: 0.6,
    timer: 0.4
  });
}


