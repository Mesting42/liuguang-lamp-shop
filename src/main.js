import { CHAPTERS, LEVELS, CHALLENGE, chapterFor, levelById } from "./levels.js";
import { canSwapCell, createRun, goalKey, legalSwap, move as resolveMove, reshuffle, winBonus } from "./engine.js";
import { DEFAULT_SETTINGS, clearSave, loadSave, writeSave } from "./save.js";
import { SoundBus } from "./audio.js";
import { recordWin, starRequirements, starsForWin } from "./progression.js";
import { BoardEffects, clearCue } from "./effects.js";
import { ANIMALS, animalName, pieceArt } from "./pieces.js";
import { fitPlayBoard } from "./layout.js";
import { swipeTarget } from "./input.js";

const app = document.getElementById("app");
const loaded = loadSave();
let save = loaded.data;
let screen = "menu";
let modal = null;
let renderedModal = null;
let modalFocusReturn = null;
let modalFocusScreen = null;
let activeChapter = 0;
let level = null;
let run = null;
let selected = null;
let focusCell = [0, 0];
let isResolving = false;
let isPaused = false;
let currentTimer = null;
let timerStarted = 0;
let timerRemaining = 0;
let timerResolve = null;
let motionGeneration = 0;
let pendingPriorRun = null;
let pendingWinOutcome = null;
let lastToast = loaded.warning;
let tutorialStep = 0;
let challengeMode = false;
let hintCells = [];
let hintTimer = null;
let pointerStart = null;
let suppressClickUntil = 0;
let tabAutoPaused = false;
let lastReward = 0;

const audio = new SoundBus(save.settings);
const boardEffects = new BoardEffects(() => save.settings);

const levelNames = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const coords = (value) => value.split(",").map(Number);
const point = (y, x) => y + "," + x;

function saveNow() {
  const success = writeSave(save);
  if (!success) toast("浏览器未能保存进度，请检查隐私或存储设置。");
}

function activeRunRecord() {
  if (!run || !level || challengeMode) return null;
  return { levelId: level.id, state: run };
}

function persistRun() {
  if (challengeMode) return;
  save.activeRun = activeRunRecord();
  saveNow();
}

function toast(message) {
  lastToast = message;
  render();
  globalThis.clearTimeout(toast.timer);
  toast.timer = globalThis.setTimeout(() => {
    if (lastToast === message) {
      lastToast = null;
      render();
    }
  }, 2500);
}

function icon(name, size = 22) {
  const shapes = {
    gear: '<path d="M12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z"/><path d="m19 13.5 2-1.5-2-1.5-.4-2.3-2.5-.4L14.5 6 12 7l-2.5-1-1.6 1.8-2.5.4L5 10.5 3 12l2 1.5.4 2.3 2.5.4L9.5 18 12 17l2.5 1 1.6-1.8 2.5-.4Z"/>',
    back: '<path d="m14.5 5-7 7 7 7"/><path d="M8 12h12"/>',
    pause: '<path d="M8 5.5h3v13H8zM15 5.5h3v13h-3z"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    sound: '<path d="M4 10v4h3l4 3V7l-4 3H4Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 10v4h3l4 3V7l-4 3H4Z"/><path d="m16 9 5 6m0-6-5 6"/>',
    restart: '<path d="M4 11a8 8 0 1 1 2 6"/><path d="M4 5v6h6"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/>',
    hint: '<path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.7.5 1 1.1 1 2.3h6c0-1.2.3-1.8 1-2.3A7 7 0 0 0 12 2Z"/>',
    star: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.4l6.3-.9z"/>',
    window: '<path d="M3.5 3.5h17v17h-17zM12 3.5v17M3.5 12h17"/><path d="M6 6h3v3H6zm9 0h3v3h-3zM6 15h3v3H6zm9 0h3v3h-3z"/>',
    book: '<path d="M4 5.5c3.5-1.8 5.8-1.6 8 0v14c-2.2-1.6-4.5-1.8-8 0z"/><path d="M20 5.5c-3.5-1.8-5.8-1.6-8 0v14c2.2-1.6 4.5-1.8 8 0z"/>'
  };
  return '<svg class="icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (shapes[name] || shapes.window) + "</svg>";
}

function ratingStar(earned = false) {
  return '<svg class="rating-star' + (earned ? " earned" : "") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.4l6.3-.9z"/></svg>';
}

function windowArt(stage = save.workshop.repairs) {
  const panes = [
    ["#eab66d", "#6d8f78", "#c47e6d", "#819bb1"],
    ["#6d8f78", "#e6d19c", "#819bb1", "#c47e6d"],
    ["#c47e6d", "#819bb1", "#eab66d", "#6d8f78"],
    ["#819bb1", "#c47e6d", "#6d8f78", "#e6d19c"]
  ];
  const brightness = stage ? 1 : 0.42;
  const cells = panes.flatMap((row, r) => row.map((color, c) => {
    const i = r * 4 + c;
    const bright = i < (stage === 0 ? 5 : stage === 1 ? 8 : stage === 2 ? 12 : 16);
    return '<path d="M' + (28 + c * 39) + " " + (32 + r * 42) + "h35v38H" + (28 + c * 39) + 'z" fill="' + (bright ? color : "#596054") + '" opacity="' + (bright ? brightness : ".66") + '"/>';
  })).join("");
  return '<svg class="workshop-window" viewBox="0 0 220 230" role="img" aria-label="流光灯铺的四列彩色玻璃窗">' +
    '<path d="M12 18h196v196H12z" fill="#76543c" stroke="#352e27" stroke-width="5"/>' +
    '<path d="M21 27h178v178H21z" fill="#d1b58a" stroke="#b08b5b" stroke-width="4"/>' +
    cells +
    '<path d="M23 29h174v174H23zM66 29v174m44-174v174m44-174v174M23 71h174m-174 42h174m-174 42h174" fill="none" stroke="#4b4032" stroke-width="7"/>' +
    '<path d="m19 28 9-9 164 0 9 9M16 209h188" fill="none" stroke="#d8bd8f" stroke-width="3"/>' +
    '<circle cx="109" cy="113" r="12" fill="#f2d69c" opacity=".72"/>' +
    '<path d="M48 206v10m124-10v10" stroke="#352e27" stroke-width="7" stroke-linecap="round"/></svg>';
}

function goalLabel(goal) {
  const names = { frost: "雾霜", crate: "木箱", vine: "藤纹", chain: "锁链", score: "分数" };
  if (goal.type === "collect") return "收集" + animalName(goal.color);
  return "清理" + (names[goal.type] || "目标");
}

