/* 
  BackStabbing Enterprises Engine
  Founded by Jeff B and Vince M
  -----------------------------------
  main.js — Core engine and global setup
*/

// ===== Global Variables =====

import {setupWorld,isColliding,TILE_SIZE,WORLD_COLS,WORLD_ROWS,BACKGROUND_COLOR,drawWorld, updateWorldAnimation} from "./world.js";
import { Enemy, enemies, spawnEnemy, updateEnemies, ENEMY_STATE } from "./enemy.js";
import { NPC, setupNPCs } from "./npc.js";
import { setupInput, keys, wasKeyPressed } from "./input.js";
import { Graphics } from "./graphics.js";
import { updateIceBolts, drawIceBolts } from "./iceBolt.js";
import { drawInventory, updateInventoryCursor, inventoryCursor} from "./inventory.js";
import { items, Item, ITEM_DEFS} from "./items.js";
import { Player } from "./player.js";
import { backgroundImage } from "./world.js"; // or wherever it lives
import { Tree, TREE_TYPES } from "./tree.js";
import { House } from "./house.js";

export const houses = [];

function spawnTreeCluster(cx, cy, offsets, type) {
  return offsets.map(([dx, dy]) =>
    new Tree(cx + dx, cy + dy, TREE_TYPES[type])
  );
}

function spawnTreeArea({
  xMin,
  xMax,
  yMin,
  yMax,
  count,
  type,
  minSpacing = 24
  }) {
  const placed = [];

  let attempts = 0;
  const MAX_ATTEMPTS = count * 10;

  while (placed.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;

    const x = Math.random() * (xMax - xMin) + xMin;
    const y = Math.random() * (yMax - yMin) + yMin;

    // Prevent clumping
    let tooClose = false;
    for (const t of placed) {
      const dx = t.x - x;
      const dy = t.y - y;
      if (Math.hypot(dx, dy) < minSpacing) {
        tooClose = true;
        break;
      }
    }

    if (tooClose) continue;

    placed.push(new Tree(x, y, TREE_TYPES[randomTreeType()]));
  }

  return placed;
}

const TREE_VARIANTS = ["PineTree1", "PineTree2"];

function randomTreeType() {
  return TREE_VARIANTS[Math.floor(Math.random() * TREE_VARIANTS.length)];
}

export const trees = [
  ...spawnTreeArea({
    xMin: 50,
    xMax: 450,
    yMin: 0,
    yMax: 400,
    count: 200,
    type: "PineTree1"
  }),

  ...spawnTreeArea({
    xMin: 750,
    xMax: 1300,
    yMin: 0,
    yMax: 450,
    count: 200,
    type: "PineTree1"
  }),

  ...spawnTreeArea({
    xMin: 50,
    xMax: 550,
    yMin: 400,
    yMax: 1000,
    count: 200,
    type: "PineTree2"
  }),

  
  ...spawnTreeArea({
    xMin: 750,
    xMax: 900,
    yMin: 450,
    yMax: 1000,
    count: 50,
    type: "PineTree1"
  }),

    ...spawnTreeArea({
    xMin: 50,
    xMax: 500,
    yMin: 1000,
    yMax: 1460,
    count: 100,
    type: "PineTree2"
  }),

  ...spawnTreeArea({
    xMin: 750,
    xMax: 1600,
    yMin: 1000,
    yMax: 1500,
    count: 100,
    type: "PineTree1"
  }),

];

let player;

export const WIDTH = 800;
export const HEIGHT = 600;

function getVillagerDialogue(tutorial) {
  if (!tutorial.moved) {
    return [
      "You look new around here.",
      "Try moving with WASD or the arrow keys."
    ];
  }

  if (!tutorial.sawEnemy) {
    return [
      "Careful out there.",
      "Goblins have been spotted near the road."
    ];
  }

  if (!tutorial.attacked) {
    return [
      "If one attacks you, press SPACE to fight back."
    ];
  }

  if (!tutorial.openedInventory) {
    return [
      "Press I to check your inventory.",
      "You might find something useful."
    ];
  }

  return [
    "You're learning fast.",
    "Stay alive out there."
  ];
}


