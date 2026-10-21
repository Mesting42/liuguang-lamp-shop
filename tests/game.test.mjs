import assert from "node:assert/strict";
import { COLORS, CHAPTERS, LEVELS, CHALLENGE } from "../src/levels.js";
import { canSwapCell, createRun, findRuns, hasMoves, goalKey, legalSwap, move, reshuffle, winBonus } from "../src/engine.js";
import { recordWin, starRequirements, starsForWin } from "../src/progression.js";
import { freshSave } from "../src/save.js";

assert.equal(CHAPTERS.length, 3, "story has three chapters");
assert.equal(LEVELS.length, 36, "story has thirty-six authored levels");
for (const [index, chapter] of CHAPTERS.entries()) {
  assert.equal(chapter.levels[1] - chapter.levels[0] + 1, 12, "each chapter spans twelve places");
  assert.equal(LEVELS.filter((level) => level.chapter === index).length, 12);
}

for (const level of LEVELS) {
  const run = createRun(level);
  assert.equal(run.board.length, 8, "all authored stages use an eight-row board");
  assert.equal(run.board[0].length, 8, "all authored stages use an eight-column board");
  assert.ok(level.steps >= 18 && level.steps <= 32, "step budget stays within the authored range");
  assert.ok(level.goals.length >= 1 && level.goals.length <= 2, "a stage has one or two readable goals");
  assert.equal(findRuns(run.board).length, 0, "generated board has no opening match");
  assert.ok(hasMoves(run.board), "generated board opens with a legal move");
  assert.ok(level.goals.every((goal) => goal.amount > 0), "all goal amounts are positive");
  const [one, two, three] = starRequirements(level);
  assert.equal(one, 0, "a completed goal guarantees one star");
  assert.ok(Number.isInteger(two) && Number.isInteger(three) && two > 0 && three > two, "authored score thresholds are fixed, increasing integers");
  assert.equal(starsForWin({ score: two - 1 }, level), 1);
  assert.equal(starsForWin({ score: two }, level), 2, "two-star boundary is inclusive");
  assert.equal(starsForWin({ score: three - 1 }, level), 2);
  assert.equal(starsForWin({ score: three }, level), 3, "three-star boundary is inclusive");
  assert.equal(starsForWin({ score: three, remaining: 0 }, level), 3, "score replaces remaining-move ratio");
}

function solveStage(level, seed = level.id * 104729 + 41) {
  let state = createRun(level, seed);
  const width = state.board[0].length;
  const height = state.board.length;
  while (state.status === "playing" && state.remaining > 0) {
    let best = null;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (const [dy, dx] of [[0, 1], [1, 0]]) {
          if (y + dy >= height || x + dx >= width) continue;
          const result = move(state, level, [y, x], [y + dy, x + dx]);
          if (!result.accepted) continue;
          if (result.state.status === "won") return result.state;
          let progressGain = 0;
          for (const goal of level.goals) {
            const key = goalKey(goal);
            progressGain += (result.state.progress[key] || 0) - (state.progress[key] || 0);
          }
          const scoreGain = result.state.score - state.score;
          const value = progressGain * 1000 + result.state.cascade * 20 + scoreGain;
          if (!best || value > best.value) best = { state: result.state, value };
        }
      }
    }
    if (!best) break;
    state = best.state;
  }
  return state;
}

for (const level of LEVELS) {
  const solution = solveStage(level);
  assert.equal(solution.status, "won", "greedy verified line can complete level " + level.id + " (" + level.name + ")");
  const reward = winBonus(solution, level);
  assert.equal(reward.state.status, "won", "the reward keeps stage " + level.id + " won");
  assert.equal(reward.state.remaining, 0, "bonus spends the spare moves");
  assert.equal(reward.state.bonus.converted, solution.remaining, "every spare move becomes a special");
  assert.ok(starsForWin(reward.state, level) >= starsForWin(solution, level), "bonus points can improve a rating");
  assert.equal(starsForWin(reward.state, level), 3, "a verified line reaches three stars in stage " + level.id);
  assert.equal(reward.state.board.flat().filter((cell) => cell.tile?.special).length, 0, "all reward specials automatically detonate");
  assert.equal(findRuns(reward.state.board).length, 0, "the reward finishes on a settled board");
}

