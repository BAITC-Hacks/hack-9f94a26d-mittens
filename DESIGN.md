# Design Direction

## Theme

Light desktop workspace.

## Selected Style Profile

custom

## Profile source

User direction: a realistic or illustrated Astana city skyline combined with a real 2GIS map, inspired by the readable territorial play of a city-building game rather than a direct visual copy of Clash of Clans.

## Visual direction

Soft sky and stone surfaces, deep blue civic ink, a single teal action accent, and synthetic district statuses in green/amber/red. The map is the primary canvas; a slim city-health rail sits on the left and a compact budget/turn card sits at top right.

## Components

- Buttons: button-playful-accent, with clear disabled and active states.
- Cards: card-quiet-panel, 12px radius, fine blue-grey border, no glow.
- Modal: modal-task-dialog as a centered district inspection overlay.
- Header: header-product-app.
- Primary screen: map-first game workspace with persistent status rail.
- Text animation: text-no-animation.
- Motion: only short feedback transitions; reduced-motion fallback.
- Scroll: scroll-native.

## States

- Buttons: default, hover, active, focus-visible, disabled.
- Districts: normal, selected, improving, critical.
- Initiative cards: available, selected, completed, unavailable due to budget.
- Map: loading fallback, API-key fallback, ready.
