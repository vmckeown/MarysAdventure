/* 
  BackStabbing Enterprises Engine
  Founded by Jeff B and Vince M
  -----------------------------------
  main.js — Core engine and global setup
*/

// ===== Global Variables =====

import {setupWorld,isColliding,TILE_SIZE,WORLD_COLS,WORLD_ROWS,BACKGROUND_COLOR,drawWorld} from "./world.js";

import { player } from "./player.js";
window.player = player;

import { Enemy, enemies, spawnEnemy, updateEnemies, ENEMY_STATE } from "./enemy.js";
import { NPC, setupNPCs } from "./npc.js";
import { setupInput, keys, wasKeyPressed } from "./input.js";
import { Graphics } from "./graphics.js";

export const WIDTH = 800;
export const HEIGHT = 600;

let canvas, ctx;

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

  //setupObjects();
  npcs = setupNPCs();

  // New enemy system: spawn enemies via enemy.js
  spawnEnemy(12, 12);
  spawnEnemy(18, 6);
  spawnEnemy(22, 12);
  setupInput();

  requestAnimationFrame(gameLoop);
}

// Combat
let attackCooldown = 0;
const ATTACK_RANGE = 50;
const ATTACK_COOLDOWN_TIME = 0.5; // seconds

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
          y: player.y,
          timer: 0.3,
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
  player.update(dt, keys, npcs, objects, ctx);
  handleAttack(dt);
  updateNPCs(dt);
  updateEnemies(dt, player)
  /*for (const e of enemies) {
    e.update(dt, player);
  }*/
  updateXPOrbs(dt);
  updateCamera(dt);
  //handleInteractions();
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
    // ✅ isColliding expects (x, y)
    if (!isColliding(nextY, npc.x, 32, npcs, objects)) npc.y = nextY;
  }
}

// ===== Combat System =====
function handleAttack(dt) {
  if (attackCooldown > 0) attackCooldown -= dt;

  const attackPressed = keys[" "] || keys["Space"] || keys["Spacebar"];

  if (attackPressed && attackCooldown <= 0) {
    attackCooldown = ATTACK_COOLDOWN_TIME;

    let hitSomething = false;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ATTACK_RANGE + enemy.size / 2) {
        // Directional cone
        const angleToEnemy = Math.atan2(dy, dx);
        let facingAngle = 0;

        switch (player.facing) {
          case "right":
            facingAngle = 0;
            break;
          case "down":
            facingAngle = Math.PI / 2;
            break;
          case "left":
            facingAngle = Math.PI;
            break;
          case "up":
            facingAngle = -Math.PI / 2;
            break;
        }

        const angleDiff = Math.abs(
          Math.atan2(
            Math.sin(angleToEnemy - facingAngle),
            Math.cos(angleToEnemy - facingAngle)
          )
        );

        if (angleDiff < Math.PI / 4) {
          // 45-degree cone
          enemy.damage(1);
          hitSomething = true;
        }
      }
    }

    if (!hitSomething) {
      // Optional: uncomment if you want feedback, but avoid spam
      // console.log("No enemy in range.");
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

// ===== Render =====
function render() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawWorld(ctx, camera);
  //drawObjects(ctx, camera, objects);
  drawEntities();
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

  ctx.restore();
  drawUI();
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
  }
  effects = effects.filter((fx) => fx.timer > 0);
}

// ===== UI Layer =====
function drawUI() {
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = "14px monospace";

  // --- Player Info ---
  ctx.fillText(`Player: (${Math.floor(player.x)}, ${Math.floor(player.y)})`, 20, 20);
  ctx.fillText(`Level: ${player.level}`, 20, 45);
  ctx.fillText(`XP: ${Math.floor(player.xp)}/${player.xpToNext}`, 20, 65);

  // --- Health Bar ---
  const barWidth = 200;
  const barHeight = 14;
  let y = 85; // start position for first bar

  // Health
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, y, barWidth, barHeight);
  const healthRatio = Math.max(0, player.health / player.maxHealth);
  ctx.fillStyle =
    healthRatio > 0.5 ? "#00ff00" : healthRatio > 0.25 ? "#ffff00" : "#ff0000";
  ctx.fillRect(20, y, barWidth * healthRatio, barHeight);
  ctx.fillStyle = "#fff";
  ctx.fillText(`HP: ${player.health}/${player.maxHealth}`, 230, y + 12);

  // --- Stamina Bar ---
  y += 25;
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(20, y, barWidth, barHeight);
  const staminaRatio = Math.max(0, player.stamina / player.maxStamina);
  ctx.fillStyle = "#00ff88";
  ctx.fillRect(20, y, barWidth * staminaRatio, barHeight);
  ctx.fillStyle = "#fff";
  ctx.fillText(`Stamina`, 230, y + 12);

  // --- Spirit Bar ---
  y += 25;
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(20, y, barWidth, barHeight);
  const spiritRatio = Math.max(0, player.spirit / player.maxSpirit);
  ctx.fillStyle = "#66aaff";
  ctx.fillRect(20, y, barWidth * spiritRatio, barHeight);
  ctx.fillStyle = "#fff";
  ctx.fillText(`Spirit`, 230, y + 12);

  // --- Dialogue Box (if active) ---
  if (activeDialogue) drawDialogueBox(activeDialogue);

  ctx.restore();
}

function handleInteractions() {
  // Check if player is near any NPC
  for (const npc of npcs) {
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Within talking range?
    if (dist < 50 && wasKeyPressed("e")) {
      activeDialogue = {
        name: npc.name,
        lines: npc.dialogue,
        currentLine: 0,
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
