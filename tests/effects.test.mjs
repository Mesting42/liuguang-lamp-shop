import assert from "node:assert/strict";
import { BoardEffects } from "../src/effects.js";
import { createRun, goalKey, winBonus } from "../src/engine.js";
import { LEVELS } from "../src/levels.js";

// A local DOM / Web Animations contract double. This does not replace visual QA.
class Element {
  constructor(className = "", rect = { x: 0, y: 0, width: 40, height: 40 }) {
    this.className = className; this.rect = rect; this.children = []; this.dataset = {}; this.style = {};
    this.classList = {
      add: (value) => { this.className += " " + value; },
      remove: (value) => { this.className = this.className.split(" ").filter((name) => name !== value).join(" "); }
    };
  }
  append(child) { child.parent = this; this.children.push(child); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); }
  setAttribute(key, value) { if (key === "class") this.className = value; else this[key] = String(value); }
  getBoundingClientRect() { return this.rect; }
  cloneNode(deep = false) {
    const result = new Element(this.className, { ...this.rect });
    result.dataset = { ...this.dataset }; result.style = { ...this.style };
    if (deep) this.children.forEach((child) => result.append(child.cloneNode(true)));
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll("*")]);
    return descendants.filter((child) => selector === "*" || (selector === "[data-cell]" ? child.dataset.cell : child.className.split(" ").includes(selector.slice(1))));
  }
  animate(keyframes, options) {
    return { keyframes, options, currentTime: 0, state: "running", playState: "running", pause() { this.state = this.playState = "paused"; }, play() { this.state = this.playState = "running"; }, cancel() { this.state = this.playState = "cancelled"; } };
  }
}

const original = Object.fromEntries(["document", "matchMedia", "innerWidth", "innerHeight"].map((key) => [key, globalThis[key]]));
try {
  const steps = new Element("steps-box", { x: 25, y: 20, width: 60, height: 30 });
  globalThis.document = { createElement: () => new Element(), createElementNS: () => new Element(), querySelector: () => steps };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.innerWidth = 1000; globalThis.innerHeight = 900;
  const state = createRun(LEVELS[0], 5150);
  state.status = "won"; state.remaining = 4;
  state.progress[goalKey(LEVELS[0].goals[0])] = LEVELS[0].goals[0].amount;
  const frames = winBonus(state, LEVELS[0]).frames.filter((frame) => frame.type.startsWith("bonus-"));

  for (const width of [320, 640]) for (const settings of [{}, { reduceMotion: true }, { reduceFlash: true }]) {
    const root = new Element("board-wood"), grid = new Element("board-grid", { x: 20, y: 100, width, height: width });
    root.append(grid);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const cell = new Element("board-cell", { x: 20 + x * width / 8, y: 100 + y * width / 8, width: width / 8, height: width / 8 });
      cell.dataset.cell = y + "," + x; cell.append(new Element("tile-body")); grid.append(cell);
    }
    const effects = new BoardEffects(() => settings);
    for (const frame of frames) {
      const previous = new Map((frame.converted || []).map(({ key }) => [key, new Element("tile-body")]));
      const duration = effects.play(root, frame, previous);
      assert.ok(duration > 0 && duration <= 720, "bonus frame timings stay bounded");
      assert.ok(effects.animations.every(({ options }) => options.delay + options.duration <= duration), "each gift finishes before the next frame");
      if (frame.type === "bonus-convert") {
        assert.equal(root.querySelectorAll(".conversion-before").length, 1, "the original glass remains until its gift arrives");
        assert.equal(root.querySelectorAll(".bonus-flight-layer").length, settings.reduceMotion || settings.reduceFlash ? 0 : 1, "motion and flash preferences suppress flying particles");
      }
      effects.pause(); assert.ok(effects.animations.every((animation) => animation.state === "paused"));
      effects.animations.forEach((animation) => { animation.currentTime = 75; });
      effects.relayout();
      assert.ok(effects.animations.every((animation) => animation.playState === "paused" && animation.currentTime === 75), "rotation rebuilds coordinates while preserving paused elapsed time");
      assert.equal(root.querySelectorAll(".board-effects").length, 1, "rotation does not duplicate overlays");
      effects.resume(); assert.ok(effects.animations.every((animation) => animation.state === "running"));
      const animations = [...effects.animations];
      effects.clear(); assert.ok(animations.every((animation) => animation.state === "cancelled"));
      assert.equal(root.querySelector(".bonus-flight-layer"), null);
      assert.equal(root.querySelector(".board-effects"), null);
    }
  }
} finally {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  }
}
console.log("Reward animation contracts passed: normal and reduced modes, small and large boards, arrival timing, pause, resume and cleanup.");
