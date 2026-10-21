# 三端适配验证

Mode: Operate. User requested actual browser checks on desktop, tablet and phone, immediate repairs, and a recommendation between phone portrait and landscape. Confirmed priority: keep the full board, goals and common controls on one screen.

Keep the existing night palette, animal artwork, engine, level content and save format. Portrait is recommended on phones because the square 8×8 board is materially larger; landscape remains supported with the board left and compact status right. Do not lock orientation or interrupt play with a rotation prompt.

Measure real HUD/footer height and the visible viewport to size the board. Account for safe areas, wrapped goals and late font loading. Common controls on compact or coarse-pointer screens have a minimum 44px height. Keep current score visible in landscape. Repeated help and the animal legend may be hidden in compact play; goals, score, star threshold and actions remain.

Use dominant-direction swipes from the source cell, with tremor tolerance. Cancelled and secondary pointers never exchange. Resizing retains the run, and ongoing effects rebase their coordinates at the same elapsed time and pause state.

Evidence: docs/RESPONSIVE_TEST_REPORT.md, actual browser screenshots and JSON under docs/testing/. 72 stage layouts and ten representative viewports checked. Touch pointer events were synthesized through the real browser page, not real touch hardware. The last settings-refresh check was interrupted by a local connection error and is explicitly not certified.

The mechanical scan is run once after edits. Existing palette and utility-type advisories are kept within the incumbent system; no new page color or type identity is introduced.
