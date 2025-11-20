export const damageNumbers = [];

export class DamageNumber {
    constructor(x, y, value, color = "#ff5555") {
        this.x = x;
        this.y = y;
        this.value = value;
        this.life = 1.0; // seconds
        this.maxLife = 1.0;
        this.color = color;
        this.floatSpeed = 30; // pixels per second
    }

    update(dt) {
        this.y -= this.floatSpeed * dt;
        this.life -= dt;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.font = "16px Arial";
        ctx.fillText(this.value, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }

    isAlive() {
        return this.life > 0;
    }
}

export function spawnDamageNumber(x, y, value, color = "#ff5555") {
    damageNumbers.push(new DamageNumber(x, y, value, color));
}

export function updateDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].update(dt);
        if (!damageNumbers[i].isAlive()) {
            damageNumbers.splice(i, 1);
        }
    }
}

export function drawDamageNumbers(ctx) {
    for (const dn of damageNumbers) {
        dn.draw(ctx);
    }
}
