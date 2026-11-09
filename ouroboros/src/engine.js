// OUROBOROS engine: a snake in a world without edges. Pure logic, no DOM.
(function (root) {
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];           // up right down left
  const W = 16, H = 16;

  const LEVELS = [
    { name: 'First Light', hint: 'Swipe or use arrows to steer. Leave one edge, return from the other.', goal: 5, speed: 6.5, accel: 0.15,
      start: [4, 8, 1, 3], map: [] },
    { name: 'Pillars', hint: 'Eat the bits. Don’t bite yourself.', goal: 7, speed: 7, accel: 0.18, start: [2, 8, 1, 3], map: [
      '................', '................', '................', '................',
      '....##....##....', '....##....##....', '................', '................',
      '................', '................', '....##....##....', '....##....##....',
      '................', '................', '................', '................'] },
    { name: 'Corridors', hint: 'The walls end, the world doesn’t. Go up to come down.', goal: 8, speed: 7.5, accel: 0.2, start: [7, 3, 2, 3], map: [
      '.....#....#.....', '.....#....#.....', '.....#....#.....', '.....#....#.....',
      '.....#....#.....', '.....#....#.....', '.....#....#.....', '................',
      '................', '.....#....#.....', '.....#....#.....', '.....#....#.....',
      '.....#....#.....', '.....#....#.....', '.....#....#.....', '.....#....#.....'] },
    { name: 'Golden', hint: 'Gold bits make you three longer. Catch them before they fade.', goal: 8, speed: 8, accel: 0.22, gold: true, start: [2, 2, 1, 3], map: [
      '................', '................', '................', '................',
      '................', '................', '.......##.......', '.....######.....',
      '.....######.....', '.......##.......', '................', '................',
      '................', '................', '................', '................'] },
    { name: 'Thin Air', hint: 'Pink bits make you two shorter. Stay light.', goal: 9, speed: 8, accel: 0.22, gold: true, pink: true, start: [8, 0, 1, 3], map: [
      '................', '.######..######.', '.#............#.', '.#............#.',
      '.#...######...#.', '.#............#.', '.#............#.', '................',
      '................', '.#............#.', '.#............#.', '.#...######...#.',
      '.#............#.', '.#............#.', '.######..######.', '................'] },
    { name: 'Drift', hint: 'These bits wander. Read where they’re going.', goal: 9, speed: 8.5, accel: 0.25, drift: true, pink: true, start: [1, 1, 1, 3], map: [
      '................', '................', '..#.........#...', '................',
      '.......#........', '................', '....#......#....', '................',
      '................', '.#.......#......', '................', '......#.....#...',
      '................', '...#............', '..........#.....', '................'] },
    { name: 'Maze', hint: 'Narrow halls. Plan the turn after the next one.', goal: 10, speed: 8.5, accel: 0.25, pink: true, start: [1, 1, 1, 3], map: [
      '#######..#######', '#..............#', '#.####.##.####.#', '#.#..........#.#',
      '#.#.###..###.#.#', '#...#......#...#', '#.#.#.#..#.#.#.#', '................',
      '................', '#.#.#.#..#.#.#.#', '#...#......#...#', '#.#.###..###.#.#',
      '#.#..........#.#', '#.####.##.####.#', '#..............#', '#######..#######'] },
    { name: 'Rush', hint: 'Faster now. Breathe, and keep turning.', goal: 12, speed: 9.5, accel: 0.4, gold: true, pink: true, start: [1, 2, 1, 3], map: [
      '................', '................', '................', '................',
      '....########....', '....#......#....', '....#......#....', '................',
      '................', '....#......#....', '....#......#....', '....########....',
      '................', '................', '................', '................'] },
    { name: 'Ouroboros', hint: 'The world has edges now. There is nothing left to eat.', goal: 0, speed: 7, accel: 0, finale: true, wrap: false, start: [3, 3, 1, 6], map: [
      '################', '#..............#', '#..............#', '#..............#',
      '#..............#', '#..............#', '#..............#', '#......GG......#',
      '#......GG......#', '#..............#', '#..............#', '#..............#',
      '#..............#', '#..............#', '#..............#', '################'] },
  ];

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const key = (x, y) => y * W + x;

  function buildLevel(def) {
    const walls = new Uint8Array(W * H);          // 0 empty, 1 wall, 2 gem
    def.map.forEach((row, y) => { for (let x = 0; x < W; x++) { const c = row[x]; if (c === '#') walls[key(x, y)] = 1; else if (c === 'G') walls[key(x, y)] = 2; } });
    const L = Object.assign({ wrap: true, gold: false, pink: false, drift: false, finale: false }, def, { walls });
    // cells reachable from the start, so bits never spawn in sealed pockets
    const reach = new Uint8Array(W * H), q = [[def.start[0], def.start[1]]];
    reach[key(def.start[0], def.start[1])] = 1;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of DIRS) {
        let nx = x + dx, ny = y + dy;
        if (L.wrap) { nx = (nx + W) % W; ny = (ny + H) % H; } else if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = key(nx, ny);
        if (!reach[k] && !walls[k]) { reach[k] = 1; q.push([nx, ny]); }
      }
    }
    L.reach = reach;
    return L;
  }

  function endlessLevel(seed) {
    const r = rng(seed);
    for (let tries = 0; tries < 50; tries++) {
      const map = Array.from({ length: H }, () => Array(W).fill('.'));
      const n = 5 + Math.floor(r() * 6);
      for (let i = 0; i < n; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H), big = r() < 0.35;
        map[y][x] = '#'; if (big && x < W - 1 && y < H - 1) { map[y][x + 1] = '#'; map[y + 1][x] = '#'; map[y + 1][x + 1] = '#'; }
      }
      for (let x = 0; x < 6; x++) map[8][x] = '.';               // keep the start lane clear
      const def = { name: 'Endless', hint: 'How long can the loop grow?', goal: Infinity, speed: 7.5, accel: 0.12, gold: true, pink: true, drift: false,
        start: [1, 8, 1, 3], map: map.map(r => r.join('')) };
      const L = buildLevel(def);
      let free = 0, reach = 0;
      for (let k = 0; k < W * H; k++) { if (!L.walls[k]) free++; if (L.reach[k]) reach++; }
      if (free === reach) return L;                              // every open cell connected
    }
    return buildLevel(Object.assign({}, LEVELS[0], { name: 'Endless', goal: Infinity, gold: true, pink: true }));
  }

  function newState(L, seed) {
    const [sx, sy, dir, len] = L.start;
    const snake = [];
    for (let i = 0; i < len; i++) {
      let x = sx - DIRS[dir][0] * i, y = sy - DIRS[dir][1] * i;
      x = (x + W) % W; y = (y + H) % H;
      snake.push([x, y]);
    }
    const st = { snake, prev: snake.map(s => s.slice()), dir, queue: [], grow: 0, bits: [], eaten: 0, steps: 0,
      alive: true, won: false, closed: false, growEvery: 6, rand: rng(seed || 1), started: false };
    if (!L.finale) spawn(L, st, 'bit');
    return st;
  }

  function occupied(st, x, y) { for (const s of st.snake) if (s[0] === x && s[1] === y) return true; return false; }
  function bitAt(st, x, y) { return st.bits.findIndex(b => b.x === x && b.y === y); }

  function spawn(L, st, type) {
    const head = st.snake[0], cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = key(x, y);
      if (!L.reach[k] || L.walls[k] || occupied(st, x, y) || bitAt(st, x, y) >= 0) continue;
      let dx = Math.abs(x - head[0]), dy = Math.abs(y - head[1]);
      if (L.wrap) { dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); }
      if (dx + dy < 3) continue;                                  // not right under the snake's nose
      cells.push([x, y]);
    }
    if (!cells.length) return null;
    const [x, y] = cells[Math.floor(st.rand() * cells.length)];
    const b = { x, y, type, ttl: type === 'gold' ? 46 : type === 'pink' ? 70 : Infinity, born: st.steps };
    st.bits.push(b);
    return b;
  }

  function turn(st, d) {
    const last = st.queue.length ? st.queue[st.queue.length - 1] : st.dir;
    if (d === last || (d + 2) % 4 === last) return false;          // no-op or reversing
    if (st.queue.length < 2) st.queue.push(d);
    st.started = true;
    return true;
  }

  function interval(L, st) {
    const sp = Math.min(16, L.speed + L.accel * st.eaten);
    return 1000 / sp;
  }

  // Advance one cell. Returns a list of events for the renderer and audio.
  function step(L, st) {
    const ev = [];
    if (!st.alive || st.won) return ev;
    if (st.queue.length) st.dir = st.queue.shift();
    st.prev = st.snake.map(s => s.slice());
    st.steps++;
    const head = st.snake[0], tail = st.snake[st.snake.length - 1];
    let nx = head[0] + DIRS[st.dir][0], ny = head[1] + DIRS[st.dir][1];
    let wrapped = false;
    if (L.wrap) { if (nx < 0 || ny < 0 || nx >= W || ny >= H) wrapped = true; nx = (nx + W) % W; ny = (ny + H) % H; }
    else if (nx < 0 || ny < 0 || nx >= W || ny >= H) { st.alive = false; ev.push({ type: 'die', cause: 'edge' }); return ev; }
    if (L.walls[key(nx, ny)]) { st.alive = false; ev.push({ type: 'die', cause: L.walls[key(nx, ny)] === 2 ? 'gem' : 'wall', x: nx, y: ny }); return ev; }
    // the finale: biting the tail closes the loop
    if (L.finale && nx === tail[0] && ny === tail[1]) {
      st.won = true; st.closed = true;
      st.snake.unshift([nx, ny]); st.snake.pop();
      ev.push({ type: 'closed' });
      return ev;
    }
    const growing = st.grow > 0;
    for (let i = 0; i < st.snake.length; i++) {
      if (i === st.snake.length - 1 && !growing) break;              // the tail moves out of the way
      const s = st.snake[i];
      if (s[0] === nx && s[1] === ny) { st.alive = false; ev.push({ type: 'die', cause: 'self', x: nx, y: ny }); return ev; }
    }
    st.snake.unshift([nx, ny]);
    if (growing) { st.grow--; st.prev.push(st.prev[st.prev.length - 1].slice()); } else st.snake.pop();
    if (wrapped) ev.push({ type: 'wrap' });

    const bi = bitAt(st, nx, ny);
    if (bi >= 0) {
      const b = st.bits.splice(bi, 1)[0];
      st.eaten++;
      if (b.type === 'gold') st.grow += 3;
      else if (b.type === 'pink') {
        let cut = 0;
        while (cut < 2 && st.snake.length > 3) { st.snake.pop(); st.prev.pop(); cut++; }
        st.grow = 0;
      } else st.grow += 1;
      ev.push({ type: 'eat', bit: b });
      if (st.eaten >= L.goal) { st.won = true; ev.push({ type: 'clear' }); return ev; }
      if (b.type === 'bit') spawn(L, st, 'bit');
    }
    if (!st.bits.some(b => b.type === 'bit') && !L.finale) spawn(L, st, 'bit');
    // timed extras
    for (const b of st.bits) if (b.ttl !== Infinity) b.ttl--;
    const expired = st.bits.filter(b => b.ttl <= 0);
    if (expired.length) { st.bits = st.bits.filter(b => b.ttl > 0); for (const b of expired) ev.push({ type: 'fade', bit: b }); }
    if (L.gold && !st.bits.some(b => b.type === 'gold') && st.rand() < 0.035) { const b = spawn(L, st, 'gold'); if (b) ev.push({ type: 'spawn', bit: b }); }
    if (L.pink && !st.bits.some(b => b.type === 'pink') && st.snake.length > 6 && st.rand() < 0.03) { const b = spawn(L, st, 'pink'); if (b) ev.push({ type: 'spawn', bit: b }); }
    // drifting bits wander one cell every few steps
    if (L.drift && st.steps % 3 === 0) {
      for (const b of st.bits) {
        const opts = DIRS.map(([dx, dy]) => [(b.x + dx + W) % W, (b.y + dy + H) % H])
          .filter(([x, y]) => !L.walls[key(x, y)] && L.reach[key(x, y)] && !occupied(st, x, y) && bitAt(st, x, y) < 0);
        if (opts.length) { const [x, y] = opts[Math.floor(st.rand() * opts.length)]; b.px = b.x; b.py = b.y; b.x = x; b.y = y; b.moved = st.steps; }
      }
    }
    // the finale keeps growing: nothing to eat, nowhere to go
    if (L.finale) { st.growEvery = Math.max(2, 6 - Math.floor(st.steps / 45)); if (st.steps % st.growEvery === 0) { st.grow++; ev.push({ type: 'grow' }); } }
    return ev;
  }

  const api = { W, H, DIRS, LEVELS, buildLevel, endlessLevel, newState, turn, step, interval, rng, key };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OB = api;
})(this);