function goalMark(goal) {
  if (goal.type === "collect") return '<span class="goal-piece">' + pieceArt(goal.color, null) + "</span>";
  const art = {
    frost: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9 4l3 3 3-3m-6 16 3-3 3 3M4.5 11l4-.5-.4-4m11.4 6-4-.5.4-4M4.5 13l4 .5-.4 4m11.4-6-4 .5.4 4"/>',
    crate: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.6 8-4.6M12 12v9m-4-7v4m8-4v4"/>',
    vine: '<path d="M4 19c6-1 8-5 9-12m0 7c0-4 3-7 7-7 0 4-3 7-7 7Zm-3-4c-3 0-5-2-5-5 3 0 5 2 5 5Zm2 7c0-3 2-5 5-5 0 3-2 5-5 5Z"/>',
    chain: '<path d="M9.5 14.5 14.5 9.5m-8 8 2-2m7-7 2-2"/><path d="M8.5 15.5 6 18a3.5 3.5 0 0 1-5-5l4.5-4.5a3.5 3.5 0 0 1 5 0m5-1 2.5-2.5a3.5 3.5 0 0 1 5 5L18.5 15a3.5 3.5 0 0 1-5 0"/>',
    score: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.4l6.3-.9z"/>'
  };
  return '<span class="goal-mark mark-' + escapeHtml(goal.type) + '" aria-hidden="true"><svg viewBox="0 0 24 24">' + (art[goal.type] || art.score) + "</svg></span>";
}

function goalProgress(goal, current = run) {
  return current?.progress?.[goalKey(goal)] || 0;
}

function goalList(goals, compact = false) {
  return '<div class="goal-list' + (compact ? " compact" : "") + '">' + goals.map((goal) => {
    const done = goalProgress(goal) >= goal.amount;
    return '<div class="goal-row' + (done ? " done" : "") + '">' + goalMark(goal) +
      '<span class="goal-name">' + escapeHtml(goalLabel(goal)) + '</span><strong>' + goalProgress(goal) + '<i>/</i>' + goal.amount + "</strong></div>";
  }).join("") + "</div>";
}

function header(options = {}) {
  return '<header class="topbar">' +
    '<button class="brand" data-action="home" aria-label="返回主菜单"><span class="brand-mark"><img src="/assets/brand-mark.svg" alt="" aria-hidden="true" width="42" height="42"></span><span><strong>流光灯铺</strong><small>老街修复手记</small></span></button>' +
    (options.title ? '<div class="top-title">' + options.title + "</div>" : '<span class="top-spacer"></span>') +
    '<div class="top-actions">' + (options.back ? '<button class="icon-button" data-action="' + options.back + '" aria-label="' + (options.backLabel || "返回") + '" title="' + (options.backLabel || "返回") + '">' + icon(options.back === "pause" ? "pause" : "back") + "</button>" : "") +
    '<button class="icon-button" data-action="settings" aria-label="设置" title="设置">' + icon("gear") + "</button></div></header>";
}

function menuView() {
  const best = Object.values(save.stars).reduce((sum, count) => sum + Number(count || 0), 0);
  const unlocked = Math.max(1, save.unlocked || 1);
  const canContinue = Boolean(save.activeRun?.state && ["playing", "bonus"].includes(save.activeRun.state.status) && levelById(save.activeRun.levelId));
  const workshopWord = ["尚未修复", "窗沿补齐", "花窗拼合", "整扇窗亮了"][save.workshop.repairs || 0] || "整扇窗亮了";
  return header() + '<main class="menu-screen">' +
    '<section class="menu-copy"><h1>一块玻璃<br><em>一束光。</em></h1><p class="scene-caption">河街 · 晴雨之间</p><p class="lead">跟着阿岚回到老街，把外婆留下的灯铺重新点亮。</p>' +
    '<div class="menu-actions"><button class="button button-primary" data-action="begin-story"><span>' + (canContinue ? "继续修复" : "走进灯铺") + '</span><span aria-hidden="true">→</span></button>' +
    (canContinue ? '<button class="text-button" data-action="new-story">从第一关开始</button>' : "") +
    '<button class="button button-secondary" data-action="challenge">' + icon("star", 18) + '<span>夜灯小试</span></button><button class="text-button menu-help" data-action="help">操作提示</button></div>' +
    '<div class="menu-progress"><span>修复记录</span><b>' + (unlocked - 1) + ' / 36 关</b><span class="progress-divider"></span><span class="mini-stars">' + icon("star", 14) + '</span><b>' + best + " 颗星</b></div></section>" +
    '<section class="menu-art" aria-label="灯铺花窗修复进度"><div class="art-backdrop"></div><div class="window-wrap">' + windowArt() + '</div><div class="art-note"><span>工坊记录</span><strong>' + workshopWord + '</strong><small>材料 ' + (save.workshop.materials || 0) + " 片</small></div><span class=\"art-glint glint-one\"></span><span class=\"art-glint glint-two\"></span></section>" +
    '<aside class="menu-side"><span class="side-rule"></span><p>这条街的灯，<br>还等着我们。</p><button class="side-link" data-action="help">' + icon("book", 17) + "再看一次操作提示</button></aside></main>" +
    '<footer class="menu-footer"><span>老街的修复从一扇窗开始</span><span>无须联网 · 进度保存在本机</span></footer>';
}

function tutorialView() {
  const pages = [
    { title: "让相同的小动物排在一起", text: "横着或竖着连成三只相同的小动物，就能收下一束光。点击两枚相邻棋子，或轻轻拖动它们。", art: "match" },
    { title: "四连与五连，会留下礼物", text: "四连会留下带方向标记的光束棋子；拐角或 T 形会留下星形晶石；五连直线会留下菱形透镜。小动物的样子不会变。", art: "special" },
    { title: "先看目标，再决定下一步", text: "雾霜、藤纹和锁链覆盖的棋子不能交换，但仍可原位匹配或用特效清理。雾霜和木箱也能通过相邻消除清理。", art: "obstacles" },
    { title: "一关只用自己的步数", text: "一次有效交换算一步，连锁不额外计步。完成目标后，余步化为特殊棋子自动消除；最终总分达到界面标出的三星线，就能获得三星。", art: "end" }
  ];
  const page = pages[tutorialStep];
  let demo = "";
  if (page.art === "match") demo = '<div class="tutorial-demo">' + ["amber", "jade", "jade", "jade", "plum"].map((color) => '<span class="demo-piece">' + pieceArt(color) + "</span>").join("") + "</div>";
  if (page.art === "special") demo = '<div class="tutorial-demo">' + pieceArt("amber", "beam") + pieceArt("coral", "bomb") + pieceArt("plum", "lens") + "</div>";
  if (page.art === "obstacles") demo = '<div class="tutorial-obstacles"><span class="sample-frost">雾霜</span><span class="sample-crate">木箱</span><span class="sample-chain">锁链</span></div>';
  if (page.art === "end") demo = '<div class="tutorial-demo"><span class="demo-big-mark">' + icon("star", 42) + '</span><span class="demo-arrow">→</span><span class="demo-big-mark">' + icon("window", 42) + "</span></div>";
  return header() + '<main class="tutorial-screen"><div class="tutorial-sheet"><div class="tutorial-topline"><span>上手提示</span><span>' + (tutorialStep + 1) + " / " + pages.length + '</span></div><div class="tutorial-art">' + demo + '</div><h1>' + page.title + '</h1><p>' + page.text + '</p><div class="tutorial-controls"><button class="text-button" data-action="skip-tutorial">跳过</button><div class="tutorial-dots">' + pages.map((_, i) => '<span class="' + (i === tutorialStep ? "active" : "") + '"></span>').join("") + '</div><button class="button button-primary" data-action="tutorial-next">' + (tutorialStep === pages.length - 1 ? "去选关" : "继续") + '<span aria-hidden="true">→</span></button></div></div></main>';
}

