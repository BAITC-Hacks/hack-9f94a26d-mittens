import { DISTRICT_IDS, INDICATOR_IDS } from './types'
import type { DistrictId, Districts, Indicators, ScoreSummary } from './types'

export const INDICATOR_WEIGHTS: Indicators = { T1: 0.10, T2: 0.10, E1: 0.09, E2: 0.11, S1: 0.11, S2: 0.11, B1: 0.09, B2: 0.09, C1: 0.10, C2: 0.10 }
export const CITY_SCORE_WEIGHTS = { average: 0.7, minimum: 0.3 } as const
export const clampIndicator = (value: number) => Math.max(0, Math.min(100, value))
export const scoreDistrict = (indicators: Indicators) => INDICATOR_IDS.reduce((sum, key) => sum + INDICATOR_WEIGHTS[key] * indicators[key], 0)

export function scoreCity(districts: Districts): ScoreSummary {
  const districtScores = {} as Record<DistrictId, number>
  let weightedAverage = 0
  let criticalIndicators = 0
  for (const district of DISTRICT_IDS) {
    districtScores[district] = scoreDistrict(districts[district].indicators)
    weightedAverage += districts[district].populationShare * districtScores[district]
    criticalIndicators += INDICATOR_IDS.filter((key) => districts[district].indicators[key] < 40).length
  }
  const minimumDistrictScore = Math.min(...Object.values(districtScores))
  return { districtScores, weightedAverage, minimumDistrictScore, criticalIndicators, score: CITY_SCORE_WEIGHTS.average * weightedAverage + CITY_SCORE_WEIGHTS.minimum * minimumDistrictScore - criticalIndicators }
}
