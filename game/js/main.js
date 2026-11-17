// Lumen Drift — entry point and game loop. Owns the state machine (title,
// playing, upgrade, paused, over), the collisions, the combo and the wave
// flow; the other modules own one job each (see render.js, enemies.js,
// waves.js, upgrades.js, player.js, projectiles.js, particles.js, audio.js).
import { clamp, distanceSquared, hashSeed, makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createStarfield, createEffects } from './particles.js';
import { createPlayer, resetPlayer, updatePlayer, damagePlayer } from './player.js';
import { createProjectiles } from './projectiles.js';
import { updateEnemies, killEnemy, splitMites, nearestWarden } from './enemies.js';
import { createWaveDirector, waveIsBoss } from './waves.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import { loadBest, saveBest } from './scores.js';
import { drawShip, drawEnemy, drawShards, drawBolts, drawOrbs, drawHud, drawScene } from './render.js';
import { buildShotScene } from './shots.js';

const WIDTH = 1280;
const HEIGHT = 720;
const FINAL_WAVE = 10;
const COMBO_WINDOW = 4;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  state: 'title',
  time: 0,
  rng: makeRng((Date.now() ^ 0x9e3779b9) >>> 0),
  input: createInput(canvas),
  audio: createAudio(),
  player: createPlayer(),
  projectiles: createProjectiles(),
  enemies: [],
  shardPickups: [],
  director: null,
  effects: createEffects(),
  starfield: null,
  score: 0,
  combo: 1,
  comboChain: 0,
  comboTimer: 0,
  shards: 0,
  wave: 0,
  waveCleared: 0,
  shotsFired: 0,
  shotsHit: 0,
  best: loadBest(),
  newBest: false,
  victory: false,
  endless: false,
  frozen: false,
  upgradeChoices: [],
  upgradeCards: [],
  get enemiesLeft() {
    return this.enemies.length + (this.director ? this.director.remainingToSpawn : 0);
  },
  get warden() {
    return nearestWarden(this.enemies);
  },
};

game.starfield = createStarfield(game.rng, WIDTH, HEIGHT);
game.director = createWaveDirector(game.rng, WIDTH, HEIGHT);

function dropShards(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = game.rng.range(0, Math.PI * 2);
    const speed = game.rng.range(40, 130);
    game.shardPickups.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7,
      phase: game.rng.range(0, Math.PI * 2),
      value: 1,
    });
  }
}

function addScore(base) {
  game.score += base * game.combo;
}

function bumpCombo() {
  game.comboChain += 1;
  game.comboTimer = COMBO_WINDOW;
  game.combo = clamp(1 + Math.floor(game.comboChain / 6), 1, 5);
}

function startRun() {
  resetPlayer(game.player);
  game.projectiles.clear();
  game.enemies.length = 0;
  game.shardPickups.length = 0;
  game.effects.clear();
  game.score = 0;
  game.combo = 1;
  game.comboChain = 0;
  game.comboTimer = 0;
  game.shards = 0;
  game.wave = 0;
  game.waveCleared = 0;
  game.shotsFired = 0;
  game.shotsHit = 0;
  game.newBest = false;
  game.victory = false;
  game.endless = false;
  game.frozen = false;
  game.upgradeChoices = [];
  startWave(1);
  game.state = 'playing';
  game.audio.unlock();
}

function startWave(wave) {
  game.wave = wave;
  game.director.startWave(wave);
}

function clearWave() {
  game.waveCleared = game.wave;
  game.audio.waveClear();
  if (game.wave >= FINAL_WAVE && !game.endless) {
    endRun(true);
    return;
  }
  game.upgradeChoices = rollUpgrades(game.rng, 3);
  game.state = 'upgrade';
}

function endRun(victory) {
  game.victory = victory;
  game.state = 'over';
  const saved = saveBest(game.score, game.waveCleared);
  game.newBest = saved.score === game.score && game.score > 0;
  game.best = saved;
  if (victory) game.audio.victory();
  else game.audio.gameOver();
}

function chooseUpgrade(index) {
  const upgrade = game.upgradeChoices[index];
  if (!upgrade) return;
  applyUpgrade(game.player, upgrade);
  game.audio.upgrade();
  game.effects.floatText(game.player.x, game.player.y - 30, upgrade.name, '#7ef0d4');
  game.upgradeChoices = [];
  startWave(game.wave + 1);
  game.state = 'playing';
}

function firePlayerBolt(player) {
  game.shotsFired += 1;
  game.projectiles.fireBolt(player);
  game.audio.shoot();
}

