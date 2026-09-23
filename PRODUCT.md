# Akim for 5 Hours

## Product

Desktop hackathon simulator where a player governs a synthetic model of Astana by selecting five initiatives from a catalog of fourteen. Submit one or several measures at a time toward a cumulative set of exactly five. District indicators update after each submission; the final city Score is available only after all five are applied. The integrated TanStack server recomputes from the baseline, preventing double spending and duplicate effects.

## Audience

Hackathon jury, city-management teams, analysts, and first-time simulator players.

## Primary design goal

Make a complex municipal trade-off legible in seconds: a real map stays central, current city health is always visible, and every decision has a cost and a narrated consequence.

## Voice

Clear, civic, direct, optimistic without making unsupported real-world claims. All district data is synthetic.

## Constraints

- Desktop-first MVP.
- Russian UI.
- Bottom horizontal action tabs, including a separate citywide tab; a left statistics panel with five expandable pairs of raw indicators. Citywide measures retain their original direction for the two-per-direction limit.
- 2GIS MapGL is a geographical visual layer only; game district values are synthetic.
- Exactly five initiatives per scenario, with at most two in the same direction: transport, greenery, social infrastructure, safety, and city services. Budget and incompatibility rules are defined in `data/campaigns.json`.
- Exactly five playable scenario districts: Esil, Almaty, Saryarka, Baikonur and Nura. Almaty's game territory is the geometric union of the current Almaty and Saraishyk boundaries from 2GIS, with one label and one set of actions. This is a scenario grouping, not an administrative change. Keep the five-district baseline and population shares unchanged.
- Starting conditions come from the simulator baseline, not a separate frontend dataset. Esil is affluent with bridge congestion and crowded schools; Almaty has aging utilities and traffic; Saryarka has private-sector smog and little greenery; Baikonur is balanced; Nura is weakest in social infrastructure and transport.
- District characteristics and population shares describe the game scenario, not verified city statistics. Keep 2GIS; do not migrate to Google Maps.
