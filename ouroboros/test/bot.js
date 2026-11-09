const OB = require('../src/engine.js');
const { W, H, DIRS } = OB;
function bfs(L, st, targetFn) {
  const head = st.snake[0], body = new Set(st.snake.slice(0, -1).map(([x, y]) => y * W + x));
  const prev = new Map(), q = [[head[0], head[1]]]; prev.set(head[1] * W + head[0], null);
  while (q.length) {
    const [x, y] = q.shift();
    if (targetFn(x, y) && !(x === head[0] && y === head[1])) {
      let k = y * W + x, path = [];
      while (prev.get(k) !== null) { path.push(k); k = prev.get(k).k; }
      const first = path[path.length - 1];
      return prev.get(first).d;
    }
    for (let d = 0; d < 4; d++) {
      let nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (L.wrap) { nx = (nx + W) % W; ny = (ny + H) % H; } else if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (prev.has(k) || L.walls[k] || (body.has(k) && !targetFn(nx, ny))) continue;
      if (x === head[0] && y === head[1] && (d + 2) % 4 === st.dir) continue;
      prev.set(k, { k: y * W + x, d: (x === head[0] && y === head[1]) ? d : prev.get(y * W + x).d });
      q.push([nx, ny]);
    }
  }
  return -1;
}
function area(L, st, d) {
  const head = st.snake[0];
  let nx = head[0] + DIRS[d][0], ny = head[1] + DIRS[d][1];
  if (L.wrap) { nx = (nx + W) % W; ny = (ny + H) % H; } else if (nx < 0 || ny < 0 || nx >= W || ny >= H) return -1;
  const body = new Set(st.snake.slice(0, -1).map(([x, y]) => y * W + x));
  if (L.walls[ny * W + nx] || body.has(ny * W + nx)) return -1;
  const seen = new Set([ny * W + nx]), q = [[nx, ny]];
  while (q.length && seen.size < 300) {
    const [x, y] = q.pop();
    for (const [dx, dy] of DIRS) {
      let a = x + dx, b = y + dy;
      if (L.wrap) { a = (a + W) % W; b = (b + H) % H; } else if (a < 0 || b < 0 || a >= W || b >= H) continue;
      const k = b * W + a; if (seen.has(k) || L.walls[k] || body.has(k)) continue; seen.add(k); q.push([a, b]);
    }
  }
  return seen.size;
}
function play(L, seed, maxSteps = 6000) {
  const st = OB.newState(L, seed);
  for (let i = 0; i < maxSteps; i++) {
    let d;
    if (L.finale) {
      const tail = st.snake[st.snake.length - 1];
      d = st.steps > 40 ? bfs(L, st, (x, y) => x === tail[0] && y === tail[1]) : -1;
    } else {
      const want = st.bits.filter(b => b.type !== 'pink' || st.snake.length > 8);
      d = bfs(L, st, (x, y) => want.some(b => b.x === x && b.y === y));
      if (d >= 0 && area(L, st, d) < st.snake.length + 2) d = -1;
    }
    if (d < 0) { let best = -1, bd = st.dir; for (let k = 0; k < 4; k++) { if ((k + 2) % 4 === st.dir) continue; const a = area(L, st, k); if (a > best) { best = a; bd = k; } } d = bd; }
    if (d !== st.dir) OB.turn(st, d);
    const ev = OB.step(L, st);
    if (!st.alive) return { win: false, steps: st.steps, cause: ev[0].cause, len: st.snake.length };
    if (st.won) return { win: true, steps: st.steps, closed: st.closed, len: st.snake.length };
  }
  return { win: false, steps: maxSteps, cause: 'timeout' };
}
let ok = true;
OB.LEVELS.forEach((def, i) => {
  const L = OB.buildLevel(def);
  let wins = 0, causes = {}, steps = 0;
  for (let s = 1; s <= 40; s++) { const r = play(L, s * 7919); if (r.win) { wins++; steps += r.steps; } else causes[r.cause] = (causes[r.cause] || 0) + 1; }
  let reach = 0, free = 0; for (let k = 0; k < W * H; k++) { if (L.reach[k]) reach++; if (!L.walls[k]) free++; }
  console.log(String(i + 1).padStart(2), def.name.padEnd(12), 'bot wins', wins + '/40', 'avg steps', wins ? Math.round(steps / wins) : '-', 'reach', reach + '/' + free, JSON.stringify(causes));
  if (wins < 30) ok = false;
});
let ew = 0; for (let s = 1; s <= 10; s++) { const L = OB.endlessLevel(s); const st = OB.newState(L, s); for (let i = 0; i < 400; i++) { OB.turn(st, Math.floor(st.rand() * 4)); OB.step(L, st); if (!st.alive) break; } ew++; }
console.log('endless levels generated:', ew, ok ? 'ALL OK' : 'SOME LEVELS WEAK');
