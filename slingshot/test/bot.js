// Plays every garden through the real engine with the fewest taps the solver proved possible.
// The solver's graph merges nearly identical states, so the bot re-plans on exact states (depth-first search that
// must bloom a new planet with each tap). In the last garden it then flies to the gem and lets go.
// Writes test/solutions.json: for each garden, the frames to wait before each tap.
const SG = require('../src/engine.js'); const { analyse, keyOf } = require('./solver.js'); const fs = require('fs');

function outcomes(L, s) {                     // every distinct result of letting go during one full orbit
  const st = SG.newState(L), res = [], seen = new Set();
  const period = Math.ceil(Math.PI * 2 / (SG.SPEED / s.d)) + 1;
  for (let k = 0; k <= period; k++) {
    SG.restore(st, s);
    for (let i = 0; i < k; i++) SG.step(L, st, false);
    SG.step(L, st, true);
    let f = 0; while (st.mode === 'fly' && !st.letgo && f++ < 900) SG.step(L, st, false);
    if (st.drifts > s.drifts || st.mode !== 'orbit') continue;
    const key = keyOf(st); if (seen.has(key)) continue; seen.add(key);
    res.push({ k, s: SG.snapshot(st) });
  }
  return res;
}
function dfs(L, s, left, goal) {
  if (goal(s)) return [];
  if (left === 0) return null;
  const need = s.bloom.filter(b => !b).length;
  if (need > left) return null;
  for (const o of outcomes(L, s)) {
    const fresh = !s.bloom[o.s.p];
    if (need === left && !fresh) continue;   // with no slack, every tap has to bloom something new
    const rest = dfs(L, o.s, left - 1, goal);
    if (rest) return [o.k].concat(rest);
  }
  return null;
}
const out = []; let ok = true;
SG.LEVELS.forEach((d, i) => {
  const L = SG.build(d), a = analyse(L), st0 = SG.newState(L);
  let taps = dfs(L, SG.snapshot(st0), a.minTaps, s => SG.allBloomed(s));
  if (taps && L.finale) {
    const st = SG.newState(L);
    for (const k of taps) { for (let f = 0; f < k; f++) SG.step(L, st, false); SG.step(L, st, true); while (st.mode === 'fly') SG.step(L, st, false); }
    if (st.p !== L.gem) { for (let extra = 1; extra <= 3; extra++) { const t2 = dfs(L, SG.snapshot(st), extra, s => s.p === L.gem); if (t2) { taps = taps.concat(t2); break; } } }
    taps.push(30);                            // nothing left to catch: let go
  }
  const st = SG.newState(L); let frames = 0;
  for (const k of taps || []) {
    for (let f = 0; f < k; f++, frames++) SG.step(L, st, false);
    SG.step(L, st, true); frames++;
    for (let f = 0; st.mode === 'fly' && !st.letgo && f < 900; f++, frames++) SG.step(L, st, false);
  }
  const good = !!taps && (L.finale ? st.letgo && SG.allBloomed(st) : st.won);
  console.log(String(i + 1).padStart(2), d.name.padEnd(14), good ? 'WIN ' : 'FAIL', `taps ${taps ? taps.length : '-'} (fewest to bloom ${a.minTaps})`, `drifts ${st.drifts}`, `${(frames / 60).toFixed(1)}s`, `soft-lock states ${a.stuck}/${a.states}`);
  if (!good || st.drifts || a.stuck) ok = false;
  out.push(taps);
});
fs.writeFileSync(__dirname + '/solutions.json', JSON.stringify(out));
if (!ok) process.exit(1);
