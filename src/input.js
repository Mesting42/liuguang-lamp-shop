export function swipeTarget(from, dx, dy, cellSize, rows, columns) {
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (distance < Math.max(9, cellSize * .28)) return null;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const target = [from[0] + (horizontal ? 0 : Math.sign(dy)), from[1] + (horizontal ? Math.sign(dx) : 0)];
  if (target[0] < 0 || target[1] < 0 || target[0] >= rows || target[1] >= columns) return null;
  return target;
}
