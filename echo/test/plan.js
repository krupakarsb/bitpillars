// Play a level from a plan: each entry is a freeze cell [c,r] or a spike to die on ['s',c,r].
// Every life's inputs come from the BFS solver and are replayed through the real engine.
const EC = require('../src/engine.js'); const { explore, ACTS } = require('./solver.js');
function show(L, echoes, cells, mark) {
  const out = [];
  for (let r = 0; r < EC.H; r++) { let line = ''; for (let c = 0; c < EC.W; c++) {
    const k = r * EC.W + c, t = L.tiles[k];
    let ch = '.#^EpGv'[t] || '?'; if (c === L.sx && r === L.sy) ch = 'S';
    if (echoes.some(e => e.k === k)) ch = 'O'; else if (cells && cells.includes(k)) ch = mark || '*';
    line += ch; } out.push(line); }
  return out.join('\n');
}
function play(idx, plan, verbose) {
  const L = EC.parse(EC.LEVELS[idx]); const st = EC.newRun(L); const inputs = [];
  const run = acts => { for (const a of acts) { const ev = EC.step(L, st, ACTS[a]); inputs.push(a); if (ev.some(e => e.type === 'win')) return 'win'; } return null; };
  for (const p of plan) {
    const r = explore(L, st.echoes);
    let acts;
    if (p[0] === 's') acts = r.spikePath(p[2] * EC.W + p[1]);
    else { acts = r.freezePath(p[1] * EC.W + p[0]); if (acts) acts = acts.concat(['F']); }
    if (!acts) { console.log(L.name, 'cannot reach', p, '\n' + show(L, st.echoes, p[0] === 's' ? r.spikeCells : r.freezeCells, p[0] === 's' ? 'x' : '*')); return false; }
    for (const a of acts) { if (a === 'F') { EC.step(L, st, { dir: 0, jump: false, echo: true }); inputs.push('F'); } else { EC.step(L, st, ACTS[a]); inputs.push(a); } }
    if (verbose) console.log('after', p, 'echoes', st.echoes.map(e => [e.c, e.r]).join(' '));
  }
  const r = explore(L, st.echoes);
  if (!r.exit) { console.log(L.name, 'exit not reachable; freeze cells:\n' + show(L, st.echoes, r.freezeCells)); return false; }
  const res = run(r.exitPath());
  return res === 'win' ? { inputs, echoes: st.echoes.length, lives: st.lives } : false;
}
module.exports = { play, show };
if (require.main === module) {
  const i = +process.argv[2]; const plan = JSON.parse(process.argv[3] || '[]');
  const t = Date.now(); const r = play(i, plan, true); console.log(EC.LEVELS[i].name, r ? `WIN with ${r.echoes} echoes, ${r.inputs.length} frames` : 'FAIL', (Date.now() - t) + 'ms');
}
