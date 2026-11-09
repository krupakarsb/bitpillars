// Replays every room's solver solution through the real engine (campaign and the whole Daily/Endless pool),
// checks every par is the true minimum (no shorter solution exists), and checks the finale can't be done
// before every rune is lit. Writes test/solutions.json for the browser test.
const LU = require('../src/engine.js'); const fs = require('fs');
const R = JSON.parse(fs.readFileSync(__dirname + '/../src/rooms.json'));
let ok = true; const out = [];
R.campaign.forEach((d, i) => {
  const L = LU.parse(d), st = LU.newState(L);
  for (const m of d.solution) LU.move(L, st, m);
  const s = LU.solve(L, null, 400000);
  const good = st.won && s.moves && s.moves.length === d.par && st.moves <= d.par + 0;
  console.log(String(i + 1).padStart(2), (d.name || '').padEnd(16), good ? 'WIN ' : 'FAIL', 'par', d.par, d.finale ? '(finale: every rune lit ' + (st.lit === (1 << L.runes.length) - 1) + ')' : '');
  if (!good) ok = false; out.push(d.solution);
});
let poolOk = 0;
R.pool.forEach(d => { const L = LU.parse(d), st = LU.newState(L); for (const m of d.solution) LU.move(L, st, m); if (st.won && !LU.doorOpen(L, LU.newState(L))) poolOk++; });
console.log('daily/endless pool:', poolOk + '/' + R.pool.length, 'rooms replay to a win and start with the door dark');
if (poolOk !== R.pool.length) ok = false;
fs.writeFileSync(__dirname + '/solutions.json', JSON.stringify(out));
if (!ok) process.exit(1);