function updateShards(dt) {
  const player = game.player;
  for (let i = game.shardPickups.length - 1; i >= 0; i -= 1) {
    const s = game.shardPickups[i];
    const distSq = distanceSquared(s.x, s.y, player.x, player.y);
    if (distSq < player.magnetRadius * player.magnetRadius) {
      const dist = Math.sqrt(distSq) || 1;
      const pull = 520 * (1 - dist / (player.magnetRadius * 1.6));
      s.vx += ((player.x - s.x) / dist) * pull * dt * 4;
      s.vy += ((player.y - s.y) / dist) * pull * dt * 4;
    } else {
      s.vx *= 0.96;
      s.vy *= 0.96;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (distSq < 30 * 30) {
      game.shardPickups.splice(i, 1);
      game.shards += s.value;
      addScore(10);
      bumpCombo();
      game.audio.pickup();
      game.effects.sparks(player.x, player.y, '#7ef0d4');
    }
  }
}

function updateCollisions(dt) {
  const player = game.player;
  // Bolts vs enemies.
  const bolts = game.projectiles.bolts;
  for (let bi = bolts.length - 1; bi >= 0; bi -= 1) {
    const bolt = bolts[bi];
    let consumed = false;
    for (let ei = game.enemies.length - 1; ei >= 0; ei -= 1) {
      const enemy = game.enemies[ei];
      const rr = enemy.radius + bolt.radius;
      if (distanceSquared(bolt.x, bolt.y, enemy.x, enemy.y) < rr * rr) {
        consumed = true;
        game.shotsHit += 1;
        enemy.hp -= bolt.damage;
        enemy.flash = 1;
        game.effects.sparks(bolt.x, bolt.y, '#bff3ff');
        game.audio.hit();
        if (enemy.hp <= 0) {
          const dead = killEnemy(game.enemies, ei);
          addScore(dead.score);
          bumpCombo();
          dropShards(dead.x, dead.y, dead.shards);
          game.effects.explosion(dead.x, dead.y, dead.color);
          game.effects.floatText(dead.x, dead.y - 18, `+${dead.score * game.combo}`, '#ffe9a8');
          game.audio.explode();
          if (dead.kind === 'splitter') splitMites(game.enemies, dead, game.rng);
        }
        break;
      }
    }
    if (consumed) bolts.splice(bi, 1);
  }
  // Enemies vs the ship.
  for (const enemy of game.enemies) {
    const rr = enemy.radius + player.radius - 4;
    if (enemy.touchCooldown <= 0 && distanceSquared(enemy.x, enemy.y, player.x, player.y) < rr * rr) {
      enemy.touchCooldown = 0.9;
      if (damagePlayer(player, enemy.damage, game.time)) {
        game.audio.hurt();
        game.effects.addShake(9);
        game.effects.burst(player.x, player.y, '#ff7a6b', 14, 220, 0.5, 3);
        game.combo = 1;
        game.comboChain = 0;
        if (!player.alive) {
          game.effects.explosion(player.x, player.y, '#e8f2ff');
          endRun(false);
          return;
        }
      }
    }
  }
  // Void orbs vs the ship.
  const orbs = game.projectiles.orbs;
  for (let i = orbs.length - 1; i >= 0; i -= 1) {
    const orb = orbs[i];
    const rr = orb.radius + player.radius - 4;
    if (distanceSquared(orb.x, orb.y, player.x, player.y) < rr * rr) {
      orbs.splice(i, 1);
      if (damagePlayer(player, orb.damage, game.time)) {
        game.audio.hurt();
        game.effects.addShake(8);
        if (!player.alive) {
          game.effects.explosion(player.x, player.y, '#e8f2ff');
          endRun(false);
          return;
        }
      }
    }
  }
}

function updatePlaying(dt) {
  const action = updatePlayer(game.player, game.input, dt, game.time, firePlayerBolt);
  if (action === 'dash') {
    game.audio.dash();
    game.effects.burst(game.player.x, game.player.y, '#7ef0d4', 8, 120, 0.35, 2.4);
  }
  game.director.update(dt, game.enemies);
  updateEnemies(game.enemies, game.player, dt, game.time, (x, y, count, speed) => {
    game.projectiles.fireRadial(x, y, count, speed);
  });
  game.projectiles.update(dt, WIDTH, HEIGHT);
  updateShards(dt);
  updateCollisions(dt);
  if (game.state !== 'playing') return;

  // Combo decay.
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) {
      game.combo = 1;
      game.comboChain = 0;
    }
  }
  // Engine trail.
  if (game.player.thrust > 0 && Math.random() < 0.6) {
    const back = game.player.angle + Math.PI;
    game.effects.trail(
      game.player.x + Math.cos(back) * 18,
      game.player.y + Math.sin(back) * 18,
      '#2f6fb2',
    );
  }
  // Wave clear: nothing left to spawn and nothing left alive.
  if (game.director.done && game.enemies.length === 0) clearWave();
}

