import { COLORS } from "./levels.js";

const point = (y, x) => y + "," + x;
const fromPoint = (value) => value.split(",").map(Number);
const inBounds = (board, y, x) => y >= 0 && x >= 0 && y < board.length && x < board[0].length;
const copy = (value) => JSON.parse(JSON.stringify(value));
export const goalKey = (goal) => goal.key || goal.type + (goal.color ? ":" + goal.color : "");

function seeded(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function makeCell(color, level, y, x) {
  const cell = { tile: color ? { color, special: null, direction: null } : null, crate: 0, frost: 0, vine: 0, chain: 0 };
  return cell;
}

function setupBoard(level, seed) {
  const [width, height] = level.size || [8, 8];
  const board = Array.from({ length: height }, () => Array(width));
  const positions = {};
  for (const kind of ["crates", "frost", "vines", "chains"]) {
    positions[kind] = new Set(level.layout?.[kind] || []);
  }
  const random = seeded(seed);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = point(y, x);
      const isCrate = positions.crates.has(key);
      let color = null;
      if (!isCrate) {
        const options = COLORS.filter((candidate) => {
          const left = x >= 2 ? board[y][x - 1]?.tile?.color === candidate && board[y][x - 2]?.tile?.color === candidate : false;
          const above = y >= 2 ? board[y - 1][x]?.tile?.color === candidate && board[y - 2][x]?.tile?.color === candidate : false;
          return !left && !above;
        });
        color = options[Math.floor(random() * options.length)] || COLORS[Math.floor(random() * COLORS.length)];
      }
      board[y][x] = makeCell(color, level, y, x);
      board[y][x].crate = isCrate ? 1 : 0;
      board[y][x].frost = positions.frost.has(key) ? 1 : 0;
      board[y][x].vine = positions.vines.has(key) ? 1 : 0;
      board[y][x].chain = positions.chains.has(key) ? 1 : 0;
    }
  }
  return board;
}

export function findRuns(board) {
  const runs = [];
  const height = board.length;
  const width = board[0].length;
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const color = board[y][x].tile?.color;
      let end = x + 1;
      if (color) while (end < width && board[y][end].tile?.color === color) end++;
      if (color && end - x >= 3) runs.push({ direction: "h", color, cells: Array.from({ length: end - x }, (_, i) => point(y, x + i)) });
      x = Math.max(end, x + 1);
    }
  }
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      const color = board[y][x].tile?.color;
      let end = y + 1;
      if (color) while (end < height && board[end][x].tile?.color === color) end++;
      if (color && end - y >= 3) runs.push({ direction: "v", color, cells: Array.from({ length: end - y }, (_, i) => point(y + i, x)) });
      y = Math.max(end, y + 1);
    }
  }
  return runs;
}

const runCells = (runs) => new Set(runs.flatMap((run) => run.cells));

function swapTiles(board, a, b) {
  const [ay, ax] = a;
  const [by, bx] = b;
  [board[ay][ax].tile, board[by][bx].tile] = [board[by][bx].tile, board[ay][ax].tile];
}

export function canSwapCell(cell) {
  return Boolean(cell?.tile && !cell.crate && !cell.frost && !cell.vine && !cell.chain);
}

function swapAllowed(board, a, b) {
  const [ay, ax] = a;
  const [by, bx] = b;
  if (!inBounds(board, ay, ax) || !inBounds(board, by, bx)) return false;
  if (Math.abs(ay - by) + Math.abs(ax - bx) !== 1) return false;
  const first = board[ay][ax];
  const second = board[by][bx];
  return canSwapCell(first) && canSwapCell(second);
}

export function legalSwap(board, a, b) {
  if (!swapAllowed(board, a, b)) return false;
  const hasSpecial = board[a[0]][a[1]].tile.special || board[b[0]][b[1]].tile.special;
  swapTiles(board, a, b);
  const legal = Boolean(hasSpecial || findRuns(board).length);
  swapTiles(board, a, b);
  return legal;
}

