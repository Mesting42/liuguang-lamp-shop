---
name: 流光灯铺
description: 深蓝夜色与暖窗灯光围绕圆润动物棋子
colors:
  canvas: "#101d30"
  deep: "#0c1727"
  surface: "#192c42"
  raised: "#22394f"
  line: "#40576c"
  text: "#eeeae0"
  muted: "#b3c0cd"
  gold: "#e7c48c"
  gold-hover: "#f2d5a7"
  brass: "#a98a60"
  success: "#b5d2b7"
  danger: "#efb0a5"
  on-gold: "#15253a"
  line-strong: "#75889a"
  danger-surface: "#704345"
  danger-hover: "#895053"
  map-pine: "#29464b"
  map-blue: "#263e59"
  map-plum: "#3a344b"
  bonus-surface: "#4f4636"
typography:
  body:
    fontFamily: "Microsoft YaHei, PingFang SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.55
  display:
    fontFamily: "Noto Serif SC Local, Songti SC, STSong, serif"
    fontSize: "clamp(44px, 5.1vw, 70px)"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  label: "3px"
  sample: "4px"
  small-control: "5px"
  control: "6px"
  display-base: "8px"
  dialog: "12px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.gold-hover}"
    textColor: "{colors.canvas}"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
---

# Design System: 流光灯铺

## Overview

**Creative North Star: "夜街与窗光"**

The page theme is a quiet night outside a lit workshop: navy backgrounds, cool blue surfaces, soft pale text, and honey-gold primary actions. The original color and background refinement preserved the page and board layouts. A later explicit user request replaced the five glass-piece illustrations with round cartoon cat, rabbit, fox, penguin and bear faces. No generated imagery is used.

`night.css` is the normative page-theme layer; `styles.css` owns layout, board and animations. `src/pieces.js` is the canonical source for authored inline animal SVGs, Chinese names and animal palettes. The workshop's glass windows and story remain part of the setting.

**Key Characteristics:**

- Deep blue canvas
- Warm gold actions
- Moonlit utility text
- Round animal faces distinct by silhouette, features and color

## Colors

Canvas and elevated surfaces are three distinct dark blue values. Primary text is warm off-white; utility text is lighter blue. Gold identifies primary actions, current chapter, scores and highlights. Completed targets combine green-tinted text with existing progress numbers. Destructive actions use soft coral and explicit action labels.

The board retains sage cells and its wood frame. The animal set uses golden-yellow cat, mint-green rabbit, apricot-orange fox, pale-blue penguin and lilac bear palettes from `src/pieces.js`. Each palette carries fur, outline, shade, cream face area, inner detail, ink, cheek and matching-light colors; `.impeccable/design.json` records their exact source values. `src/effects.js` derives matching light from each animal's `light` value. The former broad SVG recoloring rules and `--piece-fill` / `--piece-edge` assignments are removed; preserve the SVG's own fills and strokes.

**The Board Boundary Rule.** Page-theme rules in `night.css` must not override board, piece, obstacle or effect selectors. The explicit animal replacement belongs to the piece source and its narrow styling.

**The Text Hierarchy Rule.** Use warm off-white headings, blue-tinted utility text, and gold actions and score.

## Typography

Keep the bundled Chinese serif for display headings, brand and large move counts. Use the existing sans serif stack for instructions, goals and actions. Preserve the current font sizes and responsive type scale; the animal artwork introduces no new type styles.

## Layout

Retain the existing menu grid, chapter routes, centered play board, horizontal HUD and modal hierarchy. Existing phone portrait, phone landscape, tablet and desktop breakpoints remain in `styles.css`. Theme rules must not change board dimensions, target visibility, control ordering or navigation.

The user subsequently authorized responsive layout repairs. Phone portrait is the recommended play context, with the square board below the goals and common actions below the board. Short landscape windows use the board at left and a compact status column at right; keep the current score visible. `src/layout.js` measures the actual status, footer, available viewport and safe-area space to set `--board-size`; it never changes the run. Compact/coarse-pointer common controls are at least 44px high. Secondary legends and repeated interaction captions recede on compact play, while goals, score, star threshold and actions remain available. Map and help pages may scroll vertically rather than compressing their content.