function handleGlobalKeys() {
  const input = game.input;
  if (input.wasPressed('m')) game.audio.toggleMute();
  if (game.state === 'title') {
    if (input.wasPressed('enter') || input.mouse.clicked) {
      game.audio.unlock();
      startRun();
    }
  } else if (game.state === 'playing') {
    if (input.wasPressed('p') || input.wasPressed('escape')) game.state = 'paused';
    if (input.wasPressed('r')) startRun();
  } else if (game.state === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('escape') || input.mouse.clicked) game.state = 'playing';
    if (input.wasPressed('r')) startRun();
  } else if (game.state === 'upgrade') {
    if (input.wasPressed('1')) chooseUpgrade(0);
    else if (input.wasPressed('2')) chooseUpgrade(1);
    else if (input.wasPressed('3')) chooseUpgrade(2);
    else if (input.mouse.clicked) {
      for (const card of game.upgradeCards) {
        if (game.input.mouse.x >= card.x && game.input.mouse.x <= card.x + card.w
          && game.input.mouse.y >= card.y && game.input.mouse.y <= card.y + card.h) {
          chooseUpgrade(card.index);
          break;
        }
      }
    }
  } else if (game.state === 'over') {
    if (input.wasPressed('r') || input.mouse.clicked) startRun();
    else if (input.wasPressed('c') && game.victory) {
      game.endless = true;
      game.victory = false;
      startWave(game.wave + 1);
      game.state = 'playing';
    }
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  // Deep-space backdrop.
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#070b16');
  gradient.addColorStop(0.55, '#0a1124');
  gradient.addColorStop(1, '#0d0a24');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const offset = game.effects.shakeOffset();
  ctx.translate(offset.x, offset.y);
  game.starfield.draw(ctx, game.time);
  // A faint nebula wash so the field never reads as flat black.
  ctx.fillStyle = 'rgba(64, 90, 180, 0.07)';
  ctx.beginPath();
  ctx.ellipse(980, 180, 320, 150, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 90, 160, 0.05)';
  ctx.beginPath();
  ctx.ellipse(220, 560, 300, 140, 0.3, 0, Math.PI * 2);
  ctx.fill();

  if (game.state === 'playing' || game.state === 'paused' || game.state === 'upgrade' || game.state === 'over') {
    drawShards(ctx, game.shardPickups, game.time);
    drawBolts(ctx, game.projectiles.bolts);
    drawOrbs(ctx, game.projectiles.orbs, game.time);
    for (const enemy of game.enemies) drawEnemy(ctx, enemy, game.time);
    if (game.player.alive && game.state !== 'over') drawShip(ctx, game.player, game.time);
    game.effects.draw(ctx);
    if (game.state === 'playing' || game.state === 'paused') drawHud(ctx, game);
  } else {
    // Title: the ship idles over the field with a few drifters for depth.
    for (const enemy of game.enemies) drawEnemy(ctx, enemy, game.time);
    drawShards(ctx, game.shardPickups, game.time);
    drawShip(ctx, game.player, game.time);
    game.effects.draw(ctx);
  }
  drawScene(ctx, game);
  ctx.restore();
}

let last = performance.now();

function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  game.time += dt;
  if (!game.frozen) {
    handleGlobalKeys();
    if (game.state === 'playing') updatePlaying(dt);
    else if (game.state === 'title') {
      // Idle drift: the field breathes behind the title.
      game.player.y = 620 + Math.sin(game.time * 0.8) * 8;
    }
    game.effects.update(dt);
    game.starfield.update(dt, 0.2, 0.1);
  }
  draw();
  game.input.endFrame();
  requestAnimationFrame(frame);
}

// Screenshot scenes (?shot=title|play|upgrade|victory|over&seed=N): build the
// tableau, simulate a short fixed stretch so bolts and particles sit
// naturally, then freeze — the capture is a stable real render.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seed = Number(params.get('seed') ?? '7') || 7;
  game.rng = makeRng(hashSeed(`lumen-drift:${shot}:${seed}`));
  game.starfield = createStarfield(game.rng, WIDTH, HEIGHT);
  game.director = createWaveDirector(game.rng, WIDTH, HEIGHT);
  buildShotScene(game, shot, seed);
  for (let step = 0; step < 40; step += 1) {
    game.time += 1 / 60;
    game.effects.update(1 / 60);
    game.starfield.update(1 / 60, 0.2, 0.1);
  }
  document.title = `Lumen Drift — ${shot}`;
}

window.__lumenDrift = game;
requestAnimationFrame(frame);
