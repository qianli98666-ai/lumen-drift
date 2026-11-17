// Enemies of the debris field. Four kinds, each with its own movement and
// threat, plus the Warden that guards every fifth wave.
//   drifter — slow, relentless chaser; the backbone of every wave.
//   darter  — fast, telegraphs a lunge, then darts at the ship.
//   splitter — tough shell that breaks into two mites when destroyed.
//   mite    — tiny and quick, born from splitters.
//   warden  — a boss: huge hull, radial void-orbs, a health bar on the HUD.
import { clamp, distanceSquared } from './random.js';

export const ENEMY_TYPES = {
  drifter: { hp: 3, speed: 62, radius: 18, damage: 10, score: 50, shards: 2, color: '#ff7a6b' },
  darter: { hp: 2, speed: 150, radius: 13, damage: 8, score: 80, shards: 2, color: '#ffb454' },
  splitter: { hp: 5, speed: 46, radius: 24, damage: 14, score: 120, shards: 3, color: '#c792ff' },
  mite: { hp: 1, speed: 190, radius: 9, damage: 6, score: 30, shards: 1, color: '#ff9de2' },
  warden: { hp: 60, speed: 34, radius: 46, damage: 20, score: 1000, shards: 12, color: '#7ef0d4' },
};

export function spawnEnemy(list, kind, x, y, rng, hpScale = 1) {
  const base = ENEMY_TYPES[kind];
  const enemy = {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    speed: base.speed * rng.range(0.9, 1.15),
    radius: base.radius,
    damage: base.damage,
    score: base.score,
    shards: base.shards,
    color: base.color,
    flash: 0,
    wobble: rng.range(0, Math.PI * 2),
    lungeTimer: rng.range(0.8, 2.0),
    lunging: 0,
    shootTimer: rng.range(1.2, 2.4),
    touchCooldown: 0,
  };
  list.push(enemy);
  return enemy;
}

export function spawnEdgeEnemy(list, kind, rng, width, height, hpScale) {
  const side = rng.int(0, 3);
  let x;
  let y;
  if (side === 0) { x = rng.range(40, width - 40); y = -30; }
  else if (side === 1) { x = rng.range(40, width - 40); y = height + 30; }
  else if (side === 2) { x = -30; y = rng.range(40, height - 40); }
  else { x = width + 30; y = rng.range(40, height - 40); }
  return spawnEnemy(list, kind, x, y, rng, hpScale);
}

export function updateEnemies(list, player, dt, time, fireOrb) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const e = list[i];
    e.flash = Math.max(0, e.flash - dt * 5);
    e.touchCooldown = Math.max(0, e.touchCooldown - dt);
    e.wobble += dt * 2;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (e.kind === 'darter') {
      // Telegraph, then lunge: the wind-up flash warns the player.
      if (e.lunging > 0) {
        e.lunging -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else {
        e.lungeTimer -= dt;
        e.x += nx * e.speed * 0.45 * dt;
        e.y += ny * e.speed * 0.45 * dt;
        if (e.lungeTimer <= 0 && dist < 420) {
          e.lunging = 0.42;
          e.vx = nx * 460;
          e.vy = ny * 460;
          e.lungeTimer = 2.2;
        }
      }
    } else if (e.kind === 'warden') {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 560) {
        e.shootTimer = 2.6;
        fireOrb(e.x, e.y, 8, 150);
      }
    } else {
      // Drifters, splitters and mites chase with a slow sinusoidal wobble,
      // so their paths stay readable instead of perfectly straight.
      const wobbleX = Math.cos(e.wobble) * 0.35;
      const wobbleY = Math.sin(e.wobble) * 0.35;
      e.x += (nx + wobbleX * 0.4) * e.speed * dt;
      e.y += (ny + wobbleY * 0.4) * e.speed * dt;
    }

    e.x = clamp(e.x, -60, 1340);
    e.y = clamp(e.y, -60, 780);
  }
}

// A killed enemy pays out: score, shards, and mites for a splitter.
// Returns the shards dropped so the caller can spawn their pickups.
export function killEnemy(list, index) {
  const e = list[index];
  list.splice(index, 1);
  return e;
}

export function splitMites(list, enemy, rng) {
  const born = [];
  for (let i = 0; i < 2; i += 1) {
    const angle = rng.range(0, Math.PI * 2);
    born.push(spawnEnemy(
      list,
      'mite',
      enemy.x + Math.cos(angle) * 26,
      enemy.y + Math.sin(angle) * 26,
      rng,
      1,
    ));
  }
  return born;
}

export function nearestWarden(list) {
  return list.find((e) => e.kind === 'warden') ?? null;
}

export function countByKind(list) {
  const counts = { drifter: 0, darter: 0, splitter: 0, mite: 0, warden: 0 };
  for (const e of list) counts[e.kind] += 1;
  return counts;
}

export { distanceSquared };
