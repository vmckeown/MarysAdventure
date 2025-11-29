import { playerImage, FIRE_SLASH_ROW } from "./player.js";

export class Particle {
    constructor(x, y, vx, vy, life, color, size = 2) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        if (this.frame !== undefined && this.facing !== undefined) {
            const frameWidth = 32;
            const frameHeight = 33;

            const facingRow = {
                up: 0,
                left: 1,
                down: 2,
                right: 3
            }[this.facing];

            ctx.globalAlpha = this.life / this.maxLife; // fade over time

            ctx.drawImage(
                playerImage,
                this.frame * frameWidth,
                facingRow * frameHeight,
                frameWidth,
                frameHeight,
                this.x - frameWidth / 2,
                this.y - frameHeight / 2,
                frameWidth,
                frameHeight
            );

            ctx.globalAlpha = 1;
            return;
        }

        if (this.life <= 0) return;
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color.replace("ALPHA", alpha.toFixed(2));
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

export const particles = [];

export function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        if (p.dead) particles.splice(i, 1);
    }
}

export function drawParticles(ctx) {
    for (const p of particles) p.draw(ctx);
}

export class SlashParticle {
    constructor(x, y, angle, color, lifetime = 0.2, row = 8) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.color = color;
        this.lifetime = lifetime;
        this.age = 0;

        this.row = row;   // ← store the Fire Slash row

        this.frame = 0;
        this.frameTimer = 0;
        this.frameInterval = 0.05;

        this.frameWidth = 32;
        this.frameHeight = 32;
    }


    update(dt) {
        this.age += dt;
        if (this.age > this.lifetime) this.dead = true;

        // Animate frames
        this.frameTimer += dt;
        if (this.frameTimer > this.frameInterval) {
            this.frameTimer = 0;
            this.frame++;
            if (this.frame > 3) this.dead = true; // 4 frames
        }
    }

    draw(ctx) {

        const sx = this.frame * this.frameWidth;
        const sy = this.row * this.frameHeight;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.drawImage(
            playerImage,
            sx, sy,
            this.frameWidth, this.frameHeight,
            -this.frameWidth / 2,
            -this.frameHeight / 2,
            this.frameWidth,
            this.frameHeight
        );

        ctx.restore();
    }
}


