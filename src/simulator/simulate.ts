import { INITIAL_DISTRICTS } from './districts'
import { getMeasure, SYNERGIES } from './measures'
import { clampIndicator, scoreCity } from './scoring'
import { DISTRICT_IDS, INDICATOR_IDS } from './types'
import type { DistrictId, Indicators, SimulationResult } from './types'
import { TOTAL_BUDGET, validateScenario } from './validator'

export const HORIZON = 8

export function simulate(input: unknown): SimulationResult {
  const scenario = validateScenario(input)
  const districts = structuredClone(INITIAL_DISTRICTS)
  const before = scoreCity(INITIAL_DISTRICTS)
  const synergies: SimulationResult['synergies'] = []
  const applyEffects = (district: DistrictId, effects: Partial<Indicators>, factor: number) => {
    for (const key of INDICATOR_IDS) districts[district].indicators[key] += (effects[key] ?? 0) * factor
  }

  const actions = scenario.actions.map((action) => {
    const measure = getMeasure(action.measureId)!
    const effectFactor = (HORIZON - measure.lag) / HORIZON
    const targets = measure.scope === 'city' ? DISTRICT_IDS : [action.district!]
    for (const district of targets) applyEffects(district, measure.effects, effectFactor)
    return { ...action, name: measure.name, cost: measure.cost, lag: measure.lag, effectFactor }
  })
  for (const synergy of SYNERGIES) {
    const districtAction = actions.find((action) => action.measureId === synergy.districtMeasure)
    if (districtAction?.district && actions.some((action) => action.measureId === synergy.cityMeasure)) {
      applyEffects(districtAction.district, synergy.effects, 1)
      synergies.push({ measures: [synergy.districtMeasure, synergy.cityMeasure], district: districtAction.district, effects: { ...synergy.effects } })
    }
  }
  // Clamp once after summing all effects so action order cannot change a score.
  for (const district of DISTRICT_IDS) {
    for (const key of INDICATOR_IDS) districts[district].indicators[key] = clampIndicator(districts[district].indicators[key])
  }
  const after = scoreCity(districts)
  const changes: SimulationResult['changes'] = []
  const districtResults = {} as SimulationResult['districts']
  for (const district of DISTRICT_IDS) {
    const initial = INITIAL_DISTRICTS[district].indicators
    const final = districts[district].indicators
    const delta = {} as Indicators
    for (const key of INDICATOR_IDS) {
      delta[key] = final[key] - initial[key]
      if (delta[key] !== 0) changes.push({ district, indicator: key, before: initial[key], after: final[key], delta: delta[key] })
    }
    districtResults[district] = {
      populationShare: districts[district].populationShare,
      before: { ...initial }, after: { ...final }, delta,
      scoreBefore: before.districtScores[district], scoreAfter: after.districtScores[district],
      scoreDelta: after.districtScores[district] - before.districtScores[district],
    }
  }
  const spent = actions.reduce((sum, action) => sum + action.cost, 0)
  return {
    baselineScore: before.score, finalScore: after.score, scoreDelta: after.score - before.score,
    horizon: HORIZON, budget: { total: TOTAL_BUDGET, spent, remaining: TOTAL_BUDGET - spent },
    actions, districts: districtResults, scoring: { before, after },
    criticalIndicatorsBefore: before.criticalIndicators, criticalIndicatorsAfter: after.criticalIndicators,
    changes, synergies,
  }
}
