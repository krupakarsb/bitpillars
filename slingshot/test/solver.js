// Builds the full graph of "caught in orbit" states for a garden: from each one, it tries letting go on every
// frame of a full orbit and follows the flight to the next catch (or a drift). Then it checks:
//  - every planet can be reached, and from EVERY reachable orbit you can still bloom every planet (no soft-locks)
//  - the fewest taps that bloom the whole garden, with the exact frames to tap on.
const SG = require('../src/engine.js');
const keyOf = s => `${s.p}|${Math.round(s.ang * 60)}|${s.dir}|${Math.round(s.d * 4)}`;

function graph(L) {
  const st = SG.newState(L);
  const start = SG.snapshot(st);
  const nodes = new Map(); const queue = [start]; nodes.set(keyOf(start), { s: start, out: [] });
  while (queue.length) {
    const s = queue.shift(), node = nodes.get(keyOf(s));
    const period = Math.ceil(Math.PI * 2 / (SG.SPEED / s.d)) + 1;
    const seen = new Set();
    for (let k = 0; k <= period; k++) {
      SG.restore(st, s); st.bloom = L.planets.map(() => false); st.won = false;
      for (let i = 0; i < k; i++) SG.step(L, st, false);
      let ev = SG.step(L, st, true), res = null;
      for (let f = 0; f < 600 && !res; f++) {
        for (const e of ev) { if (e.type === 'catch') res = { to: SG.snapshot(st) }; if (e.type === 'drift') res = { drift: e.cause }; }
        if (!res) ev = SG.step(L, st, false);
      }
      if (!res || res.drift) continue;
      const kk = keyOf(res.to); if (seen.has(kk)) continue; seen.add(kk);
      node.out.push({ k, to: kk, p: res.to.p, flight: res.to.frame });
      if (!nodes.has(kk)) { nodes.set(kk, { s: res.to, out: [] }); queue.push(res.to); }
    }
    if (nodes.size > 80000) throw new Error('state explosion');
  }
  return { nodes, startKey: keyOf(start) };
}

function analyse(L) {
  const { nodes, startKey } = graph(L);
  const n = L.planets.length, full = (1 << n) - 1;
  // which planets each node can still reach (fixpoint)
  const reach = new Map(); for (const [k, v] of nodes) reach.set(k, 1 << v.s.p);
  let changed = true;
  while (changed) { changed = false; for (const [k, v] of nodes) { let m = reach.get(k); for (const e of v.out) m |= reach.get(e.to); if (m !== reach.get(k)) { reach.set(k, m); changed = true; } } }
  const stuck = [...nodes.keys()].filter(k => reach.get(k) !== full);
  // fewest taps: BFS over (node, bloomed mask)
  const sk = startKey + '#' + 1, prev = new Map([[sk, null]]); let q = [[startKey, 1]], goal = null;
  while (q.length && !goal) {
    const nq = [];
    for (const [k, m] of q) for (const e of nodes.get(k).out) {
      const m2 = m | (1 << e.p), id = e.to + '#' + m2;
      if (prev.has(id)) continue; prev.set(id, { id: k + '#' + m, k: e.k });
      if (m2 === full) { goal = id; break; }
      nq.push([e.to, m2]);
    }
    q = nq;
  }
  const taps = []; for (let id = goal; id && prev.get(id); id = prev.get(id).id) taps.unshift(prev.get(id).k);
  return { states: nodes.size, edges: [...nodes.values()].reduce((a, v) => a + v.out.length, 0), stuck: stuck.length, minTaps: goal ? taps.length : -1, taps,
    planetsReached: n - [...Array(n).keys()].filter(i => !(reach.get(startKey) & (1 << i))).length, nodes, startKey };
}
module.exports = { graph, analyse, keyOf };
