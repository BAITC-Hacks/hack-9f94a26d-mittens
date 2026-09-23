import { INITIAL_DISTRICTS } from './districts'
import { describeIndicatorChange, explainScore } from './breakdown'
import { getMeasure } from './measures'
import { scoreCity } from './scoring'
import { DISTRICT_IDS, INDICATOR_IDS } from './types'
import type { Indicators, SimulationResult } from './types'
import { TOTAL_BUDGET, validateScenario } from './validator'

import { applyActions, HORIZON } from './effects'
export { HORIZON } from './effects'

export function simulate(input: unknown): SimulationResult {
  const scenario = validateScenario(input)
  const { districts, synergies } = applyActions(scenario.actions)
  const before = scoreCity(INITIAL_DISTRICTS)
  const actions = scenario.actions.map(action => {
    const measure = getMeasure(action.measureId)!
    return { ...action, name: measure.name, cost: measure.cost, lag: measure.lag, effectFactor: (HORIZON - measure.lag) / HORIZON }
  })
  const after = scoreCity(districts)
  const changes: SimulationResult['changes'] = []
  const districtResults = {} as SimulationResult['districts']
  for (const district of DISTRICT_IDS) {
    const initial = INITIAL_DISTRICTS[district].indicators
    const final = districts[district].indicators
    const delta = {} as Indicators
    for (const key of INDICATOR_IDS) {
      delta[key] = final[key] - initial[key]
      if (delta[key] !== 0) changes.push(describeIndicatorChange(district, key, initial[key], final[key], districts[district].populationShare))
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
    scoreBreakdown: explainScore(before, after),
    criticalIndicatorsBefore: before.criticalIndicators, criticalIndicatorsAfter: after.criticalIndicators,
    changes, synergies,
  }
}