for (const remaining of [0, 1, 4, 17, 31]) {
  const level = { ...LEVELS[0], steps: 32 };
  const state = createRun(level, 5150);
  state.status = "won";
  state.progress[goalKey(level.goals[0])] = level.goals[0].amount;
  state.remaining = remaining;
  const before = JSON.stringify(state);
  const outcome = winBonus(state, level);
  const conversions = outcome.frames.filter((frame) => frame.type === "bonus-convert").flatMap((frame) => frame.converted);
  const conversionFrames = outcome.frames.filter((frame) => frame.type === "bonus-convert");
  conversionFrames.forEach((frame, index) => {
    assert.equal(frame.converted.length, 1, "one visible gift corresponds to one spent step");
    assert.equal(frame.remaining, remaining - index - 1, "the counter decreases one step at a time");
    assert.equal(frame.bonus.converted, index + 1);
  });
  assert.equal(conversions.length, remaining, "one bonus special is created per spare move");
  assert.equal(new Set(conversions.map((special) => special.key)).size, remaining, "conversion selects distinct pieces on authored boards");
  assert.equal(JSON.stringify(state), before, "planning a bonus does not mutate its checkpoint");
  const firstClear = outcome.frames.findIndex((frame) => frame.type === "clear");
  assert.ok(outcome.frames.every((frame, index) => frame.type !== "bonus-convert" || index < firstClear), "all conversion finishes before automatic clearing starts");
  assert.equal(outcome.state.score, state.score + outcome.frames.reduce((sum, frame) => sum + (frame.scoreDelta || 0), 0), "bonus points equal the actual cleared waves");
  assert.equal(outcome.state.bonus.score, outcome.state.score - state.score);
  assert.deepEqual(winBonus(outcome.start, level).state, outcome.state, "refreshing a saved bonus reproduces the same result");
  assert.equal(winBonus(outcome.state, level).frames.length, 0, "a completed bonus cannot be awarded twice");
  assert.equal(winBonus(outcome.state, level).state.score, outcome.state.score);
}
assert.equal(winBonus(createRun(LEVELS[0]), LEVELS[0]), null, "bonus cannot start before winning");

{
  const progress = freshSave();
  for (const level of LEVELS) {
    const solution = solveStage(level);
    const reward = recordWin(progress, solution, level);
    assert.equal(reward.unlocked, level.id + 1, "each win opens the next authored location");
  }
  assert.equal(progress.unlocked, 37, "the final stage completes the route");
  assert.equal(progress.endingSeen, true, "winning stage 36 records the ending");
  const completeSave = freshSave();
  for (let id = 1; id <= 35; id++) completeSave.stars[String(id)] = 3;
  completeSave.unlocked = 36;
  const last = recordWin(completeSave, { remaining: 0, score: starRequirements(LEVELS[35])[2] }, LEVELS[35]);
  assert.equal(last.stars, 3, "final score produces a three-star result with zero moves left");
  assert.equal(completeSave.unlocked, 37);
  assert.equal(completeSave.workshop.repairs, 3);
  assert.equal(completeSave.workshop.decorations.length, 3);
  assert.equal(starsForWin({ score: 0, remaining: 22 }, LEVELS[0]), 1, "many spare moves alone cannot award three stars");
  const repeated = recordWin(completeSave, { score: 0, remaining: 22 }, LEVELS[35]);
  assert.equal(repeated.materials, 0, "a lower-scoring replay cannot farm star improvements");
  assert.equal(completeSave.stars["36"], 3, "a lower score does not erase historical stars");
}

{
  const level = LEVELS[0];
  const state = createRun(level, 5150);
  state.status = "won";
  state.remaining = 4;
  state.score = starRequirements(level)[2] - 1;
  state.progress[goalKey(level.goals[0])] = level.goals[0].amount;
  const reward = winBonus(state, level);
  assert.equal(starsForWin(state, level), 2);
  assert.equal(starsForWin(reward.state, level), 3, "automatic reward can carry a two-star finish across the three-star line");
  const normal = freshSave(), skipped = freshSave(), resumed = freshSave();
  recordWin(normal, reward.state, level);
  recordWin(skipped, reward.state, level);
  recordWin(resumed, winBonus(reward.start, level).state, level);
  assert.deepEqual(normal, skipped, "skipping visual playback preserves score, stars and materials");
  assert.deepEqual(normal, resumed, "recovered bonus awards the same score, stars and materials");
}

function patternedBoard() {
  return Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => ({
    tile: { color: COLORS[(x + y * 2) % COLORS.length], special: null, direction: null },
    crate: 0, frost: 0, vine: 0, chain: 0
  })));
}

function synthetic(board, goals = [{ type: "collect", color: "amber", amount: 30 }]) {
  const level = { id: 900, steps: 12, size: [8, 8], goals, layout: { crates: [], frost: [], vines: [], chains: [] } };
  const state = createRun(level, 5150);
  state.board = board;
  return { level, state };
}

