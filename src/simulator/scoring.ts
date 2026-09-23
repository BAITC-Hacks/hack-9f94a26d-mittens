import data from '../../data/engine.json'
import { DISTRICT_IDS, INDICATOR_IDS } from './types'
import type { DistrictId, Districts, Indicators, ScoreSummary } from './types'

export const INDICATOR_WEIGHTS: Indicators = data.indicatorWeights
export const CITY_SCORE_WEIGHTS = data.scoreWeights
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
