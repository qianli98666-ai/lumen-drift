// Between-wave upgrades: the choice that matters. Clearing a wave offers
// three cards; the player takes one (keys 1-3 or a click) and the run bends
// around it. Each card names its effect in plain words on the card itself.
import { clamp } from './random.js';

export const UPGRADE_POOL = [
  {
    id: 'rapid-coils',
    name: 'Rapid Coils',
    icon: '»»',
    blurb: 'Fire 22% faster. Hold the trigger and paint the dark.',
    apply(player) { player.fireInterval = Math.max(0.06, player.fireInterval * 0.78); },
  },
  {
    id: 'twin-barrels',
    name: 'Twin Barrels',
    icon: '||',
    blurb: '+1 bolt per shot, fanned wider. More lead, more lumen.',
    apply(player) { player.projectiles = Math.min(5, player.projectiles + 1); player.spread = Math.min(0.22, player.spread + 0.03); },
  },
  {
    id: 'heavy-rounds',
    name: 'Heavy Rounds',
    icon: '◆',
    blurb: '+1 damage per bolt. Drifters fall in two hits, not three.',
    apply(player) { player.bulletDamage += 1; },
  },
  {
    id: 'aegis-plating',
    name: 'Aegis Plating',
    icon: '▣',
    blurb: '+25 max hull and repair 25 now. A second skin for the Kestrel.',
    apply(player) { player.maxHull += 25; player.hull = clamp(player.hull + 25, 0, player.maxHull); },
  },
  {
    id: 'ion-dash',
    name: 'Ion Dash',
    icon: '↯',
    blurb: 'Dash recharges 35% faster. Slip through the swarm.',
    apply(player) { player.dashCooldown = Math.max(0.6, player.dashCooldown * 0.65); },
  },
  {
    id: 'magnet-array',
    name: 'Magnet Array',
    icon: '◎',
    blurb: 'Pickup radius +70%. Shards fly to you from across the field.',
    apply(player) { player.magnetRadius += 70; },
  },
  {
    id: 'swift-thrusters',
    name: 'Swift Thrusters',
    icon: '»',
    blurb: '+14% flight speed. Outrun the darters, circle the Wardens.',
    apply(player) { player.speed *= 1.14; },
  },
  {
    id: 'overcharge',
    name: 'Overcharge',
    icon: '✦',
    blurb: 'Bolts fly 30% faster and the trigger answers 10% sooner.',
    apply(player) { player.bulletSpeed *= 1.3; player.fireInterval = Math.max(0.06, player.fireInterval * 0.9); },
  },
];

export function rollUpgrades(rng, count = 3) {
  const pool = [...UPGRADE_POOL];
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(player, upgrade) {
  upgrade.apply(player);
}
