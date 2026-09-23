# Akim for 5 Hours

## Product

Desktop hackathon simulator where a player governs a synthetic model of Astana by selecting five initiatives from a catalog of fourteen. The player submits the complete scenario and sees district-level consequences and an Astana Quality of Life Score returned by the backend.

## Audience

Hackathon jury, city-management teams, analysts, and first-time simulator players.

## Primary design goal

Make a complex municipal trade-off legible in seconds: a real map stays central, current city health is always visible, and every decision has a cost and a narrated consequence.

## Voice

Clear, civic, direct, optimistic without making unsupported real-world claims. All district data is synthetic.

## Constraints

- Desktop-first MVP.
- Russian UI.
- 2GIS MapGL is a geographical visual layer only; game district values are synthetic.
- Exactly five initiatives per scenario, with at most two in the same direction: transport, greenery, social infrastructure, safety, and city services. Budget and incompatibility rules are defined in `data/campaigns.json`.
- Real 2GIS boundaries for all six Astana districts, including Saraishyk; district indicators and population are synthetic.
