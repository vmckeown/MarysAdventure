/* 
  BackStabbing Enterprises Engine
  Founded by Jeff B and Vince M
  -----------------------------------
  main.js — Core engine and global setup
*/

// ===== Global Variables =====

import {setupWorld,isColliding,TILE_SIZE,WORLD_COLS,WORLD_ROWS,BACKGROUND_COLOR,drawWorld, updateWorldAnimation} from "./world.js";
import { enemies, spawnEnemy, updateEnemies, ENEMY_STATE } from "./enemy.js";
import { setupNPCs } from "./npc.js";
import { setupInput, keys, wasKeyPressed } from "./input.js";
import { Graphics } from "./graphics.js";
import { updateIceBolts, drawIceBolts } from "./iceBolt.js";
import { drawInventory, updateInventoryCursor, inventoryCursor} from "./inventory.js";
import { items, Item, ITEM_DEFS} from "./items.js";
import { Player } from "./player.js";
import { Tree, TREE_TYPES } from "./tree.js";
import { House } from "./house.js";
import { drawDialogue, startDialogue, advanceDialogue, getVillagerDialogue, isDialogueActive } from "./dialogue.js";
import { completeStep, getActiveQuest, quests, startQuest, QUEST_STATE, setQuestUpdateHandler} from "./quests.js";
import "./questData.js";
import { Raft } from "./raft.js";
import { updateQuestUI, drawQuestUI, triggerQuestUI } from "./questUI.js";
import { handleInteractions } from "./interactions.js";
import { loadSound, playSound } from "./audio.js";
import { Rock } from "./rocks.js";
import { SKILLS, skillXpForNextLevel } from "./skills.js";
import { Ruin } from "./ruin.js";
import { ELEMENTS, getActiveElements} from "./elements.js";
import {toggleSkillTree, drawSkillTree, isSkillTreeOpen, handleSkillTreeInput, getUnlockedAirPassives, drawSwiftStepParticles } from "./skillTreeUI.js";

export const houses = [];
const QUEST_FLASH_DURATION = 1.2;

function spawnTreeCluster(cx, cy, offsets, type) {
  return offsets.map(([dx, dy]) =>
    new Tree(cx + dx, cy + dy, TREE_TYPES[type])
  );
}

setQuestUpdateHandler((quest) => {
  triggerQuestUI();

  if (quest.id === "shore_intro" && quest.currentStep === 0) {
    for (const e of enemies) {
      e.enabled = true;
      e.alive = true;
      e.state = ENEMY_STATE.PATROL;

      // reset AI state cleanly
      e.alertTimer = 0;
      e.lostSightTimer = 0;
      e.chaseTimer = 0;
      e.hitStunTimer = 0;
      e.path = null;
      e.pathIndex = 0;
      e.lastSeen = null;

      console.log("✅ Goblin enabled at quest start");
    }
  }
});

function drawSkillsDebug(ctx) {
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";

  let y = 20;
  for (const [name, s] of Object.entries(SKILLS)) {
    ctx.fillText(
      `${name}: ${s.level} (${s.xp}/${skillXpForNextLevel(s.level)})`,
      10,
      y
    );
    y += 14;
  }

  ctx.restore();
}


const ruins = [];

ruins.push(
  new Ruin(1200, 450, "air")
);



// Quest UI animation state
let questSlideX = -400;        // start offscreen
let questTargetX = 20;         // where it slides to
const QUEST_SLIDE_SPEED = 10;

let questFlashTimer = 0;

const rafts = [];

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

const ROCK_POSITIONS = [
  { x: 16, y: 34 }, 
  { x: 19, y: 34 },
  { x: 22, y: 39 },
  { x: 18, y: 40 },
  { x: 22, y: 45 }
];



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

window.triggerQuestUI = function () {
  questTargetX = 20;
  questFlashTimer = QUEST_FLASH_DURATION;
};

window.hideQuestUI = function () {
  questTargetX = -400;
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

  loadSound("quest_start", "./sounds/quest_start.wav", 0.6);
  loadSound("quest_update", "./sounds/quest_update.wav", 0.6);
  loadSound("quest_complete", "./sounds/quest_complete.wav", 0.7);

  setupInput();
  setupWorld();

  // ✅ CREATE PLAYER INSTANCE HERE
  player = new Player(8, 46);
  window.player = player; // optional, for debugging only

  player.skillPoints = 1;


for (const pos of ROCK_POSITIONS) {
  objects.push(
    new Rock(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE
    )
  );
}

  npcs = setupNPCs(() => getVillagerDialogue(tutorial));

  spawnEnemy(45, 45, "coward");
  const goblin = enemies[enemies.length - 1];
  goblin.enabled = false;

  houses.push(
    new House(1000, 600, {
      spriteX: 0,
      spriteY: 0
    })
  );

  const raftX = 8 * TILE_SIZE;
  const raftY = 48 * TILE_SIZE;

  rafts.push(
    new Raft(raftX,raftY, 0, 6)
  );

  items.push(new Item(400, 300, "health"));

  requestAnimationFrame(gameLoop);
}

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;

  Object.values(window.sounds || {}).forEach(a => {
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
    }).catch(() => {});
  });

  audioUnlocked = true;
}