export function hasMoves(board) {
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[0].length; x++) {
      if (x + 1 < board[0].length && legalSwap(board, [y, x], [y, x + 1])) return true;
      if (y + 1 < board.length && legalSwap(board, [y, x], [y + 1, x])) return true;
    }
  }
  return false;
}

export function createRun(level, seed = level.id || 360) {
  let board;
  let chosenSeed = seed;
  for (let attempt = 0; attempt < 50; attempt++) {
    chosenSeed = (seed + attempt * 7919) >>> 0;
    board = setupBoard(level, chosenSeed);
    if (!findRuns(board).length && hasMoves(board)) break;
  }
  return {
    levelId: level.id,
    seed: chosenSeed,
    board,
    steps: level.steps,
    remaining: level.steps,
    score: 0,
    progress: {},
    cascade: 0,
    status: "playing",
    lastEvent: null
  };
}

function specialArea(board, special, y, x, partnerColor = null) {
  const result = new Set([point(y, x)]);
  if (special === "beam") {
    if (board[y][x].tile?.direction === "v") {
      for (let row = 0; row < board.length; row++) result.add(point(row, x));
    } else {
      for (let col = 0; col < board[0].length; col++) result.add(point(y, col));
    }
  } else if (special === "bomb") {
    for (let row = Math.max(0, y - 1); row <= Math.min(board.length - 1, y + 1); row++) {
      for (let col = Math.max(0, x - 1); col <= Math.min(board[0].length - 1, x + 1); col++) result.add(point(row, col));
    }
  } else if (special === "lens") {
    const color = partnerColor || board[y][x].tile?.color;
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[0].length; col++) {
        if (board[row][col].tile?.color === color) result.add(point(row, col));
      }
    }
  }
  return result;
}

function comboArea(board, a, b) {
  const [ay, ax] = a;
  const [by, bx] = b;
  const first = board[ay][ax].tile;
  const second = board[by][bx].tile;
  const set = new Set();
  const add = (values) => values.forEach((value) => set.add(value));
  if (first.special === "lens" && second.special === "lens") {
    for (let y = 0; y < board.length; y++) for (let x = 0; x < board[0].length; x++) set.add(point(y, x));
  } else if (first.special === "lens" || second.special === "lens") {
    const lens = first.special === "lens" ? first : second;
    const target = first.special === "lens" ? second : first;
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[0].length; x++) if (board[y][x].tile?.color === target.color) set.add(point(y, x));
    }
    if (target.special) add(specialArea(board, target.special, first.special === "lens" ? by : ay, first.special === "lens" ? bx : ax));
    if (lens.special) set.add(point(first.special === "lens" ? ay : by, first.special === "lens" ? ax : bx));
  } else if (first.special === "beam" && second.special === "beam") {
    for (let y = 0; y < board.length; y++) set.add(point(y, ax));
    for (let x = 0; x < board[0].length; x++) set.add(point(ay, x));
    for (let y = 0; y < board.length; y++) set.add(point(y, bx));
    for (let x = 0; x < board[0].length; x++) set.add(point(by, x));
  } else if ((first.special === "beam" && second.special === "bomb") || (first.special === "bomb" && second.special === "beam")) {
    const cy = Math.round((ay + by) / 2);
    const cx = Math.round((ax + bx) / 2);
    for (let y = Math.max(0, cy - 1); y <= Math.min(board.length - 1, cy + 1); y++) {
      for (let x = 0; x < board[0].length; x++) set.add(point(y, x));
    }
    for (let x = Math.max(0, cx - 1); x <= Math.min(board[0].length - 1, cx + 1); x++) {
      for (let y = 0; y < board.length; y++) set.add(point(y, x));
    }
  } else if (first.special === "bomb" && second.special === "bomb") {
    for (const [cy, cx] of [[ay, ax], [by, bx]]) {
      for (let y = Math.max(0, cy - 2); y <= Math.min(board.length - 1, cy + 2); y++) {
        for (let x = Math.max(0, cx - 2); x <= Math.min(board[0].length - 1, cx + 2); x++) set.add(point(y, x));
      }
    }
  } else {
    add(specialArea(board, first.special, ay, ax));
    add(specialArea(board, second.special, by, bx));
  }
  return set;
}

