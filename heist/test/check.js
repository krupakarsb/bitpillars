const HE = require('../src/engine.js'); const { solve, naive, show, play } = require('./solver.js');
const only = process.argv[2] !== undefined ? [+process.argv[2]] : HE.HEISTS.map((_, i) => i);
for (const i of only) {
  const d = HE.HEISTS[i]; const L = HE.parse(d); d.map.forEach((r, y) => { if (r.length !== HE.W) throw d.name + ' row ' + y; });
  if (d.map.length !== HE.H) throw d.name + ' rows';
  const t = Date.now();
  if (!d.finale) {
    const s = solve(L, null), nv = naive(L);
    const nvSt = nv ? play(L, null, nv.moves) : null;
    console.log(i + 1, d.name.padEnd(12), s ? `solvable in ${(s.ticks / HE.TPS).toFixed(1)}s` : 'NO SOLUTION', '| naive route', nvSt ? (nvSt.caught ? 'gets caught' : nvSt.won ? 'WINS (guards do not matter!)' : 'fails') : 'n/a', `${Date.now() - t}ms`);
    if (process.argv[3]) console.log(show(L, s && s.moves));
  } else {
    const s1 = solve(L, null);
    console.log(i + 1, d.name.padEnd(12), 'first minute alone:', s1 ? 'SOLVABLE (bad)' : 'impossible, as intended');
  }
}
// the finale: minute one, walk to the plate and end the loop; minute two, your echo holds the plate for you
if (only.includes(5)) {
  const L = HE.parse(HE.HEISTS[5]); const plate = L.plates[0], px = plate % HE.W, py = (plate / HE.W) | 0;
  const quiet = Object.assign({}, L, { gem: -2, sx: -9 });              // plain walking search to the plate
  const st = HE.newLoop(L, null); let layer = [{ x: st.x, y: st.y, m: [] }], seen = new Set([st.x + ',' + st.y]), setup = null;
  while (layer.length && !setup) { const nx = []; for (const n of layer) for (const d of [0, 1, 2, 3]) { const x = n.x + HE.DIRS[d][0], y = n.y + HE.DIRS[d][1];
    if (HE.blockedTile(L, st, y * HE.W + x, false) || seen.has(x + ',' + y)) continue; seen.add(x + ',' + y); const m = n.m.concat([d]); if (x === px && y === py) { setup = m; break; } nx.push({ x, y, m }); } layer = nx; }
  const s1 = play(L, null, setup);
  const run = { loop: 2, lastPath: s1.path };
  const s2 = solve(L, run);
  console.log('6 Fool You     minute one: walk to the plate in', setup.length, 'steps and end the loop. minute two:', s2 ? `solvable in ${(s2.ticks / HE.TPS).toFixed(1)}s with your echo on the plate` : 'NO SOLUTION');
  // rushing ahead of your echo should get you caught by yourself
  const nv = naive(Object.assign({}, L));
}
