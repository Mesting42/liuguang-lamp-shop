# Superseded: visual redesign exploration

The user declined generated imagery and clarified the task to page colors and backgrounds only, preserving existing layouts. This earlier composition proposal is rejected. Follow `color-refinement-brief.md` and `night.css` instead. No mockup in this file is an approved implementation reference.

## Confirmed scope

- Request: redesign every game page outside the existing match-three board.
- User confirmed the direction: 童话夜街 — midnight blue, warm illuminated windows, a soft storybook old-town atmosphere.
- User confirmed all surfaces: title menu, three chapter maps, tutorial, play-page chrome, settings, pause, results, credits and ending.
- Preserve the current board, wooden frame, glass pieces, special marks, clearing effects, pointer and keyboard handling, match rules, authored stages, local save and spare-move bonus.
- Build in the existing dependency-free JavaScript project. All runtime assets remain local.

## Decision status

Awaiting the user's composition choice; no redesign implementation has begun.

1. A, 窗前工坊: left task/controls ledger, board in the middle, warm workshop scene to the right. Mock: `.impeccable/mocks/night-street-a.png`.
2. B, 河街夜灯 (recommended for board clarity and responsive continuity): centered board, compact horizontal status strip, illustrated river-town edges. Mock: `.impeccable/mocks/night-street-b.png`.
3. C, 夜窗手记: large board on the left, repair journal and illustrated window on the right. Mock: `.impeccable/mocks/night-street-c.png`.

These are generated UI studies. Every existing board cell, game control and UI text stays semantic, interactive code in the implementation.

## Skill workflow

- Impeccable new-work and visualize references loaded. Imagegen skill loaded; native built-in tool produced three comps, one call per option.
- Direction seed: `9529bbfe`, experience mode. The user's explicit night-street direction overrides the roll. Do not offer unrelated catalog directions again.
- Context script already ran earlier in this conversation; do not rerun it. PRODUCT.md exists, DESIGN.md is absent and must be written from the completed redesign.
- Comp prompts are embedded in each PNG and recorded in `.png.json` and `.png.prompt.txt` sidecars. Set `approved: true` on the chosen sidecar after the user answers.
- Before implementation record the direction contract and comp ingredient inventory; generate required scene assets at production resolution instead of cropping the mockup.
- Keep the scope constraint especially strict for `.board-wood`, `.board-grid`, `.board-cell`, `.tile-body`, `.piece`, obstacle layers and `.board-effects`; surrounding CSS must not accidentally restyle the preserved board.
- Implementation must cover desktop, tablet, phone portrait and phone landscape, preserving live state and modal focus handling.
- Complete bounded screenshot verification, relevant game checks and build, finish review, and DESIGN.md recording.

## Current project state

- Production preview is intended at http://127.0.0.1:4174/. Restart only this project's server if needed.
- Spare-move victory bonus and its tests were completed before this redesign. Do not remove or reimplement that feature.
- No relevant memory registry entry was found.