function formBoard(kind) {
  const board = patternedBoard();
  if (kind === "beam") {
    board[2][2].tile.color = "amber";
    ["amber", "amber", "coral", "amber", "jade"].forEach((color, index) => { board[3][index].tile.color = color; });
    return { board, from: [2, 2], to: [3, 2] };
  }
  if (kind === "lens") {
    board[2][2].tile.color = "amber";
    ["amber", "amber", "coral", "amber", "amber", "jade"].forEach((color, index) => { board[3][index].tile.color = color; });
    return { board, from: [2, 2], to: [3, 2] };
  }
  if (kind === "bomb") {
    board[1][2].tile.color = "amber";
    board[2][2].tile.color = "amber";
    board[3][1].tile.color = "amber";
    board[3][2].tile.color = "coral";
    board[3][3].tile.color = "amber";
    board[4][2].tile.color = "amber";
    return { board, from: [4, 2], to: [3, 2] };
  }
  throw new Error("unknown shape");
}

for (const cover of ["frost", "vine", "chain"]) {
  for (const endpoint of ["from", "to"]) {
    for (const special of [null, "beam", "bomb", "lens"]) {
      const setup = formBoard("beam");
      const [y, x] = setup[endpoint];
      const cell = setup.board[y][x];
      cell[cover] = 1;
      cell.tile.special = special;
      cell.tile.direction = special === "beam" ? "h" : null;
      const { level, state } = synthetic(setup.board);
      const before = structuredClone(state);
      assert.equal(canSwapCell(cell), false, cover + " prevents selecting an exchange endpoint");
      assert.equal(legalSwap(state.board, setup.from, setup.to), false, cover + " excludes a move from hints and move detection");
      const result = move(state, level, setup.from, setup.to);
      assert.equal(result.accepted, false, cover + " blocks the " + endpoint + " endpoint, including " + special);
      assert.equal(result.frames.length, 0, "a covered swap produces no movement or clearing animation");
      assert.match(result.reason, /覆盖.*不能|清除覆盖后才能/);
      assert.deepEqual(result.state, before, "a covered swap spends no steps and changes no board, score or goals");
      assert.deepEqual(state, before, "checking hints and rejected moves leaves the input intact");
      cell[cover] = 0;
      assert.equal(canSwapCell(cell), true, "clearing the cover releases the cell");
      assert.equal(legalSwap(state.board, setup.from, setup.to), true, "the same matching move becomes legal after unlocking");
    }
  }

  const setup = formBoard("beam");
  setup.board[3][0][cover] = 1;
  const { level, state } = synthetic(setup.board, [{ type: cover, amount: 1 }]);
  const result = move(state, level, setup.from, setup.to);
  assert.ok(result.accepted, "unlocked neighbors can match with a stationary " + cover + " cell");
  assert.equal(result.state.progress[cover], 1, "a stationary match clears " + cover);
  assert.equal(result.state.board[3][0][cover], 0);
  assert.equal(canSwapCell(result.state.board[3][0]), true, "a cleared cell is exchangeable again");

  const beamBoard = patternedBoard();
  beamBoard[3][0][cover] = 1;
  beamBoard[3][3].tile.special = "beam";
  beamBoard[3][3].tile.direction = "h";
  const beamSetup = synthetic(beamBoard, [{ type: cover, amount: 1 }]);
  const beamResult = move(beamSetup.state, beamSetup.level, [3, 3], [3, 4]);
  assert.ok(beamResult.accepted);
  assert.equal(beamResult.state.progress[cover], 1, "an external special still clears " + cover);

  for (const [first, second] of [["beam", "beam"], ["beam", "bomb"], ["bomb", "bomb"], ["lens", "beam"], ["lens", "bomb"], ["lens", "lens"]]) {
    for (const x of [3, 4]) {
      const comboBoard = patternedBoard();
      comboBoard[3][3].tile.special = first;
      comboBoard[3][4].tile.special = second;
      comboBoard[3][x][cover] = 1;
      const comboSetup = synthetic(comboBoard);
      const before = structuredClone(comboSetup.state);
      const comboResult = move(comboSetup.state, comboSetup.level, [3, 3], [3, 4]);
      assert.equal(comboResult.accepted, false, first + "+" + second + " cannot bypass " + cover + " at either endpoint");
      assert.equal(comboResult.frames.length, 0);
      assert.deepEqual(comboResult.state, before);
    }
  }

  const blockedBoard = patternedBoard();
  blockedBoard.flat().forEach((cell) => { cell[cover] = 1; });
  blockedBoard[3][3].tile.special = "lens";
  assert.equal(hasMoves(blockedBoard), false, "locked specials do not falsely count as available moves");
}

