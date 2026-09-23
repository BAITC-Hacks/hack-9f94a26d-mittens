# Design Direction

## Theme

Light, full-screen city map with a dark translucent game HUD.

## Selected Style Profile

custom

## Profile source

User direction: Cities: Skylines II-inspired city management, blue accents, black translucent panels, a full-screen 2GIS map of Astana and district actions that appear only after selecting a district. Only the five scenario districts are playable: Esil, Almaty, Saryarka, Baikonur and Nura. Their boundaries remain real; scenario characteristics and indicators remain synthetic.

## Visual direction

White/off-white land, retained blue water and green parks, understated district outlines and a blue selected district. Compact floating black translucent panels replace the permanent sidebar. Blue is reserved for interactive/selected states and key resources. Use system typography, legible secondary labels, restrained borders and one consistent small radius. Translucency is an explicit user request, not decorative glass added by default.

## Components

- Buttons: compact solid blue primary action, horizontal category tabs, clear selected, applied, disabled and keyboard-focus states. Tabs support arrow keys, Home and End.
- Cards: quiet black translucent HUD panels, 10px radius, fine neutral border, no glow.
- Modal: compact single-column final report with a dark backdrop, before/after Score, citywide directions, actual improvement/loss counts, a short GPT explanation with “Обновить отчёт”, congratulations and a new-round action. Do not show a district table or unchanged-indicator count here. Escape/close returns focus to “Итоги раунда”.
- Header: small city identity at top left; a compact two-column budget/decision-count panel at top right. Only show the final Score when calculated. No “О раунде” panel.
- Primary screen: edge-to-edge map. Initially no district is selected; show a short selection prompt. Selecting a district reveals its statistics and action dock. Closing hides both without clearing the scenario.
- District panel: tall, left-side, from below the district picker to the bottom safe margin, independent of action dock height on desktop. Display weighted district D and five native disclosure groups expanding into raw indicator pairs. Put definitions in a second disclosure; keep critical warnings visible. Move population, scenario background and calculation notes into “О районе и показателях”.
- Each collapsed group shows its normalized weighted score, signed change since the round began, a blue retained-value bar and green gain/red loss segment. Expanded indicators use the same comparison treatment. Red represents the lost portion between current and baseline values, not extra score. Numerical signs and meter accessibility text supplement color. Draft measures never change these displays.
- Initiative selection: compact bottom dock beginning to the right of the tall statistics panel, with a clear gutter. Six horizontal tabs sit above cards with title and target on the left, price on the right and a blue selected outline. Do not show effect/lag previews or a details disclosure. Unavailable-card reasons remain visible. Citywide measures remain M2/M6/M12/M14.
- Submission: one primary apply button and a collapsed “План” list with remove controls, applied states and reset. After submission, replace cards with five direction tabs showing signed changes for the latest submission, an observed-change explanation and a visible “Почему изменилось” GPT area capped at 50 words. Keep loading/unavailable states inside that area; text generation never blocks numerical results or navigation.
- Result flow: before five applied measures, show “Следующее действие”. Once complete, show “Итоги раунда”. If all five are submitted at once, do not automatically open the round modal: show step results first. If a round is completed incrementally, open the whole-round report automatically; it can be closed and reopened. Whole-round figures always compare to the baseline, unlike last-step figures.
- Desktop panels never overlap; narrow screens stack statistics above the bottom dock. Measured dock height controls map padding and mobile statistics bounds. Keep 2GIS attribution visible.
- Text animation: text-no-animation.
- Motion: direct state feedback, except while waiting for GPT: a compact construction scene and an indeterminate blue line. Stop/unmount animation on response or error, respect prefers-reduced-motion, and never display fictitious completion percentages.
- Scroll: scroll-native.

## States

- Buttons: default, hover, active, focus-visible, disabled.
- Districts: normal, selected, improving, critical.
- Initiative cards: available, selected, completed, unavailable due to budget.
- Map: loading, ready, explicit map/boundary error with retry. District polygons follow real 2GIS geometry; game indicators remain synthetic. Panning and zooming are enabled.
- Map styling: use documented MapGL layer replacement for neutral land colors; keep roads, buildings, parks, water and 2GIS attribution intact. An optional published custom style UUID takes precedence.
