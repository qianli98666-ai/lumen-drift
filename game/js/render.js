// All canvas drawing for Lumen Drift: the ship, the enemies, the shards, the
// HUD and every screen. The palette is one coherent deep-space set — indigo
// field, cyan lumen, warm amber warnings — so a screenshot reads at a glance.
import { clamp } from './random.js';
import { formatNumber } from './scores.js';

const INK = '#dfe9ff';
const DIM = '#8fa8cc';
const CYAN = '#7ef0d4';
const AMBER = '#ffb454';
const ROSE = '#ff7a6b';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPanel(ctx, x, y, w, h, fill = 'rgba(8, 14, 30, 0.82)') {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(126, 240, 212, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawButton(ctx, x, y, w, h, label, sublabel) {
  drawPanel(ctx, x, y, w, h, 'rgba(20, 42, 74, 0.92)');
  ctx.fillStyle = INK;
  ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 - (sublabel ? 2 : -7));
  if (sublabel) {
    ctx.fillStyle = DIM;
    ctx.font = '400 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(sublabel, x + w / 2, y + h / 2 + 20);
  }
}

export function drawShip(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  const blink = time < player.invulnerableUntil && Math.floor(time * 14) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  // Engine glow.
  ctx.fillStyle = 'rgba(126, 240, 212, 0.5)';
  ctx.beginPath();
  ctx.moveTo(-14, 7);
  ctx.lineTo(-22 - Math.sin(time * 30) * 4, 0);
  ctx.lineTo(-14, -7);
  ctx.closePath();
  ctx.fill();
  // Hull: a swept salvage skiff.
  ctx.fillStyle = '#e8f2ff';
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-10, -13);
  ctx.lineTo(-16, -5);
  ctx.lineTo(-16, 5);
  ctx.lineTo(-10, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f6fb2';
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-6, -8);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
  // Cockpit lamp.
  ctx.fillStyle = CYAN;
  ctx.beginPath();
  ctx.arc(6, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const flash = enemy.flash > 0;
  const body = flash ? '#ffffff' : enemy.color;
  if (enemy.kind === 'drifter') {
    ctx.rotate(Math.sin(enemy.wobble) * 0.25);
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * enemy.radius;
      const py = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a0d12';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'darter') {
    const lunging = enemy.lunging > 0;
    ctx.rotate(Math.atan2(enemy.vy, enemy.vx) || 0);
    ctx.fillStyle = lunging ? '#ffe08a' : body;
    ctx.beginPath();
    ctx.moveTo(enemy.radius + 6, 0);
    ctx.lineTo(-enemy.radius * 0.7, -enemy.radius * 0.8);
    ctx.lineTo(-enemy.radius * 0.3, 0);
    ctx.lineTo(-enemy.radius * 0.7, enemy.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.kind === 'splitter') {
    ctx.rotate(time * 0.5);
    ctx.fillStyle = body;
    ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-enemy.radius * 0.5, -enemy.radius * 0.5, enemy.radius, enemy.radius);
    ctx.strokeStyle = '#241335';
    ctx.lineWidth = 2;
    ctx.strokeRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
  } else if (enemy.kind === 'mite') {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, -2, 2, 0, Math.PI * 2);
    ctx.arc(3, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'warden') {
    ctx.rotate(Math.sin(time * 0.8) * 0.08);
    ctx.strokeStyle = body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(126, 240, 212, 0.16)';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + time * 0.4;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * enemy.radius * 0.62, Math.sin(a) * enemy.radius * 0.62, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#0b2b26';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (enemy.hp < enemy.maxHp && enemy.kind !== 'mite') {
    const w = enemy.radius * 2;
    const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(5, 8, 18, 0.7)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
    ctx.fillStyle = ratio > 0.5 ? CYAN : ROSE;
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * ratio, 5);
  }
}

export function drawShards(ctx, shards, time) {
  for (const s of shards) {
    const pulse = 0.7 + 0.3 * Math.sin(time * 5 + s.phase);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#9ff5e2';
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 10;
    ctx.fillRect(-s.radius / 1.4, -s.radius / 1.4, s.radius * 1.4, s.radius * 1.4);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function drawBolts(ctx, bolts) {
  for (const b of bolts) {
    ctx.strokeStyle = '#bff3ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

export function drawOrbs(ctx, orbs, time) {
  for (const o of orbs) {
    ctx.fillStyle = '#b46bff';
    ctx.shadowColor = '#b46bff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius + Math.sin(time * 6) * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eadcff';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

export function drawHud(ctx, game) {
  const { player, score, combo, shards, wave, enemiesLeft } = game;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Hull bar.
  ctx.fillStyle = 'rgba(5, 8, 18, 0.6)';
  roundRect(ctx, 18, 16, 250, 46, 8);
  ctx.fill();
  ctx.fillStyle = DIM;
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HULL', 30, 34);
  const hullRatio = clamp(player.hull / player.maxHull, 0, 1);
  ctx.fillStyle = '#16263f';
  roundRect(ctx, 78, 24, 176, 14, 7);
  ctx.fill();
  ctx.fillStyle = hullRatio > 0.5 ? CYAN : hullRatio > 0.25 ? AMBER : ROSE;
  if (hullRatio > 0) {
    roundRect(ctx, 78, 24, 176 * hullRatio, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(player.hull)} / ${player.maxHull}`, 78, 56);
  // Dash readiness.
  const dashReady = player.dashTimer <= 0;
  ctx.fillStyle = dashReady ? CYAN : DIM;
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dashReady ? 'DASH READY  [Shift]' : `DASH ${player.dashTimer.toFixed(1)}s`, 30, 82);
  // Wave, centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${wave}`, 640, 38);
  ctx.fillStyle = DIM;
  ctx.font = '400 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(enemiesLeft > 0 ? `${enemiesLeft} hostiles remain` : 'field clear — choose an upgrade', 640, 58);
  // Score, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = '700 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(formatNumber(score), 1262, 40);
  ctx.fillStyle = combo > 1 ? AMBER : DIM;
  ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(combo > 1 ? `COMBO ×${combo}` : 'COMBO ×1', 1262, 60);
  ctx.fillStyle = CYAN;
  ctx.fillText(`◆ ${shards} lumen`, 1262, 80);
  // Warden health bar.
  const warden = game.warden;
  if (warden) {
    const w = 420;
    const x = 640 - w / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = ROSE;
    ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('THE WARDEN', 640, 96);
    ctx.fillStyle = '#16263f';
    roundRect(ctx, x, 104, w, 12, 6);
    ctx.fill();
    ctx.fillStyle = CYAN;
    roundRect(ctx, x, 104, w * clamp(warden.hp / warden.maxHp, 0, 1), 12, 6);
    ctx.fill();
  }
  // Bottom hint.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(143, 168, 204, 0.75)';
  ctx.font = '400 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WASD / arrows move · mouse aims · hold click or Space to fire · Shift dash · P pause · M mute', 640, 706);
}

function drawTitleScreen(ctx, game, time) {
  ctx.fillStyle = 'rgba(4, 7, 15, 0.45)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  const bob = Math.sin(time * 1.2) * 6;
  ctx.fillStyle = CYAN;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('A  S A L V A G E   R U N   A M O N G   T H E   S T A R S', 640, 148 + bob);
  ctx.fillStyle = INK;
  ctx.font = '700 92px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(126, 240, 212, 0.55)';
  ctx.shadowBlur = 34;
  ctx.fillText('LUMEN DRIFT', 640, 248 + bob);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '400 21px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Pilot the skiff Kestrel. Gather the lumen. Outlast the field.', 640, 292 + bob);
  drawPanel(ctx, 390, 330, 500, 118, 'rgba(8, 14, 30, 0.78)');
  ctx.fillStyle = INK;
  ctx.font = '400 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Collect lumen shards from fallen foes — they are your score', 640, 362);
  ctx.fillText('and your combo. Clear a wave, choose 1 of 3 upgrades.', 640, 388);
  ctx.fillText('Survive all 10 waves and the Wardens to clear the sector.', 640, 414);
  const pulse = 0.65 + 0.35 * Math.sin(time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO LAUNCH', 640, 506);
  ctx.globalAlpha = 1;
  ctx.fillStyle = DIM;
  ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move      Mouse — aim      Hold click / Space — fire      Shift — dash', 640, 548);
  ctx.fillText('P — pause      M — mute sound', 640, 574);
  if (game.best.score > 0) {
    ctx.fillStyle = AMBER;
    ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST  ${formatNumber(game.best.score)}  ·  WAVE ${game.best.wave}`, 640, 622);
  }
}

function drawUpgradeScreen(ctx, game) {
  ctx.fillStyle = 'rgba(4, 7, 15, 0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = CYAN;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${game.wave} CLEARED`, 640, 108);
  ctx.fillStyle = INK;
  ctx.font = '700 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Choose an upgrade', 640, 162);
  ctx.fillStyle = DIM;
  ctx.font = '400 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('One card. The run bends around it. Press 1, 2 or 3 — or click a card.', 640, 196);
  const cardW = 300;
  const cardH = 250;
  const gap = 28;
  const total = cardW * 3 + gap * 2;
  const startX = 640 - total / 2;
  game.upgradeCards = [];
  game.upgradeChoices.forEach((upgrade, i) => {
    const x = startX + i * (cardW + gap);
    const y = 240;
    const hovered = game.input.mouse.x >= x && game.input.mouse.x <= x + cardW
      && game.input.mouse.y >= y && game.input.mouse.y <= y + cardH;
    drawPanel(ctx, x, y, cardW, cardH, hovered ? 'rgba(24, 52, 88, 0.95)' : 'rgba(8, 14, 30, 0.88)');
    if (hovered) {
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2.5;
      roundRect(ctx, x, y, cardW, cardH, 14);
      ctx.stroke();
    }
    game.upgradeCards.push({ x, y, w: cardW, h: cardH, index: i });
    ctx.fillStyle = AMBER;
    ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, x + cardW / 2, y + 36);
    ctx.fillStyle = CYAN;
    ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(upgrade.icon, x + cardW / 2, y + 92);
    ctx.fillStyle = INK;
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(upgrade.name, x + cardW / 2, y + 134);
    ctx.fillStyle = DIM;
    ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
    const words = upgrade.blurb.split(' ');
    const lines = [''];
    for (const word of words) {
      const test = lines[lines.length - 1] === '' ? word : `${lines[lines.length - 1]} ${word}`;
      if (test.length > 30) lines.push(word);
      else lines[lines.length - 1] = test;
    }
    lines.slice(0, 3).forEach((line, li) => {
      ctx.fillText(line, x + cardW / 2, y + 168 + li * 22);
    });
  });
  ctx.fillStyle = DIM;
  ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Score ${formatNumber(game.score)}   ·   ${game.shards} lumen banked   ·   Hull ${Math.ceil(game.player.hull)}/${game.player.maxHull}`, 640, 548);
}

function drawEndScreen(ctx, game, victory) {
  ctx.fillStyle = victory ? 'rgba(6, 20, 16, 0.6)' : 'rgba(18, 6, 10, 0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = victory ? CYAN : ROSE;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(victory ? 'A L L   1 0   W A V E S   C L E A R E D' : 'T H E   K E S T R E L   I S   L O S T', 640, 132);
  ctx.fillStyle = INK;
  ctx.font = '700 64px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(victory ? 'SECTOR CLEARED!' : 'RUN OVER', 640, 208);
  ctx.fillStyle = DIM;
  ctx.font = '400 19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(
    victory
      ? 'The field is quiet. The lumen is yours — and the drift goes on.'
      : 'The debris field keeps your lumen. The Kestrel can fly again.',
    640,
    246,
  );
  drawPanel(ctx, 440, 290, 400, 210, 'rgba(8, 14, 30, 0.85)');
  const rows = [
    ['FINAL SCORE', formatNumber(game.score)],
    ['WAVES CLEARED', String(game.waveCleared)],
    ['LUMEN GATHERED', String(game.shards)],
    ['SHOTS FIRED', String(game.shotsFired)],
    ['ACCURACY', game.shotsFired > 0 ? `${Math.round((game.shotsHit / game.shotsFired) * 100)}%` : '—'],
  ];
  rows.forEach(([label, value], i) => {
    const y = 330 + i * 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = DIM;
    ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(label, 470, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = INK;
    ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(value, 810, y);
  });
  ctx.textAlign = 'center';
  if (game.newBest) {
    ctx.fillStyle = AMBER;
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('★ NEW BEST SCORE ★', 640, 540);
  } else if (game.best.score > 0) {
    ctx.fillStyle = DIM;
    ctx.font = '400 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Best score ${formatNumber(game.best.score)} · wave ${game.best.wave}`, 640, 540);
  }
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', 640, 592);
  ctx.globalAlpha = 1;
  if (victory) {
    ctx.fillStyle = DIM;
    ctx.font = '400 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('or press C to keep drifting — endless waves, no more Wardens to fear', 640, 624);
  }
}

function drawPausedScreen(ctx, game) {
  ctx.fillStyle = 'rgba(4, 7, 15, 0.6)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '700 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', 640, 330);
  ctx.fillStyle = DIM;
  ctx.font = '400 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press P or Esc to resume · R to restart the run', 640, 372);
  drawButton(ctx, 520, 410, 240, 54, 'RESUME', 'P / Esc / click');
}

export function drawScene(ctx, game) {
  const { state, time } = game;
  if (state === 'title') drawTitleScreen(ctx, game, time);
  else if (state === 'upgrade') drawUpgradeScreen(ctx, game);
  else if (state === 'over') drawEndScreen(ctx, game, game.victory);
  else if (state === 'paused') drawPausedScreen(ctx, game);
}
