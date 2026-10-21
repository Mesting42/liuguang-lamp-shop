import { ANIMALS } from "./pieces.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const GLASS = Object.fromEntries(Object.entries(ANIMALS).map(([key, animal]) => [key, animal.light]));
const names = { beam: "光束玻璃", bomb: "灯芯晶石", lens: "虹彩透镜" };

export function clearCue(frame) {
  if (frame.type === "bonus-start") return "目标达成 · " + frame.bonus.moves + " 步余光送给这扇窗";
  if (frame.type === "bonus-convert") return "余步化光 · 已转化 " + frame.bonus.converted + " / " + frame.bonus.moves;
  if (frame.type === "bonus-ready") return "余步全部化光 · 自动引爆";
  if (frame.type === "bonus-complete") return "余光收好 · 奖励 +" + frame.bonus.score.toLocaleString("zh-CN") + " 分";
  if (frame.combo) {
    const types = frame.combo.types;
    if (types.every((type) => type === "lens")) return "双透镜共鸣 · 整盘折光";
    if (types.includes("lens")) return "虹彩共鸣 · 同类棋子一起亮起";
    if (types.every((type) => type === "bomb")) return "双晶石共鸣 · 扩大爆发";
    if (types.includes("bomb")) return "光束与晶石 · 三行三列";
    return "双光束共鸣 · 交叉清除";
  }
  if (frame.created) return names[frame.created.type] + "已成形" + (frame.created.type === "beam" ? (frame.created.direction === "v" ? " · 纵向" : " · 横向") : "");
  const special = frame.specials?.[0];
  if (special?.type === "beam") return special.direction === "v" ? "纵向光束 · 清除整列" : "横向光束 · 清除整行";
  if (special?.type === "bomb") return "灯芯爆发 · 周围九格";
  if (special?.type === "lens") return "虹彩透镜 · 收集同类棋子";
  return frame.event?.cascade > 1 ? frame.event.cascade + " 连锁 · 碎光接力" : "";
}

