// ==========================================================
// particles.js  —  Modular Particle System (Option B Fully Implemented)
// ==========================================================

import { playerImage } from "./player.js";

// Global particle list
export const particles = [];

// ==========================================================
// BASE PARTICLE (all particles inherit from this)
// ==========================================================
export class BaseParticle {
    constructor(x, y, life, color = "rgba(255,255,255,ALPHA)", size = 4) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;

        this.life = life;     // seconds
        this.age = 0;

        this.color = color;
        this.size = size;

        this.remove = false;
    }

    update(dt) {
        this.age += dt;
        if (this.age >= this.life) {
            this.remove = true;
            return;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    alpha() {
        return Math.max(0, 1 - this.age / this.life);
    }

    draw(ctx) {
        ctx.fillStyle = this.color.replace("ALPHA", this.alpha());
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==========================================================
// GENERIC PARTICLE  (old round puff)
// ==========================================================
export class Particle extends BaseParticle {
    constructor(x, y, vx, vy, life, color, size = 4) {
        super(x, y, life, color, size);
        this.vx = vx;
        this.vy = vy;
    }
}

// ==========================================================
// SPRITE PARTICLE (for future spell VFX sprites)
// ==========================================================
export class SpriteParticle extends BaseParticle {
    constructor(x, y, vx, vy, life, sprite, sx, sy, sw, sh, scale = 1) {
        super(x, y, life);

        this.vx = vx;
        this.vy = vy;

        this.sprite = sprite;
        this.sx = sx;
        this.sy = sy;
        this.sw = sw;
        this.sh = sh;

        this.scale = scale;
        this.rotation = 0;
        this.fade = true;
    }

    draw(ctx) {
        const alpha = this.fade ? this.alpha() : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.drawImage(
            this.sprite,
            this.sx, this.sy, this.sw, this.sh,
            -this.sw / 2 * this.scale,
            -this.sh / 2 * this.scale,
            this.sw * this.scale,
            this.sh * this.scale
        );

        ctx.restore();
    }
}

// ==========================================================
// FIRE SLASH PARTICLE (uses Mary's sprite sheet rows 8–11)
// ==========================================================
export class SlashParticle extends BaseParticle {
    constructor(x, y, facing, rowIndex, frameDuration = 0.06) {
        super(x, y, 0.24); // 4 frames * 0.06

        this.facing = facing;
        this.rowIndex = rowIndex;

        this.frame = 0;
        this.frameTimer = 0;
        this.frameDuration = frameDuration;

        this.frameW = 32;
        this.frameH = 33;

        // From your Mary.png file
        this.frameCount = 4;

        // Offsets so slash appears outward, not on top of player
        this.offsetMap = {
            up:    { x: 0,  y: -20 },
            down:  { x: 0,  y: 20 },
            left:  { x: -20, y: 0 },
            right: { x: 20,  y: 0 }
        };
    }

    update(dt) {
        super.update(dt);
        if (this.remove) return;

        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.frame++;

            if (this.frame >= this.frameCount) {
                this.remove = true;
            }
        }
    }

    draw(ctx) {
        const off = this.offsetMap[this.facing];

        const sx = this.frame * this.frameW;
        const sy = this.rowIndex * this.frameH;

        ctx.save();
        ctx.globalAlpha = this.alpha();

        if (!playerImage.complete) return;
        if (!this.target) return;
        if(!this.owner){
            this.alive = false;
            return;
        }
        if(!this.sprite) return;

        ctx.drawImage(
            playerImage,
            sx, sy,
            this.frameW, this.frameH,
            this.x + off.x - this.frameW / 2,
            this.y + off.y - this.frameH / 2,
            this.frameW, this.frameH
        );

        ctx.restore();
    }
}

// ==========================================================
// MAIN UPDATE + DRAW LOOP
// ==========================================================

export function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        if (p.remove) particles.splice(i, 1);
    }
}

export function drawParticles(ctx) {
    for (const p of particles) {
        p.draw(ctx);
    }
}

// ======================================================
// FIRE SLASH PARTICLE  (4-frame directional slash VFX)
// ======================================================
export class FireSlashParticle extends BaseParticle {
    constructor(x, y, angle, duration, spriteRow) {
        super(x, y, 0, 0, duration, "rgba(255,255,255,ALPHA)", 0);

        this.angle = angle;       // rotation
        this.spriteRow = spriteRow; // row 8–11 on Mary.png
        this.frame = 0;
        this.frameTimer = 0;
        this.frameInterval = duration / 4;

        this.width = 32;
        this.height = 33;
    }

    update(dt) {
        this.frameTimer += dt;

        if (this.frameTimer >= this.frameInterval) {
            this.frame++;
            this.frameTimer = 0;
            if (this.frame > 3) this.alive = false;
        }
    }

    draw(ctx) {
        if (!playerImage.complete) return;
        if (!this.target) return;
        if(!this.owner){
            this.alive = false;
            return;
        }
        if(!this.sprite) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.drawImage(
            playerImage,
            this.frame * this.width,
            this.spriteRow * this.height,
            this.width,
            this.height,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );

        ctx.restore();
    }
}

//---------------------------------------------------------
// LIGHTNING PARTICLE HELPERS
//---------------------------------------------------------
particles.spawnLightningBurst = function(x, y) {
    for (let i = 0; i < 12; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 80;
        particles.push(new Particle(
            x, y,
            Math.cos(ang) * speed,
            Math.sin(ang) * speed,
            0.25,
            "rgba(120,180,255,ALPHA)",
            3
        ));
    }
};

particles.spawnLightningTrail = function(x, y) {
    particles.push(new Particle(
        x, y,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        0.15,
        "rgba(180,220,255,ALPHA)",
        2
    ));
};

particles.spawnLightningHit = function(x, y) {
    for (let i = 0; i < 6; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 40;
        particles.push(new Particle(
            x, y,
            Math.cos(ang) * speed,
            Math.sin(ang) * speed,
            0.2,
            "rgba(255,255,255,ALPHA)",
            3
        ));
    }
};


// LIGHTNING DASH PARTICLE

export class LightningDashParticle extends BaseParticle {
    constructor(x, y, facing) {
        super(x, y, 0.20, "rgba(255,255,255,ALPHA)", 0); // FIXED

        this.frameWidth = 32;
        this.frameHeight = 33;

        this.frame = 0;
        this.frameTimer = 0;
        this.frameInterval = 0.05;

        const rowMap = {
            up:    12,
            left:  13,
            down:  14,
            right: 15
        };

        this.row = rowMap[facing] ?? 12;

        console.log("⚡ LightningDashParticle created — row:", this.row);
    }

    update(dt) {
        super.update(dt);
        if (this.remove) return;

        this.frameTimer += dt;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            this.frame = (this.frame + 1) % 4;
        }
    }

    draw(ctx) {
        if (!playerImage.complete) return;

        const sx = this.frame * this.frameWidth;
        const sy = this.row * this.frameHeight;

        ctx.drawImage(
            playerImage,
            sx, sy,
            this.frameWidth, this.frameHeight,
            this.x - this.frameWidth / 2,
            this.y - this.frameHeight / 2,
            this.frameWidth, this.frameHeight
        );
    }
}


