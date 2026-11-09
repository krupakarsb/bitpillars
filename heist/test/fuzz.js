// Random moves in every heist for many minutes: you never stand inside a wall or a closed door, the clock never
// passes a minute, guards stay on floor tiles, and every loop ends by winning, being seen, or time running out.
const HE = require('../src/engine.js');
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let ticks = 0, loops = 0, caught = 0, wins = 0;
HE.HEISTS.forEach((d, i) => {
  const L = HE.parse(d);
  for (const r of L.routes) for (const p of r) if (L.tiles[p.y * HE.W + p.x] === 1) throw new Error('guard walks through a wall in ' + d.name);
  for (let seed = 1; seed <= 60; seed++) {
    const R = rng(seed * 13 + i); let run = { loop: 1, lastPath: null };
    for (let m = 0; m < 4; m++) {
      const st = HE.newLoop(L, run); let dir = -1;
      while (!st.over) {
        if (R() < 0.3) dir = R() < 0.2 ? -1 : Math.floor(R() * 4);
        HE.step(L, st, dir); ticks++;
        const t = L.tiles[st.y * HE.W + st.x];
        if (t === 1) throw new Error('inside a wall in ' + d.name);
        if (st.t > HE.LOOP) throw new Error('clock past a minute');
      }
      loops++; if (st.caught) caught++; if (st.won) wins++;
      run = { loop: run.loop + 1, lastPath: st.path };
    }
  }
});
console.log('fuzz ticks', ticks, 'minutes', loops, 'seen', caught, 'random wins', wins, 'no errors');
