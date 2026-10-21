# Page color and background refinement

## Latest user direction

The user clarified that the request concerns the existing pages' colors and backgrounds. This supersedes the earlier full-layout redesign discussion. Do not request another composition approval, generate imagery, rebuild the navigation or change page topology.

- Preserve the existing layout, controls, copy, illustration geometry, board, pieces, rules, input, stages, save data and victory bonus.
- Apply the confirmed night-street palette across menu, maps, tutorial, play HUD, settings, pause, results, credits and ending.
- No AI-generated images. The earlier generated mockups were rejected and are not approved implementation references.
- Atmosphere comes from CSS background color fields and six small static points of moonlight. The existing authored window and brand SVGs remain.

## Implementation

`night.css` is a separate theme layer after `styles.css`. It supplies a midnight canvas, blue elevated surfaces, moonlit text, muted utility labels, honey-gold primary actions and warm window backdrops. The base layout and the original styles file are preserved. No board, piece, obstacle or effect selectors are changed by the theme. Original board shadow and piece color tokens are preserved.

## Validation scope

Production build and asset serving, computed color contrast checks, absence of generated images in the production assets, preservation of source logic and layout, and rendered desktop/mobile checks wherever the browser connection is available. Do not claim live visual testing if the current browser tools cannot connect.
