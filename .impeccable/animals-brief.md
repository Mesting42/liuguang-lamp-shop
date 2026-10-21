# 小动物棋子

Mode: Operate. Narrow replacement of the five piece illustrations, explicitly requested by the user.

Confirmed direction: round cute cartoon faces — cat, rabbit, bear, fox and penguin. No AI images, remote assets or bitmap dependencies. The app remains a local match-three game about restoring the lamp shop.

The visual set uses warm clean outlines, small glossy eyes, pale muzzles and soft cheeks. Cat ears, long rabbit ears, fox cheeks, an egg-shaped penguin face and round bear ears must remain distinguishable at phone cell sizes. Shapes and facial features carry recognition in addition to color.

Specials preserve the animal face: a directional ribbon for a beam, round star medallion for a crystal, rainbow diamond medallion for a lens. Existing cover overlays remain and block exchanges until cleared. Base piece identifiers are unchanged for old saves. Goals, legend, tutorial and accessible names must match the new artwork.

Scope: src/pieces.js, integration text and render calls in src/main.js, effect palette in src/effects.js, and narrow piece CSS in styles.css. No changes to levels, scoring rules, gameplay algorithms, screen structure, page palette, brand icon or backgrounds. The three engine rejection messages only change the noun from glass to piece.

Verification evidence: 25 source SVG variants and a small-cell source render, model/markup tests, existing engine and effect tests. The source renders are not live-page screenshots; the browser tool reported that the IAB surface was unavailable. Development-only tests/animals-preview.html uses the actual module and CSS and never changes the player save.