const mapPoints = [[90,75],[320,115],[500,190],[430,285],[230,300],[90,385],[130,500],[360,485],[520,580],[420,680],[180,700],[300,825]];
const mapNames = ["灯铺后室","河街石桥","钟表修理铺","纸鸢窗","茶铺雨棚","邮筒边","蓝砖门楼","街角花窗","夜班电车","旧照相馆","河风廊","灯铺花窗"];

function mapView() {
  const chapter = CHAPTERS[activeChapter];
  const totalStars = Object.values(save.stars).reduce((sum, count) => sum + Number(count || 0), 0);
  const path = mapPoints.map(([x, y], i) => (i === 0 ? "M" : "L") + x + " " + y).join(" ");
  const nodes = mapPoints.map(([x, y], index) => {
    const id = activeChapter * 12 + index + 1;
    const unlocked = id <= Math.max(1, save.unlocked || 1);
    const earned = Number(save.stars[id] || 0);
    return '<button class="map-node ' + (unlocked ? "unlocked" : "locked") + (earned ? " cleared" : "") + '" style="--x:' + (x / 6) + '%;--y:' + (y / 9) + '%" data-action="level" data-level="' + id + '"' + (!unlocked ? " disabled" : "") + ' aria-label="第' + id + "关 " + escapeHtml(mapNames[index]) + (unlocked ? "" : "，尚未解锁") + '">' +
      '<span class="node-number">' + id + '</span><span class="node-stars">' + [0, 1, 2].map((i) => ratingStar(i < earned)).join("") + '</span><span class="node-name">' + mapNames[index] + "</span></button>";
  }).join("");
  const chapterButtons = CHAPTERS.map((entry, index) => '<button class="chapter-tab ' + (index === activeChapter ? "active" : "") + '" data-action="chapter" data-chapter="' + index + '"' + (index * 12 + 1 > save.unlocked ? " disabled" : "") + '><span>' + escapeHtml(entry.title) + '</span><small>' + (index + 1) + " / 3</small></button>").join("");
  const repairLevel = save.workshop.repairs || 0;
  return header({ back: "home", backLabel: "返回菜单" }) + '<main class="map-screen"><section class="map-heading"><div><h1>' + escapeHtml(chapter.title) + '</h1><p class="scene-caption">' + escapeHtml(chapter.place) + '</p><p>' + escapeHtml(chapter.subtitle) + '</p></div><div class="map-story"><p>' + escapeHtml(chapter.story) + '</p><span>—— ' + escapeHtml(chapter.character) + '</span></div></section>' +
    '<div class="chapter-tabs">' + chapterButtons + '</div><section class="map-layout"><div class="town-map" aria-label="' + escapeHtml(chapter.title) + '关卡路线">' +
    '<div class="map-scene scene-' + chapter.palette + '"><span class="scene-roof roof-a"></span><span class="scene-roof roof-b"></span><span class="scene-lamp lamp-a"></span><span class="scene-lamp lamp-b"></span><span class="scene-water"></span></div>' +
    '<svg class="map-route" viewBox="0 0 600 900" preserveAspectRatio="none" aria-hidden="true"><path d="' + path + '" fill="none" stroke="#e9d7b3" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path d="' + path + '" fill="none" stroke="#9b805d" stroke-width="2" stroke-dasharray="4 13" stroke-linecap="round"/></svg>' + nodes + '</div>' +
    '<aside class="workshop-card"><div class="workshop-card-top"><span>灯铺陈列窗</span><b>' + totalStars + ' <i>★</i></b></div><div class="mini-window">' + windowArt(repairLevel) + '</div><h2>' + ["等第一块玻璃归位", "窗沿已经补好", "花纹开始连起来", "整扇窗亮起来了"][Math.min(3, repairLevel)] + '</h2><p>完成关卡可得星星与修复材料，慢慢补齐这扇留在老街的花窗。</p><div class="decoration-list">' + (save.workshop.decorations.length ? save.workshop.decorations.map((item) => '<span>' + escapeHtml(item) + "</span>").join("") : "<span>灯穗 · 6 颗星解锁</span>") + '</div><button class="button button-secondary full-button" data-action="challenge">来一局夜灯小试</button></aside></section>' +
    '<div class="map-footnote"><span>沿着灯光往前走</span><span>已开放到第 ' + save.unlocked + " 关</span></div></main>";
}

function cellMarkup(cell, y, x) {
  const key = point(y, x);
  const positionLabel = '第' + (y + 1) + '行第' + (x + 1) + '列，';
  if (cell.crate) return '<button class="board-cell blocked crate-cell" data-cell="' + key + '" aria-label="' + positionLabel + '木箱，需清理相邻棋子"><span class="crate-art"><i></i><i></i><i></i></span><span class="obstacle-label">木箱</span></button>';
  const tile = cell.tile;
  const locked = !canSwapCell(cell);
  const selectedCell = selected && selected[0] === y && selected[1] === x;
  const hint = hintCells.includes(key);
  return '<button class="board-cell' + (selectedCell ? " selected" : "") + (cell.flash ? " clearing" : "") + (cell.chain ? " chained" : "") + (cell.frost ? " frosted" : "") + (cell.vine ? " vined" : "") + (locked ? " swap-locked" : "") + (hint ? " hinting" : "") + '" data-cell="' + key + '"' + (locked ? ' aria-disabled="true" title="清除覆盖后才能交换"' : "") + ' aria-label="' + positionLabel + animalName(tile.color) + (tile.special ? "，" + ({ beam: "光束玻璃" + (tile.direction === "v" ? "，纵向" : "，横向"), bomb: "灯芯晶石", lens: "虹彩透镜" }[tile.special]) : "") + (cell.frost ? "，覆盖雾霜" : "") + (cell.vine ? "，覆有藤纹" : "") + (cell.chain ? "，被锁链扣住" : "") + (locked ? "，不能交换" : "") + '">' +
    '<span class="tile-body">' + pieceArt(tile.color, tile.special, tile.direction) + '</span>' + (cell.frost ? '<span class="frost-overlay" aria-hidden="true"></span>' : "") + (cell.vine ? '<span class="vine-overlay" aria-hidden="true"></span>' : "") + (cell.chain ? '<span class="chain-overlay" aria-hidden="true"><i></i><i></i></span>' : "") + '</button>';
}

