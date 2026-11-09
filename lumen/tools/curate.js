// Generates rooms for one tier and keeps only good ones: solvable, inside a move range, door dark at the start,
// and every lamp, mirror and crate matters. Usage: node tools/curate.js <tier> <count> <minPar> <maxPar> <seedBase> <out.json>
const LU = require('../src/engine.js'); const fs = require('fs');
const [tier, count, lo, hi, base] = process.argv.slice(2, 7).map(Number), out = process.argv[7];
const found = []; let tried = 0; const t0 = Date.now();
for (let s = base; found.length < count && tried < 20000; s++) {
  tried++;
  const def = LU.generate(s * 7919 + tier * 104729, tier);
  const c = LU.check(def, lo, hi, 80000);
  if (c) { found.push({ map: def.map, lamps: def.lamps, tier, par: c.par, seed: s }); fs.writeFileSync(out, JSON.stringify(found)); }
}
console.log(`tier ${tier}: ${found.length} rooms from ${tried} tries in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
