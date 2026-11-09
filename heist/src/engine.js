// ONE MINUTE HEIST engine. One room, a one-minute loop, guards with flashlights, a gem to steal.
// Every minute the room resets and you start again, keeping only what you learned.
// The world moves in ticks (six per second); everything is deterministic, shared by the browser and Node.
(function (root) {
  const W = 15, H = 11, TPS = 6, LOOP = 60 * TPS;   // 360 ticks in a minute
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];  // up right down left
  const VIEW = 4, TIMED = 10 * TPS;                  // flashlight reach, lever gates stay open for 10 s

  // Legend: # wall  S start and exit  G gem  k key  D locked door (a key opens it for this loop)
  //         p plate (holds V bars open while someone stands on it)  l lever (opens T gates for 10 s)
  // guards: { path: [[x,y], ...] waypoints joined by straight lines, every: ticks per step, pause: ticks at each end }
  // echo: true means the guard is you, replaying your previous minute.
  const HEISTS = [
    { name: 'The Job', hint: 'Take the gem and get back to the door you came in. Stay out of the light.', map: [
      '###############', '#S.....#......#', '#......#......#', '#......#......#', '#.............#', '#......#....G.#',
      '#......#......#', '#......#......#', '#......#......#', '#......#......#', '###############'],
      guards: [{ path: [[8, 5], [13, 5]], every: 2, pause: 3 }] },
    { name: 'Keycard', hint: 'The vault door is locked. Somebody left a keycard upstairs.', map: [
      '###############', '#S....#.......#', '#.....#...k...#', '#.....#.......#', '#.............#', '#.....#########',
      '#.....#.......#', '#.....D...G...#', '#.....#.......#', '#.....#.......#', '###############'],
      guards: [{ path: [[8, 1], [12, 1], [12, 3], [8, 3]], loop: true, every: 2 }, { path: [[8, 6], [12, 6], [12, 9], [8, 9]], loop: true, every: 2, offset: 7 }] },
    { name: 'Lever', hint: 'The lever opens the vault gate for ten seconds. Run.', map: [
      '###############', '#S...........l#', '#.............#', '#.###########.#', '#.#.........#.#', '#.#....G....#.#',
      '#.#.........#.#', '#.####T######.#', '#.............#', '#.............#', '###############'],
      guards: [{ path: [[4, 4], [10, 4], [10, 6], [4, 6]], loop: true, every: 2 }, { path: [[2, 9], [12, 9]], every: 2, pause: 2 }] },
    { name: 'Pressure', hint: 'The bars only open while something stands on the gold plate.', map: [
      '###############', '#S......#.....#', '#.......#..p..#', '#.......#.....#', '#.......#.....#', '#.............#',
      '#.......###V###', '#.......#.....#', '#.......#..G..#', '#.......#.....#', '###############'],
      guards: [{ path: [[11, 5], [11, 2]], every: 2, pause: 14 }, { path: [[2, 3], [5, 3], [5, 8], [2, 8]], loop: true, every: 3 }] },
    { name: 'Night Shift', hint: 'Three guards tonight. Watch them for a minute first, if you like.', map: [
      '###############', '#S..#.....#..k#', '#...#.....#...#', '#...#..#..#...#', '#......#......#', '###.#######.###',
      '#.............#', '#.#####D#####.#', '#.#.........#.#', '#.#....G....#.#', '###############'],
      guards: [{ path: [[5, 1], [9, 1], [9, 2], [5, 2]], loop: true, every: 2 }, { path: [[1, 6], [13, 6]], every: 2, pause: 4 }, { path: [[3, 8], [11, 8]], every: 3, pause: 6, offset: 20 }] },
    { name: 'Fool You', hint: 'No guard tonight. Strange.', finale: true, map: [
      '###############', '#S............#', '#.............#', '#.....###V###.#', '#.....#.....#.#', '#.....#..G..#.#',
      '#.....#.....#.#', '#.....#######.#', '#.............#', '#............p#', '###############'],
      guards: [{ echo: true }] },
  ];

  function parse(def) {
    const rows = def.map, tiles = new Uint8Array(W * H);   // 0 floor 1 wall 2 door 3 bars 4 timed gate
    let sx = 1, sy = 1, gem = -1; const keys = [], plates = [], levers = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = rows[y][x], k = y * W + x;
      if (ch === '#') tiles[k] = 1; else if (ch === 'D') tiles[k] = 2; else if (ch === 'V') tiles[k] = 3; else if (ch === 'T') tiles[k] = 4;
      else if (ch === 'S') { sx = x; sy = y; } else if (ch === 'G') gem = k; else if (ch === 'k') keys.push(k);
      else if (ch === 'p') plates.push(k); else if (ch === 'l') levers.push(k);
    }
    const L = Object.assign({ hint: '', guards: [] }, def, { tiles, sx, sy, gem, keys, plates, levers });
    L.routes = L.guards.filter(g => !g.echo).map(g => route(g));
    return L;
  }
  // a guard's position and facing for every tick of the minute
  function route(g) {
    const legs = [g.path[0].slice()];                       // straight legs between waypoints, one tile at a time
    for (let i = 1; i < g.path.length; i++) { let [cx, cy] = legs[legs.length - 1]; const [x, y] = g.path[i];
      while (cx !== x) { cx += Math.sign(x - cx); legs.push([cx, cy]); } while (cy !== y) { cy += Math.sign(y - cy); legs.push([cx, cy]); } }
    if (g.loop) { let [cx, cy] = legs[legs.length - 1]; const [x, y] = legs[0];   // close the circuit back to the start
      while (cx !== x) { cx += Math.sign(x - cx); legs.push([cx, cy]); } while (cy !== y) { cy += Math.sign(y - cy); legs.push([cx, cy]); } legs.pop(); }
    const every = g.every || 2, pause = g.pause || 0, out = [];
    let i = 0, dir = 1, wait = pause, f = g.face !== undefined ? g.face : faceTo(legs[0], legs[1] || legs[0]), t = (g.offset || 0);
    // run the route forward so guards can start mid-patrol
    const ticks = LOOP + 2 + (g.offset || 0);
    for (let k = 0; k < ticks; k++) {
      if (k >= (g.offset || 0)) out.push({ x: legs[i][0], y: legs[i][1], f });
      if ((k + 1) % every) continue;
      if (g.loop) { const n = (i + 1) % legs.length; f = faceTo(legs[i], legs[n]); i = n; continue; }
      const n = i + dir;
      if (n < 0 || n >= legs.length) { if (wait > 0) { wait--; continue; } dir = -dir; wait = pause; f = faceTo(legs[i], legs[i + dir]); continue; }
      f = faceTo(legs[i], legs[n]); i = n;
    }
    return out;
  }
  function faceTo(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; return dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : dx < 0 ? 3 : 2; }

  function newLoop(L, run) {
    const st = { x: L.sx, y: L.sy, f: 2, t: 0, hasGem: false, keys: 0, opened: new Set(), leverUntil: -1, caught: false, won: false, over: false,
      path: [{ x: L.sx, y: L.sy, f: 2 }], loop: run ? run.loop : 1, echo: run && run.lastPath ? run.lastPath : null };
    return st;
  }
  const blockedTile = (L, st, k, plateHeld) => {
    const t = L.tiles[k];
    if (t === 1) return true;
    if (t === 2) return !st.opened.has(k);
    if (t === 3) return !plateHeld;
    if (t === 4) return !(st.leverUntil > st.t);
    return false;
  };
  // where every watcher is at tick t (guards on routes, and your echo replaying your last minute)
  function watchers(L, st, t) {
    const out = L.routes.map(r => r[Math.min(t, r.length - 1)]);
    if (st.echo && L.guards.some(g => g.echo)) out.push(Object.assign({ echo: true }, st.echo[Math.min(t, st.echo.length - 1)]));
    return out;
  }
  function plateHeldAt(L, st, t, px, py) {
    if (!L.plates.length) return false;
    const ws = watchers(L, st, t);
    return L.plates.every(k => { const x = k % W, y = (k / W) | 0; return (px === x && py === y) || ws.some(w => w.x === x && w.y === y); });
  }
  // the tiles a flashlight lights up: a short cone, stopped by walls and closed doors
  function cone(L, st, w, plateHeld) {
    const out = [], [dx, dy] = DIRS[w.f];
    for (let d = 1; d <= VIEW; d++) {
      const spread = d === 1 ? 0 : 1;
      for (let s = -spread; s <= spread; s++) {
        const x = w.x + dx * d + (dy !== 0 ? s : 0), y = w.y + dy * d + (dx !== 0 ? s : 0);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (los(L, st, w.x, w.y, x, y, plateHeld)) out.push(y * W + x);
      }
    }
    return out;
  }
  function los(L, st, x0, y0, x1, y1, plateHeld) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 1; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      if (blockedTile(L, st, y * W + x, plateHeld)) return false;
    }
    return true;
  }

  // one tick. dir: 0..3 to step, -1 to wait
  function step(L, st, dir) {
    const ev = [];
    if (st.over) return ev;
    const t1 = st.t + 1;
    if (dir >= 0) {
      st.f = dir;
      const nx = st.x + DIRS[dir][0], ny = st.y + DIRS[dir][1], k = ny * W + nx;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) {
        if (L.tiles[k] === 2 && !st.opened.has(k) && st.keys > 0) { st.opened.add(k); ev.push({ type: 'unlock', k }); }
        const held = plateHeldAt(L, st, t1, nx, ny) || plateHeldAt(L, st, st.t, st.x, st.y);
        if (!blockedTile(L, st, k, held)) { st.x = nx; st.y = ny; ev.push({ type: 'move' }); }
        else ev.push({ type: 'bump' });
      }
    }
    st.t = t1;
    const k = st.y * W + st.x;
    if (L.keys.includes(k) && !(st.keysTaken || (st.keysTaken = new Set())).has(k)) { st.keysTaken.add(k); st.keys++; ev.push({ type: 'key' }); }
    if (L.levers.includes(k) && st.leverUntil <= st.t) { st.leverUntil = st.t + TIMED; ev.push({ type: 'lever' }); }
    if (k === L.gem && !st.hasGem) { st.hasGem = true; ev.push({ type: 'gem' }); }
    st.path.push({ x: st.x, y: st.y, f: st.f });
    // caught?
    const held = plateHeldAt(L, st, st.t, st.x, st.y);
    const ws = watchers(L, st, st.t), prev = watchers(L, st, st.t - 1), me = st.path[st.path.length - 2];
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i], p = prev[i];
      const swapped = p && w.x === me.x && w.y === me.y && p.x === st.x && p.y === st.y;
      if ((w.x === st.x && w.y === st.y) || swapped || cone(L, st, w, held).includes(k)) { st.caught = true; st.over = true; ev.push({ type: 'caught', by: i, echo: !!w.echo }); return ev; }
    }
    if (st.hasGem && st.x === L.sx && st.y === L.sy) { st.won = true; st.over = true; ev.push({ type: 'win' }); return ev; }
    if (st.t >= LOOP) { st.over = true; ev.push({ type: 'timeup' }); }
    return ev;
  }

  const api = { W, H, TPS, LOOP, DIRS, VIEW, TIMED, HEISTS, parse, route, newLoop, step, watchers, cone, plateHeldAt, blockedTile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HE = api;
})(this);