let canvas, ctx;
let deathFade = 0;

const tutorial = {
  moved: false,
  sawEnemy: false,
  attacked: false,
  openedInventory: false
};

let tutorialDebugOnce = {
  moved: false,
  sawEnemy: false,
  attacked: false,
  openedInventory: false
};



window.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // Start your game here
  init();
});

// Timing
let lastTime = 0;
let deltaTime = 0;

// Input
let lastKeyState = {};

// Entities
let npcs = [];
let objects = [];
let xpOrbs = [];
let effects = [];

// Dialogue System
let activeDialogue = null;

export function triggerDialogue(text, duration = 3) {
  activeDialogue = {
    text,
    timer: duration,
    alpha: 1
  };
}

// Camera
let camera = {
  x: 0,
  y: 0,
  width: WIDTH,
  height: HEIGHT,
  speed: 5.0, // smoothing factor
};

// ===== Initialization =====
function init() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  setupInput();
  setupWorld();

  // ✅ CREATE PLAYER INSTANCE HERE
  player = new Player(3, 46);
  window.player = player; // optional, for debugging only

  npcs = setupNPCs(getVillagerDialogue);

  spawnEnemy(22, 32, "coward");

  houses.push(
    new House(1000, 600, {
      spriteX: 0,
      spriteY: 0
    })
  );

  items.push(new Item(400, 300, "health"));

  requestAnimationFrame(gameLoop);
}


// Combat
let attackCooldown = 0;
const ATTACK_RANGE = 50;
const ATTACK_COOLDOWN_TIME = 0.5; // seconds

function updateItems(dt) {
  for (const item of items) {
    item.update(dt);
  }
}

function getInventoryInput() {
  return {
    left: keys["a"] || keys["ArrowLeft"],
    right: keys["d"] || keys["ArrowRight"],
    up: keys["w"] || keys["ArrowUp"],
    down: keys["s"] || keys["ArrowDown"],
    confirm: wasKeyPressed("Enter") || wasKeyPressed(" ")
  };
}

function updateXPOrbs(dt) {
  for (const orb of xpOrbs) {
    if (orb.collected) continue;

    // Drift slowly at first
    orb.x += orb.driftX * dt;
    orb.y += orb.driftY * dt;
    orb.driftX *= 0.95;
    orb.driftY *= 0.95;

    // Check proximity to player
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 150) {
      // Start homing
      const homingStrength = 6; // higher = faster pull
      orb.x += dx * dt * homingStrength;
      orb.y += dy * dt * homingStrength;

      if (dist < 20) {
        orb.collected = true;
        player.gainXP(orb.value);
        effects.push({
          type: "xpBurst",
          x: player.x,
          y: player.y - 10,
          value: orb.value,
          vy: -30,      // upward speed
          alpha: 1,
          timer: 0.8,
        });
      }
    }
  }

  // Remove collected orbs
  xpOrbs = xpOrbs.filter((o) => !o.collected);
}

