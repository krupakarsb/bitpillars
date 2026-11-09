const LU = require('../src/engine.js'); const rooms = require('../tools/rooms-hand.js');
for (const k of Object.keys(rooms)) { const d = rooms[k], L = LU.parse(d), s = LU.solve(L, null, 400000);
  console.log(k.padEnd(8), d.name.padEnd(16), s.moves ? 'par ' + s.moves.length : 'UNSOLVABLE'); }