{
  const cell = patternedBoard()[0][0];
  cell.frost = cell.vine = cell.chain = 1;
  for (const cover of ["frost", "vine", "chain"]) {
    assert.equal(canSwapCell(cell), false, "every remaining layer continues to prevent exchange");
    cell[cover] = 0;
  }
  assert.equal(canSwapCell(cell), true, "all covers must be removed before exchange");
  assert.equal(canSwapCell({ ...cell, crate: 1 }), false, "crates remain immovable");
  assert.equal(canSwapCell({ ...cell, tile: null }), false, "empty cells cannot exchange");
}

{
  const setup = formBoard("beam");
  setup.board[4][0].frost = 1;
  const { level, state } = synthetic(setup.board, [{ type: "frost", amount: 1 }]);
  const result = move(state, level, setup.from, setup.to);
  assert.ok(result.accepted);
  const clear = result.frames.find((frame) => frame.type === "clear");
  assert.ok(!clear.cleared.includes("4,0"), "the adjacent frozen piece is outside the match");
  assert.ok(clear.obstacles.some(({ key, kinds }) => key === "4,0" && kinds.includes("frost")), "adjacent matching still removes frost without exchanging the frozen tile");
  assert.equal(result.state.progress.frost, 1);
}

for (const [shape, expected] of [["beam", "beam"], ["bomb", "bomb"], ["lens", "lens"]]) {
  const setup = formBoard(shape);
  const { level, state } = synthetic(setup.board);
  const result = move(state, level, setup.from, setup.to);
  assert.ok(result.accepted, shape + " formation is a valid move");
  const firstClear = result.frames.find((frame) => frame.type === "clear");
  assert.equal(firstClear?.event?.type, expected, shape + " formation announces the created special");
  assert.equal(firstClear.created.type, expected, shape + " formation has an animation origin");
  assert.ok(!firstClear.specials.some((special) => special.key === firstClear.created.key), "a newly formed special waits for a later trigger");
  assert.ok(firstClear.board.flat().some((cell) => cell.tile?.special === expected), shape + " special remains on the board");
  assert.equal(result.state.remaining, state.remaining - 1, "special creation consumes one move");
}

for (const [special, direction] of [["beam", "h"], ["beam", "v"], ["bomb", null], ["lens", null]]) {
  const board = patternedBoard();
  board[3][3].tile.special = special;
  board[3][3].tile.direction = direction;
  const { level, state } = synthetic(board);
  const result = move(state, level, [3, 3], [3, 4]);
  const clear = result.frames.find((frame) => frame.type === "clear");
  const trigger = clear.specials.find((effect) => effect.type === special);
  assert.ok(trigger, special + " activation supplies a visible effect");
  assert.equal(trigger.key, "3,4", "the effect starts at the special's position after swapping");
  assert.equal(trigger.direction, direction);
  assert.equal(clear.combo, null, "one special with an ordinary tile is not a double-special combination");
  assert.ok(trigger.targets.every((key) => clear.cleared.includes(key)), "the displayed special range agrees with the cleared tiles");
  assert.ok(clear.scoreDelta > 0, "each clearing frame supplies its own score feedback");
  for (const fall of result.frames.filter((frame) => frame.type === "fall")) {
    for (const travel of fall.falls) {
      assert.ok(travel.from < travel.to, "falling tiles travel downwards");
      assert.ok(fall.board[travel.to][Number(travel.key.split(",")[1])].tile, "every animation destination contains a tile");
    }
  }
}

{
  const board = patternedBoard();
  board[3][3].tile.special = "beam";
  board[3][3].tile.direction = "h";
  board[3][4].tile.special = "bomb";
  const { level, state } = synthetic(board);
  const result = move(state, level, [3, 3], [3, 4]);
  assert.ok(result.accepted, "two adjacent specials can always combine");
  assert.ok(result.frames.some((frame) => frame.type === "clear" && frame.event?.type === "combo"), "special swap announces a combination");
  const clear = result.frames.find((frame) => frame.combo);
  assert.deepEqual(clear.combo.types, ["beam", "bomb"]);
  assert.ok(clear.combo.targets.every((key) => clear.cleared.includes(key)), "combo animation uses the actual expanded clearing area");
  assert.equal(result.state.remaining, state.remaining - 1, "a special combination consumes one move");
}

