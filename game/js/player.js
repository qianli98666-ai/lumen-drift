// The player's salvage skiff, the Kestrel: movement, dash, firing and hull.
// Upgrades from upgrades.js mutate the ship's stats; this module owns the
// per-frame behaviour of the ship itself.
import { clamp } from './random.js';

export const SHIP_BASE = {
  radius: 16,
  speed: 300,
  maxHull: 100,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 1,
  projectiles: 1,
  spread: 0.09,
  magnetRadius: 90,
  dashCooldown: 1.6,
  dashTime: 0.16,
  dashSpeed: 900,
};

export function createPlayer() {
  return {
    x: 640,
    y: 560,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: SHIP_BASE.radius,
    hull: SHIP_BASE.maxHull,
    maxHull: SHIP_BASE.maxHull,
    speed: SHIP_BASE.speed,
    fireInterval: SHIP_BASE.fireInterval,
    fireTimer: 0,
    bulletSpeed: SHIP_BASE.bulletSpeed,
    bulletDamage: SHIP_BASE.bulletDamage,
    projectiles: SHIP_BASE.projectiles,
    spread: SHIP_BASE.spread,
    magnetRadius: SHIP_BASE.magnetRadius,
    dashCooldown: SHIP_BASE.dashCooldown,
    dashTimer: 0,
    dashTimeLeft: 0,
    dashX: 0,
    dashY: 0,
    invulnerableUntil: 0,
    alive: true,
    thrust: 0,
  };
}

export function resetPlayer(player) {
  const fresh = createPlayer();
  Object.assign(player, fresh);
}

export function updatePlayer(player, input, dt, time, fireBullet) {
  if (!player.alive) return;
  const move = input.moveVector();
  player.thrust = Math.hypot(move.x, move.y) > 0.1 ? 1 : 0;

  // Dash: a short invulnerable burst in the movement (or aim) direction.
  if (player.dashTimeLeft > 0) {
    player.dashTimeLeft -= dt;
    player.x += player.dashX * player.dashSpeed * dt;
    player.y += player.dashY * player.dashSpeed * dt;
  } else {
    player.x += move.x * player.speed * dt;
    player.y += move.y * player.speed * dt;
  }
  player.x = clamp(player.x, 24, 1256);
  player.y = clamp(player.y, 24, 696);

  if (input.wasPressed('shift')) {
    if (player.dashTimer <= 0) {
      let dx = move.x;
      let dy = move.y;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(player.angle);
        dy = Math.sin(player.angle);
      }
      const len = Math.hypot(dx, dy) || 1;
      player.dashX = dx / len;
      player.dashY = dy / len;
      player.dashTimeLeft = SHIP_BASE.dashTime;
      player.dashTimer = player.dashCooldown;
      player.invulnerableUntil = time + 0.22;
      return 'dash';
    }
  }
  player.dashTimer = Math.max(0, player.dashTimer - dt);

  // Aim at the mouse; fire while held (or while Space is held).
  player.angle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);
  player.fireTimer -= dt;
  const firing = input.mouse.down || input.isDown(' ');
  if (firing && player.fireTimer <= 0) {
    player.fireTimer = player.fireInterval;
    fireBullet(player);
    return 'shoot';
  }
  return null;
}

export function damagePlayer(player, amount, time) {
  if (!player.alive || time < player.invulnerableUntil) return false;
  player.hull -= amount;
  player.invulnerableUntil = time + 0.7;
  if (player.hull <= 0) {
    player.hull = 0;
    player.alive = false;
  }
  return true;
}

export function repairPlayer(player, amount) {
  player.hull = clamp(player.hull + amount, 0, player.maxHull);
}
