// Wave director: what each wave throws at the player, and how the pressure
// grows. Waves 5 and 10 are guarded by a Warden; wave 10 cleared is the
// sector victory, after which the field goes endless.
import { spawnEdgeEnemy } from './enemies.js';

export function waveIsBoss(wave) {
  return wave % 5 === 0;
}

export function waveComposition(wave, rng) {
  // A spawn queue of enemy kinds, shuffled, with a boss first on boss waves.
  const queue = [];
  const budget = 5 + wave * 3;
  let remaining = budget;
  const weights = [
    ['drifter', 10],
    ['darter', 3 + wave],
    ['splitter', 1 + Math.floor(wave / 2)],
  ];
  if (waveIsBoss(wave)) queue.push('warden');
  while (remaining > 0) {
    let total = 0;
    for (const [, weight] of weights) total += weight;
    let roll = rng.next() * total;
    let picked = 'drifter';
    for (const [kind, weight] of weights) {
      roll -= weight;
      if (roll <= 0) {
        picked = kind;
        break;
      }
    }
    queue.push(picked);
    remaining -= 1;
  }
  // Shuffle the tail (never the boss, which leads the wave).
  const head = waveIsBoss(wave) ? queue.slice(0, 1) : [];
  const tail = waveIsBoss(wave) ? queue.slice(1) : queue;
  for (let i = tail.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [tail[i], tail[j]] = [tail[j], tail[i]];
  }
  return [...head, ...tail];
}

export function createWaveDirector(rng, width, height) {
  return {
    queue: [],
    spawnTimer: 0,
    spawnInterval: 0.9,
    remainingToSpawn: 0,
    hpScale: 1,
    startWave(wave) {
      this.queue = waveComposition(wave, rng);
      this.remainingToSpawn = this.queue.length;
      this.spawnTimer = 0.4;
      this.spawnInterval = Math.max(0.35, 0.95 - wave * 0.04);
      this.hpScale = 1 + (wave - 1) * 0.12;
    },
    update(dt, enemies) {
      if (this.remainingToSpawn <= 0) return;
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.spawnInterval;
        const kind = this.queue[this.queue.length - this.remainingToSpawn];
        this.remainingToSpawn -= 1;
        spawnEdgeEnemy(enemies, kind, rng, width, height, this.hpScale);
      }
    },
    get done() {
      return this.remainingToSpawn <= 0;
    },
  };
}
