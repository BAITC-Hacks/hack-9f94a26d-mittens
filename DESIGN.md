# Design Direction

## Theme

Light, full-screen city map with a dark translucent game HUD.

## Selected Style Profile

custom

## Profile source

User direction: Cities: Skylines II-inspired city management, blue accents, black translucent panels, a full-screen 2GIS map of Astana and district actions that appear only after selecting a district. All six administrative boundaries remain real; indicators remain synthetic.

## Visual direction

White/off-white land, retained blue water and green parks, understated district outlines and a blue selected district. Compact floating black translucent panels replace the permanent sidebar. Blue is reserved for interactive/selected states and key resources. Use system typography, legible secondary labels, restrained borders and one consistent small radius. Translucency is an explicit user request, not decorative glass added by default.

## Components

- Buttons: compact solid blue primary action, dark flat category rows, clear selected, disabled and keyboard-focus states.
- Cards: quiet black translucent HUD panels, 10px radius, fine neutral border, no glow.
- Modal: none; district details are non-modal floating panels.
- Header: compact game HUD with city identity, budget, scenario count and calculated quality-of-life score.
- Primary screen: edge-to-edge map. Initially no district is selected; show a short selection prompt. Selecting a district reveals its statistics and action dock. Closing hides both without clearing the scenario.
- Initiative selection: open a category first (transport, ecology, social, safety, services), then choose its initiatives. A back button returns to all categories; selection counts and the scenario summary persist across categories.
- Text animation: text-no-animation.
- Motion: no motion; direct state feedback.
- Scroll: scroll-native.

## States

- Buttons: default, hover, active, focus-visible, disabled.
- Districts: normal, selected, improving, critical.
- Initiative cards: available, selected, completed, unavailable due to budget.
- Map: loading, ready, explicit map/boundary error with retry. District polygons follow real 2GIS geometry; game indicators remain synthetic. Panning and zooming are enabled.
- Map styling: use documented MapGL layer replacement for neutral land colors; keep roads, buildings, parks, water and 2GIS attribution intact. An optional published custom style UUID takes precedence.
