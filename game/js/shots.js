// Deterministic demo scenes for screenshots (?shot=title|play|upgrade|
// victory|over&seed=N). They are real renders of the game's own code: the
// scene builder drives the same spawn, combat and render paths as play,
// then freezes the simulation so a capture is stable. This mirrors the
// starter's shots.json pattern (?shot=start&seed=1).
import { makeRng } from './random.js';
import { spawnEnemy } from './enemies.js';
import { rollUpgrades } from './upgrades.js';

function scatterShards(game, count, cx, cy) {
  const rng = game.rng;
  for (let i = 0; i < count; i += 1) {
    game.shardPickups.push({
      x: cx + rng.range(-260, 260),
      y: cy + rng.range(-180, 180),
      vx: rng.range(-30, 30),
      vy: rng.range(-30, 30),
      radius: 7,
      phase: rng.range(0, Math.PI * 2),
      value: 1,
    });
  }
}

function stageBattle(game, wave) {
  // A busy mid-wave tableau: the ship firing, three enemy kinds closing in,
  // bolts in flight, shards on the field, a fresh explosion.
  const rng = game.rng;
  game.wave = wave;
  game.score = 12450 + wave * 1300;
  game.shards = 46;
  game.combo = 3;
  game.comboTimer = 3.2;
  game.player.x = 620;
  game.player.y = 430;
  game.player.angle = -0.5;
  game.player.hull = 78;
  game.player.fireTimer = 0;
  const spots = [
    ['drifter', 880, 240],
    ['drifter', 420, 180],
    ['darter', 1010, 420],
    ['splitter', 300, 330],
    ['darter', 760, 130],
    ['drifter', 1050, 600],
    ['splitter', 180, 560],
    ['mite', 940, 520],
  ];
  for (const [kind, x, y] of spots) spawnEnemy(game.enemies, kind, x, y, rng, 1 + (wave - 1) * 0.12);
  for (let i = 0; i < 5; i += 1) {
    const angle = -0.5 + (i - 2) * 0.09;
    game.projectiles.bolts.push({
      x: 640 + Math.cos(angle) * (60 + i * 46),
      y: 420 + Math.sin(angle) * (60 + i * 46),
      vx: Math.cos(angle) * 640,
      vy: Math.sin(angle) * 640,
      damage: 1,
      radius: 4,
      life: 1.1,
    });
  }
  scatterShards(game, 9, 700, 420);
  game.effects.explosion(880, 240, '#ff7a6b');
  game.effects.floatText(880, 210, '+150', '#ffe9a8');
  game.effects.floatText(640, 380, 'COMBO ×3', '#ffb454');
}

export function buildShotScene(game, scene, seed) {
  game.rng = makeRng(seed);
  game.enemies.length = 0;
  game.shardPickups.length = 0;
  game.projectiles.clear();
  game.effects.clear();
  game.upgradeChoices = [];
  game.upgradeCards = [];
  game.state = scene === 'title' ? 'title' : scene === 'play' ? 'playing' : scene === 'upgrade' ? 'upgrade' : 'over';
  game.victory = scene === 'victory';
  game.frozen = true;

  if (scene === 'title') {
    game.best = { score: 48250, wave: 7 };
    game.player.x = 640;
    game.player.y = 620;
    game.player.angle = -Math.PI / 2;
    spawnEnemy(game.enemies, 'drifter', 220, 220, game.rng, 1);
    spawnEnemy(game.enemies, 'darter', 1060, 260, game.rng, 1);
    spawnEnemy(game.enemies, 'splitter', 980, 560, game.rng, 1);
    scatterShards(game, 6, 640, 420);
  } else if (scene === 'play') {
    stageBattle(game, 3);
  } else if (scene === 'upgrade') {
    game.upgradeChoices = rollUpgrades(game.rng, 3);
    stageBattle(game, 4);
    // stageBattle stages the tableau; the display numbers are set after it
    // so they are the ones the capture shows.
    game.wave = 4;
    game.score = 18200;
    game.shards = 52;
    game.player.hull = 64;
    game.state = 'upgrade';
    game.enemies.length = 0;
    game.projectiles.clear();
    game.effects.clear();
  } else if (scene === 'victory' || scene === 'over') {
    stageBattle(game, scene === 'victory' ? 10 : 6);
    game.wave = scene === 'victory' ? 10 : 6;
    game.waveCleared = scene === 'victory' ? 10 : 5;
    game.score = scene === 'victory' ? 96400 : 21350;
    game.shards = scene === 'victory' ? 318 : 96;
    game.shotsFired = scene === 'victory' ? 1840 : 640;
    game.shotsHit = scene === 'victory' ? 1196 : 352;
    game.newBest = scene === 'victory';
    game.best = { score: scene === 'victory' ? 96400 : 48250, wave: scene === 'victory' ? 10 : 7 };
    game.state = 'over';
  }
  return game;
}

export const SHOT_SCENES = ['title', 'play', 'upgrade', 'victory', 'over'];
