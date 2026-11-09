const EC = require('../src/engine.js'); const { explore } = require('./solver.js'); const { show } = require('./plan.js');
const i = +process.argv[2]; const ech = JSON.parse(process.argv[3] || '[]');
const L = EC.parse(EC.LEVELS[i]);
const echoes = ech.map(([c, r]) => ({ k: r * EC.W + c, c, r }));
const r = explore(L, echoes);
console.log(L.name, 'exit:', r.exit, 'nodes', r.nodes);
console.log(show(L, echoes, r.freezeCells)); if (r.spikeCells.length) console.log('spikes:\n' + show(L, echoes, r.spikeCells, 'x'));
