// The bot follows the shaft's safe lanes (and grabs motes when it is free to), through the whole run:
// down, the flip, and back up. It must finish with no hits. Then it checks every gate has a gap and that
// the safe path never asks for more lane changes than there is time for at top speed.
const DR = require('../src/engine.js'); const fs = require('fs');
const C = DR.buildCourse();
// 1) static checks
const vmax = 130, framesPerLane = DR.LW / (DR.LW / 6);
for (const half of [C.down, C.down.slice().reverse()]) for (let i = 1; i < half.length; i++) {
  const a = half[i - 1], b = half[i];
  if (!b.gaps) throw new Error('gate without a gap ' + i);
  if (!(b.gaps & (1 << b.safe))) throw new Error('safe lane is blocked ' + i);
  const frames = Math.abs(b.y - a.y) / vmax * 60, need = Math.abs(b.safe - a.safe) * framesPerLane;
  if (need + 3 > frames) throw new Error(`too tight at gate ${i}: need ${need} frames, have ${frames.toFixed(1)}`);
}
// 2) play it
const st = DR.newRun(C), inputs = []; let f = 0;
while (!st.won && f < 60 * 400) {
  let want = st.target;
  if (st.phase !== 'flip') {
    const gates = DR.gateList(C, st), g = gates[Math.min(st.next, gates.length - 1)];
    want = g.safe;
    // a mote just before the gate, one lane off: take it if there is time to come back
    const ms = DR.motesOf(C, st), dir = st.phase === 'up' ? -1 : 1;
    for (const m of ms) { const ahead = (m.y - st.y) * dir; if (ahead > 4 && ahead < 40 && Math.abs(m.lane - g.safe) <= 0 && (g.y - m.y) * dir > 20) want = m.lane; }
  }
  const inp = want > st.target ? 1 : want < st.target ? -1 : 0;
  inputs.push(inp);
  const ev = DR.step(C, st, inp); f++;
  for (const e of ev) if (e.type === 'hit' || e.type === 'fade') throw new Error('bot got hit at frame ' + f + ' ' + JSON.stringify(e) + ' phase ' + st.phase);
}
console.log('bot run:', st.won ? 'WIN' : 'FAIL', 'time', (f / 60).toFixed(1) + 's', 'hits', st.hits, 'motes', st.got.size + '/' + DR.totalMotes(C), 'lane changes', st.moved);
// compress the inputs (run-length) for the browser replay
const rl = []; for (const v of inputs) { const l = rl[rl.length - 1]; if (l && l[0] === v) l[1]++; else rl.push([v, 1]); }
fs.writeFileSync(__dirname + '/solution.json', JSON.stringify(rl));
if (!st.won) process.exit(1);
