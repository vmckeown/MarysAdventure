export const particles = [];

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
        // PLAYER AFTERIMAGE DASH TRAIL
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

export function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
}

export function drawParticles(ctx) {
    for (const p of particles) p.draw(ctx);
}


export class SlashParticle {
    constructor(x, y, angle, color = "rgba(255,255,255,ALPHA)", duration = 0.2) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.life = this.maxLife = duration;
        this.color = color;
        this.radius = 30;
        this.arcWidth = Math.PI / 3; // 60 degree arc
    }

    update(dt) {
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        const alpha = this.life / this.maxLife;
        ctx.strokeStyle = this.color.replace("ALPHA", alpha.toFixed(2));
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, this.angle - this.arcWidth / 2, this.angle + this.arcWidth / 2);
        ctx.stroke();
    }
}
