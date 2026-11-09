// Builds src/rooms.json: the 20-room campaign (hand-made teaching rooms + generated rooms + the finale)
// and the pool of generated rooms used by Daily and Endless. Every room gets its par from the solver.
const LU = require('../src/engine.js'); const fs = require('fs'); const path = require('path');
const H = require('./rooms-hand.js');
const gen = {}; for (const f of fs.readdirSync(path.join(__dirname, '../gen')).filter(f => f.endsWith('.json'))) {
  const t = +f[1]; (gen[t] = gen[t] || []).push(...JSON.parse(fs.readFileSync(path.join(__dirname, '../gen', f)))); }
for (const t in gen) gen[t].sort((a, b) => a.par - b.par);
const NAMES = ['Ember Hall', 'Quiet Prism', 'Lantern Row', 'Glass Garden', 'Cold Fire', 'Low Sun', 'Night Kiln', 'Pale Arch', 'Copper Dusk', 'Still Water',
  'Shard Court', 'Velvet Ray', 'Moth Light', 'Two Moons', 'Halo', 'Afterglow', 'Candle Maze', 'Blue Hour', 'Red Shift', 'Gilded Room'];
let ni = 0;
const take = (t, n) => { const out = gen[t] ? gen[t].splice(0, n) : []; if (out.length < n) throw new Error(`need ${n} tier-${t} rooms, have ${out.length}`); return out.map(r => ({ name: NAMES[ni++ % NAMES.length], map: r.map, lamps: r.lamps, tier: t })); };
const hand = d => ({ name: d.name, hint: d.hint, map: d.map, lamps: d.lamps, finale: d.finale || undefined });
const campaign = [hand(H.first), ...take(0, 2), hand(H.red), ...take(1, 2), hand(H.mirror), ...take(2, 2), hand(H.ice), ...take(3, 2), hand(H.cancel), ...take(4, 6), hand(H.finale)];
// pool: everything left from tiers 2-4, ordered by difficulty
const pool = [2, 3, 4, 1].flatMap(t => gen[t] || []).sort((a, b) => a.par - b.par).map(r => ({ map: r.map, lamps: r.lamps, tier: r.tier }));
for (const r of campaign.concat(pool)) { const s = LU.solve(LU.parse(r), null, 400000); if (!s.moves) throw new Error('unsolvable: ' + (r.name || r.map.join('/'))); r.par = s.moves.length; r.solution = s.moves; }
fs.writeFileSync(path.join(__dirname, '../src/rooms.json'), JSON.stringify({ campaign, pool }));
console.log('campaign', campaign.map((r, i) => `${i + 1}:${r.name}(${r.par})`).join(' '));
console.log('pool', pool.length, 'rooms, pars', pool.map(r => r.par).join(','));
