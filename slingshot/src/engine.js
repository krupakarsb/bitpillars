// SLINGSHOT GARDEN engine: orbit a tiny planet, tap to let go, fly straight, get caught by the next one.
// Every planet you touch blooms. Pure logic, fixed 60 Hz steps, shared by the browser and Node.
(function (root) {
  const WW = 160, WH = 200;              // world size in pixels
  const SPEED = 1.9;                     // flight speed, px per frame
  const RING = 12, INNER = 6;            // capture ring beyond the surface, closest orbit
  const MARGIN = 14;                     // how far past the edge counts as drifting away

  // planets: [x, y, r] or [x, y, r, 'gem']; thorns: [x, y, r]
  const LEVELS = [
    { name: 'First Bloom', hint: 'Tap anywhere to let go. Fly to the next planet.', planets: [[80, 150, 12], [80, 58, 12]], thorns: [] },
    { name: 'Three Seeds', hint: 'Let go when you face where you want to go.', planets: [[44, 160, 11], [116, 112, 11], [50, 52, 11]], thorns: [] },
    { name: 'Small Worlds', hint: 'Small planets spin you faster.', planets: [[80, 168, 14], [128, 108, 6], [36, 96, 7], [96, 38, 10]], thorns: [] },
    { name: 'Thorns', hint: 'Thorns send you back. Fly around them.', planets: [[40, 164, 11], [124, 160, 9], [124, 50, 11], [38, 64, 9]], thorns: [[82, 160, 4], [124, 104, 4], [82, 56, 4], [40, 112, 4]] },
    { name: 'Long Throw', hint: 'Far away, small window. Breathe.', planets: [[30, 172, 9], [134, 24, 9], [130, 170, 7], [30, 30, 7]], thorns: [[80, 100, 6]] },
    { name: 'Ring', hint: 'Bloom the whole ring.', planets: [[80, 176, 9], [138, 124, 8], [124, 46, 8], [36, 46, 8], [22, 124, 8]], thorns: [[80, 100, 7], [70, 92, 3], [92, 110, 3], [92, 90, 3], [68, 112, 3]] },
    { name: 'Detour', hint: 'Some planets only see each other.', planets: [[30, 176, 9], [130, 176, 9], [130, 100, 7], [30, 100, 7], [80, 28, 11]], thorns: [[80, 176, 5], [80, 138, 5], [80, 100, 5], [80, 62, 5], [52, 62, 3], [108, 62, 3]] },
    { name: 'Needle', hint: 'Thread the gap.', planets: [[80, 178, 10], [80, 26, 10], [26, 100, 8], [134, 100, 8]], thorns: [[50, 100, 4], [62, 100, 4], [98, 100, 4], [110, 100, 4], [80, 70, 3], [80, 130, 3]] },
    { name: 'Constellation', hint: 'Every star wants a garden.', planets: [[80, 182, 8], [24, 150, 6], [136, 150, 6], [56, 116, 5], [104, 116, 5], [24, 80, 6], [136, 80, 6], [80, 66, 7], [80, 20, 8]], thorns: [[80, 120, 4], [50, 76, 3], [110, 76, 3], [80, 150, 3]] },
    { name: 'The Gem', hint: 'Bloom the last garden.', finale: true, planets: [[80, 176, 10], [32, 128, 8], [128, 128, 8], [80, 72, 12, 'gem']], thorns: [[80, 128, 4]] },
  ];

  function build(def) {
    const planets = def.planets.map(([x, y, r, kind], i) => ({ i, x, y, r, kind: kind || 'planet', cap: r + RING }));
    const thorns = (def.thorns || []).map(([x, y, r]) => ({ x, y, r }));
    return Object.assign({ hint: '' }, def, { planets, thorns, gem: planets.findIndex(p => p.kind === 'gem') });
  }

  function newState(L) {
    const p = L.planets[0];
    const st = { mode: 'orbit', p: 0, ang: Math.PI * 1.5, dir: 1, d: p.r + 9, x: 0, y: 0, vx: 0, vy: 0, from: -1, clear: false,
      bloom: L.planets.map((q, i) => i === 0), taps: 0, drifts: 0, frame: 0, won: false, letgo: false, last: null, age: 0 };
    place(L, st); st.last = orbitOf(st);
    return st;
  }
  const orbitOf = st => ({ p: st.p, ang: st.ang, dir: st.dir, d: st.d });
  function place(L, st) { const p = L.planets[st.p]; st.x = p.x + Math.cos(st.ang) * st.d; st.y = p.y + Math.sin(st.ang) * st.d; }
  const allBloomed = st => st.bloom.every(Boolean);

  function release(L, st) {
    st.vx = -Math.sin(st.ang) * SPEED * st.dir; st.vy = Math.cos(st.ang) * SPEED * st.dir;
    st.from = st.p; st.clear = false; st.mode = 'fly'; st.taps++; st.age = 0;
  }

  // one 60 Hz frame. tap: true on the frame the player taps.
  function step(L, st, tap) {
    const ev = [];
    if (st.won && !st.letgo) return ev;
    st.frame++;
    if (st.mode === 'orbit') {
      if (tap) {
        const finalGo = L.finale && st.p === L.gem && allBloomed(st);
        release(L, st); ev.push({ type: 'release' });
        if (finalGo) { st.letgo = true; st.won = true; ev.push({ type: 'letgo' }); }
      } else {
        st.ang += st.dir * SPEED / st.d;
        if (st.ang > Math.PI * 2) st.ang -= Math.PI * 2; else if (st.ang < 0) st.ang += Math.PI * 2;
        place(L, st); st.age++;
        return ev;
      }
    }
    // flying in a straight line
    st.x += st.vx; st.y += st.vy; st.age++;
    if (st.letgo) return ev;                              // nothing left to catch
    const from = L.planets[st.from];
    if (!st.clear && Math.hypot(st.x - from.x, st.y - from.y) > from.cap) st.clear = true;
    for (const t of L.thorns) if (Math.hypot(st.x - t.x, st.y - t.y) < t.r + 1.5) { drift(L, st, ev, 'thorn', t); return ev; }
    let best = -1, bd = 1e9;
    for (const p of L.planets) {
      if (p.i === st.from && !st.clear) continue;
      const dd = Math.hypot(st.x - p.x, st.y - p.y);
      if (dd <= p.cap && dd < bd) { bd = dd; best = p.i; }
    }
    if (best >= 0) {
      const p = L.planets[best], rx = st.x - p.x, ry = st.y - p.y;
      st.p = best; st.d = Math.max(p.r + INNER, Math.min(p.cap, bd)); st.ang = Math.atan2(ry, rx); if (st.ang < 0) st.ang += Math.PI * 2;
      st.dir = rx * st.vy - ry * st.vx >= 0 ? 1 : -1; st.mode = 'orbit'; st.age = 0;
      place(L, st);
      const fresh = !st.bloom[best]; st.bloom[best] = true; st.last = orbitOf(st);
      ev.push({ type: 'catch', p: best, fresh });
      if (!L.finale && allBloomed(st)) { st.won = true; ev.push({ type: 'win' }); }
      if (L.finale && best === L.gem && allBloomed(st)) ev.push({ type: 'gemready' });
      return ev;
    }
    if (st.x < -MARGIN || st.y < -MARGIN || st.x > WW + MARGIN || st.y > WH + MARGIN) drift(L, st, ev, 'away');
    return ev;
  }
  function drift(L, st, ev, cause, t) {
    st.drifts++;
    ev.push({ type: 'drift', cause, x: st.x, y: st.y, t });
    Object.assign(st, st.last); st.mode = 'orbit'; st.age = 0; place(L, st);
    ev.push({ type: 'respawn' });
  }

  const snapshot = st => ({ mode: st.mode, p: st.p, ang: st.ang, dir: st.dir, d: st.d, x: st.x, y: st.y, vx: st.vx, vy: st.vy, from: st.from, clear: st.clear,
    bloom: st.bloom.slice(), taps: st.taps, drifts: st.drifts, frame: st.frame, won: st.won, letgo: st.letgo, last: Object.assign({}, st.last), age: st.age });
  const restore = (st, s) => { Object.assign(st, s, { bloom: s.bloom.slice(), last: Object.assign({}, s.last) }); };

  const api = { WW, WH, SPEED, RING, LEVELS, build, newState, step, snapshot, restore, allBloomed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SG = api;
})(this);
