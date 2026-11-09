// Random inputs in every room: the player never ends a frame inside a wall, numbers stay finite,
// echoes never exceed the room's cap, and no echo ever sits on the start cell or inside a wall.
const EC = require('../src/engine.js');
let frames = 0, lives = 0, wins = 0;
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
EC.LEVELS.forEach((d, li) => {
  const L = EC.parse(d);
  for (let seed = 1; seed <= 30; seed++) {
    const R = rng(seed * 97 + li), st = EC.newRun(L); let inp = { dir: 0, jump: false, echo: false };
    for (let f = 0; f < 6000 && !st.won; f++) {
      if (R() < 0.08) inp = { dir: [-1, 0, 1][Math.floor(R() * 3)], jump: R() < 0.5, echo: false };
      const ev = EC.step(L, st, { dir: inp.dir, jump: inp.jump, echo: R() < 0.002 });
      frames++; lives += ev.filter(e => e.type === 'spawn').length; if (st.won) wins++;
      if (![st.x, st.y, st.vy].every(Number.isFinite)) throw new Error('NaN in ' + d.name);
      if (st.echoes.length > L.cap) throw new Error('cap exceeded in ' + d.name);
      for (const e of st.echoes) { if (L.tiles[e.k] === 1 || (e.c === L.sx && e.r === L.sy)) throw new Error('bad echo cell in ' + d.name); }
      const c0 = Math.floor(st.x / 8), c1 = Math.floor((st.x + 5.999) / 8), r0 = Math.floor(st.y / 8), r1 = Math.floor((st.y + 6.999) / 8);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (r < 0 || r >= EC.H) continue;
        if (L.tiles[r * EC.W + c] === 1 || EC.echoAt(st, r * EC.W + c) >= 0) throw new Error(`inside a wall in ${d.name} at ${st.x.toFixed(2)},${st.y.toFixed(2)} frame ${f} seed ${seed}`);
      }
    }
  }
});
console.log('fuzz frames', frames, 'lives', lives, 'random wins', wins, 'no errors');
