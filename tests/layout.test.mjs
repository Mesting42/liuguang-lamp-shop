import assert from "node:assert/strict";
import { boardSize } from "../src/layout.js";
import { swipeTarget } from "../src/input.js";

for (const [width, height, max] of [[372, 600, 614], [302, 350, 614], [600, 276, 560], [960, 580, 614], [750, 670, 614]]) {
  const value = boardSize({ width, height, max });
  assert.ok(value <= width && value <= height && value <= max);
  assert.equal(value, Math.floor(Math.min(width, height, max)));
}
assert.equal(boardSize({ width: 300, height: -10 }), 0, "short windows never create negative dimensions");
for (const size of [30, 43, 64]) {
  const threshold = Math.max(9, size * .28);
  assert.equal(swipeTarget([3, 3], threshold - .1, 0, size, 8, 8), null, "taps and small tremors do not exchange");
  assert.deepEqual(swipeTarget([3, 3], threshold + .1, 0, size, 8, 8), [3, 4], "a short swipe inside the original cell can exchange");
  assert.deepEqual(swipeTarget([3, 3], -threshold - 1, 2, size, 8, 8), [3, 2]);
  assert.deepEqual(swipeTarget([3, 3], 2, threshold + 1, size, 8, 8), [4, 3]);
  assert.deepEqual(swipeTarget([3, 3], 2, -threshold - 1, size, 8, 8), [2, 3]);
  assert.deepEqual(swipeTarget([3, 3], size * 4, size * 2, size, 8, 8), [3, 4], "long swipes still exchange only adjacent cells");
  assert.equal(swipeTarget([0, 0], -size, 0, size, 8, 8), null);
  assert.equal(swipeTarget([0, 0], 0, -size, size, 8, 8), null);
  assert.equal(swipeTarget([7, 7], size, 0, size, 8, 8), null);
  assert.equal(swipeTarget([7, 7], 0, size, size, 8, 8), null);
}
console.log("Responsive input checks passed: bounded board sizes, short directional swipes, tremor tolerance and safe edges.");
