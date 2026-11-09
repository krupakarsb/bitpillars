const OB = require('../src/engine.js');
let n = 0;
for (const def of OB.LEVELS) for (let s = 1; s <= 200; s++) {
  const L = OB.buildLevel(def), st = OB.newState(L, s);
  for (let i = 0; i < 2000 && st.alive && !st.won; i++) { if (st.rand() < 0.3) OB.turn(st, Math.floor(st.rand() * 4)); OB.step(L, st);
    if (st.prev.length !== st.snake.length) throw new Error('prev/snake mismatch ' + def.name);
    if (st.snake.length < 3) throw new Error('too short'); n++; }
}
// tail-tip rule: in a normal level, stepping into the tail's cell is safe (it moves away)
const L = OB.buildLevel(OB.LEVELS[0]); const st = OB.newState(L, 1);
st.snake = [[5,5],[5,6],[4,6],[4,5]]; st.prev = st.snake.map(s=>s.slice()); st.dir = 3; st.bits = [];
OB.step(L, st); console.log('normal level, head into tail cell -> alive:', st.alive);
// finale: not biting eventually kills you
const F = OB.buildLevel(OB.LEVELS[8]); const f = OB.newState(F, 3); let i = 0;
for (; i < 5000 && f.alive && !f.won; i++) { const h = f.snake[0]; /* circle along the walls */ const d = f.dir; const nx = h[0]+OB.DIRS[d][0], ny=h[1]+OB.DIRS[d][1]; if (F.walls[ny*16+nx]) OB.turn(f,(d+1)%4); OB.step(F, f); }
console.log('finale wall-circling ->', f.won ? 'closed the loop at step ' + i + ' (ring filled)' : f.alive ? 'STILL ALIVE (bad)' : 'dies after ' + i + ' steps');
// a careful player who never steps onto the tail: must die in bounded time
{ const F2 = OB.buildLevel(OB.LEVELS[8]); let worst = 0, wins = 0;
  for (let s = 1; s <= 200; s++) { const g = OB.newState(F2, s); let k = 0;
    for (; k < 20000 && g.alive && !g.won; k++) {
      const h = g.snake[0], t = g.snake[g.snake.length - 1];
      const opts = [0,1,2,3].filter(d => (d + 2) % 4 !== g.dir).filter(d => { const x = h[0]+OB.DIRS[d][0], y = h[1]+OB.DIRS[d][1];
        return x>=0&&y>=0&&x<16&&y<16&&!F2.walls[y*16+x]&&!(x===t[0]&&y===t[1])&&!g.snake.some(c=>c[0]===x&&c[1]===y); });
      if (opts.length) { const d = opts.includes(g.dir) && g.rand() < 0.7 ? g.dir : opts[Math.floor(g.rand()*opts.length)]; OB.turn(g, d); }
      OB.step(F2, g); }
    if (g.won) wins++; else if (g.alive) throw new Error('finale survived forever'); worst = Math.max(worst, k); }
  console.log('finale avoiding the tail: always dies, worst', worst, 'steps (~' + Math.round(worst/7) + 's), accidental closes', wins); }
console.log('fuzz steps', n, 'no errors');
