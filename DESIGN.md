# Design Direction

## Theme

Light desktop workspace.

## Selected Style Profile

custom

## Profile source

User direction: an interactive 2GIS map of Astana with real administrative boundaries for all six districts. District polygons and geographic labels replace the eight-sided game zones. An economy overlay carries an RTS-like visual language and the development intelligence panel uses a dense grand-strategy command-room layout.

## Visual direction

Muted map layer with military-chart charcoal framing, brass budget details, and green/amber/red synthetic district statuses. The 2GIS map is the primary canvas; a dense city-health intelligence rail sits on the left, a framed treasury overlay is at top right, and the initiative dock sits at lower right.

## Components

- Buttons: button-playful-accent, with clear disabled and active states.
- Cards: card-quiet-panel, 12px radius, fine blue-grey border, no glow.
- Modal: modal-task-dialog as a centered district inspection overlay.
- Header: header-product-app.
- Primary screen: map-first game workspace with persistent status rail.
- Initiative selection: open a category first (transport, ecology, social, safety, services), then choose its initiatives. A back button returns to all categories; selection counts and the scenario summary persist across categories.
- Text animation: text-no-animation.
- Motion: only short feedback transitions; reduced-motion fallback.
- Scroll: scroll-native.

## States

- Buttons: default, hover, active, focus-visible, disabled.
- Districts: normal, selected, improving, critical.
- Initiative cards: available, selected, completed, unavailable due to budget.
- Map: loading, ready, explicit map/boundary error with retry. District polygons follow real 2GIS geometry; game indicators remain synthetic. Panning and zooming are enabled.
