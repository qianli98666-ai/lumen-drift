// Projectiles: the player's lumen bolts and the Warden's void orbs. Plain
// arrays with swap-remove updates; the game loop owns collision checks.
export function createProjectiles() {
  return {
    bolts: [],
    orbs: [],
    fireBolt(player) {
      const count = player.projectiles;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * player.spread;
        const angle = player.angle + offset;
        this.bolts.push({
          x: player.x + Math.cos(angle) * 22,
          y: player.y + Math.sin(angle) * 22,
          vx: Math.cos(angle) * player.bulletSpeed,
          vy: Math.sin(angle) * player.bulletSpeed,
          damage: player.bulletDamage,
          radius: 4,
          life: 1.1,
        });
      }
    },
    fireOrb(x, y, angle, speed = 170) {
      this.orbs.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: 12,
        radius: 8,
        life: 5,
      });
    },
    fireRadial(x, y, count, speed = 150) {
      for (let i = 0; i < count; i += 1) {
        this.fireOrb(x, y, (i / count) * Math.PI * 2, speed);
      }
    },
    update(dt, width, height) {
      for (let i = this.bolts.length - 1; i >= 0; i -= 1) {
        const b = this.bolts[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -20 || b.x > width + 20 || b.y < -20 || b.y > height + 20) {
          this.bolts.splice(i, 1);
        }
      }
      for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
        const o = this.orbs[i];
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.life -= dt;
        if (o.life <= 0 || o.x < -30 || o.x > width + 30 || o.y < -30 || o.y > height + 30) {
          this.orbs.splice(i, 1);
        }
      }
    },
    clear() {
      this.bolts.length = 0;
      this.orbs.length = 0;
    },
  };
}