function formedSpecial(runs, moveCells) {
  if (!runs.length) return null;
  let intersection = null;
  for (const horizontal of runs.filter((run) => run.direction === "h")) {
    for (const vertical of runs.filter((run) => run.direction === "v")) {
      const common = horizontal.cells.find((key) => vertical.cells.includes(key));
      if (common) intersection = { type: "bomb", key: common };
    }
  }
  if (intersection) return intersection;
  const five = runs.find((run) => run.cells.length >= 5);
  if (five) return { type: "lens", key: five.cells.find((key) => moveCells.has(key)) || five.cells[Math.floor(five.cells.length / 2)] };
  const four = runs.filter((run) => run.cells.length >= 4).sort((a, b) => b.cells.length - a.cells.length)[0];
  if (four) return { type: "beam", direction: four.direction, key: four.cells.find((key) => moveCells.has(key)) || four.cells[Math.floor(four.cells.length / 2)] };
  return null;
}

function addProgress(state, goals, type, amount = 1, color = null) {
  for (const goal of goals) {
    if (goal.type !== type) continue;
    if (goal.color && goal.color !== color) continue;
    const key = goalKey(goal);
    state.progress[key] = Math.min(goal.amount, (state.progress[key] || 0) + amount);
  }
}

function hitObstacles(board, directHits, matchCells, state, goals) {
  const near = new Set(directHits);
  for (const value of matchCells) {
    const [y, x] = fromPoint(value);
    for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inBounds(board, y + dy, x + dx)) near.add(point(y + dy, x + dx));
    }
  }
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[0].length; x++) {
      const key = point(y, x);
      const cell = board[y][x];
      if (cell.crate && (directHits.has(key) || near.has(key))) {
        cell.crate = Math.max(0, cell.crate - 1);
        if (!cell.crate) addProgress(state, goals, "crate");
      }
      if (cell.frost && (directHits.has(key) || near.has(key))) {
        cell.frost = 0;
        addProgress(state, goals, "frost");
      }
      if (cell.vine && directHits.has(key)) {
        cell.vine = Math.max(0, cell.vine - 1);
        if (!cell.vine) addProgress(state, goals, "vine");
      }
      if (cell.chain && directHits.has(key)) {
        cell.chain = 0;
        addProgress(state, goals, "chain");
      }
    }
  }
}

function expandSpecials(board, hits, partnerColor = null, protectedKey = null) {
  const queue = [...hits];
  const visited = new Set();
  const triggered = [];
  while (queue.length) {
    const key = queue.shift();
    if (key === protectedKey) continue;
    if (visited.has(key)) continue;
    visited.add(key);
    const [y, x] = fromPoint(key);
    const tile = board[y]?.[x]?.tile;
    if (!tile?.special) continue;
    const area = specialArea(board, tile.special, y, x, partnerColor);
    triggered.push({ key, type: tile.special, direction: tile.direction, color: partnerColor || tile.color, targets: [...area] });
    for (const extra of area) {
      if (!hits.has(extra)) {
        hits.add(extra);
        queue.push(extra);
      }
    }
  }
  return triggered;
}