function boardMarkup(board) {
  const width = board[0].length;
  return '<div class="board-grid" role="group" aria-busy="' + isResolving + '" aria-label="三消棋盘，' + width + " 列 " + board.length + ' 行" style="--cols:' + width + '">' + board.map((row, y) => row.map((cell, x) => cellMarkup(cell, y, x)).join("")).join("") + "</div>";
}

function starGoalMarkup() {
  const [, , three] = starRequirements(level);
  const gap = Math.max(0, three - run.score);
  const complete = ["won", "bonus"].includes(run.status);
  const status = gap ? "还差 " + gap.toLocaleString("zh-CN") + " 分" : complete ? "三星分数已达标" : "分数已达标，继续完成目标";
  return '<div class="star-goal' + (gap ? "" : " reached") + '"><span class="star-goal-title">' + icon("star", 15) + '三星目标 <b>' + three.toLocaleString("zh-CN") + ' 分</b></span><span class="star-goal-gap">' + status + '</span><progress max="' + three + '" value="' + Math.min(three, run.score) + '" aria-label="三星分数进度"></progress><small>完成全部目标后，按总分评星 · 余步奖励也计分</small></div>';
}

function ratingRulesMarkup() {
  const [, two, three] = starRequirements(level);
  return '<div class="rating-rules"><b>本关评星条件</b><span>一星：完成全部关卡目标</span><span>二星：通关且总分 ≥ ' + two.toLocaleString("zh-CN") + ' 分</span><span>三星：通关且总分 ≥ ' + three.toLocaleString("zh-CN") + ' 分</span><small>总分包含余步化光奖励，奖励结束后确定星级。</small></div>';
}

function playView() {
  const chapter = challengeMode ? { title: "夜灯小试" } : chapterFor(level.id);
  const name = challengeMode ? "固定布局 · 限步挑战" : level.name;
  const bonus = run.status === "bonus";
  return header({ title: '<strong>' + escapeHtml(name) + '</strong><span class="game-kicker">' + escapeHtml(chapter.title) + '</span>', back: "pause", backLabel: "暂停" }) +
    '<main class="play-screen" data-phase="' + (bonus ? run.bonus.phase : "playing") + '"><div class="play-status"><div class="steps-box"><small>' + (bonus ? "余步化光" : "剩余步数") + '</small><strong>' + run.remaining + '</strong></div><div class="goal-panel"><span class="panel-caption">' + (bonus ? "目标已达成" : "本关目标") + '</span>' + goalList(level.goals, true) + '</div><div class="score-box"><small>' + (challengeMode ? "挑战分数" : "本局得分") + '</small><strong>' + run.score.toLocaleString("zh-CN") + '</strong><span class="cascade-note">' + (bonus ? "奖励 " + run.cascade + " 连锁" : run.cascade > 1 ? run.cascade + " 连锁" : "一步一束光") + '</span></div>' + starGoalMarkup() + '</div>' +
    '<section class="board-stage"><div class="board-wood">' + boardMarkup(run.board) + '</div><div class="board-caption"><span>' + (bonus ? "余步化光 · 已转化 " + run.bonus.converted + " / " + run.bonus.moves : "点击相邻两枚棋子，或按住拖动") + '</span><span>' + (bonus ? run.bonus.phase === "converting" ? "光落到哪里，哪里就有特殊标记" : "全部赋光后自动引爆" : "方向键也可移动焦点") + '</span></div></section>' +
    '<div class="play-bottom">' + (bonus ? '<span class="bonus-note">余步化光 · 奖励正在自动结算</span>' : '<div class="piece-legend">' + Object.entries(ANIMALS).map(([color, animal]) => '<span>' + pieceArt(color) + animal.name + '</span>').join("") + '</div>') + '<div class="play-actions">' +
    (bonus ? '<button class="small-action" data-action="skip-bonus">' + icon("play", 18) + '跳过奖励动画</button>' :
    '<button class="small-action" data-action="hint"' + (isResolving ? " disabled" : "") + '>' + icon("hint", 18) + '看一眼提示</button><button class="small-action" data-action="restart"' + (isResolving ? " disabled" : "") + '>' + icon("restart", 18) + '重新开始</button>') +
    '<button class="small-action" data-action="map">' + icon("map", 18) + '返回地图</button></div></div>' +
    (lastToast ? '<div class="toast" role="status">' + escapeHtml(lastToast) + "</div>" : "") + "</main>";
}

function endingView() {
  const totalStars = Object.values(save.stars).reduce((sum, stars) => sum + Number(stars || 0), 0);
  const totalScore = Object.values(save.scores).reduce((sum, score) => sum + Number(score || 0), 0);
  return header() + '<main class="ending-screen"><div class="ending-window">' + windowArt(3) + '<span class="ending-glow"></span></div><section class="ending-copy"><h1>整条街，<br><em>都亮起来了。</em></h1><p class="scene-caption">雨巷小剧场 · 今晚开场</p><p>林秋拉开门厅的帘子，河街的窗光映进观众席。阿岚把铜钥匙放回外婆的抽屉，留下一本新的修复手记。</p><div class="ending-score"><span><strong>36</strong> 关完成</span><span><strong>' + totalStars + '</strong> 颗星</span><span><strong>' + totalScore.toLocaleString("zh-CN") + '</strong> 总分</span></div><div class="ending-actions"><button class="button button-primary" data-action="map">回到街区</button><button class="button button-secondary" data-action="challenge">再试一次夜灯小试</button></div><button class="text-button" data-action="credits">翻看修复图册</button></section></main>' +
    (modal === "credits" ? creditsModal() : "");
}

