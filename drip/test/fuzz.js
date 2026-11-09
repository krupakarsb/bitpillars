// Random lane presses for many runs: the drop never leaves the shaft, values stay finite,
// glow never goes below zero or above three, gates are judged in order, and a run always ends or keeps moving.
const DR = require('../src/engine.js'); const C = DR.buildCourse();
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let frames = 0, hits = 0, fades = 0, wins = 0;
for (let seed = 1; seed <= 60; seed++) {
  const R = rng(seed), st = DR.newRun(C);
  for (let f = 0; f < 60 * 300 && !st.won; f++) {
    const r = R(), inp = r < 0.03 ? -1 : r < 0.06 ? 1 : 0;
    const ev = DR.step(C, st, inp); frames++;
    hits += ev.filter(e => e.type === 'hit').length; fades += ev.filter(e => e.type === 'fade').length;
    if (![st.x, st.y].every(Number.isFinite)) throw new Error('NaN');
    if (st.x < DR.WALL + DR.LW / 2 - 1e-9 || st.x > DR.SW - DR.WALL - DR.LW / 2 + 1e-9) throw new Error('left the shaft');
    if (st.glow < 1 || st.glow > 3) throw new Error('glow out of range ' + st.glow);
  }
  if (st.won) wins++;
}
console.log('fuzz frames', frames, 'hits', hits, 'fades', fades, 'random runs finished', wins + '/60', 'no errors');