function applyGravity(board, random) {
  const falls = [];
  for (let x = 0; x < board[0].length; x++) {
    let segmentBottom = board.length - 1;
    for (let y = board.length - 1; y >= -1; y--) {
      const boundary = y < 0 || board[y][x].crate > 0;
      if (!boundary) continue;
      const segmentTop = y + 1;
      const tiles = [];
      for (let row = segmentTop; row <= segmentBottom; row++) {
        if (board[row][x].tile) tiles.push({ tile: board[row][x].tile, row });
      }
      const emptyCount = segmentBottom - segmentTop + 1 - tiles.length;
      let index = tiles.length - 1;
      for (let row = segmentBottom; row >= segmentTop; row--) {
        const source = index >= 0 ? tiles[index--] : null;
        const from = source ? source.row : row - emptyCount;
        board[row][x].tile = source ? source.tile : { color: COLORS[Math.floor(random() * COLORS.length)], special: null, direction: null };
        if (from !== row) falls.push({ key: point(row, x), from, to: row, top: segmentTop, fresh: !source });
      }
      segmentBottom = y - 1;
      if (emptyCount < 0) throw new Error("Board gravity produced an invalid segment.");
    }
  }
  return falls;
}

function objectivesDone(state, goals) {
  return goals.every((goal) => (state.progress[goalKey(goal)] || 0) >= goal.amount);
}

function clearWave(next, level, options, random) {
  const { hits, matches, keep = null, created = null, partnerColor = null } = options;
  let event = options.event || null;
  if (keep) hits.delete(keep);
  const triggered = expandSpecials(next.board, hits, partnerColor, keep);
  const clearable = new Set([...hits].filter((key) => key !== keep));
  const frozenFrame = copy(next.board);
  for (const key of clearable) {
    const [y, x] = fromPoint(key);
    if (frozenFrame[y]?.[x]?.tile) frozenFrame[y][x].flash = true;
  }
  const combo = options.combo ? { ...options.combo, targets: [...clearable] } : null;
  if (combo) event = "combo";
  if (!event && triggered.length) event = triggered[0].type;
  next.cascade += 1;
  hitObstacles(next.board, hits, matches, next, level.goals);
  const obstacles = [];
  for (let y = 0; y < next.board.length; y++) {
    for (let x = 0; x < next.board[0].length; x++) {
      const kinds = ["crate", "frost", "vine", "chain"].filter((kind) => frozenFrame[y][x][kind] > next.board[y][x][kind]);
      if (kinds.length) obstacles.push({ key: point(y, x), kinds });
    }
  }
  const scoreBefore = next.score;
  let cleared = 0;
  for (const key of clearable) {
    const [y, x] = fromPoint(key);
    const cell = next.board[y]?.[x];
    if (!cell?.tile || cell.crate) continue;
    const tile = cell.tile;
    addProgress(next, level.goals, "collect", 1, tile.color);
    if (tile.special) next.score += 120;
    next.score += 60;
    cell.tile = null;
    cleared++;
  }
  next.score += Math.max(0, cleared - 3) * 10 + Math.max(0, next.cascade - 1) * 100;
  addProgress(next, level.goals, "score", Math.max(0, cleared * 60));
  if (event === "lens") addProgress(next, level.goals, "score", 120);
  next.lastEvent = { type: event || (next.cascade > 1 ? "cascade" : "match"), count: cleared, cascade: next.cascade };
  const clear = {
    type: "clear", board: frozenFrame, event: next.lastEvent,
    cleared: [...clearable].filter((key) => {
      const [y, x] = fromPoint(key);
      return Boolean(frozenFrame[y]?.[x]?.tile);
    }),
    specials: triggered, created, combo, obstacles, scoreDelta: next.score - scoreBefore,
    progress: copy(next.progress), score: next.score
  };
  const falls = applyGravity(next.board, random);
  return [clear, { type: "fall", board: copy(next.board), falls, event: next.lastEvent, score: next.score }];
}