{
  const board = patternedBoard();
  board[2][2].tile.color = "amber";
  ["amber", "amber", "coral", "amber", "jade"].forEach((color, index) => { board[3][index].tile.color = color; });
  board[3][1].chain = 1;
  board[3][0].vine = 1;
  board[3][1].frost = 1;
  board[3][4] = { tile: null, crate: 1, frost: 0, vine: 0, chain: 0 };
  const goals = [
    { type: "collect", color: "amber", amount: 2 },
    { type: "frost", amount: 1 },
    { type: "vine", amount: 1 },
    { type: "chain", amount: 1 },
    { type: "crate", amount: 1 }
  ];
  const { level, state } = synthetic(board, goals);
  const result = move(state, level, [2, 2], [3, 2]);
  assert.ok(result.accepted);
  for (const goal of goals) assert.ok((result.state.progress[goalKey(goal)] || 0) >= goal.amount, goal.type + " objective records its progress");
  assert.equal(result.state.status, "won", "completing all goals ends the stage immediately");
}

{
  const run = createRun(LEVELS[0], 22);
  const initialSteps = run.remaining;
  let rejected = false;
  outer: for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      for (const [dy, dx] of [[0, 1], [1, 0]]) {
        if (y + dy >= 8 || x + dx >= 8) continue;
        const result = move(run, LEVELS[0], [y, x], [y + dy, x + dx]);
        if (!result.accepted) {
          assert.equal(run.remaining, initialSteps, "an invalid swap does not spend a move");
          rejected = true;
          break outer;
        }
      }
    }
  }
  assert.ok(rejected, "initial boards provide a non-matching swap to test the return path");
}

{
  let foundCascade = false;
  for (let seed = 1; seed <= 24 && !foundCascade; seed++) {
    const state = createRun(LEVELS[0], seed * 919);
    outer: for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        for (const [dy, dx] of [[0, 1], [1, 0]]) {
          if (y + dy >= 8 || x + dx >= 8) continue;
          const outcome = move(state, LEVELS[0], [y, x], [y + dy, x + dx]);
          if (outcome.accepted && outcome.state.cascade >= 2) {
            assert.ok(outcome.frames.some((frame) => frame.type === "fall"), "a cascade renders a falling stage");
            foundCascade = true;
            break outer;
          }
        }
      }
    }
  }
  assert.ok(foundCascade, "authored refills can produce a readable consecutive cascade");
}

{
  let state = createRun(CHALLENGE, 0x4c554d49);
  const sequence = [];
  for (let turn = 0; turn < CHALLENGE.steps; turn++) {
    let best = null;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        for (const [dy, dx] of [[0, 1], [1, 0]]) {
          if (y + dy >= 8 || x + dx >= 8) continue;
          const result = move(state, CHALLENGE, [y, x], [y + dy, x + dx]);
          if (!result.accepted || result.state.status === "won") continue;
          const cost = result.state.score - state.score + (result.state.cascade > 1 ? 70 : 0);
          if (!best || cost < best.cost) best = { result, cost, from: [y, x], to: [y + dy, x + dx] };
        }
      }
    }
    assert.ok(best, "the fixed challenge has a safe playable move");
    sequence.push([best.from, best.to]);
    state = best.result.state;
  }
  assert.equal(state.status, "lost", "the challenge can reach a fair, explicit failure state");
  assert.equal(state.remaining, 0);
}

{
  const solution = solveStage(CHALLENGE, 0x4c554d49);
  assert.equal(solution.status, "won", "the fixed-layout score challenge can be completed without paid help");
  assert.equal(starsForWin(winBonus(solution, CHALLENGE).state, CHALLENGE), 3, "the side challenge also has a reachable three-star target");
}

{
  let value = 781;
  const random = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
  let noMoveBoard = null;
  for (let attempt = 0; attempt < 30000 && !noMoveBoard; attempt++) {
    const candidate = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({
      tile: { color: COLORS[Math.floor(random() * COLORS.length)], special: null, direction: null },
      crate: 0, frost: 0, vine: 0, chain: 0
    })));
    if (!findRuns(candidate).length && !hasMoves(candidate)) noMoveBoard = candidate;
  }
  assert.ok(noMoveBoard, "test finds a valid dead board with no opening matches");
  const repaired = reshuffle(noMoveBoard, 500);
  assert.equal(findRuns(repaired).length, 0, "shuffle does not add an opening match");
  assert.ok(hasMoves(repaired), "shuffle restores a legal move");
}

console.log("Game checks passed: 36 reachable three-star solutions, score thresholds and bonus rating, legal starts, special formations and combos, cascades, invalid swaps, goals, all cover locks, blockers, and reshuffle.");