function creditsModal() {
  return '<div class="modal-shade" data-action="close-modal"><section class="dialog credits-dialog" role="dialog" aria-modal="true" aria-labelledby="credits-title"><button class="dialog-close" data-action="close-modal" aria-label="关闭">×</button><h2 id="credits-title">街坊都记得这束光</h2><p class="dialog-note">修复图册</p><p>阿岚在灯铺里留下了新的玻璃样片。周站长修好了站台钟，林秋把门厅的灯一直留到散场。</p><div class="credits-panes">' + ["amber", "jade", "coral", "azure", "plum"].map((color) => '<span>' + pieceArt(color) + "</span>").join("") + '</div><button class="button button-primary full-button" data-action="map">继续逛街区</button></section></div>';
}

function settingsModal() {
  const settings = save.settings;
  return '<div class="modal-shade" data-action="close-modal"><section class="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button class="dialog-close" data-action="close-modal" aria-label="关闭">×</button><h2 id="settings-title">设置</h2><p class="dialog-note">灯铺的声音与画面</p>' +
    '<label class="setting-row"><span><b>背景音乐</b><small>轻轻的工坊旋律</small></span><input type="checkbox" data-setting="music" ' + (settings.music ? "checked" : "") + '><i class="toggle"></i></label>' +
    '<label class="setting-row"><span><b>操作音效</b><small>匹配、连锁和修复反馈</small></span><input type="checkbox" data-setting="sfx" ' + (settings.sfx ? "checked" : "") + '><i class="toggle"></i></label>' +
    '<label class="volume-row"><span><b>音量</b><strong>' + Math.round(settings.volume * 100) + '%</strong></span><input type="range" min="0" max="100" value="' + Math.round(settings.volume * 100) + '" data-setting="volume" aria-label="音量"></label>' +
    '<div class="setting-options"><label class="check-row"><input type="checkbox" data-setting="reduceMotion" ' + (settings.reduceMotion ? "checked" : "") + '><span>简化动画</span></label><label class="check-row"><input type="checkbox" data-setting="reduceFlash" ' + (settings.reduceFlash ? "checked" : "") + '><span>降低闪光</span></label><label class="check-row"><input type="checkbox" data-setting="vibration" ' + (settings.vibration ? "checked" : "") + '><span>触屏轻震</span></label></div>' +
    '<div class="setting-help"><span>存档与设置保存在本机浏览器。</span><button class="text-button danger-text" data-action="reset-save">重置游戏进度</button></div><button class="button button-primary full-button" data-action="close-modal">完成</button></section></div>';
}

function pauseModal() {
  return '<div class="modal-shade pause-shade"><section class="dialog pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title">' +
    '<h2 id="pause-title">' + (tabAutoPaused ? "页面切换，游戏已暂停" : "歇一会儿") + '</h2><p class="dialog-note">碎光也歇一会儿</p>' +
    '<p>当前棋盘和步数都已停住。</p>' + ratingRulesMarkup() + '<div class="dialog-actions">' +
    '<button class="button button-primary" data-action="resume">' + icon("play", 18) + '继续这一关</button>' +
    '<button class="button button-secondary" data-action="restart">' + icon("restart", 18) + '重新开始</button>' +
    '<button class="text-button" data-action="map">返回地图</button></div></section></div>';
}

function resultModal() {
  const won = run.status === "won";
  const stars = won ? starsForWin(run, level) : 0;
  const message = won ? (challengeMode ? "夜色里收下了这束光。" : "这扇窗，已经重新亮了。") : "还差一点，再试一回吧。";
  const remainingGoals = level.goals.filter((goal) => goalProgress(goal) < goal.amount).map((goal) => goalLabel(goal)).join("、");
  return '<div class="modal-shade"><section class="dialog result-dialog ' + (won ? "won-dialog" : "lost-dialog") + '" role="dialog" aria-modal="true" aria-labelledby="result-title">' +
    '<div class="result-mark">' + icon(won ? "star" : "restart", 32) + '</div><h2 id="result-title">' + message + '</h2><p class="dialog-note">' + (won ? (challengeMode ? "夜灯挑战完成" : "修复完成") : "这次先到这里") + '</p>' +
    (won ? '<div class="result-stars" aria-label="' + stars + '颗星">' + [0, 1, 2].map((i) => ratingStar(i < stars)).join("") + '</div>' + (run.bonus ? '<p class="result-bonus">余步化光 · ' + run.bonus.moves + ' 步带来 <b>+' + run.bonus.score.toLocaleString("zh-CN") + '</b> 分</p>' : "") + '<div class="result-stats"><span>本局得分 <b>' + run.score.toLocaleString("zh-CN") + '</b></span><span>达标余步 <b>' + (run.completionRemaining ?? run.remaining) + '</b></span><span>修复材料 <b>+' + lastReward + '</b></span></div>' :
    '<p class="failure-reason">步数用完时还差：' + escapeHtml(remainingGoals || "目标还没有全部完成") + "。不消耗体力，马上可以重试。</p>") +
    ratingRulesMarkup() + (won ? '<p class="rating-result">' + (stars === 3 ? "目标全部完成，总分达到三星线。" : "目标全部完成，距离三星还差 " + Math.max(0, starRequirements(level)[2] - run.score).toLocaleString("zh-CN") + " 分。多做连锁、组合特效，并留些步数化光吧。") + '</p>' : "") +
    '<div class="dialog-actions">' + (won && !challengeMode && level.id === 36 ? '<button class="button button-primary" data-action="ending">看结局</button>' :
    won && !challengeMode ? '<button class="button button-primary" data-action="next-level">继续沿街走</button>' :
    '<button class="button button-primary" data-action="retry">再试一次</button>') +
    '<button class="button button-secondary" data-action="map">返回地图</button></div></section></div>';
}

function resetModal() {
  return '<div class="modal-shade" data-action="close-modal"><section class="dialog reset-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"><button class="dialog-close" data-action="close-modal" aria-label="取消">×</button><h2 id="reset-title">要清空灯铺手记吗？</h2><p class="dialog-note">重新开始</p><p>这会删除已解锁关卡、每关星级与最高分、修复材料、装饰、当前关卡和设置。删除后无法恢复。</p><div class="dialog-actions"><button class="button button-danger" data-action="confirm-reset">清空并重来</button><button class="button button-secondary" data-action="close-modal">先留着</button></div></section></div>';
}

function modalMarkup() {
  if (modal === "settings") return settingsModal();
  if (modal === "pause") return pauseModal();
  if (modal === "result") return resultModal();
  if (modal === "reset") return resetModal();
  return "";
}

function focusDescriptor(element) {
  if (!element) return null;
  if (element.dataset?.cell) return { type: "cell", value: element.dataset.cell };
  if (element.dataset?.setting) return { type: "setting", value: element.dataset.setting };
  if (element.dataset?.action) return { type: "action", value: element.dataset.action, level: element.dataset.level || null };
  if (element.id) return { type: "id", value: element.id };
  return null;
}