export function move(state, level, from, to) {
  if (state.status !== "playing") return { accepted: false, reason: "关卡已经结束。", state, frames: [] };
  const board = copy(state.board);
  if (!swapAllowed(board, from, to)) {
    const covered = [from, to].some(([y, x]) => {
      const cell = board[y]?.[x];
      return cell?.tile && (cell.frost || cell.vine || cell.chain);
    });
    return { accepted: false, reason: covered ? "这枚棋子被覆盖锁住了，清除覆盖后才能交换。" : "这两枚棋子暂时不能交换。", state, frames: [] };
  }
  const [fy, fx] = from;
  const [ty, tx] = to;
  const first = board[fy][fx].tile;
  const second = board[ty][tx].tile;
  const hadSpecial = Boolean(first.special || second.special);
  swapTiles(board, from, to);
  const runsAfterSwap = findRuns(board);
  if (!hadSpecial && !runsAfterSwap.length) return {
    accepted: false, reason: "没有连成一线，棋子回到原位。", state,
    frames: [{ type: "invalid", board: copy(state.board), from, to }]
  };

  const next = { ...copy(state), board, remaining: state.remaining - 1, cascade: 0 };
  const random = seeded((state.seed + state.score * 31 + state.remaining * 127) >>> 0);
  const frames = [{ type: "swap", board: copy(board), from, to, message: null }];
  let direct = hadSpecial ? comboArea(board, [fy, fx], [ty, tx]) : null;
  let partnerColor = null;
  if (hadSpecial) {
    if (first.special === "lens" && !second.special) partnerColor = second.color;
    if (second.special === "lens" && !first.special) partnerColor = first.color;
    if (first.special === "lens" && second.special) partnerColor = second.color;
    if (second.special === "lens" && first.special) partnerColor = first.color;
  }
  const moveCells = new Set([point(fy, fx), point(ty, tx)]);
  let firstPass = true;
  let safety = 0;

  while (safety++ < 32) {
    const runs = findRuns(next.board);
    if (!runs.length && !direct) break;
    const matches = runCells(runs);
    let keep = null;
    let event = null;
    let created = null;
    if (firstPass && runs.length && !hadSpecial) {
      const formation = formedSpecial(runs, moveCells);
      if (formation) {
        const [sy, sx] = fromPoint(formation.key);
        const tile = next.board[sy][sx].tile;
        tile.special = formation.type;
        tile.direction = formation.direction || null;
        keep = formation.key;
        created = formation;
        event = formation.type;
      }
    }
    const hits = new Set([...(direct || []), ...matches]);
    const combo = firstPass && first.special && second.special ? {
      types: [first.special, second.special], keys: [point(fy, fx), point(ty, tx)]
    } : null;
    frames.push(...clearWave(next, level, { hits, matches, keep, created, event, combo, partnerColor }, random));
    if (objectivesDone(next, level.goals)) {
      next.status = "won";
      break;
    }
    firstPass = false;
    direct = null;
  }

  if (safety >= 32 && findRuns(next.board).length) {
    const retry = createRun(level, next.seed + next.score + 917);
    next.board = retry.board;
    frames.push({ type: "settle", board: copy(next.board), event: { type: "settle" } });
  }
  next.seed = (next.seed + next.score + 97) >>> 0;
  if (next.status !== "won" && next.remaining <= 0) next.status = "lost";
  if (next.status === "playing" && !hasMoves(next.board)) {
    next.board = reshuffle(next.board, next.seed);
    frames.push({ type: "shuffle", board: copy(next.board), event: { type: "shuffle" } });
  }
  return { accepted: true, state: next, frames };
}

