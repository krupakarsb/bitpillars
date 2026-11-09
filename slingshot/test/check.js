const SG = require('../src/engine.js'); const { analyse } = require('./solver.js');
const only = process.argv[2] !== undefined ? [+process.argv[2]] : SG.LEVELS.map((_, i) => i);
for (const i of only) {
  const L = SG.build(SG.LEVELS[i]); const t = Date.now(); const a = analyse(L);
  console.log(String(i + 1).padStart(2), L.name.padEnd(14), `planets ${a.planetsReached}/${L.planets.length}`, `states ${a.states}`, `edges ${a.edges}`, `stuck ${a.stuck}`, `min taps ${a.minTaps}`, `${Date.now() - t}ms`);
}
