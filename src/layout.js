export function boardSize({ width, height, max = 614 }) {
  return Math.max(0, Math.floor(Math.min(width, height, max)));
}

const number = (value) => Number.parseFloat(value) || 0;
const verticalSpace = (element) => {
  const style = getComputedStyle(element);
  return element.getBoundingClientRect().height + number(style.marginTop) + number(style.marginBottom);
};

// Fit the actual UI, including wrapped goals, safe areas and browser chrome.
// This function never reads or changes the current game run.
export function fitPlayBoard(element) {
  if (!element) return;
  const stage = element.querySelector(".board-stage");
  const status = element.querySelector(".play-status");
  const bottom = element.querySelector(".play-bottom");
  if (!stage || !status || !bottom) return;
  const style = getComputedStyle(element);
  const bounds = element.getBoundingClientRect();
  const viewportHeight = globalThis.visualViewport?.scale === 1 ? visualViewport.height : innerHeight;
  const landscape = matchMedia("(orientation: landscape) and (max-height: 540px)").matches;
  const width = element.clientWidth - number(style.paddingLeft) - number(style.paddingRight);
  const caption = stage.querySelector(".board-caption");
  const captionHeight = caption && getComputedStyle(caption).display !== "none" ? verticalSpace(caption) : 0;
  const safeBottom = number(getComputedStyle(document.body).paddingBottom);
  const height = viewportHeight - (bounds.top + scrollY) - number(style.paddingTop) - number(style.paddingBottom) - safeBottom - verticalSpace(bottom) - captionHeight - 6;
  const size = boardSize({
    width: landscape ? width - status.getBoundingClientRect().width - number(style.columnGap) : width,
    height: landscape ? height : height - verticalSpace(status),
    max: landscape ? 560 : 614
  });
  const value = size + "px";
  if (element.style.getPropertyValue("--board-size") !== value) element.style.setProperty("--board-size", value);
}