export function winBonus(state, level) {
  if (state.bonus?.completed) return { start: copy(state), state: copy(state), frames: [] };
  if (!["won", "bonus"].includes(state.status) || !objectivesDone(state, level.goals)) return null;
  const moves = Math.max(0, Math.min(level.steps, Math.floor(state.completionRemaining ?? state.remaining)));
  const start = {
    ...copy(state), status: "bonus", completionRemaining: moves,
    bonus: { moves, converted: 0, score: 0, completed: false, phase: "start" }
  };
  const next = { ...copy(start), cascade: 0 };
  const random = seeded((state.seed + 0x6c696768 + state.score) >>> 0);
  const frames = [{ type: "bonus-start", board: copy(next.board), remaining: moves, bonus: copy(next.bonus) }];
  const ordinary = [], existing = [];
  for (let y = 0; y < next.board.length; y++) {
    for (let x = 0; x < next.board[0].length; x++) {
      const cell = next.board[y][x];
      if (cell.tile && !cell.crate) (cell.tile.special ? existing : ordinary).push(point(y, x));
    }
  }
  for (const keys of [ordinary, existing]) {
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
  }
  const positions = [...ordinary, ...existing];
  // Authored boards have at least 52 pieces and at most 32 spare moves.
  // Cycling also lets an unusually small recovered board spend every bonus move.
  for (let index = 0; index < moves && positions.length; index++) {
    const key = positions[index % positions.length];
    const [y, x] = fromPoint(key);
    const tile = next.board[y][x].tile;
    const pick = random();
    tile.special = pick < .6 ? "beam" : pick < .9 ? "bomb" : "lens";
    tile.direction = tile.special === "beam" ? (random() < .5 ? "h" : "v") : null;
    const converted = [{ key, type: tile.special, direction: tile.direction, color: tile.color }];
    next.remaining = moves - index - 1;
    next.bonus.converted = index + 1;
    next.bonus.phase = "converting";
    frames.push({ type: "bonus-convert", board: copy(next.board), converted, remaining: next.remaining, bonus: copy(next.bonus) });
  }
  next.remaining = 0;
  next.bonus.phase = "clearing";
  const specialKeys = () => next.board.flatMap((row, y) => row.flatMap((cell, x) => cell.tile?.special ? [point(y, x)] : []));
  if (specialKeys().length || findRuns(next.board).length) {
    frames.push({ type: "bonus-ready", board: copy(next.board), remaining: 0, bonus: copy(next.bonus) });
  }
  for (let wave = 0; wave < 64; wave++) {
    const matches = runCells(findRuns(next.board));
    const specials = specialKeys();
    if (!matches.size && !specials.length) break;
    const ignition = wave === 63 ? specials : specials.length ? [specials[Math.floor(random() * specials.length)]] : [];
    const waveFrames = clearWave(next, level, { hits: new Set([...matches, ...ignition]), matches }, random);
    next.bonus.score = next.score - start.score;
    frames.push(...waveFrames.map((frame) => ({ ...frame, remaining: 0, bonus: copy(next.bonus) })));
  }
  if (findRuns(next.board).length) {
    next.board = reshuffle(next.board, next.seed + next.score + 181);
    frames.push({ type: "settle", board: copy(next.board), remaining: 0, bonus: copy(next.bonus) });
  }
  next.status = "won";
  next.seed = (next.seed + next.score + 181) >>> 0;
  next.bonus.phase = "complete";
  next.bonus.completed = true;
  next.bonus.score = next.score - start.score;
  frames.push({ type: "bonus-complete", board: copy(next.board), score: next.score, remaining: 0, bonus: copy(next.bonus) });
  return { start, state: next, frames };
}

export function reshuffle(board, seed = 3) {
  const random = seeded(seed);
  const result = copy(board);
  const positions = [];
  const tiles = [];
  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      if (result[y][x].tile && !result[y][x].crate) {
        positions.push([y, x]);
        tiles.push(result[y][x].tile);
      }
    }
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    positions.forEach(([y, x], i) => { result[y][x].tile = copy(tiles[i]); });
    if (!findRuns(result).length && hasMoves(result)) return result;
  }
  const replacement = setupBoard({ size: [result[0].length, result.length], layout: {
    crates: result.flatMap((row, y) => row.flatMap((cell, x) => cell.crate ? [point(y, x)] : [])),
    frost: [], vines: [], chains: []
  } }, seed + 1);
  for (let y = 0; y < result.length; y++) {
    for (let x = 0; x < result[0].length; x++) {
      if (result[y][x].tile) result[y][x].tile = replacement[y][x].tile;
    }
  }
  return result;
}

export function isComplete(state, goals) {
  return objectivesDone(state, goals);
}

export function countCells(board, property) {
  return board.flat().filter((cell) => Boolean(cell[property])).length;
}
