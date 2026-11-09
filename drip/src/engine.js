// DRIP engine: a drop of light falling down a shaft, slipping between lanes through gaps in the gates.
// At the bottom the world flips and you rise back up through the same shaft, every gate in reverse.
// Pure logic, fixed 60 Hz steps, deterministic, shared by the browser and Node.
(function (root) {
  const LANES = 5, LW = 16, WALL = 8, SW = WALL * 2 + LANES * LW;   // shaft width in pixels
  const SP = 56, N = 150, CP = 25;                                    // gate spacing, gates per half, checkpoint every N gates
  const SWITCH = 6;                                                    // frames to slide one lane
  const BIOMES = ['Moss', 'Crystal', 'Roots', 'Ember', 'Abyss'];
  const START = 120;

  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const laneX = l => WALL + l * LW + LW / 2;

  // The shaft is the same for everyone. Each gate has at least one gap, and a "safe lane" path through all of
  // them never needs more than two lane changes between neighbouring gates (one between close pairs).
  function buildCourse(seed) {
    const R = rng(seed || 20261109);
    const down = []; let safe = 2, y = START;
    for (let i = 0; i < N; i++) {
      const biome = Math.min(4, Math.floor(i / (N / 5)));
      const close = i > 10 && R() < 0.12 + biome * 0.03;                // a quick double: half spacing
      const reach = close ? 1 : 2;
      const next = Math.max(0, Math.min(LANES - 1, safe + Math.round((R() * 2 - 1) * reach)));
      let gaps = 1 << next;
      const extra = biome < 1 ? 2 : biome < 3 ? 1 : R() < 0.5 ? 1 : 0;   // deeper gates have fewer gaps
      for (let k = 0; k < extra; k++) gaps |= 1 << Math.floor(R() * LANES);
      if (i < 4) gaps |= 1 << safe;
      y += i === 0 ? 0 : close ? SP / 2 : SP;
      down.push({ i, y, gaps, safe: next, biome, cp: i % CP === 0, close });
      safe = next;
    }
    const bottom = y + 140;                                             // the pool
    // motes: one between most gates, sometimes off the safe lane (a small risk for a small reward)
    const motes = (gates, salt) => { const R2 = rng(salt), out = [];
      for (let i = 0; i + 1 < gates.length; i++) { if (R2() < 0.25) continue; const a = gates[i], b = gates[i + 1];
        const lane = R2() < 0.55 ? b.safe : Math.max(0, Math.min(LANES - 1, b.safe + (R2() < 0.5 ? -1 : 1)));
        out.push({ y: (a.y + b.y) / 2, lane }); }
      return out; };
    return { down, bottom, motesDown: motes(down, 77), motesUp: motes(down.slice().reverse(), 91) };
  }

  // speed rises through each half
  function speed(st, C) {
    const p = st.phase === 'down' ? st.y / C.bottom : st.phase === 'up' ? 1 - st.y / C.bottom : 0;
    return (st.phase === 'up' ? 78 : 70) + 52 * Math.min(1, Math.max(0, p) * 1.15);
  }

  function newRun(C) {
    const st = { phase: 'down', y: 40, lane: 2, target: 2, x: laneX(2), glow: 3, inv: 0, hits: 0, fades: 0, next: 0, cp: 0,
      got: new Set(), frame: 0, flipT: 0, won: false, moved: 0 };
    return st;
  }
  // gates in the order you meet them; in the up phase the shaft is the same, walked backwards
  const gateList = (C, st) => st.phase === 'up' ? C.down.slice().reverse() : C.down;
  const motesOf = (C, st) => st.phase === 'up' ? C.motesUp : C.motesDown;

  // input: -1 left, +1 right, 0 nothing (a press, not a hold)
  function step(C, st, input) {
    const ev = [];
    if (st.won) return ev;
    st.frame++;
    if (input && st.phase !== 'flip') {
      const t = Math.max(0, Math.min(LANES - 1, st.target + input));
      if (t !== st.target) { st.target = t; st.moved++; ev.push({ type: 'move', dir: input }); }
    }
    // slide toward the target lane
    const tx = laneX(st.target), dx = tx - st.x, sp = LW / SWITCH;
    st.x = Math.abs(dx) <= sp ? tx : st.x + Math.sign(dx) * sp;
    st.lane = Math.round((st.x - WALL - LW / 2) / LW);
    if (st.inv > 0) st.inv--;

    if (st.phase === 'flip') {
      if (++st.flipT >= 150) { st.phase = 'up'; st.next = 0; st.cp = 0; ev.push({ type: 'rise' }); }
      return ev;
    }
    const prevY = st.y, dy = speed(st, C) / 60, dir = st.phase === 'up' ? -1 : 1;
    st.y += dy * dir;
    const gates = gateList(C, st);
    // gates: judged the moment the drop's centre crosses the gate line
    while (st.next < gates.length) {
      const g = gates[st.next], gy = g.y;
      const crossed = dir > 0 ? prevY < gy && st.y >= gy : prevY > gy && st.y <= gy;
      if (!crossed) break;
      if (g.cp) { st.cp = st.next; ev.push({ type: 'checkpoint', i: st.next }); }
      let hit = false;
      for (let l = 0; l < LANES; l++) {
        if (g.gaps & (1 << l)) continue;
        const a = WALL + l * LW, b = a + LW;
        if (st.x + 2.5 > a + 0.5 && st.x - 2.5 < b - 0.5) { hit = true; break; }
      }
      st.next++;
      if (hit) {
        if (st.inv > 0) { ev.push({ type: 'graze', i: st.next - 1 }); continue; }
        st.hits++; st.glow--; st.inv = 50; ev.push({ type: 'hit', i: st.next - 1, glow: st.glow });
        if (st.glow <= 0) { fade(C, st, ev); return ev; }
      } else ev.push({ type: 'pass', i: st.next - 1, close: g.close });
    }
    // motes
    const ms = motesOf(C, st), tag = st.phase === 'up' ? 'u' : 'd';
    for (let k = 0; k < ms.length; k++) {
      const m = ms[k], id = tag + k;
      if (st.got.has(id) || Math.abs(m.y - st.y) > 6) continue;
      if (Math.abs(laneX(m.lane) - st.x) < 7) { st.got.add(id); ev.push({ type: 'mote', id, n: st.got.size }); }
    }
    // bottom and top
    if (st.phase === 'down' && st.y >= C.bottom) { st.y = C.bottom; st.phase = 'flip'; st.flipT = 0; ev.push({ type: 'flip' }); }
    else if (st.phase === 'up' && st.y <= -30) { st.won = true; ev.push({ type: 'win' }); }
    return ev;
  }
  function fade(C, st, ev) {
    st.fades++;
    const gates = gateList(C, st), g = gates[st.cp];
    st.next = st.cp; st.y = g.y - (st.phase === 'up' ? -70 : 70); st.glow = 3; st.inv = 90;
    st.target = g.safe; st.x = laneX(g.safe); st.lane = g.safe;
    ev.push({ type: 'fade', cp: st.cp });
  }
  const totalMotes = C => C.motesDown.length + C.motesUp.length;

  const api = { LANES, LW, WALL, SW, SP, N, CP, BIOMES, buildCourse, newRun, step, speed, laneX, gateList, motesOf, totalMotes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DR = api;
})(this);
