// ECHO engine: ten-second rooms. Every life you lose leaves a frozen echo you can stand on.
// Pure logic, no DOM. Fixed 60 Hz steps, deterministic, shared by the browser and Node.
(function (root) {
  const T = 8, W = 20, H = 13;                 // tile size, room size in tiles
  const PW = 6, PH = 7;                         // player hitbox
  const RUN = 1.2, GRAV = 0.22, MAXFALL = 3.4, JUMP = 3.0, CUT = 1.0;
  const COYOTE = 5, BUFFER = 6, LIFE = 600;     // frames (10 s)

  // Legend: # wall  ^ spikes  v ceiling spikes  S start  E exit  p plate  G gate (open while every plate is held down)
  const LEVELS = [
    { name: 'First Steps', cap: 3, hint: 'Arrows or A/D to move, Up/W/Space to jump. Reach the door.', touchHint: 'Hold the arrows to move, JUMP to jump. Reach the door.', map: [
      '####################', '#..................#', '#..................#', '#..................#', '#..................#', '#..................#',
      '#..................#', '#..................#', '#..................#', '#...........##.....#', '#S.....#....##...E.#', '#####...############', '#####...############'] },
    { name: 'Too High', cap: 3, hint: 'Too high? Press Down (or wait ten seconds) to freeze. Your echo stays. Stand on it.', touchHint: 'Too high? Tap ECHO (or wait ten seconds) to freeze. Your echo stays. Stand on it.', map: [
      '####################', '#..................#', '#..................#', '#..................#', '#..................#', '#..................#',
      '#..................#', '#..................#', '#.........##.......#', '#.........##.......#', '#S........##....E..#', '####################', '####################'] },
    { name: 'Spikes', cap: 4, hint: 'Spikes end a life, but your echo covers the spike.', map: [
      '####################', '#..................#', '#..................#', '#..................#', '#..................#', '#..................#',
      '#..................#', '#..................#', '#..................#', '#..................#', '#S...^^^^^^^^^...E.#', '####################', '####################'] },
    { name: "Echoes Don't Fall", cap: 4, hint: 'Freeze in mid-air. Echoes stay exactly where you leave them.', map: [
      '####################', '#..................#', '#..................#', '#..................#', '#..................#', '#..................#',
      '#..................#', '#..................#', '#..................#', '#..................#', '#S..............E..#', '#####.........######', '#####.........######'] },
    { name: 'Plate', cap: 3, hint: 'A gold plate opens the gate while something holds it down.', map: [
      '####################', '#.............#....#', '#.............#....#', '#.............#....#', '#.............#....#', '#.............#....#',
      '#.............#....#', '#.............#....#', '#.............#....#', '#.............G..E.#', '#S.p..........G....#', '####################', '####################'] },
    { name: 'Higher', cap: 4, hint: 'Build a staircase out of yourself.', map: [
      '####################', '#..................#', '#.............E....#', '#...........########', '#..................#', '#..................#',
      '#..................#', '#..................#', '#..................#', '#..................#', '#S.................#', '####################', '####################'] },
    { name: 'Two Plates', cap: 3, hint: 'Only three echoes can stay. The oldest one fades first.', map: [
      '####################', '#..............#...#', '#..............#...#', '#..............#...#', '#..............#...#', '#.p............#...#',
      '#######........#...#', '#..............#...#', '#..............#...#', '#..............G...#', '#S..p..........G.E.#', '####################', '####################'] },
    { name: 'Low Ceiling', cap: 6, hint: 'No room to jump. Pave the way.', map: [
      '####################', '#....#########.....#', '#....#########.....#', '#....#########.....#', '#....#########.....#', '#....#########.....#',
      '#....#########.....#', '#....#########.....#', '#....vvvvvvvvv.....#', '#..................#', '#S....^^^^^......E.#', '####################', '####################'] },
    { name: 'Gatekeeper', cap: 4, hint: 'The plate is on the pillar. The door is past the gate.', map: [
      '####################', '#................#.#', '#................#.#', '#................#.#', '#................#.#', '#................#.#',
      '#..........p.....#.#', '#.........###....#.#', '#.........###....#.#', '#.........###....G.#', '#S..^^^^^^###^^^.GE#', '####################', '####################'] },
    { name: 'Seven', cap: 7, hint: 'Only seven echoes can stay. Make every one count.', map: [
      '####################', '#..............G.E.#', '#..............#####', '#..................#', '#..................#', '#..................#',
      '#..................#', '#..................#', '#..................#', '#..................#', '#S.................#', '###p####p####p######', '####################'] },
  ];

  function parse(def) {
    const rows = def.map.slice();
    while (rows.length < H) rows.unshift('#' + '.'.repeat(W - 2) + '#');
    const tiles = new Uint8Array(W * H);         // 0 air, 1 wall, 2 spike, 3 exit, 4 plate, 5 gate
    let sx = 1, sy = 1; const plates = [], gates = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = (rows[r] || '')[c] || '#', k = r * W + c;
      if (ch === '#') tiles[k] = 1;
      else if (ch === '^') tiles[k] = 2;
      else if (ch === 'v') tiles[k] = 6;
      else if (ch === 'E') tiles[k] = 3;
      else if (ch === 'p') { tiles[k] = 4; plates.push(k); }
      else if (ch === 'G') { tiles[k] = 5; gates.push(k); }
      else if (ch === 'S') { sx = c; sy = r; }
    }
    return Object.assign({ cap: 99, par: 0, hint: '' }, def, { tiles, sx, sy, plates, gates });
  }

  function newRun(L) {
    const st = { echoes: [], lives: 1, deaths: 0, won: false, frame: 0 };
    spawn(L, st); st.wasOpen = platesHeld(L, st, st.x, st.y);
    return st;
  }
  function spawn(L, st) {
    st.x = L.sx * T + 1; st.y = L.sy * T + (T - PH); st.vy = 0;
    st.ground = true; st.coyote = COYOTE; st.buf = 0; st.held = false; st.face = 1; st.t = 0; st.cutOk = false;
    st.alive = true;
  }

  const key = (c, r) => r * W + c;
  function echoAt(st, k) { for (let i = 0; i < st.echoes.length; i++) if (st.echoes[i].k === k) return i; return -1; }
  function platesHeld(L, st, px, py) {
    if (!L.plates.length) return true;
    for (const k of L.plates) {
      if (echoAt(st, k) >= 0) continue;
      const c = k % W, r = (k / W) | 0;                                   // the player standing on it counts too
      if (px !== undefined && px + PW > c * T && px < c * T + T && py + PH > r * T + 4 && py < r * T + T) continue;
      return false;
    }
    return true;
  }
  function solidAt(L, st, c, r, open) {
    if (c < 0 || c >= W) return true;
    if (r < 0) return true;
    if (r >= H) return false;
    const k = r * W + c, t = L.tiles[k];
    if (t === 1) return true;
    if (t === 5 && !open) return true;
    return echoAt(st, k) >= 0;
  }
  function boxHits(L, st, x, y, open) {
    const c0 = Math.floor(x / T), c1 = Math.floor((x + PW - 0.001) / T);
    const r0 = Math.floor(y / T), r1 = Math.floor((y + PH - 0.001) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidAt(L, st, c, r, open)) return true;
    return false;
  }
  function overlapGate(L, st) {
    const c0 = Math.floor(st.x / T), c1 = Math.floor((st.x + PW - 0.001) / T);
    const r0 = Math.floor(st.y / T), r1 = Math.floor((st.y + PH - 0.001) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (r >= 0 && r < H && L.tiles[r * W + c] === 5) return true;
    return false;
  }

  // place an echo in cell k; returns the event
  function addEcho(L, st, k, cause) {
    const c = k % W, r = (k / W) | 0;
    if (r < 0 || r >= H || (c === L.sx && r === L.sy) || L.tiles[k] === 1 || L.tiles[k] === 3 || echoAt(st, k) >= 0) return { type: 'noecho', cause };
    st.echoes.push({ k, c, r, cause, pose: st.face, born: st.frame });
    let faded = null;
    if (st.echoes.length > L.cap) faded = st.echoes.shift();
    return { type: 'echo', cause, c, r, faded };
  }
  function centerCell(st) { return key(Math.floor((st.x + PW / 2) / T), Math.floor((st.y + PH / 2) / T)); }

  function endLife(L, st, ev, cause, k) {
    st.alive = false; st.deaths++;
    if (k !== undefined) ev.push(addEcho(L, st, k, cause)); else ev.push({ type: 'lost', cause });
    ev.push({ type: 'die', cause, x: st.x, y: st.y });
    st.lives++;
    spawn(L, st);
    ev.push({ type: 'spawn' });
  }

  // input: { dir: -1|0|1, jump: bool (held), echo: bool (pressed this frame) }
  function step(L, st, input) {
    const ev = [];
    if (st.won) return ev;
    st.frame++; st.t++;
    const dir = input.dir | 0;
    if (dir) st.face = dir;
    // gates: open while held; a closing gate never closes on top of you
    const open = platesHeld(L, st, st.x, st.y) || (st.wasOpen && overlapGate(L, st));
    if (open !== st.wasOpen) ev.push({ type: open ? 'gateopen' : 'gateclose' });
    st.wasOpen = open;
    if (input.echo) { endLife(L, st, ev, 'echo', centerCell(st)); return ev; }

    // horizontal
    const nx = st.x + dir * RUN;
    if (!boxHits(L, st, nx, st.y, open)) st.x = nx;
    else if (dir > 0) st.x = Math.floor((st.x + PW + RUN) / T) * T - PW;           // snug against the wall
    else if (dir < 0) st.x = Math.floor((st.x - RUN) / T) * T + T;
    if (boxHits(L, st, st.x, st.y, open)) st.x = nx - dir * RUN;                   // safety: never end inside

    // jump: buffered press, coyote time, variable height
    const press = input.jump && !st.held; st.held = !!input.jump;
    if (press) st.buf = BUFFER; else if (st.buf) st.buf--;
    if (st.buf && (st.ground || st.coyote > 0)) { st.vy = -JUMP; st.buf = 0; st.coyote = 0; st.ground = false; st.cutOk = true; ev.push({ type: 'jump' }); }
    if (!st.held && st.cutOk && st.vy < -CUT) { st.vy = -CUT; st.cutOk = false; }
    if (st.vy >= 0) st.cutOk = false;

    // vertical
    st.vy = Math.min(MAXFALL, st.vy + GRAV);
    const ny = st.y + st.vy;
    const wasGround = st.ground;
    if (!boxHits(L, st, st.x, ny, open)) { st.y = ny; st.ground = false; }
    else if (st.vy > 0) { st.y = Math.floor((ny + PH) / T) * T - PH; st.vy = 0; st.ground = true; if (!wasGround) ev.push({ type: 'land' }); }
    else { st.y = Math.floor(ny / T) * T + T; st.vy = 0; ev.push({ type: 'bonk' }); }
    if (st.ground) st.coyote = COYOTE; else if (st.coyote > 0) st.coyote--;
    // standing check (walking off a ledge)
    if (st.ground && !boxHits(L, st, st.x, st.y + 0.5, open)) st.ground = false;

    // fell out of the room
    if (st.y > H * T + 4) { endLife(L, st, ev, 'fall'); return ev; }
    // spikes: the echo covers the spike that got you
    const c0 = Math.floor(st.x / T), c1 = Math.floor((st.x + PW - 0.001) / T);
    const r0 = Math.floor(st.y / T), r1 = Math.floor((st.y + PH - 0.001) / T);
    let spike = -1, best = -1;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const tk = r >= 0 && r < H ? L.tiles[r * W + c] : 0;
      if ((tk !== 2 && tk !== 6) || echoAt(st, r * W + c) >= 0) continue;
      const ox = Math.min(st.x + PW, c * T + T - 1) - Math.max(st.x, c * T + 1);
      const hit = tk === 2 ? st.y + PH > r * T + 4.5 : st.y < r * T + 3.5;
      if (hit && ox > 0.5 && ox > best) { best = ox; spike = r * W + c; }
    }
    if (spike >= 0) { endLife(L, st, ev, 'spike', spike); return ev; }
    // exit
    const ck = centerCell(st);
    if (L.tiles[ck] === 3) { st.won = true; ev.push({ type: 'win' }); return ev; }
    // ten seconds: you freeze where you stand
    if (st.t >= LIFE) { endLife(L, st, ev, 'time', ck); return ev; }
    return ev;
  }

  function snapshot(st) { return { x: st.x, y: st.y, vy: st.vy, ground: st.ground, coyote: st.coyote, buf: st.buf, held: st.held, face: st.face, t: st.t, cutOk: st.cutOk, wasOpen: st.wasOpen, alive: st.alive }; }
  function restore(st, s) { Object.assign(st, s); }

  const api = { T, W, H, PW, PH, LIFE, LEVELS, parse, newRun, spawn, step, snapshot, restore, echoAt, platesHeld, key, centerCell };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EC = api;
})(this);
