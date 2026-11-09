// LOOPFALL core engine: wraparound gravity-slide simulation, solver, generator.
// Shared by Node (level verification) and the browser game.
(function (root) {
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 up, 1 right, 2 down, 3 left

  function parseLevel(rows, name) {
    const h = rows.length, w = rows[0].length;
    const tiles = [], shards = [], crates = [];
    let player = null;
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error('ragged row in ' + name);
      for (let x = 0; x < w; x++) {
        let c = rows[y][x];
        if (c === 'P') { player = [x, y]; c = '.'; }
        else if (c === 'C') { crates.push([x, y]); c = '.'; }
        else if (c === '*') { shards.push([x, y]); c = '.'; }
        tiles.push(c);
      }
    }
    if (!player) throw new Error('no player in ' + name);
    return { name: name || '', w, h, tiles, shards, start: { p: player, c: crates, m: 0 } };
  }

  function solidFor(t, dir) {
    if (t === '#') return true;
    if (t === 'b') return dir % 2 === 0; // blue: solid under vertical gravity
    if (t === 'o') return dir % 2 === 1; // amber: solid under horizontal gravity
    return false;
  }

  const wrap = (v, n) => ((v % n) + n) % n;

  // Simulate one gravity shift. Returns new state plus a tick-by-tick record for animation.
  function simulate(L, st, dir) {
    const { w, h, tiles, shards } = L;
    const dx = DX[dir], dy = DY[dir];
    const objs = [{ x: st.p[0], y: st.p[1], ux: st.p[0], uy: st.p[1], moving: true, alive: true, player: true }];
    for (const c of st.c) objs.push({ x: c[0], y: c[1], ux: c[0], uy: c[1], moving: true, alive: true, player: false });
    const paths = objs.map(o => [[o.ux, o.uy]]);
    const events = [];
    let mask = st.m, result = 'ok';
    const allMask = (1 << shards.length) - 1;
    const lane = dir % 2 === 0 ? h : w;
    const limit = lane * 2 + 2;
    const occ = new Map();
    const key = (x, y) => y * w + x;
    let t = 0;
    while (true) {
      // settle: find which moving objects are blocked
      occ.clear();
      objs.forEach((o, i) => { if (o.alive) occ.set(key(o.x, o.y), i); });
      let changed = true;
      while (changed) {
        changed = false;
        for (const o of objs) {
          if (!o.alive || !o.moving) continue;
          const nx = wrap(o.x + dx, w), ny = wrap(o.y + dy, h);
          if (solidFor(tiles[key(nx, ny)], dir)) { o.moving = false; changed = true; continue; }
          const j = occ.get(key(nx, ny));
          if (j !== undefined && !objs[j].moving) { o.moving = false; changed = true; }
        }
      }
      const movers = objs.filter(o => o.alive && o.moving);
      if (!movers.length) break;
      if (t >= limit) {
        // everything still moving is caught in an endless lane
        for (let i = 0; i < objs.length; i++) {
          const o = objs[i];
          if (!o.alive || !o.moving) continue;
          if (o.player) { result = 'loop'; events.push({ t, type: 'loop' }); }
          else { o.alive = false; events.push({ t, type: 'lost', i }); }
        }
        break;
      }
      t++;
      for (const o of movers) {
        o.x = wrap(o.x + dx, w); o.y = wrap(o.y + dy, h); o.ux += dx; o.uy += dy;
      }
      objs.forEach((o, i) => paths[i].push([o.ux, o.uy]));
      const p = objs[0];
      if (p.moving) {
        const tile = tiles[key(p.x, p.y)];
        for (let s = 0; s < shards.length; s++) {
          if (!(mask & (1 << s)) && shards[s][0] === p.x && shards[s][1] === p.y) {
            mask |= 1 << s; events.push({ t, type: 'shard', s, x: p.x, y: p.y });
          }
        }
        if (tile === 'x') { result = 'dead'; events.push({ t, type: 'dead', x: p.x, y: p.y }); break; }
        if (tile === 'E' && mask === allMask) { result = 'win'; events.push({ t, type: 'win', x: p.x, y: p.y }); break; }
      }
      if (result === 'loop') break;
    }
    const ns = {
      p: [objs[0].x, objs[0].y],
      c: objs.slice(1).filter(o => o.alive).map(o => [o.x, o.y]),
      m: mask,
    };
    const moved = objs.some((o, i) => paths[i].length > 1) || events.length > 0;
    return { state: ns, paths, events, result, ticks: t, moved, alive: objs.map(o => o.alive) };
  }

  function stateKey(st) {
    const cs = st.c.map(c => c[1] * 64 + c[0]).sort((a, b) => a - b).join(',');
    return st.p[0] + ',' + st.p[1] + '|' + cs + '|' + st.m;
  }

  // BFS for the shortest solution. Returns {moves, path} or null.
  function solve(L, maxNodes) {
    maxNodes = maxNodes || 300000;
    const start = L.start;
    const seen = new Map();
    seen.set(stateKey(start), null);
    let frontier = [{ st: start, path: [] }];
    let nodes = 0;
    while (frontier.length) {
      const next = [];
      for (const node of frontier) {
        for (let d = 0; d < 4; d++) {
          const r = simulate(L, node.st, d);
          if (!r.moved || r.result === 'dead' || r.result === 'loop') continue;
          const path = node.path.concat(d);
          if (r.result === 'win') return { moves: path.length, path, nodes };
          const k = stateKey(r.state);
          if (seen.has(k)) continue;
          seen.set(k, 1);
          if (++nodes > maxNodes) return null;
          next.push({ st: r.state, path });
        }
      }
      frontier = next;
    }
    return null;
  }

  // ---- generator ----
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function usesWrap(L, path) {
    let st = L.start;
    for (const d of path) {
      const r = simulate(L, st, d);
      for (const p of r.paths) for (const [x, y] of p) if (x < 0 || y < 0 || x >= L.w || y >= L.h) return true;
      st = r.state;
    }
    return false;
  }

  // difficulty 0..1 -> params
  function genParams(diff) {
    const d = Math.max(0, Math.min(1, diff));
    return {
      w: 6 + Math.round(d * 2), h: 7 + Math.round(d * 2),
      walls: 0.2,
      shards: 2 + Math.round(d * 2),
      crates: d < 0.2 ? 0 : (d < 0.6 ? 1 : 2),
      spikes: d < 0.3 ? 0 : 1 + Math.round(d * 2),
      phase: d < 0.4 ? 0 : 0.06 + d * 0.06,
      minMoves: 4 + Math.round(d * 7),
      maxMoves: 8 + Math.round(d * 10),
    };
  }

  function generate(seed, diff, tries) { return generateP(seed, genParams(diff), tries); }

  function generateP(seed, P, tries) {
    const R = rng(seed);
    tries = tries || 400;
    for (let attempt = 0; attempt < tries; attempt++) {
      const w = P.w, h = P.h, n = w * h;
      const grid = new Array(n).fill('.');
      for (let i = 0; i < n; i++) {
        const r = R();
        if (r < P.walls) grid[i] = '#';
        else if (r < P.walls + P.phase) grid[i] = R() < 0.5 ? 'b' : 'o';
      }
      const empties = () => { const e = []; for (let i = 0; i < n; i++) if (grid[i] === '.') e.push(i); return e; };
      const take = (ch) => { const e = empties(); if (!e.length) return false; grid[e[Math.floor(R() * e.length)]] = ch; return true; };
      let ok = take('P') && take('E');
      for (let i = 0; ok && i < P.shards; i++) ok = take('*');
      for (let i = 0; ok && i < P.crates; i++) ok = take('C');
      for (let i = 0; ok && i < P.spikes; i++) ok = take('x');
      if (!ok) continue;
      const rows = [];
      for (let y = 0; y < h; y++) rows.push(grid.slice(y * w, y * w + w).join(''));
      const L = parseLevel(rows, 'gen');
      const sol = solve(L, 60000);
      if (!sol) continue;
      if (sol.moves < P.minMoves || sol.moves > P.maxMoves) continue;
      if (!usesWrap(L, sol.path)) continue;
      L.par = sol.moves; L.rows = rows; L.solution = sol.path;
      return L;
    }
    return null;
  }

  const api = { DX, DY, parseLevel, simulate, solve, generate, generateP, genParams, rng, usesWrap, solidFor, stateKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LF = api;
})(this);