// ===== Game Loop =====
function gameLoop(timestamp) {
  deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

// ===== Update =====
function update(dt) {
   updateWorldAnimation(dt); 

  if (activeDialogue) {
    activeDialogue.timer -= dt;
    activeDialogue.alpha = Math.min(1, activeDialogue.timer);

    if (activeDialogue.timer <= 0) {
      activeDialogue = null;
    }
  }

  if (wasKeyPressed("i")) {
    player.isInventoryOpen = !player.isInventoryOpen;
    tutorial.openedInventory = true;
  }

  player.update(dt);

  if (player.isInventoryOpen) {
    const input = getInventoryInput();
    updateInventoryCursor(dt, input);

    if (input.confirm) {
      player.useItem(inventoryCursor);
    }

    return; // pause game while inventory open
  }

  if (player.isDead) {
    deathFade = Math.min(1, deathFade + dt * 1.5);
  } else {
    deathFade = Math.max(0, deathFade - dt * 2);
  }

  if (!tutorial.moved) {
    if (
      keys["w"] || keys["a"] || keys["s"] || keys["d"] ||
      keys["ArrowUp"] || keys["ArrowDown"] ||
      keys["ArrowLeft"] || keys["ArrowRight"]
    ) {
      tutorial.moved = true;

      if (!tutorialDebugOnce.moved) {
        console.log("✅ Tutorial: movement detected");
        tutorialDebugOnce.moved = true;
      }
    }
  }


  // ===== INPUT ROUTING =====
  let mx = 0;
  let my = 0;

  if (!player.isDead && !player.isInventoryOpen) {
    if (keys["w"] || keys["ArrowUp"]) my -= 1;
    if (keys["s"] || keys["ArrowDown"]) my += 1;
    if (keys["a"] || keys["ArrowLeft"]) mx -= 1;
    if (keys["d"] || keys["ArrowRight"]) mx += 1;

    player.handleMovementInput(mx, my, dt);

    if (wasKeyPressed("e")) {
      player.startIceCast();
    }

    if (keys[" "] || keys["Space"]) {
      handleAttack(dt);
    }
  }

  if (!player.isInventoryOpen && !player.isDead) {
    updateItems(dt);
  }

  if (player.isInventoryOpen && !player.isDead) {
    if (wasKeyPressed("1")) {
        player.useItem(0);
    }
  }

  updateIceBolts(dt);
  handleAttack(dt, npcs, objects);
  updateNPCs(dt);
  //updateEnemies(dt, player)
  const xpFromEnemies = updateEnemies(dt, player);

  if (!player.isInventoryOpen && !player.isDead) {
    updateIceBolts(dt);
    handleAttack(dt, npcs, objects);
    updateNPCs(dt);

    const xpFromEnemies = updateEnemies(dt);
    if (xpFromEnemies > 0) {
      player.gainXP(xpFromEnemies);
      effects.push({
        type: "xpText",
        x: player.x,
        y: player.y - 20,
        value: xpFromEnemies,
        vy: -30,
        alpha: 1,
       timer: 0.8,
      });
    }
  }

  handleItemPickup();
  updateItemPickup(player);
  updateXPOrbs(dt);
  updateCamera(dt);
  handleInteractions();
}

// ===== NPC Idle Movement =====
function updateNPCs(dt) {
  for (const npc of npcs) {
    npc.idleTimer += dt;
    if (npc.idleTimer > 2) {
      npc.dir *= -1;
      npc.idleTimer = 0;
    }

    const nextY = npc.y + npc.dir * npc.speed * dt;
    if (!isColliding(nextY, npc.x, 32, npcs, objects)) npc.y = nextY;
  }
}

function updateItemPickup(player) {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.size / 2 + 16) {
      const pickedUp = player.addItem({
        type: item.type,
        name: item.type
      });

      if (pickedUp) {
        items.splice(i, 1);
      }
    }
  }
}


// ===== Combat System =====
function handleAttack(dt) {
  const attackPressed = keys[" "] || keys["Space"] || keys["Spacebar"];

  if (!tutorial.sawEnemy) {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 200) {
        tutorial.sawEnemy = true;

        if (!tutorialDebugOnce.sawEnemy) {
          console.log("✅ Tutorial: enemy detected nearby");
          tutorialDebugOnce.sawEnemy = true;
        }

        break;
      }
    }
  }


  if (attackPressed) {
    tutorial.attacked = true;
  }

  if (attackCooldown > 0) attackCooldown -= dt;

  if (attackPressed && attackCooldown <= 0) {
    attackCooldown = ATTACK_COOLDOWN_TIME;

    let hitSomething = false;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ATTACK_RANGE + enemy.size / 2) {
        const angleToEnemy = Math.atan2(dy, dx);

        let facingAngle = 0;
        switch (player.facing) {
          case "right": facingAngle = 0; break;
          case "down":  facingAngle = Math.PI / 2; break;
          case "left":  facingAngle = Math.PI; break;
          case "up":    facingAngle = -Math.PI / 2; break;
        }

        const angleDiff = Math.abs(
          Math.atan2(
            Math.sin(angleToEnemy - facingAngle),
            Math.cos(angleToEnemy - facingAngle)
          )
        );

        if (angleDiff < Math.PI / 4) {
          enemy.damage(1);
          hitSomething = true;
        }
      }
    }
  }
}