function elementForFocusDescriptor(descriptor) {
  if (!descriptor) return null;
  if (descriptor.type === "cell") return app.querySelector('[data-cell="' + descriptor.value + '"]');
  if (descriptor.type === "setting") return app.querySelector('[data-setting="' + descriptor.value + '"]');
  if (descriptor.type === "action") {
    const candidates = [...app.querySelectorAll('[data-action="' + descriptor.value + '"]')];
    return candidates.find((element) => (element.dataset.level || null) === descriptor.level) || candidates[0] || null;
  }
  return [...app.querySelectorAll("[id]")].find((element) => element.id === descriptor.value) || null;
}

function dialogFocusableElements(dialog) {
  return [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0);
}

function render() {
  const movingBoard = screen === "play" && isResolving ? boardEffects.root : null;
  const activeElement = document.activeElement;
  const previousDialog = app.querySelector(".dialog");
  const focusWasInDialog = Boolean(previousDialog && previousDialog.contains(activeElement));
  const focusedDialogControl = focusWasInDialog ? focusDescriptor(activeElement) : null;
  const previouslyFocusedCell = activeElement?.dataset?.cell || null;
  if (previouslyFocusedCell) focusCell = coords(previouslyFocusedCell);
  const openingModal = Boolean(modal && !renderedModal);
  const closingModal = Boolean(!modal && renderedModal);
  if (openingModal) {
    modalFocusReturn = focusDescriptor(activeElement);
    modalFocusScreen = screen;
  }
  document.documentElement.classList.toggle("reduce-motion", Boolean(save.settings.reduceMotion));
  document.documentElement.classList.toggle("reduce-flash", Boolean(save.settings.reduceFlash));
  let view = "";
  if (screen === "menu") view = menuView();
  else if (screen === "tutorial") view = tutorialView();
  else if (screen === "map") view = mapView();
  else if (screen === "play") view = playView() + (modal === "result" ? resultModal() : modalMarkup());
  else if (screen === "ending") view = endingView() + (modal && modal !== "credits" ? modalMarkup() : "");
  else view = menuView();
  if (modal && !["play", "ending"].includes(screen)) view += modalMarkup();
  if (lastToast && screen !== "play") view += '<div class="toast global-toast" role="status">' + escapeHtml(lastToast) + "</div>";
  app.innerHTML = view;
  if (movingBoard) app.querySelector(".board-wood")?.replaceWith(movingBoard);
  fitPlayBoard(app.querySelector(".play-screen"));
  for (const child of app.children) {
    const isDialogShade = child.classList.contains("modal-shade");
    child.inert = Boolean(modal && !isDialogShade);
    if (modal && !isDialogShade) child.setAttribute("aria-hidden", "true");
    else child.removeAttribute("aria-hidden");
  }
  if (!modal && screen === "play" && focusCell && previouslyFocusedCell) {
    const cell = app.querySelector('[data-cell="' + point(focusCell[0], focusCell[1]) + '"]');
    if (cell) cell.focus({ preventScroll: true });
  }
  if (modal) {
    const dialog = app.querySelector(".dialog");
    const dialogFocus = focusWasInDialog ? elementForFocusDescriptor(focusedDialogControl) : null;
    const initialFocus = dialog?.querySelector("button:not([disabled]), input:not([disabled])") || dialog;
    (dialogFocus || initialFocus)?.focus({ preventScroll: true });
  } else if (closingModal) {
    const returnFocus = screen === modalFocusScreen ? elementForFocusDescriptor(modalFocusReturn) : null;
    (returnFocus || app.querySelector(".topbar button") || app.querySelector("main h1"))?.focus({ preventScroll: true });
    modalFocusReturn = null;
    modalFocusScreen = null;
  }
  renderedModal = modal;
}

function goToMap() {
  if (isResolving) cancelResolution();
  screen = "map";
  modal = null;
  selected = null;
  isPaused = false;
  tabAutoPaused = false;
  render();
}

function beginLevel(id, isChallenge = false) {
  if (isResolving) return;
  challengeMode = isChallenge;
  level = isChallenge ? CHALLENGE : levelById(id);
  if (!isChallenge && id > save.unlocked) {
    toast("先修好前一扇窗，这个地点就会开放。");
    return;
  }
  run = createRun(level, isChallenge ? 0x4c554d49 : id * 104729 + 41);
  screen = "play";
  modal = null;
  isPaused = false;
  selected = null;
  focusCell = [0, 0];
  lastToast = null;
  render();
  persistRun();
}

function continueLevel() {
  const record = save.activeRun;
  if (record?.state && ["playing", "bonus"].includes(record.state.status) && record.levelId) {
    challengeMode = false;
    level = levelById(record.levelId);
    run = record.state;
    screen = "play";
    modal = null;
    isPaused = false;
    selected = null;
    render();
    if (run.status === "bonus") playWinBonus(++motionGeneration);
  } else {
    screen = save.tutorialSeen ? "map" : "tutorial";
    tutorialStep = 0;
    render();
  }
}

function finishLevel(showResult = true) {
  lastReward = 0;
  if (run.status === "won") {
    audio.play("win");
    if (save.settings.vibration && navigator.vibrate) navigator.vibrate(25);
    if (!challengeMode) {
      const reward = recordWin(save, run, level);
      lastReward = reward.materials;
      if (reward.newlyUnlocked) audio.play("repair");
    } else {
      lastReward = Math.floor(run.score / 1000);
      save.workshop.materials = (save.workshop.materials || 0) + lastReward;
    }
    if (!challengeMode) save.activeRun = null;
  } else {
    audio.play("fail");
    if (!challengeMode) save.activeRun = null;
  }
  saveNow();
  modal = showResult ? "result" : null;
  isResolving = false;
  if (showResult) render();
}

function motionDelay(ms) {
  return new Promise((resolve) => {
    timerRemaining = ms;
    timerResolve = resolve;
    scheduleTimer();
  });
}

function scheduleTimer() {
  if (!timerResolve || isPaused) return;
  timerStarted = Date.now();
  currentTimer = globalThis.setTimeout(() => {
    currentTimer = null;
    timerResolve?.();
    timerResolve = null;
    timerRemaining = 0;
  }, timerRemaining);
}

function pauseTimer() {
  if (currentTimer) {
    globalThis.clearTimeout(currentTimer);
    currentTimer = null;
    timerRemaining = Math.max(0, timerRemaining - (Date.now() - timerStarted));
  }
}

