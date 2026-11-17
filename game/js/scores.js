// Best-score persistence. Local storage only, guarded so a blocked store
// (private mode, file:// quirks) never breaks the game.
const BEST_KEY = 'lumen-drift-best';

export function loadBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (raw === null) return { score: 0, wave: 0 };
    const parsed = JSON.parse(raw);
    if (typeof parsed?.score !== 'number') return { score: 0, wave: 0 };
    return { score: parsed.score, wave: parsed.wave ?? 0 };
  } catch {
    return { score: 0, wave: 0 };
  }
}

export function saveBest(score, wave) {
  const best = loadBest();
  if (score <= best.score) return best;
  const next = { score, wave };
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the run still counts, it just is not kept.
  }
  return next;
}

export function formatNumber(value) {
  return value.toLocaleString('en-US');
}
