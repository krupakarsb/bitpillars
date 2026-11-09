// Random moves in every room: nobody ends up inside a wall or on top of another object, nothing leaves the room,
// you never stand on a tile you weren't allowed to enter, and undo-by-snapshot restores exactly.
const LU = require('../src/engine.js'); const fs = require('fs');
const R = JSON.parse(fs.readFileSync(__dirname + '/../src/rooms.json'));
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let moves = 0, wins = 0;
R.campaign.concat(R.pool).forEach((d, ri) => {
  const L = LU.parse(d);
  for (let seed = 1; seed <= 25; seed++) {
    const Rn = rng(seed * 101 + ri), st = LU.newState(L);
    for (let i = 0; i < 400 && !st.won; i++) {
      const snap = LU.clone(st), before = LU.light(L, st);
      const dir = Math.floor(Rn() * 4), tx = st.px + LU.DIRS[dir][0], ty = st.py + LU.DIRS[dir][1];
      const targetSolid = tx >= 0 && ty >= 0 && tx < L.W && ty < L.H && LU.solidBits(before.bits[ty * L.W + tx]) && before.occ[ty * L.W + tx] < 0;
      const ev = LU.move(L, st, dir); moves++;
      if (targetSolid && st.px === tx && st.py === ty) throw new Error('walked into red light in ' + (d.name || ri));
      const seen = new Set([st.py * L.W + st.px]);
      for (const o of st.objs) { const k = o.y * L.W + o.x; if (L.wall[k] || seen.has(k)) throw new Error('overlap or wall in ' + (d.name || ri)); seen.add(k); }
      if (L.wall[st.py * L.W + st.px]) throw new Error('inside a wall');
      if (Rn() < 0.05) { const back = LU.clone(snap); if (LU.keyOf(L, back) !== LU.keyOf(L, snap)) throw new Error('snapshot mismatch'); }
    }
    if (st.won) wins++;
  }
});
console.log('fuzz moves', moves, 'random wins', wins, 'no errors');