function resumeTimer() {
  if (timerResolve) scheduleTimer();
}

function pauseGame(fromVisibility = false) {
  if (screen !== "play" || modal === "result") return;
  pointerStart = null;
  isPaused = true;
  tabAutoPaused = fromVisibility;
  pauseTimer();
  boardEffects.pause();
  audio.stopMusic();
  modal = "pause";
  render();
}

function resumeGame() {
  isPaused = false;
  tabAutoPaused = false;
  modal = null;
  render();
  boardEffects.resume();
  resumeTimer();
  audio.startMusic();
}

async function playMove(from, to) {
  if (isResolving || modal || !run) return;
  const outcome = resolveMove(run, level, from, to);
  if (!outcome.accepted && !outcome.frames.length) {
    if (outcome.reason) toast(outcome.reason);
    selected = null;
    render();
    return;
  }
  const generation = ++motionGeneration;
  pendingPriorRun = JSON.parse(JSON.stringify(run));
  isResolving = true;
  run = { ...run, remaining: outcome.state.remaining, cascade: 0 };
  selected = null;
  hintCells = [];
  render();
  await audio.unlock();
  if (generation !== motionGeneration) return;
  audio.play("swap");
  if (!await playFrames(outcome.frames, generation)) return;
  run = outcome.state;
  boardEffects.clear();
  if (run.status === "won") {
    await playWinBonus(generation);
    return;
  }
  pendingPriorRun = null;
  isResolving = false;
  render();
  if (!outcome.accepted) { toast(outcome.reason); return; }
  if (run.status !== "playing") finishLevel();
  else persistRun();
}

async function playWinBonus(generation) {
  const outcome = winBonus(run, level);
  if (!outcome) return;
  pendingWinOutcome = outcome;
  pendingPriorRun = null;
  isResolving = true;
  selected = null;
  run = outcome.start;
  // Store the deterministic starting checkpoint, so refreshing replays this
  // reward before it is credited rather than losing it or granting it twice.
  persistRun();
  render();
  await audio.unlock();
  if (generation !== motionGeneration) return;
  if (!await playFrames(outcome.frames, generation)) return;
  boardEffects.clear();
  run = outcome.state;
  pendingWinOutcome = null;
  finishLevel();
}

async function playFrames(frames, generation) {
  for (const frame of frames) {
    if (generation !== motionGeneration) return false;
    const previousTiles = new Map((frame.converted || []).map(({ key }) => [key, app.querySelector('[data-cell="' + key + '"] .tile-body')?.cloneNode(true)]));
    boardEffects.clear();
    if (frame.board) run = { ...run, board: frame.board };
    if (frame.score !== undefined) run.score = frame.score;
    if (frame.progress) run.progress = frame.progress;
    if (frame.remaining !== undefined) run.remaining = frame.remaining;
    if (frame.bonus) run.bonus = frame.bonus;
    if (frame.event && frame.type === "clear") {
      run.cascade = frame.event.cascade || run.cascade;
      const name = frame.combo ? "combo" : frame.specials?.[0]?.type || frame.created?.type || (run.cascade > 1 ? "cascade" : "match");
      audio.play(name);
      lastToast = null;
    }
    if (frame.type === "bonus-start") { run.cascade = 0; audio.play("repair"); lastToast = null; }
    if (frame.type === "bonus-convert") audio.play("bonus");
    if (frame.type === "bonus-ready") audio.play("bonus-ready");
    if (frame.type === "shuffle") lastToast = "棋盘已经重新排好，新的落点出现了。";
    if (frame.type === "settle") lastToast = run.status === "bonus" ? "碎光收拢，奖励已经收好了。" : "连锁过长，棋盘已整理好，可以继续。";
    render();
    const duration = boardEffects.play(app.querySelector(".board-wood"), frame, previousTiles);
    if (isPaused) boardEffects.pause();
    if (frame.type === "clear" || frame.type.startsWith("bonus-")) {
      const announcement = document.createElement("span");
      announcement.className = "board-announcement";
      announcement.setAttribute("role", "status");
      announcement.textContent = clearCue(frame) || "收下" + frame.event.count + "枚棋子，得分" + frame.scoreDelta;
      boardEffects.overlay.append(announcement);
    }
    await motionDelay(duration);
    if (generation !== motionGeneration) return false;
  }
  return true;
}

function cellAction(value) {
  if (screen !== "play" || isResolving || modal) return;
  const [y, x] = coords(value);
  focusCell = [y, x];
  const current = run.board[y][x];
  if (current.crate || !current.tile) {
    selected = null;
    render();
    return;
  }
  if (!canSwapCell(current)) {
    selected = null;
    toast("这枚棋子被覆盖锁住了，清除覆盖后才能交换。");
    return;
  }
  if (!selected) {
    selected = [y, x];
    render();
    return;
  }
  const [oldY, oldX] = selected;
  if (oldY === y && oldX === x) {
    selected = null;
    render();
    return;
  }
  if (Math.abs(oldY - y) + Math.abs(oldX - x) === 1) {
    playMove([oldY, oldX], [y, x]);
  } else {
    selected = [y, x];
    render();
  }
}

function showHint() {
  if (isResolving || modal) return;
  const board = run.board;
  const pairs = [];
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[0].length; x++) {
      for (const [dy, dx] of [[0, 1], [1, 0]]) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < board.length && nx < board[0].length && legalSwap(board, [y, x], [ny, nx])) {
          pairs.push([point(y, x), point(ny, nx)]);
        }
      }
    }
  }
  if (!pairs.length) {
    run = { ...run, board: reshuffle(run.board, run.seed + run.score + 1) };
    toast("没有能连上的位置，棋盘已经重新排好。");
    persistRun();
    return;
  }
  hintCells = pairs[0];
  render();
  globalThis.clearTimeout(hintTimer);
  hintTimer = globalThis.setTimeout(() => { hintCells = []; render(); }, 1500);
}

function restartLevel() {
  if (isResolving) cancelResolution();
  beginLevel(level.id, challengeMode);
}

function cancelResolution() {
  motionGeneration++;
  boardEffects.clear();
  if (currentTimer) globalThis.clearTimeout(currentTimer);
  currentTimer = null;
  timerRemaining = 0;
  if (timerResolve) timerResolve();
  timerResolve = null;
  const completedWin = pendingWinOutcome?.state;
  pendingWinOutcome = null;
  if (completedWin) run = completedWin;
  else if (pendingPriorRun) run = pendingPriorRun;
  pendingPriorRun = null;
  isResolving = false;
  isPaused = false;
  modal = null;
  if (completedWin) finishLevel(false);
}

