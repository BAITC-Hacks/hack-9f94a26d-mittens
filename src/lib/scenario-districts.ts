import { INITIAL_DISTRICTS } from '../simulator/districts'
import { DISTRICT_PRESENTATION } from '../simulator/presentation'
import { scoreDistrict } from '../simulator/scoring'
import { directionScore } from './indicator-stats'
import { DISTRICT_IDS } from '../simulator/types'
import type { DistrictId, Indicators, SimulationResult } from '../simulator/types'

export type IndicatorKey = 'transport' | 'green' | 'social' | 'safety' | 'service'
export type District = {
  id: string
  name: string
  population: string
  indicators: Record<IndicatorKey, number>
  rawIndicators: Indicators
  score: number
}

// UI summaries only: simulation effects and the weighted QoL formula continue
// to use all ten original indicators, without rounding or modifying them.
export function summarizeIndicators(values: Indicators): District['indicators'] {
  return {
    transport: directionScore(values, ['T1', 'T2']),
    green: directionScore(values, ['E1', 'E2']),
    social: directionScore(values, ['S1', 'S2']),
    safety: directionScore(values, ['B1', 'B2']),
    service: directionScore(values, ['C1', 'C2']),
  }
}

export const districtIds: Record<string, DistrictId> = Object.fromEntries(
  DISTRICT_IDS.map(id => [DISTRICT_PRESENTATION[id].mapId, id]),
)

export const districtScenarios: Record<string, string> = Object.fromEntries(
  DISTRICT_IDS.map(id => [DISTRICT_PRESENTATION[id].mapId, DISTRICT_PRESENTATION[id].scenario]),
)

export const initialDistricts: District[] = DISTRICT_IDS.map(id => {
  const baseline = INITIAL_DISTRICTS[id]
  const presentation = DISTRICT_PRESENTATION[id]
  return {
    id: presentation.mapId,
    name: presentation.name,
    population: Math.round(baseline.populationShare * 100) + '% населения модели',
    indicators: summarizeIndicators(baseline.indicators),
    rawIndicators: { ...baseline.indicators },
    score: scoreDistrict(baseline.indicators),
  }
})

export function presentDistricts(results: SimulationResult['districts']): District[] {
  return initialDistricts.map(district => {
    const result = results[districtIds[district.id]]
    return { ...district, rawIndicators: { ...result.after }, indicators: summarizeIndicators(result.after), score: result.scoreAfter }
  })
}
