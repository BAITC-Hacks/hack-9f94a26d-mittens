import { CITY_SCORE_WEIGHTS, INDICATOR_WEIGHTS } from './scoring'
import { DISTRICT_IDS } from './types'
import type { DistrictId, IndicatorChange, IndicatorId, ScoreBreakdown, ScoreComponent, ScoreSummary } from './types'

const INDICATOR_NAMES: Record<IndicatorId, string> = {
  T1: 'Road efficiency', T2: 'Public transport accessibility',
  E1: 'Greenery', E2: 'Air quality',
  S1: 'Schools and kindergartens', S2: 'Clinics and primary healthcare',
  B1: 'Street safety', B2: 'Road safety',
  C1: 'Utilities reliability', C2: 'Speed of handling citizen requests',
}

export function describeIndicatorChange(
  district: DistrictId, indicator: IndicatorId, before: number, after: number, populationShare: number,
): IndicatorChange {
  const delta = after - before
  const weight = INDICATOR_WEIGHTS[indicator]
  const districtScoreDelta = weight * delta
  const weightedAverageDelta = populationShare * districtScoreDelta
  const criticalBefore = before < 40
  const criticalAfter = after < 40
  return {
    district, indicator, indicatorName: INDICATOR_NAMES[indicator], before, after, delta,
    weight, populationShare, districtScoreDelta, weightedAverageDelta,
    cityAverageScoreDelta: CITY_SCORE_WEIGHTS.average * weightedAverageDelta,
    criticalBefore, criticalAfter,
    criticalPenaltyScoreDelta: Number(criticalBefore) - Number(criticalAfter),
  }
}

const component = (before: number, after: number): ScoreComponent => ({ before, after, delta: after - before })

export function explainScore(before: ScoreSummary, after: ScoreSummary): ScoreBreakdown {
  return {
    formula: '0.7 * weightedAverage + 0.3 * minimumDistrictScore - criticalIndicators',
    weightedAverage: {
      weight: CITY_SCORE_WEIGHTS.average,
      ...component(CITY_SCORE_WEIGHTS.average * before.weightedAverage, CITY_SCORE_WEIGHTS.average * after.weightedAverage),
    },
    weakestDistrict: {
      weight: CITY_SCORE_WEIGHTS.minimum,
      ...component(CITY_SCORE_WEIGHTS.minimum * before.minimumDistrictScore, CITY_SCORE_WEIGHTS.minimum * after.minimumDistrictScore),
      districtsBefore: DISTRICT_IDS.filter((id) => before.districtScores[id] === before.minimumDistrictScore),
      districtsAfter: DISTRICT_IDS.filter((id) => after.districtScores[id] === after.minimumDistrictScore),
    },
    criticalPenalty: component(0 - before.criticalIndicators, 0 - after.criticalIndicators),
    total: component(before.score, after.score),
  }
}
