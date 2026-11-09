// Plays every heist through the real engine with the solver's moves, and the finale the intended way:
// minute one, walk to the plate and end the loop early; minute two, your echo holds the plate while you steal the gem.
// Writes test/solutions.json: per heist, a list of loops, each a list of moves (-1 wait, 0-3 step, 'R' end the loop).
const HE = require('../src/engine.js'); const { solve, play } = require('./solver.js'); const fs = require('fs');
const out = []; let ok = true;
HE.HEISTS.forEach((d, i) => {
  const L = HE.parse(d);
  if (!d.finale) {
    const s = solve(L, null); const st = s ? play(L, null, s.moves) : null;
    const good = st && st.won && !st.caught;
    console.log(i + 1, d.name.padEnd(12), good ? 'WIN ' : 'FAIL', s ? `${s.moves.length} ticks (${(s.moves.length / HE.TPS).toFixed(1)}s)` : '');
    if (!good) ok = false; out.push([s ? s.moves : []]);
  } else {
    const plate = L.plates[0], px = plate % HE.W, py = (plate / HE.W) | 0, st0 = HE.newLoop(L, null);
    let layer = [{ x: st0.x, y: st0.y, m: [] }], seen = new Set([st0.x + ',' + st0.y]), setup = null;
    while (layer.length && !setup) { const nx = []; for (const n of layer) for (const dd of [0, 1, 2, 3]) { const x = n.x + HE.DIRS[dd][0], y = n.y + HE.DIRS[dd][1];
      if (HE.blockedTile(L, st0, y * HE.W + x, false) || seen.has(x + ',' + y)) continue; seen.add(x + ',' + y); const m = n.m.concat([dd]); if (x === px && y === py) { setup = m; break; } nx.push({ x, y, m }); } layer = nx; }
    const s1 = play(L, null, setup);
    const s2 = solve(L, { loop: 2, lastPath: s1.path }); const st2 = s2 ? play(L, { loop: 2, lastPath: s1.path }, s2.moves) : null;
    const good = st2 && st2.won;
    console.log(i + 1, d.name.padEnd(12), good ? 'WIN ' : 'FAIL', `minute one ${setup.length} steps to the plate, then end the loop; minute two ${s2 ? s2.moves.length : '-'} ticks`);
    if (!good) ok = false; out.push([setup.concat(['R']), s2 ? s2.moves : []]);
  }
});
fs.writeFileSync(__dirname + '/solutions.json', JSON.stringify(out));
if (!ok) process.exit(1);