## Elevation & Depth

Background atmosphere comes from two low-opacity colored light fields and a navy color transition. Six static CSS points add a sparse night-sky detail; lowering flash hides them. Surfaces are opaque; there is no backdrop blur. Dialog depth uses a navy shade and soft downward shadow. The board retains its original elevation.

## Shapes

Controls have 6px corners, dialogs 12px. The existing menu-window backdrop and ending display use an arched upper silhouette. Other artwork and route shapes retain their authored geometry.

Animal pieces share a round, cute face language in a 72 × 72 SVG viewBox, with warm clean outlines, glossy eyes, pale muzzles or face areas and soft cheeks. Preserve the species-specific silhouettes: triangular cat ears and whiskers, tall rabbit ears and small teeth, pointed fox ears and cheek tufts, an egg-shaped penguin with side flippers and a beak, and round bear ears. Shape and facial features supplement color recognition.

## Components

### Buttons and controls

Primary buttons use dark text on gold; secondary buttons use pale warm text on navy with a muted brass border. Keyboard focus uses a visible pale-gold outline. Settings controls retain native semantics and state handling. Goal counters, result statistics, hints, pause, bonus and failure states all use the same text hierarchy.

### Animal pieces

`pieceArt()` renders the same authored vector family in the board, collection goals, legend, tutorial and ending display. Shared animal names also supply board accessibility labels. Keep the stable piece/save keys: `amber` → 猫咪, `jade` → 兔子, `coral` → 狐狸, `azure` → 企鹅, `plum` → 小熊. These are existing saved identifiers; the replacement changes their presentation.

Specials keep the animal face visible. A gold horizontal arrow ribbon below the face means a horizontal beam; a vertical arrow ribbon at the right means a vertical beam. A round gold star medallion at the lower right means the lamp crystal (`bomb`), and a four-color diamond medallion with a pale central glint means the rainbow lens (`lens`). Special markers receive a small local drop shadow. Frost, vine and chain overlays retain their current layering and exchange-blocking semantics.

### Score goals and spare-move reward

The gameplay HUD now includes a compact three-star score target, live score gap and progress indicator, using the existing gold and success tokens. Pause and result views list the fixed score conditions. Complete the stage goals before rating the final score, including the spare-move reward.

Reward conversion is a single purposeful sequence: each spare move launches a small curved light from the counter, the prior animal piece remains until arrival, then a short local ring and direction mark reveal its new special. After all gifts, a brief readiness cue precedes automatic clearing. Reduced motion removes travel; reduced flash removes flying particles. All animations share the existing pause, resume and cleanup lifecycle.

On viewport changes, effects rebase the active frame to the new board geometry, retaining animation elapsed time and pause state. Touch input accepts a short dominant-direction swipe from the source cell; it need not cross the exact cell boundary. Ignore cancelled or secondary pointers. Keep a visible operation-guide entry in compact menus.

The original palette-only scope remains the page-theme boundary. Score guidance and reward animation refine `styles.css` and `src/effects.js`; the later authorized animal replacement changes piece artwork, shared names and effect palettes without changing levels, scoring or progression.

## Do's and Don'ts

### Do:

- **Do** keep the foreground readable on every surface, including settings and chapter tabs.
- **Do** use CSS for the page background and local authored vector artwork.
- **Do** keep animal silhouettes, facial features and special direction/type marks distinct at small piece sizes.
- **Do** keep the shared animal definitions and stable saved piece keys aligned across artwork, goals, legend, tutorial, accessibility labels and effect light colors.
- **Do** keep motion preferences, focus behavior, target information and responsive play intact.

### Don't:

- **Don't** introduce generated illustrations, raster mockups, remote assets or decorative English headings.
- **Don't** restyle the board, replace its pieces, rewrite gameplay or rearrange page layouts as part of a palette-only theme change. The later explicit animal-piece request authorizes the documented artwork replacement within its narrow scope.
- **Don't** apply broad SVG recoloring that overrides the animal faces or hides their special markers.
