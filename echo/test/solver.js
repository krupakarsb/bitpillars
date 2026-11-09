// Breadth-first search over every frame-by-frame input for one life (10 s).
// Finds: which cells you can freeze in, which spikes you can die on, whether the exit is reachable,
// and the exact input sequence for any of those, so a bot can replay real inputs through the engine.
const EC = require('../src/engine.js');
const ACTS = []; for (const dir of [0, 1, -1]) for (const jump of [false, true]) ACTS.push({ dir, jump });
// states that differ by less than a tenth of a pixel are merged (each node keeps its exact snapshot, so paths stay exact)
const kf = s => `${Math.round(s.x * 4)},${Math.round(s.y * 4)},${Math.round(s.vy * 8)},${s.ground ? 1 : 0},${s.coyote > 0 ? 1 : 0},${s.buf > 0 ? 1 : 0},${s.held ? 1 : 0},${s.cutOk ? 1 : 0},${s.wasOpen ? 1 : 0}`;

function explore(L, echoes, opts = {}) {
  const st = EC.newRun(L); st.echoes = echoes.map(e => Object.assign({}, e));
  st.wasOpen = EC.platesHeld(L, st, st.x, st.y);
  const start = EC.snapshot(st);
  const seen = new Map(); seen.set(kf(start), null);
  let layer = [{ s: start, id: kf(start) }];
  const freeze = new Map(), spikes = new Map(); let exit = null;
  const nodes = new Map(); nodes.set(kf(start), { parent: null, act: null });
  const limit = opts.frames || EC.LIFE - 1;
  const note = (map, k, id) => { if (!map.has(k)) map.set(k, id); };
  note(freeze, EC.centerCell(st), kf(start));
  for (let f = 0; f < limit && layer.length && !exit; f++) {
    const next = [];
    for (const { s, id } of layer) {
      for (let a = 0; a < ACTS.length; a++) {
        EC.restore(st, s); st.won = false; st.deaths = 0;
        const n0 = st.echoes.length;
        const ev = EC.step(L, st, ACTS[a]);
        if (ev.some(e => e.type === 'win')) { exit = { parent: id, act: a }; break; }
        const d = ev.find(e => e.type === 'die');
        if (d) {
          const e = ev.find(e => e.type === 'echo');
          if (d.cause === 'spike' && e) note(spikes, e.r * EC.W + e.c, { parent: id, act: a });
          st.echoes.length = n0; if (st.echoes.length < echoes.length) st.echoes = echoes.map(e => Object.assign({}, e));
          st.echoes = echoes.map(e => Object.assign({}, e));
          continue;
        }
        const sn = EC.snapshot(st), k = kf(sn);
        if (nodes.has(k)) continue;
        nodes.set(k, { parent: id, act: a, s: sn });
        note(freeze, EC.centerCell(st), k);
        next.push({ s: sn, id: k });
      }
      if (exit) break;
    }
    layer = next;
    if (nodes.size > (opts.maxNodes || 3e6)) break;
  }
  const path = (id) => { const out = []; while (id) { const n = nodes.get(id); if (!n || n.act === null) break; out.push(n.act); id = n.parent; } return out.reverse(); };
  return {
    nodes: nodes.size, exit: !!exit,
    exitPath: () => exit ? path(exit.parent).concat([exit.act]) : null,
    freezeCells: [...freeze.keys()], spikeCells: [...spikes.keys()],
    freezePath: k => freeze.has(k) ? path(freeze.get(k)) : null,
    spikePath: k => spikes.has(k) ? path(spikes.get(k).parent).concat([spikes.get(k).act]) : null,
  };
}
module.exports = { explore, ACTS };
