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
- Modal: none; district details are non-modal floating panels.
- Header: compact game HUD with city identity, budget, scenario count and calculated quality-of-life score.
- Primary screen: edge-to-edge map. Initially no district is selected; show a short selection prompt. Selecting a district reveals its statistics and action dock. Closing hides both without clearing the scenario.
- District panel: left-side, scrollable; display the weighted district D and five native disclosure groups expanding into T1/T2, E1/E2, S1/S2, B1/B2, C1/C2 with exact raw values, meters and definitions. Values below 40 have a labelled critical warning. Starting conditions are explicitly synthetic; Almaty's panel explains the Saraishyk grouping.
- Each collapsed group shows its normalized weighted score, signed change since the round began, a blue retained-value bar and green gain/red loss segment. Expanded indicators use the same comparison treatment. Red represents the lost portion between current and baseline values, not extra score. Numerical signs and meter accessibility text supplement color. Draft measures never change these displays.
- Initiative selection: full-width bottom dock. Six horizontal tabs remain visible above a horizontal row of action cards. The citywide tab contains M2/M6/M12/M14 only; the other five contain district measures. Keep original direction labels and limits for citywide cards.
- Submission: reserve draft costs, submit one or several at a time, retain applied measures as locked chips. Final Score only after five cumulative decisions. Preserve the draft on failure; offer a new round. The map displays only applied changes. The dock remains above 2GIS attribution; measured dock height controls map padding and statistics-panel bounds.
- Text animation: text-no-animation.
- Motion: no motion; direct state feedback.
- Scroll: scroll-native.

## States

- Buttons: default, hover, active, focus-visible, disabled.
- Districts: normal, selected, improving, critical.
- Initiative cards: available, selected, completed, unavailable due to budget.
- Map: loading, ready, explicit map/boundary error with retry. District polygons follow real 2GIS geometry; game indicators remain synthetic. Panning and zooming are enabled.
- Map styling: use documented MapGL layer replacement for neutral land colors; keep roads, buildings, parks, water and 2GIS attribution intact. An optional published custom style UUID takes precedence.
