// Breadth-first search over one minute, tick by tick, with every guard's route known in advance.
// Returns the fastest way to grab the gem and get back out without being seen (or null if there is none).
const HE = require('../src/engine.js');
const clone = st => Object.assign({}, st, { opened: new Set(st.opened), keysTaken: new Set(st.keysTaken || []), path: st.path });
const keyOf = st => `${st.x},${st.y},${st.hasGem ? 1 : 0},${st.keys},${[...st.opened].join('.')},${st.leverUntil > st.t ? st.leverUntil : -1}`;
function solve(L, run, opts = {}) {
  const st0 = HE.newLoop(L, run); st0.path = null;
  let layer = [{ st: st0, moves: [] }];
  for (let t = 0; t < HE.LOOP; t++) {
    const seen = new Set(), next = [];
    for (const { st, moves } of layer) {
      for (const d of [-1, 0, 1, 2, 3]) {
        const s = clone(st); s.path = [{ x: st.x, y: st.y, f: st.f }];
        const ev = HE.step(L, s, d);
        if (s.caught) continue;
        const m = moves.concat([d]);
        if (s.won) return { moves: m, ticks: t + 1 };
        if (s.over) continue;
        if (opts.avoid && opts.avoid(s)) continue;
        const k = keyOf(s); if (seen.has(k)) continue; seen.add(k);
        s.path = null; next.push({ st: s, moves: m });
      }
    }
    layer = next;
    if (!layer.length) return null;
  }
  return null;
}
// replay moves through the engine and return the final state (with its full path, for echo recordings)
function play(L, run, moves) { const st = HE.newLoop(L, run); for (const d of moves) { HE.step(L, st, d); if (st.over) break; } return st; }
// the shortest walk ignoring guards entirely: used to check the guards actually matter
function naive(L) {
  const quiet = Object.assign({}, L, { routes: [], guards: L.guards.filter(g => g.echo) });
  return solve(quiet, null);
}
function show(L, moves, run) {
  const grid = L.map.map(r => r.split(''));
  for (const r of L.routes) for (const p of r) if (grid[p.y][p.x] === '.') grid[p.y][p.x] = ':';
  if (moves) { const st = play(L, run, moves); for (const p of st.path) if (grid[p.y][p.x] === '.' || grid[p.y][p.x] === ':') grid[p.y][p.x] = '*'; }
  return grid.map(r => r.join('')).join('\n');
}
module.exports = { solve, play, naive, show };
