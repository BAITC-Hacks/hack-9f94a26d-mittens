# Design Direction

## Theme

Light desktop workspace.

## Selected Style Profile

custom

## Profile source

User direction: real 2GIS map of Astana with synthetic districts as eight-sided game zones; an economy overlay carries an RTS-like visual language and the development intelligence panel uses a dense grand-strategy command-room layout.

## Visual direction

Muted map layer with military-chart charcoal framing, brass budget details, and green/amber/red synthetic district statuses. The 2GIS map is the primary canvas; a dense city-health intelligence rail sits on the left, a framed treasury overlay is at top right, and the initiative dock sits at lower right.

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