function pickupItem(worldItem) {
  const inventoryItem = {
    type: worldItem.type,
    name: worldItem.type.toUpperCase()
  };

  const added = player.addItem(inventoryItem);

  if (added) {
    effects.push({
      type: "xpText",
      x: player.x,
      y: player.y - 20,
      value: inventoryItem.name,
      vy: -20,
      alpha: 1,
      timer: 0.8,
    });
  }
}


function handleItemPickup() {
  for (let i = items.length - 1; i >= 0; i--) {
    const worldItem = items[i];

    const dx = player.x - worldItem.x;
    const dy = player.y - worldItem.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.size / 2 + 16) {
      const def = ITEM_DEFS[worldItem.type];
      if (!def) continue;

      const added = player.addItem(def);
      if (added) {
        items.splice(i, 1);

        effects.push({
          type: "xpText",
          x: player.x,
          y: player.y - 20,
          value: def.name,
          vy: -20,
          alpha: 1,
          timer: 0.8
        });
      }
    }
  }
}

// ===== Camera (Smooth Follow) =====
function updateCamera(dt) {
  const targetX = player.x - camera.width / 2;
  const targetY = player.y - camera.height / 2;

  // Smooth follow (lerp)
  camera.x += (targetX - camera.x) * camera.speed * dt;
  camera.y += (targetY - camera.y) * camera.speed * dt;

  // Clamp to world bounds
  camera.x = Math.max(0, Math.min(camera.x, WORLD_COLS * TILE_SIZE - camera.width));
  camera.y = Math.max(
    0,
    Math.min(camera.y, WORLD_ROWS * TILE_SIZE - camera.height)
  );
}

function drawTutorialHints(ctx) {
  let text = null;

  if (!tutorial.moved) {
    text = "Use WASD or Arrow Keys to move";
  }
  else if (!tutorial.sawEnemy) {
    text = "Explore the area";
  }
  else if (!tutorial.attacked) {
    text = "Press SPACE to attack";
  }
  else if (!tutorial.openedInventory) {
    text = "Press I to open your inventory";
  }

  if (!text) return;

  ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(200, 520, 400, 40);

    ctx.fillStyle = "#fff";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, 400, 548);
  ctx.restore();
}



// ===== Input Helper for Single Key Press Detection =====
let previousKeys = {};

function drawEntitiesSorted() {
  const renderables = [];

  // Trees
  for (const tree of trees) {
    renderables.push(tree);
  }

  for (const house of houses){
    renderables.push(house);
  }

  // Enemies
  for (const enemy of enemies) {
    if (enemy.alive) renderables.push(enemy);
  }

  // NPCs
  for (const npc of npcs) {
    renderables.push(npc);
  }

  // Player
  renderables.push(player);

  // Sort by Y (depth)
  renderables.sort((a, b) => a.y - b.y);

  // Draw
  for (const obj of renderables) {
    if (obj.draw) obj.draw(ctx);
  }
}


