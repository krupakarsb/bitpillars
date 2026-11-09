// LUMEN engine: light makes the rules.
//   red light   -> that floor is solid for you (things can still be pushed into it)
//   blue light  -> that floor is ice (you slide across it)
//   red + blue  -> they cancel out: plain floor again
//   gold light  -> wakes the door; step onto a lit door to leave
// You push lamps, mirrors and crates to move the light around. Turn-based, deterministic, shared by browser and Node.
(function (root) {
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];                    // up right down left
  const SLASH = [1, 0, 3, 2], BACK = [3, 2, 1, 0];                    // '/' and '\' reflections, by travel direction
  const COLORS = { r: 1, b: 2, g: 4 };

  // map: # wall · floor @ you O door C crate / \ mirrors * rune (finale)   lamps: [x, y, colour r|b|g, direction 0-3]
  function parse(def) {
    const rows = def.map, H = rows.length, W = rows[0].length, wall = new Uint8Array(W * H);
    let px = 1, py = 1, door = -1; const objs = [], runes = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = rows[y][x], k = y * W + x;
      if (ch === '#') wall[k] = 1;
      else if (ch === '@') { px = x; py = y; }
      else if (ch === 'O') door = k;
      else if (ch === 'C') objs.push({ t: 'c', x, y });
      else if (ch === '/' || ch === '\\') objs.push({ t: 'm', x, y, m: ch });
      else if (ch === '*') runes.push(k);
    }
    for (const [x, y, c, d] of def.lamps || []) objs.push({ t: 'l', x, y, c, d });
    return Object.assign({ hint: '' }, def, { W, H, wall, px, py, door, objs, runes });
  }
  function newState(L) {
    return { px: L.px, py: L.py, face: 2, objs: L.objs.map(o => Object.assign({}, o)), lit: 0, moves: 0, won: false };
  }
  const clone = st => ({ px: st.px, py: st.py, face: st.face, objs: st.objs.map(o => Object.assign({}, o)), lit: st.lit, moves: st.moves, won: st.won });

  // trace every beam. Returns per-tile colour bits and the beam segments for drawing.
  function light(L, st) {
    const W = L.W, H = L.H, bits = new Uint8Array(W * H), occ = new Int16Array(W * H).fill(-1), segs = [];
    st.objs.forEach((o, i) => { occ[o.y * W + o.x] = i; });
    const shoot = (x, y, d, c) => {
      const seen = new Set(); const bit = COLORS[c];
      for (let n = 0; n < 400; n++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
        const k = ny * W + nx;
        if (L.wall[k]) { segs.push({ x, y, nx, ny, c, end: true }); return; }
        const sk = k * 4 + d; if (seen.has(sk)) return; seen.add(sk);
        segs.push({ x, y, nx, ny, c });
        bits[k] |= bit;
        const oi = occ[k];
        if (oi >= 0) { const o = st.objs[oi]; if (o.t !== 'm') return; d = o.m === '/' ? SLASH[d] : BACK[d]; }
        x = nx; y = ny;
      }
    };
    for (const o of st.objs) if (o.t === 'l') shoot(o.x, o.y, o.d, o.c);
    if (L.finale) shoot(st.px, st.py, st.face, 'g');                // in the dark, you are the light
    return { bits, segs, occ };
  }
  const solidBits = b => (b & 1) && !(b & 2);
  const iceBits = b => (b & 2) && !(b & 1);

  // one move. Returns events. dir 0-3.
  function move(L, st, dir) {
    const ev = [];
    if (st.won) return ev;
    const W = L.W, H = L.H; st.face = dir;
    let lt = light(L, st);
    const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !L.wall[y * W + x] && lt.occ[y * W + x] < 0 && !solidBits(lt.bits[y * W + x]);
    const tx = st.px + DIRS[dir][0], ty = st.py + DIRS[dir][1];
    if (tx < 0 || ty < 0 || tx >= W || ty >= H || L.wall[ty * W + tx]) { ev.push({ type: 'bump' }); return finish(L, st, ev); }
    const oi = lt.occ[ty * W + tx];
    if (oi >= 0) {
      const bx = tx + DIRS[dir][0], by = ty + DIRS[dir][1];
      const okBox = bx >= 0 && by >= 0 && bx < W && by < H && !L.wall[by * W + bx] && lt.occ[by * W + bx] < 0;   // red light stops you, not things
      if (!okBox || by * W + bx === L.door || L.runes.includes(by * W + bx)) { ev.push({ type: 'bump' }); return finish(L, st, ev); }
      const o = st.objs[oi]; o.x = bx; o.y = by; ev.push({ type: 'push', t: o.t });
    } else if (solidBits(lt.bits[ty * W + tx])) { ev.push({ type: 'blocked' }); return finish(L, st, ev); }
    st.px = tx; st.py = ty; st.moves++; ev.push({ type: 'step' });
    // ice: keep sliding while you stand on blue light and the way ahead is clear
    for (let n = 0; n < 50; n++) {
      lt = light(L, st);
      if (!iceBits(lt.bits[st.py * W + st.px])) break;
      const nx = st.px + DIRS[dir][0], ny = st.py + DIRS[dir][1];
      if (!free(nx, ny)) break;
      st.px = nx; st.py = ny; ev.push({ type: 'slide' });
    }
    return finish(L, st, ev);
  }
  function finish(L, st, ev) {
    const lt = light(L, st);
    if (L.finale) {
      L.runes.forEach((k, i) => { if ((lt.bits[k] & 4) && !(st.lit & (1 << i))) { st.lit |= 1 << i; ev.push({ type: 'rune', i }); } });
      if (L.runes.length && st.lit === (1 << L.runes.length) - 1) { st.won = true; ev.push({ type: 'win' }); }
    } else if (st.py * L.W + st.px === L.door && (lt.bits[L.door] & 4)) { st.won = true; ev.push({ type: 'win' }); }
    return ev;
  }
  const doorOpen = (L, st) => L.door >= 0 && !!(light(L, st).bits[L.door] & 4);

  // breadth-first search for the fewest moves. Used for par, hints and to check generated rooms.
  const keyOf = (L, st) => st.px + ',' + st.py + (L.finale ? ',' + st.face + ',' + st.lit : '') + '|' + st.objs.map(o => o.x + ',' + o.y).join(';');
  function solve(L, st0, cap) {
    const start = clone(st0 || newState(L)); start.won = false;
    const seen = new Map([[keyOf(L, start), null]]); let layer = [start], depth = 0; const lim = cap || 250000;
    while (layer.length) {
      const next = [];
      for (const s of layer) for (let d = 0; d < 4; d++) {
        const n = clone(s); const ev = move(L, n, d);
        if (!L.finale && ev.length === 1 && ev[0].type !== 'step' && n.face === s.face) continue;
        const k = keyOf(L, n); if (seen.has(k)) continue; seen.set(k, { k: keyOf(L, s), d });
        if (n.won) { const path = []; let c = k; while (seen.get(c)) { path.unshift(seen.get(c).d); c = seen.get(c).k; } return { moves: path, nodes: seen.size }; }
        next.push(n);
        if (seen.size > lim) return { moves: null, nodes: seen.size, capped: true };
      }
      layer = next; depth++;
    }
    return { moves: null, nodes: seen.size };
  }

  // ---------------- procedural rooms ----------------
  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // tier 0: gold only · 1: + red · 2: + mirrors · 3: + blue · 4: everything
  function generate(seed, tier, opts) {
    const R = rng(seed), W = 7 + Math.floor(R() * 3), H = 7 + Math.floor(R() * 2);
    const g = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1) ? '#' : '.'));
    const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) cells.push([x, y]);
    const take = () => { for (let n = 0; n < 200; n++) { const [x, y] = cells[Math.floor(R() * cells.length)]; if (g[y][x] === '.') return [x, y]; } return null; };
    const nWalls = Math.floor(R() * (W + H) * (tier >= 2 ? 0.35 : 0.6));
    for (let i = 0; i < nWalls; i++) { const p = take(); if (p) g[p[1]][p[0]] = '#'; }
    const put = ch => { const p = take(); if (p) g[p[1]][p[0]] = ch; return p; };
    put('@'); put('O');
    const lamps = [];
    const lamp = c => { const p = take(); if (p) { g[p[1]][p[0]] = 'L'; lamps.push([p[0], p[1], c, Math.floor(R() * 4)]); } };
    lamp('g');
    if (tier === 1 || tier === 4 || (tier >= 2 && R() < 0.4)) { lamp('r'); if (tier === 1 && R() < 0.4) lamp('r'); }
    if (tier >= 3) lamp('b');

    if (tier === 2 || (tier >= 4 && R() < 0.6)) put(R() < 0.5 ? '/' : '\\');
    if (tier === 2 && R() < 0.25) put(R() < 0.5 ? '/' : '\\');
    const crates = R() < (tier >= 2 ? 0.35 : 0.6) ? 1 : 0; for (let i = 0; i < crates; i++) put('C');
    const map = g.map(r => r.join('').replace(/L/g, '.'));
    return { name: 'Room ' + (seed % 10000), map, lamps, seed, tier };
  }
  // keep a room only if it is solvable in the target range, the door starts dark, and every lamp and mirror matters
  function check(def, minMoves, maxMoves, cap) {
    const L = parse(def), st = newState(L);
    if (doorOpen(L, st)) return null;
    const s = solve(L, st, cap || 60000);
    if (!s.moves || s.moves.length < minMoves || s.moves.length > maxMoves) return null;
    // every lamp, mirror and crate has to matter: take it away and the room must change (impossible, easier or harder)
    for (let i = 0; i < L.objs.length; i++) {
      const o = L.objs[i];
      if (o.t === 'l' && o.c === 'g') continue;
      const d2 = JSON.parse(JSON.stringify(def));
      if (o.t === 'l') d2.lamps = d2.lamps.filter(l => !(l[0] === o.x && l[1] === o.y));
      else d2.map = d2.map.map((r, y) => y === o.y ? r.slice(0, o.x) + '.' + r.slice(o.x + 1) : r);
      const L2 = parse(d2), s2 = solve(L2, null, cap || 60000);
      if (s2.moves && s2.moves.length === s.moves.length) return null;   // no change at all: it's decoration, not a puzzle piece
    }
    return { par: s.moves.length, solution: s.moves };
  }
  function makeRoom(seed, tier, minMoves, maxMoves, tries) {
    for (let t = 0; t < (tries || 400); t++) {
      const def = generate(seed * 1000 + t, tier);
      const c = check(def, minMoves, maxMoves);
      if (c) return Object.assign(def, c);
    }
    return null;
  }

  const api = { DIRS, parse, newState, clone, light, move, solve, generate, check, makeRoom, rng, doorOpen, solidBits, iceBits, keyOf, LEVELS: [] };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LU = api;
})(this);