window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("mousedown", unlockAudio, { once: true });

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

  const attackPressed = keys[" "] || keys["Space"];
  const inventoryPressed = wasKeyPressed("i");
  const interactPressed = wasKeyPressed("e");
  const skillTreePressed = wasKeyPressed("k");
  const escapePressed = wasKeyPressed("Escape");

  // ---- SKILL TREE TOGGLE ----
  if (skillTreePressed) {
    toggleSkillTree();
  }

  // ---- SKILL TREE INPUT (DO NOT RETURN) ----
  if (isSkillTreeOpen()) {
    handleSkillTreeInput(player, wasKeyPressed);
  }

  // ---- INTERACT ----
  if (interactPressed && !isSkillTreeOpen()) {
    if (isDialogueActive()) {
      advanceDialogue();
    } else {
      for (const ruin of ruins) {
        if (ruin.isNear(player.x, player.y)) {
          ruin.interact(player);
          console.log("✅ Interacting with ruin");
          return;
        }
      }
      handleInteractions({ player, npcs, rafts, qPressed: true });
    }
  }

  // ---- INVENTORY (THIS ONE CAN RETURN) ----
  if (inventoryPressed) {
    player.isInventoryOpen = !player.isInventoryOpen;
    return;
  }

  // ---- MOVEMENT ----
  let mx = 0, my = 0;

  if (!player.isDead && !player.isInventoryOpen && !isSkillTreeOpen()) {
    if (keys["w"] || keys["ArrowUp"]) my -= 1;
    if (keys["s"] || keys["ArrowDown"]) my += 1;
    if (keys["a"] || keys["ArrowLeft"]) mx -= 1;
    if (keys["d"] || keys["ArrowRight"]) mx += 1;

    player.handleMovementInput(mx, my, dt, npcs, objects);
  }

  // ---- ATTACK ----
  if (!player.isDead && attackPressed && !isSkillTreeOpen()) {
    handleAttack(dt);
  }

  // ---- UPDATE SYSTEMS ----
  player.update(dt);
  updateEnemies(dt, player);
  updateXPOrbs(dt);
  updateItemPickup(player);
  updateCamera(dt);
  updateQuestUI(dt);
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

function drawInteractionHint(text, x, y) {
  ctx.save();
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(x - 40, y - 28, 80, 18);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 14);

  ctx.restore();
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

