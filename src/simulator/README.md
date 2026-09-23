# Simulation response / score explanation

`simulate({ actions: [{ measureId, district? }, ...] })` validates and calculates a complete scenario. The TanStack Start function `simulateCity` returns `{ ok: true, result }` with the same data plus `aiAnalysis` / `aiError`. Invalid scenarios return `{ ok: false, error }`. No frontend changes are needed to produce this backend response; a frontend must explicitly consume these fields to display them.

Existing fields remain available: `baselineScore`, `finalScore`, `scoreDelta`, `budget`, `districts`, `scoring`, `changes`, `synergies`, and critical-indicator counts. No values are rounded by the backend.

## Changed attributes

`result.changes` contains only district/indicator pairs whose final value differs from the baseline. Each entry includes:

- `district`, `indicator`, `indicatorName`: which attribute changed.
- `before`, `after`, `delta`: actual values after lag, synergies and clamping.
- `weight`, `populationShare`: coefficients used in scoring.
- `districtScoreDelta = weight * delta`.
- `weightedAverageDelta = populationShare * districtScoreDelta`.
- `cityAverageScoreDelta = 0.7 * weightedAverageDelta`.
- `criticalBefore`, `criticalAfter`: whether the value is strictly below 40.
- `criticalPenaltyScoreDelta`: +1 if the attribute stops being critical, -1 if it becomes critical, otherwise 0.

Example: M7 in Nura changes S1 (schools and kindergartens) from 38 to 48. Its indicator delta is +10, district-score contribution +1.1, weighted-average contribution +0.176, and city-average score contribution +0.1232. Crossing 40 also removes one penalty point, adding +1 to the final score.

## How the final score adds up

`result.scoreBreakdown` contains `before`, `after` and `delta` for each term:

- `weightedAverage`: `0.7 * D_avg` (already weighted).
- `weakestDistrict`: `0.3 * min(D_d)` (already weighted), plus `districtsBefore` / `districtsAfter` identifying all districts tied for the minimum.
- `criticalPenalty`: `-N_crit`.
- `total`: the full score and its change.

The first three terms sum to `total`, up to floating-point precision. Sum `changes[].districtScoreDelta` per district to reproduce that district's score change. Sum all `cityAverageScoreDelta` and `criticalPenaltyScoreDelta`, then add `scoreBreakdown.weakestDistrict.delta` to reproduce the city score change.

The weakest-district term is kept separate: improving a district can cause another district to become the weakest, so assigning a fixed 30% contribution to every changed attribute would be incorrect. These are algebraic contributions to the result, not independent scores for individual measures.

For the example M7/M8/M10 in Nura, M12 citywide, M5 in Saryarka:

```text
Baseline score                  52.55768
City-average contribution       +0.85064
Weakest-district contribution    +1.13475
Critical-penalty improvement     +2.00000
Final score                     56.54307
```

Run `npm test` to verify the calculations and contribution totals, including negative changes and a switch in the weakest district. AI only explains the calculated data; none of these fields depend on its response.
