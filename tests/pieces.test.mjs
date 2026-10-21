import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { COLORS } from "../src/levels.js";
import { ANIMALS, animalName, pieceArt } from "../src/pieces.js";

assert.deepEqual(Object.keys(ANIMALS), COLORS, "animal views keep the five saved piece identifiers");
assert.equal(new Set(Object.values(ANIMALS).map(({ species }) => species)).size, 5, "each type has its own silhouette");
assert.deepEqual(Object.values(ANIMALS).map(({ name }) => name), ["猫咪", "兔子", "狐狸", "企鹅", "小熊"]);
const versions = [[null, "h"], ["beam", "h"], ["beam", "v"], ["bomb", "h"], ["lens", "h"]];
for (const color of COLORS) {
  for (const [special, direction] of versions) {
    const art = pieceArt(color, special, direction);
    assert.equal((art.match(/<svg\b/g) || []).length, 1);
    assert.equal((art.match(/<\/svg>/g) || []).length, 1);
    assert.ok(art.includes('viewBox="0 0 72 72"'));
    assert.ok(art.includes('data-animal="' + ANIMALS[color].species + '"'));
    assert.ok(art.includes('class="animal-eyes"'), "a special never replaces the animal's face");
    assert.ok(art.includes('class="animal-outline"'));
    assert.ok(!/undefined|NaN|<script|<image|href=|\bid=|url\(/i.test(art), "repeated artwork is local, self-contained and has no colliding SVG IDs");
    if (special) assert.ok(art.includes('class="animal-special animal-' + (special === "beam" ? "beam-" + direction : special) + '"'));
    else assert.ok(!art.includes("animal-special"));
    assert.equal(pieceArt(color, special, direction), art, "art is deterministic and does not affect game randomness");
  }
  assert.equal(animalName(color), ANIMALS[color].name);
}
assert.notEqual(pieceArt("amber", "beam", "h"), pieceArt("amber", "beam", "v"), "beam direction is visible");
assert.equal(pieceArt("broken-save"), pieceArt("amber"), "unknown recovered visuals use a safe default");
assert.equal(animalName("broken-save"), "猫咪");
assert.equal(animalName("__proto__"), "猫咪", "unknown name keys use the same fallback as their artwork");
assert.equal(pieceArt('amber" onclick="bad', 'lens" onclick="bad'), pieceArt("amber"), "unknown attributes never enter SVG markup");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
assert.ok(!css.includes(".piece path:first-child"), "old glass fill rules cannot recolor animal eyes and special marks");
const ui = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
assert.ok(!/琥珀纹|叶脉纹|花瓣纹|雨滴纹|月环纹|琥珀菱纹/.test(ui), "goals and accessible names no longer describe obsolete shapes");
console.log("Animal artwork checks passed: five distinct animals, all special variants, stable saves, safe SVG markup and matching UI labels.");
