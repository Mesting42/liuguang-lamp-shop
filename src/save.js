const STORAGE_KEY = "liuguang-lamp-shop-save-v1";

export const DEFAULT_SETTINGS = {
  music: true,
  sfx: true,
  volume: 0.62,
  reduceMotion: false,
  reduceFlash: false,
  vibration: true
};

export function freshSave() {
  return {
    version: 1,
    unlocked: 1,
    stars: {},
    scores: {},
    workshop: { materials: 0, repairs: 0, decorations: [] },
    settings: { ...DEFAULT_SETTINGS },
    tutorialSeen: false,
    activeRun: null,
    endingSeen: false
  };
}

export function loadSave() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { data: freshSave(), warning: null };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed !== "object") {
      return { data: freshSave(), warning: "存档格式无法读取，已为你准备一份新存档。" };
    }
    const initial = freshSave();
    return {
      data: {
        ...initial,
        ...parsed,
        workshop: { ...initial.workshop, ...(parsed.workshop || {}) },
        settings: { ...initial.settings, ...(parsed.settings || {}) },
        stars: parsed.stars && typeof parsed.stars === "object" ? parsed.stars : {},
        scores: parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {}
      },
      warning: null
    };
  } catch {
    return { data: freshSave(), warning: "浏览器无法读取旧存档。可以继续游玩，之后在设置里重新开始。" };
  }
}

export function writeSave(save) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