function spawnSwiftStepParticle(x, y) {
  effects.push({
    type: "wind",
    x: x + (Math.random() * 6 - 3),
    y: y + (Math.random() * 6 - 3),
    vx: Math.random() * -20,
    vy: Math.random() * -10,
    alpha: 0.6,
    size: 6,
    timer: 0.3
  });
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

// ===== Input Helper for Single Key Press Detection =====
let previousKeys = {};

function drawEntitiesSorted() {
  const renderables = [];

  // Trees
  for (const tree of trees) {
    renderables.push(tree);
  }

  // Rocks
  for (const obj of objects) {
    renderables.push(obj);
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
  drawSwiftStepParticles(ctx, deltaTime);

  for (const ruin of ruins) {
    ruin.draw(ctx);
  }

  for (const item of items) {
    item.draw(ctx);
  }

  for (const raft of rafts) {
    raft.draw(ctx);

    if (raft.isNear(player.x, player.y)) {
      drawInteractionHint("Press Q", raft.x, raft.y);
    }
  }
  
  drawEffects();

  // ===== Enemy Path & Vision Debug (leave as-is if you want debug) =====
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
        ? "rgba(255,0,0,0.4)"
        : enemy.state === ENEMY_STATE.PATROL
        ? "rgba(255,255,0,0.3)"
        : "rgba(255,165,0,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Optional: line to player
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

  // ----- UI Layer (screen-space) -----
  drawDialogue(ctx, canvas);

  drawUI();
  drawQuestUI(ctx, getActiveQuest());

  // Debug skills display
  drawSkillsDebug(ctx);

  // Inventory overlay
  if (player.isInventoryOpen) {
    drawInventory(ctx, canvas, player);
  }

  // Skill tree overlay (draw ON TOP of everything)
  if (isSkillTreeOpen()) {
    drawSkillTree(ctx, canvas, player);
  }

  // Death fade
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

    if (fx.type === "airPulse") {
      fx.radius += 60 * deltaTime;
      fx.alpha -= deltaTime * 1.5;

      ctx.strokeStyle = `rgba(180,240,255,${fx.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
      ctx.stroke();

      fx.timer -= deltaTime;
    }


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

    if (fx.type === "skillPoint") {
      ctx.fillStyle = "#7fdfff";
      ctx.font = "bold 14px monospace";
      ctx.fillText(fx.text, fx.x, fx.y);
      fx.y -= 20 * deltaTime;
      fx.timer -= deltaTime;
    }

    if (fx.type === "wind") {
      ctx.save();
      ctx.globalAlpha = fx.alpha;
      ctx.strokeStyle = "#9fe8ff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(fx.x + fx.size, fx.y);
      ctx.stroke();

      ctx.restore();

      fx.x += fx.vx * deltaTime;
      fx.y += fx.vy * deltaTime;
      fx.alpha -= deltaTime * 2;
      fx.timer -= deltaTime;
    }
  }
  effects = effects.filter(fx => fx.timer > 0);
}



// ===== UI Layer =====
let xpFlashTimer = 0;
let levelFlashTimer = 0;
let displayedXP = 0;

function drawStatLabel(text, x, y) {
  ctx.fillStyle = "#eee";
  ctx.font = "12px monospace";
  ctx.fillText(text, x - 28, y + 9);
}

function drawUI() {
  const baseX = 48;
  const baseY = canvas.height - 120;

  const barWidth = 170;
  const barHeight = 10;
  const spacing = 18;

  ctx.save();

  // Smooth XP animation
  displayedXP += (player.xp - displayedXP) * Math.min(1, deltaTime * 8);
  const xpRatio = Math.min(1, displayedXP / player.xpToNext);

  // ===== LEVEL HEADER =====
  if (levelFlashTimer > 0) {
    ctx.shadowColor = "#ffe066";
    ctx.shadowBlur = 20 * levelFlashTimer;
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px monospace";
  ctx.fillText(`Lv ${player.level}`, baseX, baseY - 12);
  ctx.fillText(`SP: ${player.skillPoints}`, baseX + 80, baseY - 12);

  ctx.shadowBlur = 0;

  // ===== XP BAR =====
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(baseX, baseY, barWidth, barHeight);

  ctx.fillStyle = "#6ecbff";
  ctx.fillRect(baseX, baseY, barWidth * xpRatio, barHeight);

  if (xpFlashTimer > 0) {
    ctx.strokeStyle = `rgba(110,203,255,${xpFlashTimer * 4})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(baseX - 1, baseY - 1, barWidth + 2, barHeight + 2);
  }

  // ===== HP =====
  const hpY = baseY + spacing;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(baseX, hpY, barWidth, barHeight);

  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(baseX, hpY, barWidth * (player.health / player.maxHealth), barHeight);

  drawStatLabel("HP", baseX, hpY);

  // ===== STAMINA =====
  const stY = hpY + spacing;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(baseX, stY, barWidth, barHeight);

  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(baseX, stY, barWidth * (player.stamina / player.maxStamina), barHeight);

  drawStatLabel("ST", baseX, stY);

  // ===== SPIRIT =====
  const spY = stY + spacing;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(baseX, spY, barWidth, barHeight);

  ctx.fillStyle = "#5dade2";
  ctx.fillRect(baseX, spY, barWidth * (player.spirit / player.maxSpirit), barHeight);

  drawStatLabel("SP", baseX, spY);

  // ===== ELEMENT + PASSIVES (HUD) =====
  const activeElements = getActiveElements();
  if (activeElements.length > 0) {
    ctx.fillStyle = "#7fdfff";
    ctx.font = "bold 12px monospace";
    ctx.fillText(activeElements[0].toUpperCase(), baseX + 60, baseY - 12);
  }

  const passives = getUnlockedAirPassives();
  let passiveY = spY + 22;

  ctx.font = "11px monospace";
  ctx.fillStyle = "#bfefff";

  for (const p of passives) {
    ctx.fillText(`🌬 ${p}`, baseX, passiveY);
    passiveY += 14;
  }

  ctx.restore();
}



function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}






