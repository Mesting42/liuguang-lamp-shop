export function starRequirements(level) {
  return level.starScores || [0, 6000, 10000];
}

export function starsForWin(run, level) {
  const [, two, three] = starRequirements(level);
  return run.score >= three ? 3 : run.score >= two ? 2 : 1;
}

export function recordWin(save, run, level) {
  const key = String(level.id);
  const oldUnlock = Math.max(1, Number(save.unlocked || 1));
  const oldStars = Number(save.stars[key] || 0);
  const stars = starsForWin(run, level);
  save.stars[key] = Math.max(oldStars, stars);
  save.scores[key] = Math.max(Number(save.scores[key] || 0), run.score);
  save.unlocked = Math.max(oldUnlock, Math.min(37, level.id + 1));

  const materials = (oldStars === 0 ? 2 : 0) + Math.max(0, stars - oldStars) * 3;
  save.workshop.materials = (save.workshop.materials || 0) + materials;
  const totalStars = Object.values(save.stars).reduce((sum, value) => sum + Number(value || 0), 0);
  const decorations = [[6, "雨滴小穗"], [18, "铜铃花芯"], [36, "月白帘穗"]];
  for (const [threshold, decoration] of decorations) {
    if (totalStars >= threshold && !save.workshop.decorations.includes(decoration)) save.workshop.decorations.push(decoration);
  }
  save.workshop.repairs = Math.min(3, Math.floor(totalStars / 12));
  if (level.id === 36) save.endingSeen = true;
  return { stars, materials, unlocked: save.unlocked, newlyUnlocked: save.unlocked > oldUnlock, totalStars };
}
