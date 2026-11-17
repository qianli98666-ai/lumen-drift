// Particles, floating score text, shockwaves and the parallax starfield.
// Everything here is cosmetic: it makes hits feel physical without touching
// the simulation in the other modules.
import { clamp } from './random.js';

export function createStarfield(rng, width, height) {
  const layers = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const stars = [];
    const count = 46 - layer * 10;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: rng.range(0, width),
        y: rng.range(0, height),
        size: 0.6 + layer * 0.55 + rng.range(0, 0.7),
        twinkle: rng.range(0, Math.PI * 2),
        speed: 4 + layer * 9,
      });
    }
    layers.push(stars);
  }
  return {
    update(dt, driftX, driftY) {
      for (const stars of layers) {
        for (const star of stars) {
          star.x -= driftX * star.speed * dt * 0.12;
          star.y += driftY * star.speed * dt * 0.12 + star.speed * dt * 0.25;
          star.twinkle += dt * 2;
          if (star.y > height + 4) {
            star.y = -4;
            star.x = rng.range(0, width);
          }
          if (star.x < -4) star.x = width + 4;
          if (star.x > width + 4) star.x = -4;
        }
      }
    },
    draw(ctx, time) {
      for (let layer = 0; layer < layers.length; layer += 1) {
        for (const star of layers[layer]) {
          const alpha = 0.35 + 0.3 * Math.sin(time * 1.4 + star.twinkle) + layer * 0.18;
          ctx.globalAlpha = clamp(alpha, 0.12, 0.95);
          ctx.fillStyle = layer === 2 ? '#cfe6ff' : '#8fb4e8';
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

export function createEffects() {
  const particles = [];
  const texts = [];
  const rings = [];
  let shake = 0;

  function burst(x, y, color, count, speed, life = 0.6, size = 3) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: life * (0.6 + Math.random() * 0.6),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        drag: 0.92,
      });
    }
  }

  return {
    burst,
    addShake(amount) {
      shake = Math.min(14, shake + amount);
    },
    shakeOffset() {
      if (shake < 0.2) return { x: 0, y: 0 };
      return {
        x: (Math.random() * 2 - 1) * shake,
        y: (Math.random() * 2 - 1) * shake,
      };
    },
    explosion(x, y, color) {
      burst(x, y, color, 26, 260, 0.7, 3.4);
      burst(x, y, '#ffffff', 8, 140, 0.35, 2);
      rings.push({ x, y, radius: 6, maxRadius: 74, life: 0.45, maxLife: 0.45, color });
      this.addShake(7);
    },
    sparks(x, y, color) {
      burst(x, y, color, 7, 180, 0.35, 2.2);
    },
    trail(x, y, color) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 0.3, maxLife: 0.3,
        size: 2.4, color, drag: 0.9,
      });
    },
    floatText(x, y, text, color = '#ffe9a8') {
      texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
    },
    update(dt) {
      shake = Math.max(0, shake - dt * 26);
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const r = rings[i];
        r.life -= dt;
        r.radius = r.maxRadius * (1 - r.life / r.maxLife);
        if (r.life <= 0) rings.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of particles) {
        ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const r of rings) {
        ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1) * 0.8;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
      for (const t of texts) {
        ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      particles.length = 0;
      texts.length = 0;
      rings.length = 0;
      shake = 0;
    },
  };
}