// ===== Render =====
function render() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);


  drawWorld(ctx, camera);
  drawEntitiesSorted();
    
  for (const item of items) {
    item.draw(ctx);
  }

  drawEffects();
  
  // ===== DEBUG: Draw Enemy Paths =====
  for (const enemy of enemies) {
    if (!enemy.path || enemy.path.length === 0) continue;

    ctx.strokeStyle =
      enemy.state === ENEMY_STATE.CHASE
        ? "red"
        : enemy.state === ENEMY_STATE.PATROL
        ? "yellow"
        : "orange";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < enemy.path.length; i++) {
      const tx = enemy.path[i].x * TILE_SIZE + TILE_SIZE / 2;
      const ty = enemy.path[i].y * TILE_SIZE + TILE_SIZE / 2;
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }

    ctx.stroke();

    // Draw path points
    for (const node of enemy.path) {
      const px = node.x * TILE_SIZE + TILE_SIZE / 2;
      const py = node.y * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }


  }

  // ===== Enemy Path & Vision Debug =====
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    // --- Path Visualization ---
    if (enemy.path && enemy.path.length > 0) {
      ctx.strokeStyle =
        enemy.state === ENEMY_STATE.CHASE
          ? "red"
          : enemy.state === ENEMY_STATE.PATROL
          ? "yellow"
          : "orange";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < enemy.path.length; i++) {
        const tx = enemy.path[i].x * TILE_SIZE + TILE_SIZE / 2;
        const ty = enemy.path[i].y * TILE_SIZE + TILE_SIZE / 2;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();

      // Draw path nodes as small dots
      for (const node of enemy.path) {
        const px = node.x * TILE_SIZE + TILE_SIZE / 2;
        const py = node.y * TILE_SIZE + TILE_SIZE / 2;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Vision Range Visualization ---
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.visionRange, 0, Math.PI * 2);
    ctx.strokeStyle =
      enemy.state === ENEMY_STATE.CHASE
        ? "rgba(255,0,0,0.4)" // red for chase
        : enemy.state === ENEMY_STATE.PATROL
        ? "rgba(255,255,0,0.3)" // yellow for patrol
        : "rgba(255,165,0,0.3)"; // orange for search
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Optional: draw line of sight when player is visible
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < enemy.visionRange) {
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(player.x, player.y);
      ctx.strokeStyle = "rgba(255,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  drawIceBolts(ctx);

  ctx.restore();
  drawDialogue(ctx);
  drawUI();
  drawTutorialHints(ctx);

  if (player.isInventoryOpen) {
    drawInventory(ctx, canvas, player);
  }

  if (deathFade > 0) {
    ctx.save();
    ctx.globalAlpha = deathFade;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

}

// ===== Draw Entities =====
function drawEntities() {
  // NPCs
  for (const npc of npcs) {
    Graphics.circle(ctx, npc.x, npc.y, npc.size / 2, npc.color);
  }

  // Enemies (each Enemy has its own draw)
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.draw(ctx);
  }

  // Player
  player.draw(ctx);

  // Attack range indicator (debug)
  if (attackCooldown <= 0.05) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, ATTACK_RANGE, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.stroke();
  }

  for (const orb of xpOrbs) {
    if (orb.collected) continue;
    const pulse = Math.sin(performance.now() / 150) * 2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size + pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(50, 200, 255, 0.7)";
    ctx.fill();
  }
}

function collidesWithTrees(x, y, size) {
  for (const tree of trees) {
    const b = tree.getCollisionBox();
    if (
      x + size / 2 > b.x &&
      x - size / 2 < b.x + b.width &&
      y + size / 2 > b.y &&
      y - size / 2 < b.y + b.height
    ) {
      return true;
    }
  }
  return false;
}


function drawEffects() {
  for (const fx of effects) {

    if (fx.type === "xpBurst") {
      const alpha = fx.timer / 0.3;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 20 * (1 - alpha), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      fx.timer -= deltaTime;
    }

    // --- Floating XP text ---
    if (fx.type === "xpText") {
      fx.y += fx.vy * deltaTime;
      fx.alpha = fx.timer / 0.8;

      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.fillStyle = "#66ccff";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`+${fx.value} XP`, fx.x - 12, fx.y);
      ctx.restore();

      fx.timer -= deltaTime;
    }
  }

  effects = effects.filter(fx => fx.timer > 0);
}


