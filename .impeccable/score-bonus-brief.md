# 三星规则与余步化光

Mode: Operate, with one authored reward sequence.

The player wants explicit score conditions for three stars and a clearer gift animation. Final score includes automatic spare-move clearing. Keep the night palette, existing glass pieces, obstacle behavior and story progression. Do not use generated images.

- Show the current level's fixed three-star target and remaining score gap throughout play; pause and result views explain all three ratings.
- Completion is still based on the authored goals. Score alone never completes a stage.
- One spare move sends one light from the counter to one glass piece. Preserve the old glass until arrival, then reveal the special's direction or pattern. Convert all spare moves before clearing.
- Use bounded SVG geometry and Web Animations, no dependencies, screen-wide flashes, or continuous loops. Keep input locked through automatic reward playback.
- Pause and resume every animation; clear overlays on skip, restart and map navigation. Reduced motion uses a short crossfade; reduced flash suppresses the flight and trail.
- Preserve existing best scores, stars and unlocked levels. Award improved stars and materials once from the completed bonus state.

Verification: automated threshold and engine regressions plus mocked animation lifecycle contracts. Browser visual checks remain subject to the available browser connection.

The mechanical scan reports advisory-only palette and font-size documentation gaps in the incumbent files. This feature uses existing night theme tokens for score guidance, existing `GLASS` piece colors and the existing `#fff0bb` glass highlight for reward geometry, and existing 10–13px utility type sizes. These are intentional extensions of the current HUD and effect language; no new page palette is introduced.