// The engine describes what happened; this layer only draws its recorded result.
export class BoardEffects {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.root = null;
    this.animations = [];
  }

  clear() {
    for (const animation of this.animations) animation.cancel();
    this.animations = [];
    this.root?.classList.remove("is-animating");
    this.root?.querySelector(".board-effects")?.remove();
    this.root?.querySelector(".bonus-flight-layer")?.remove();
    this.root = null;
    this.lastFrame = null;
    this.previousTiles = new Map();
  }

  pause() { for (const animation of this.animations) animation.pause(); }
  resume() { for (const animation of this.animations) animation.play(); }

  relayout() {
    if (!this.root || !this.lastFrame) return;
    const root = this.root, frame = this.lastFrame, previous = this.previousTiles;
    const elapsed = this.animations[0]?.currentTime || 0;
    const paused = this.animations.some((animation) => animation.playState === "paused");
    this.play(root, frame, previous);
    for (const animation of this.animations) {
      animation.currentTime = elapsed;
      if (paused) animation.pause();
    }
  }

  animate(element, keyframes, duration, delay = 0, easing = "cubic-bezier(.16,1,.3,1)") {
    if (!element) return;
    this.animations.push(element.animate(keyframes, { duration, delay, easing, fill: "both" }));
  }

  svgNode(tag, attributes, parent = this.svg) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }

  center(key) { return this.cells.get(key)?.center || [this.width / 2, this.height / 2]; }
  tile(key) { return this.cells.get(key)?.element.querySelector(".tile-body"); }

  ring(key, color, delay = 0, radius = this.step * .65, duration = null) {
    const [cx, cy] = this.center(key);
    const ring = this.svgNode("circle", { cx, cy, r: radius, fill: "none", stroke: color, "stroke-width": this.soft ? 2 : 3 });
    ring.style.transformOrigin = cx + "px " + cy + "px";
    this.animate(ring, [{ transform: this.reducedMotion ? "scale(1)" : "scale(.35)", opacity: .85 }, { transform: "scale(1)", opacity: 0 }], duration ?? (this.soft ? 150 : 350), delay, "cubic-bezier(.25,.6,.35,1)");
  }

  conversion(special, previousTile, duration) {
    const [cx, cy] = this.center(special.key);
    const flightTime = Math.round(duration * .62);
    const arrival = this.reducedMotion ? 0 : flightTime;
    const color = GLASS[special.color] || "#edc476";
    const old = previousTile;
    if (old) {
      old.classList.add("conversion-before");
      old.style.left = cx + "px";
      old.style.top = cy + "px";
      old.style.width = this.step * .83 + "px";
      old.style.height = this.step * .83 + "px";
      this.overlay.append(old);
      this.animate(old, [{ opacity: 1 }, { opacity: 0 }], 100, arrival);
    }
    this.animate(this.tile(special.key), this.reducedMotion ? [{ opacity: 0 }, { opacity: 1 }] : [
      { transform: "scale(.86)", opacity: 0 },
      { transform: "scale(1.12)", opacity: 1, offset: .6 },
      { transform: "scale(1)", opacity: 1 }
    ], this.reducedMotion ? 120 : duration - arrival, arrival);

    if (!this.soft) {
      const source = document.querySelector(".steps-box strong")?.getBoundingClientRect();
      const bounds = this.root.querySelector(".board-grid").getBoundingClientRect();
      const sx = source ? source.x + source.width / 2 : bounds.x + this.width / 2;
      const sy = source ? source.y + source.height / 2 : bounds.y;
      const tx = bounds.x + cx, ty = bounds.y + cy;
      const controlX = sx + (tx - sx) * .28 + (tx >= sx ? -1 : 1) * Math.min(65, this.width * .14);
      const controlY = sy + (ty - sy) * .6;
      const layer = this.svgNode("svg", { class: "bonus-flight-layer", viewBox: `0 0 ${innerWidth} ${innerHeight}`, preserveAspectRatio: "none", "aria-hidden": "true" }, this.root);
      const path = this.svgNode("path", { d: `M${sx} ${sy} Q${controlX} ${controlY} ${tx} ${ty}`, fill: "none", stroke: color, "stroke-width": 1.5, pathLength: 1, "stroke-dasharray": "1", "stroke-linecap": "round" }, layer);
      this.animate(path, [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: .4, opacity: .5, offset: .45 }, { strokeDashoffset: 0, opacity: 0 }], flightTime, 0, "linear");
      for (let trail = 0; trail < 3; trail++) {
        const light = this.svgNode("g", {}, layer);
        this.svgNode("circle", { r: this.step * (trail ? .035 : .105), fill: color, opacity: trail ? .65 : .25 }, light);
        this.svgNode("path", { d: "M0 -5 2 -1 5 0 2 1 0 5 -2 1 -5 0 -2 -1Z", fill: "#fff0bb" }, light);
        const frames = Array.from({ length: 7 }, (_, i) => {
          const t = i / 6, u = 1 - t;
          const x = u * u * sx + 2 * u * t * controlX + t * t * tx;
          const y = u * u * sy + 2 * u * t * controlY + t * t * ty;
          return { transform: `translate(${x}px,${y}px) scale(${trail ? .55 : 1})`, opacity: i === 0 || i === 6 ? 0 : trail ? .45 : 1, offset: t };
        });
        this.animate(light, frames, flightTime - trail * 14, trail * 12, "linear");
      }
    }

    this.ring(special.key, color, arrival, this.step * .57, duration - arrival);
    const stamp = this.svgNode("g", { transform: `translate(${cx} ${cy})`, fill: "none", stroke: "#fff0bb", "stroke-width": 2, "stroke-linecap": "round" });
    const radius = this.step * .38;
    if (special.type === "beam") {
      this.svgNode("line", special.direction === "v" ? { x1: 0, y1: -radius, x2: 0, y2: radius } : { x1: -radius, y1: 0, x2: radius, y2: 0 }, stamp);
    } else if (special.type === "bomb") {
      this.svgNode("circle", { r: radius * .65 }, stamp);
    } else {
      this.svgNode("path", { d: `M0 ${-radius} ${radius} 0 0 ${radius} ${-radius} 0Z` }, stamp);
    }
    this.animate(stamp, [{ opacity: this.soft ? .5 : .9 }, { opacity: 0 }], duration - arrival, arrival);
  }

  shards(key, color, count, delay) {
    const [cx, cy] = this.center(key);
    for (let i = 0; i < count; i++) {
      const angle = (i * 2.4 + cx * .031 + cy * .019);
      const distance = this.step * (.38 + (i % 3) * .15);
      const size = this.step * (.075 + (i % 2) * .025);
      const shard = this.svgNode("path", { d: `M0 ${-size} ${size * .6} 0 0 ${size * 1.7} ${-size * .65} 0Z`, fill: color, stroke: "#fff0ce", "stroke-width": .7 });
      this.animate(shard, [
        { transform: `translate(${cx}px,${cy}px) rotate(${i * 70}deg) scale(.7)`, opacity: .95 },
        { transform: `translate(${cx + Math.cos(angle) * distance}px,${cy + Math.sin(angle) * distance + this.step * .2}px) rotate(${i * 70 + 80}deg) scale(.3)`, opacity: 0 }
      ], 390, delay, "cubic-bezier(.12,.65,.3,1)");
    }
  }

  beam(key, direction, delay = 0) {
    const [cx, cy] = this.center(key);
    const vertical = direction === "v";
    const group = this.svgNode("g", {});
    const line = vertical ? { x1: 0, y1: -cy, x2: 0, y2: this.height - cy } : { x1: -cx, y1: 0, x2: this.width - cx, y2: 0 };
    this.svgNode("line", { ...line, stroke: "#eac981", "stroke-width": this.soft ? 8 : this.step * .27, opacity: .4 }, group);
    this.svgNode("line", { ...line, stroke: "#fff0bb", "stroke-width": this.soft ? 2 : 4 }, group);
    const origin = `translate(${cx}px,${cy}px)`;
    this.animate(group, [
      { transform: origin + (vertical ? " scaleY(.02)" : " scaleX(.02)"), opacity: .9 },
      { transform: origin + " scale(1)", opacity: .9, offset: .42 },
      { transform: origin + " scale(1)", opacity: .7, offset: .72 },
      { transform: origin + " scale(1)", opacity: 0 }
    ], this.soft ? 160 : 400, delay, "linear");
  }

  burst(key, delay = 0, size = 3) {
    const [cx, cy] = this.center(key);
    const radius = this.step * size / 2;
    const range = this.svgNode("rect", { x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2, rx: this.step * .18, fill: "#f5cb81", "fill-opacity": this.soft ? .08 : .2, stroke: "#f6dfaa", "stroke-width": 3 });
    range.style.transformOrigin = `${cx}px ${cy}px`;
    this.animate(range, [{ transform: this.reducedMotion ? "scale(1)" : "scale(.2)", opacity: .9 }, { transform: "scale(1)", opacity: .8, offset: .55 }, { transform: this.reducedMotion ? "scale(1)" : "scale(1.03)", opacity: 0 }], this.soft ? 170 : 420, delay);
    if (!this.soft) this.ring(key, "#ffe2a5", delay, radius * .9);
  }

  lens(special, delay = 0) {
    const [sx, sy] = this.center(special.key);
    const targets = special.targets.filter((key) => key !== special.key);
    const stride = Math.max(1, Math.ceil(targets.length / 20));
    for (let i = 0; i < targets.length; i += stride) {
      const [tx, ty] = this.center(targets[i]);
      const path = this.svgNode("path", {
        d: `M${sx} ${sy} Q${(sx + tx) / 2 + (ty - sy) * .16} ${(sy + ty) / 2 - (tx - sx) * .16} ${tx} ${ty}`,
        fill: "none", stroke: GLASS[special.color] || "#e5c9ed", "stroke-width": this.soft ? 1.5 : 2.5, "stroke-linecap": "round", pathLength: 1,
        "stroke-dasharray": 1
      });
      this.animate(path, [{ strokeDashoffset: 1, opacity: .9 }, { strokeDashoffset: 0, opacity: .85, offset: .65 }, { strokeDashoffset: 0, opacity: 0 }], this.soft ? 170 : 430, delay + (this.soft ? 0 : (i % 4) * 16));
    }
    this.ring(special.key, "#e7c8ed", delay, this.step * 1.1);
  }

  activate(frame) {
    if (frame.combo) {
      const targets = new Set(frame.combo.targets);
      if (frame.combo.types.includes("beam")) {
        for (let y = 0; y < frame.board.length; y++) {
          if (frame.board[y].every((_, x) => targets.has(`${y},${x}`))) this.beam(`${y},${Math.floor(frame.board[0].length / 2)}`, "h");
        }
        for (let x = 0; x < frame.board[0].length; x++) {
          if (frame.board.every((_, y) => targets.has(`${y},${x}`))) this.beam(`${Math.floor(frame.board.length / 2)},${x}`, "v", 50);
        }
      }
      if (frame.combo.types.every((type) => type === "bomb")) for (const key of frame.combo.keys) this.burst(key, 0, 5);
      if (frame.combo.types.includes("lens")) {
        const source = frame.specials.find((special) => special.type === "lens");
        this.lens({ ...source, targets: frame.combo.targets });
      }
    }
    const specials = frame.combo ? (frame.specials || []).filter((special) => !frame.combo.keys.includes(special.key)) : frame.specials || [];
    specials.slice(0, 8).forEach((special, index) => {
      const delay = this.soft ? 0 : Math.min(index * 45, 180);
      if (special.type === "beam") this.beam(special.key, special.direction, delay);
      if (special.type === "bomb") this.burst(special.key, delay);
      if (special.type === "lens") this.lens(special, delay);
    });
  }

  formation(frame) {
    const created = frame.created;
    if (!created) return;
    const [cx, cy] = this.center(created.key);
    if (!this.soft) {
      for (const key of frame.cleared.slice(0, 6)) {
        const [sx, sy] = this.center(key);
        const light = this.svgNode("circle", { r: this.step * .065, fill: "#ffe9b0" });
        this.animate(light, [{ transform: `translate(${sx}px,${sy}px)`, opacity: .9 }, { transform: `translate(${cx}px,${cy}px)`, opacity: 0 }], 330, 70);
      }
    }
    this.ring(created.key, "#ffe5a2", this.soft ? 0 : 90, this.step * .8);
    this.animate(this.tile(created.key), this.reducedMotion ? [{ opacity: .5 }, { opacity: 1 }] : [
      { transform: "scale(.8)" }, { transform: "scale(1.2)", offset: .58 }, { transform: "scale(1)" }
    ], this.soft ? 130 : 420);
  }

  message(text, className, x, y, duration = 480) {
    const node = document.createElement("span");
    node.className = className;
    node.textContent = text;
    node.style.left = x / this.width * 100 + "%";
    node.style.top = y / this.height * 100 + "%";
    this.overlay.append(node);
    this.animate(node, [
      { transform: "translate(-50%, 0)", opacity: 0 },
      { transform: "translate(-50%, -3px)", opacity: 1, offset: .16 },
      { transform: "translate(-50%, -5px)", opacity: 1, offset: .72 },
      { transform: "translate(-50%, -9px)", opacity: 0 }
    ], this.reducedMotion ? Math.min(220, duration) : duration, 0, "linear");
  }

  play(root, frame, previousTiles = new Map()) {
    this.clear();
    this.lastFrame = frame;
    this.previousTiles = new Map([...previousTiles].map(([key, tile]) => [key, tile?.cloneNode(true)]));
    this.root = root;
    this.root.classList.add("is-animating");
    const settings = this.getSettings();
    this.reducedMotion = settings.reduceMotion || globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.soft = this.reducedMotion || settings.reduceFlash;
    const grid = root.querySelector(".board-grid");
    const bounds = grid.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    this.cells = new Map([...grid.querySelectorAll("[data-cell]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return [element.dataset.cell, { element, center: [rect.x - bounds.x + rect.width / 2, rect.y - bounds.y + rect.height / 2], size: rect.width }];
    }));
    this.step = this.cells.get("0,1") ? this.center("0,1")[0] - this.center("0,0")[0] : this.width / frame.board[0].length;
    this.overlay = document.createElement("div");
    this.overlay.className = "board-effects";
    this.overlay.setAttribute("aria-hidden", "true");
    grid.append(this.overlay);
    this.svg = this.svgNode("svg", { viewBox: `0 0 ${this.width} ${this.height}`, preserveAspectRatio: "none", class: "effect-canvas" }, this.overlay);

    if (frame.type.startsWith("bonus-")) {
      const duration = this.reducedMotion ? 180 : frame.type === "bonus-convert" ? frame.bonus.converted <= 3 ? 480 : 360 : frame.type === "bonus-ready" ? 720 : frame.type === "bonus-complete" ? 620 : 500;
      if (frame.type === "bonus-start") {
        const steps = document.querySelector(".steps-box");
        this.animate(steps, this.reducedMotion ? [{ opacity: .6 }, { opacity: 1 }] : [{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: .4 }, { transform: "scale(1)" }], this.reducedMotion ? 150 : 360);
      }
      if (frame.type === "bonus-convert") {
        frame.converted.forEach((special) => this.conversion(special, previousTiles.get(special.key), duration));
      }
      if (frame.type === "bonus-ready") {
        frame.board.forEach((row, y) => row.forEach((cell, x) => {
          if (cell.tile?.special) this.ring(`${y},${x}`, GLASS[cell.tile.color], 0, this.step * .48);
        }));
      }
      if (frame.type !== "bonus-convert") this.message(clearCue(frame), "effect-callout bonus-callout", this.width / 2, this.step * .28, duration - 20);
      return duration;
    }

    if (frame.type === "swap" || frame.type === "invalid") {
      const a = frame.from.join(","), b = frame.to.join(",");
      const [ax, ay] = this.center(a), [bx, by] = this.center(b);
      for (const [key, dx, dy] of [[a, bx - ax, by - ay], [b, ax - bx, ay - by]]) {
        const translation = `translate(${dx}px,${dy}px)`;
        const keyframes = frame.type === "invalid" ? [{ transform: "translate(0,0)" }, { transform: translation, offset: .48 }, { transform: "translate(0,0)" }] : [{ transform: translation }, { transform: "translate(0,0)" }];
        this.animate(this.tile(key), this.reducedMotion ? [{ opacity: .5 }, { opacity: 1 }] : keyframes, this.reducedMotion ? 90 : frame.type === "invalid" ? 320 : 190);
      }
      return this.reducedMotion ? 100 : frame.type === "invalid" ? 330 : 200;
    }

    if (frame.type === "fall") {
      for (const fall of frame.falls || []) {
        const sourceRow = fall.top > 0 ? Math.max(fall.top, fall.from) : fall.from;
        const distance = (sourceRow - fall.to) * this.step;
        this.animate(this.tile(fall.key), [
          { transform: `translateY(${this.reducedMotion ? 0 : distance}px)`, opacity: fall.fresh ? .25 : 1 },
          { transform: "translateY(0)", opacity: 1 }
        ], this.reducedMotion ? 120 : 280, this.reducedMotion ? 0 : Number(fall.key.split(",")[1]) % 3 * 14, "cubic-bezier(.25,.7,.35,1)");
      }
      return this.reducedMotion ? 130 : 320;
    }

    if (frame.type === "clear") {
      this.activate(frame);
      const cleared = frame.cleared || [];
      const fragments = this.soft ? 0 : Math.max(2, Math.min(5, Math.floor(100 / Math.max(1, cleared.length))));
      cleared.forEach((key, index) => {
        const [y, x] = key.split(",").map(Number);
        const color = GLASS[frame.board[y][x].tile.color];
        const delay = this.reducedMotion ? 0 : frame.specials?.length ? 70 + Math.min(index * 5, 100) : (index % 3) * 18;
        this.animate(this.tile(key), this.reducedMotion ? [{ opacity: 1 }, { opacity: 0 }] : [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(1.12)", opacity: 1, offset: .25 },
          { transform: "scale(.3) rotate(9deg)", opacity: 0 }
        ], this.reducedMotion ? 150 : 230, delay, "linear");
        this.ring(key, color, delay);
        this.shards(key, color, fragments, delay + 25);
      });
      for (const obstacle of frame.obstacles || []) {
        const cell = this.cells.get(obstacle.key)?.element;
        for (const kind of obstacle.kinds) {
          const layer = cell?.querySelector(kind === "crate" ? ".crate-art" : "." + kind + "-overlay");
          this.animate(layer, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: this.reducedMotion ? "scale(1)" : "scale(1.17)" }], this.reducedMotion ? 150 : 280, 40);
        }
        this.ring(obstacle.key, "#e4dfc1", 60);
      }
      this.formation(frame);
      const cue = clearCue(frame);
      if (cue) this.message(cue, "effect-callout", this.width / 2, this.step * .28);
      if (cleared.length) {
        const centers = cleared.map((key) => this.center(key));
        const cx = Math.max(this.step, Math.min(this.width - this.step, centers.reduce((total, c) => total + c[0], 0) / centers.length));
        const cy = Math.max(this.step * 1.2, centers.reduce((total, c) => total + c[1], 0) / centers.length);
        this.message("+" + frame.scoreDelta, "effect-score", cx, cy);
      }
      return this.reducedMotion ? 210 : frame.specials?.length || frame.created || frame.combo ? 660 : 500;
    }

    this.animate(grid, [{ opacity: .5 }, { opacity: 1 }], this.reducedMotion ? 120 : 280);
    return this.reducedMotion ? 130 : 300;
  }
}
