// The bot plays every room through the real engine, using inputs found by the BFS solver.
// It writes test/solutions.json, which the browser test replays key by key.
const EC = require('../src/engine.js'); const { play } = require('./plan.js'); const fs = require('fs');
const PLANS = [
  [],
  [[9, 10]],
  [['s', 8, 10], ['s', 12, 10]],
  [[7, 9], [11, 9]],
  [[3, 10]],
  [[10, 9], [10, 7], [10, 5]],
  [[7, 9], [7, 7], [2, 5], [4, 10]],
  [['s', 6, 10], ['s', 7, 10], ['s', 8, 10], ['s', 9, 10], ['s', 10, 10]],
  [['s', 7, 10], [9, 9], [11, 6]],
  [[3, 11], [8, 11], [13, 11], [9, 9], [11, 7], [13, 5], [14, 3]],
];
const out = []; let ok = true;
EC.LEVELS.forEach((d, i) => {
  const t = Date.now(); const r = play(i, PLANS[i]);
  console.log(String(i + 1).padStart(2), d.name.padEnd(18), r ? `WIN  echoes ${r.echoes} (cap ${d.cap})  ${(r.inputs.length / 60).toFixed(1)}s of play` : 'FAIL', `${Date.now() - t}ms`);
  if (!r) ok = false; else out.push(r.inputs);
});
fs.writeFileSync(__dirname + '/solutions.json', JSON.stringify(out));
if (!ok) process.exit(1);