// ===== UI Layer =====
function drawUI() {
  const barWidth = 200;
  const barHeight = 14;

  ctx.save();

  // --- UI background panel ---
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(10, 10, 300, 160);
  ctx.strokeStyle = "#888";
  ctx.strokeRect(10, 10, 300, 160);

  ctx.font = "14px monospace";

  let y = 40;

  // --- Level ---
  ctx.fillStyle = "#ccc";
  ctx.fillText("Level", 20, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(`${player.level}`, 80, y);

  // --- XP text ---
  y += 20;
  ctx.fillStyle = "#ccc";
  ctx.fillText("XP", 20, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(`${Math.floor(player.xp)}/${player.xpToNext}`, 80, y);

  // --- XP bar ---
  y += 10;
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(20, y, barWidth, barHeight);

  // Smooth XP animation
  const xpLerpSpeed = 8; // higher = faster animation
  player.displayXP += (player.xp - player.displayXP) * Math.min(1, xpLerpSpeed * deltaTime);

  const xpRatio = Math.min(1, player.displayXP / player.xpToNext);

  ctx.fillStyle = "#66ccff";
  ctx.fillRect(20, y, barWidth * xpRatio, barHeight);

  // --- Health ---
  y += 30;
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(20, y, barWidth, barHeight);

  const healthRatio = Math.max(0, player.health / player.maxHealth);
  ctx.fillStyle =
    healthRatio > 0.5 ? "#00ff00" :
    healthRatio > 0.25 ? "#ffff00" :
    "#ff0000";

  ctx.fillRect(20, y, barWidth * healthRatio, barHeight);
  ctx.fillStyle = "#fff";
  ctx.fillText(`HP: ${player.health}/${player.maxHealth}`, 230, y + 12);

  // --- Stamina ---
  y += 25;
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(20, y, barWidth, barHeight);

  const staminaRatio = Math.max(0, player.stamina / player.maxStamina);
  ctx.fillStyle = "#00ff88";
  ctx.fillRect(20, y, barWidth * staminaRatio, barHeight);
  ctx.fillStyle = "#fff";
  ctx.fillText("Stamina", 230, y + 12);

  // --- Spirit ---
  y += 25;
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(20, y, barWidth, barHeight);

  const spiritRatio = Math.max(0, player.spirit / player.maxSpirit);
  ctx.fillStyle = "#66aaff";
  ctx.fillRect(20, y, barWidth * spiritRatio, barHeight);
  ctx.fillStyle = "#fff";
  ctx.fillText("Spirit", 230, y + 12);

  // --- Dialogue ---
  //if (activeDialogue) drawDialogue(activeDialogue);

  ctx.restore();
}

function drawDialogue(ctx) {
  if (!activeDialogue) return;

  const padding = 10;
  const width = 420;
  const height = 48;

  const x = canvas.width / 2 - width / 2;
  const y = canvas.height - 120;

  ctx.save();
  ctx.globalAlpha = activeDialogue.alpha;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = "#aaa";
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.textAlign = "center";
  ctx.fillText(activeDialogue.text, x + width / 2, y + 30);

  ctx.restore();
}

function handleInteractions() {
  // Check if player is near any NPC
  for (const npc of npcs) {
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Within talking range?
    if (dist < 50 && wasKeyPressed("q")) {
     const lines = typeof npc.dialogue === "function"
        ? npc.dialogue()
        : npc.dialogue;

      activeDialogue = {
        name: npc.name,
        lines,
        currentLine: 0
      };
    }
  }

  // Advance dialogue
  if (activeDialogue && wasKeyPressed("Enter")) {
    activeDialogue.currentLine++;
    if (activeDialogue.currentLine >= activeDialogue.lines.length) {
      activeDialogue = null;
    }
  }
}