function setSetting(key, value) {
  save.settings[key] = value;
  audio.setSettings(save.settings);
  saveNow();
  render();
}

function handleAction(action, element) {
  if (action === "settings") {
    if (screen === "play" && ["playing", "bonus"].includes(run?.status)) {
      isPaused = true;
      pauseTimer();
      boardEffects.pause();
      audio.stopMusic();
    }
    modal = "settings"; render(); return;
  }
  if (action === "close-modal") {
    if (modal === "pause" || isPaused) resumeGame();
    else { modal = null; render(); }
    return;
  }
  if (action === "home") {
    if (screen === "play" && !modal) goToMap();
    else { screen = "menu"; modal = null; render(); }
    return;
  }
  if (action === "begin-story") { audio.unlock(); continueLevel(); return; }
  if (action === "new-story") { save.activeRun = null; save.tutorialSeen = false; saveNow(); tutorialStep = 0; screen = "tutorial"; render(); return; }
  if (action === "tutorial-next") {
    if (tutorialStep < 3) tutorialStep++;
    else { save.tutorialSeen = true; saveNow(); screen = "map"; }
    render(); return;
  }
  if (action === "skip-tutorial" || action === "help") {
    if (action === "skip-tutorial") { save.tutorialSeen = true; saveNow(); screen = "map"; }
    else { tutorialStep = 0; screen = "tutorial"; }
    render(); return;
  }
  if (action === "chapter") {
    const chapterIndex = Number(element.dataset.chapter);
    if (chapterIndex * 12 + 1 <= save.unlocked) activeChapter = chapterIndex;
    render(); return;
  }
  if (action === "level") { beginLevel(Number(element.dataset.level)); return; }
  if (action === "challenge") { beginLevel(0, true); return; }
  if (action === "map") { goToMap(); return; }
  if (action === "skip-bonus" && pendingWinOutcome) { cancelResolution(); modal = "result"; render(); return; }
  if (action === "pause") { pauseGame(); return; }
  if (action === "resume") { resumeGame(); return; }
  if (action === "restart") { restartLevel(); return; }
  if (action === "retry") { beginLevel(level.id, challengeMode); return; }
  if (action === "next-level") { beginLevel(level.id + 1); return; }
  if (action === "ending") { screen = "ending"; modal = null; render(); return; }
  if (action === "credits") { modal = "credits"; render(); return; }
  if (action === "hint") { showHint(); return; }
  if (action === "reset-save") { modal = "reset"; render(); return; }
  if (action === "confirm-reset") {
    clearSave();
    save = { ...DEFAULT_SETTINGS };
    save = loadSave().data;
    level = null; run = null; screen = "menu"; modal = null; activeChapter = 0;
    audio.setSettings(save.settings);
    lastToast = "进度已清空，灯铺可以重新修复了。";
    render(); return;
  }
}

app.addEventListener("click", (event) => {
  if (Date.now() < suppressClickUntil) return;
  const cell = event.target.closest("[data-cell]");
  if (cell) {
    cellAction(cell.dataset.cell);
    return;
  }
  const control = event.target.closest("[data-action]");
  if (control) {
    if (control.classList.contains("modal-shade") && event.target !== control) return;
    if (control.disabled) return;
    handleAction(control.dataset.action, control);
  }
});

app.addEventListener("change", (event) => {
  const control = event.target.closest("[data-setting]");
  if (!control) return;
  const key = control.dataset.setting;
  const value = control.type === "checkbox" ? control.checked : Number(control.value) / 100;
  setSetting(key, value);
});

app.addEventListener("input", (event) => {
  const control = event.target.closest('[data-setting="volume"]');
  if (!control) return;
  save.settings.volume = Number(control.value) / 100;
  audio.setSettings(save.settings);
});

app.addEventListener("pointerdown", (event) => {
  const cell = event.target.closest("[data-cell]");
  if (!cell || screen !== "play" || isResolving || modal || !event.isPrimary || event.button !== 0) return;
  pointerStart = { key: cell.dataset.cell, x: event.clientX, y: event.clientY, pointerId: event.pointerId, size: cell.getBoundingClientRect().width };
  try { cell.setPointerCapture(event.pointerId); } catch { /* Synthetic test pointers have no active capture. */ }
});

globalThis.addEventListener("pointerup", (event) => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const start = pointerStart;
  pointerStart = null;
  const dx = event.clientX - start.x, dy = event.clientY - start.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < Math.max(9, start.size * .28)) return;
  suppressClickUntil = Date.now() + 300;
  const from = coords(start.key);
  const target = swipeTarget(from, dx, dy, start.size, run.board.length, run.board[0].length);
  if (!target) return;
  focusCell = target;
  playMove(from, target);
});

globalThis.addEventListener("pointercancel", (event) => {
  if (pointerStart?.pointerId === event.pointerId) pointerStart = null;
});
globalThis.addEventListener("blur", () => { pointerStart = null; });
let layoutFrame = null;
const refreshLayout = () => {
  pointerStart = null;
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    fitPlayBoard(app.querySelector(".play-screen"));
    if (isResolving) boardEffects.relayout();
  });
};
globalThis.addEventListener("resize", refreshLayout);
globalThis.visualViewport?.addEventListener("resize", refreshLayout);
document.fonts?.ready.then(refreshLayout);

document.addEventListener("keydown", (event) => {
  if (modal) {
    const dialog = app.querySelector(".dialog");
    if (event.key === "Tab" && dialog) {
      const focusable = dialogFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
      } else if (event.shiftKey && (document.activeElement === focusable[0] || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        focusable[focusable.length - 1].focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus({ preventScroll: true });
      }
      return;
    }
    if (event.key === "Escape") {
      if (modal === "pause" || isPaused) resumeGame();
      else if (modal !== "result") { modal = null; render(); }
      return;
    }
    return;
  }
  if (event.key === "Escape") {
    if (screen === "play") pauseGame();
    return;
  }
  if (screen !== "play" || isResolving) return;
  if (event.key.toLowerCase() === "r" && !event.target.matches("input,textarea")) {
    event.preventDefault();
    restartLevel();
    return;
  }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    const active = document.activeElement?.dataset?.cell;
    const [y, x] = active ? coords(active) : focusCell;
    const offset = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
    const ny = Math.max(0, Math.min(run.board.length - 1, y + offset[0]));
    const nx = Math.max(0, Math.min(run.board[0].length - 1, x + offset[1]));
    focusCell = [ny, nx];
    event.preventDefault();
    app.querySelector('[data-cell="' + point(ny, nx) + '"]')?.focus();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "play" && !modal && ["playing", "bonus"].includes(run?.status)) pauseGame(true);
});

render();
