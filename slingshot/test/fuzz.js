// Random tapping in every garden: values stay finite, the seed always ends up either orbiting at a sane distance or
// flying at constant speed, blooms never un-bloom, and drifting always puts you back on a planet you had reached.
const SG = require('../src/engine.js');
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let frames = 0, taps = 0, wins = 0, drifts = 0;
SG.LEVELS.forEach((d, li) => {
  const L = SG.build(d);
  for (let seed = 1; seed <= 40; seed++) {
    const R = rng(seed * 31 + li), st = SG.newState(L); let bloomed = 1;
    for (let f = 0; f < 8000 && !(st.won && !L.finale) && !st.letgo; f++) {
      const ev = SG.step(L, st, st.mode === 'orbit' && R() < 0.02);
      frames++; if (ev.some(e => e.type === 'release')) taps++; if (ev.some(e => e.type === 'drift')) drifts++;
      if (![st.x, st.y, st.ang, st.d].every(Number.isFinite)) throw new Error('NaN in ' + d.name);
      const nb = st.bloom.filter(Boolean).length; if (nb < bloomed) throw new Error('un-bloomed in ' + d.name); bloomed = nb;
      if (st.mode === 'orbit') { const p = L.planets[st.p], dd = Math.hypot(st.x - p.x, st.y - p.y);
        if (Math.abs(dd - st.d) > 1e-6 || st.d < p.r + 5.99 || st.d > p.cap + 1e-6 || !st.bloom[st.p]) throw new Error('bad orbit in ' + d.name); }
      else if (Math.abs(Math.hypot(st.vx, st.vy) - SG.SPEED) > 1e-9) throw new Error('bad speed in ' + d.name);
    }
    if (st.won || st.letgo) wins++;
  }
});
console.log('fuzz frames', frames, 'taps', taps, 'drifts', drifts, 'random clears', wins, 'no errors');
