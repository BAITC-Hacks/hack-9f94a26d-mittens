import { INITIAL_DISTRICTS } from '../simulator/districts'
import { simulateProgress } from '../simulator/simulate'
import { DISTRICT_IDS, INDICATOR_IDS } from '../simulator/types'
import type { Action } from '../simulator/types'
import { describeIndicatorChange } from '../simulator/breakdown'

// Accept only action IDs/targets, not client-provided deltas or scores.
export function buildAnalysisContext(input: unknown) {
  if (!input || typeof input !== 'object' || !('previousActions' in input) || !Array.isArray(input.previousActions)) throw new Error('Invalid previous actions')
  const progress = simulateProgress(input)
  const previous = input.previousActions.length ? simulateProgress({ actions: input.previousActions }).result : null
  const previousActions: Action[] = previous?.actions ?? []
  if (previousActions.length >= progress.result.actions.length || previousActions.some(action => !progress.result.actions.some(current => current.measureId === action.measureId && current.district === action.district))) throw new Error('Previous actions must be a proper subset')
  const newActions = progress.result.actions.filter(action => !previousActions.some(item => item.measureId === action.measureId))
  const changes = DISTRICT_IDS.flatMap(district => INDICATOR_IDS.flatMap(indicator => {
    const before = previous?.districts[district].after[indicator] ?? INITIAL_DISTRICTS[district].indicators[indicator]
    const after = progress.result.districts[district].after[indicator]
    return before === after ? [] : [describeIndicatorChange(district, indicator, before, after, progress.result.districts[district].populationShare)]
  }))
  return {
    progress,
    step: {
      scope: 'Only the latest submission; changes below compare with the previous submission, not the round baseline.',
      newActions, previousActions, changes, horizon: progress.result.horizon,
      synergies: progress.result.synergies.filter(synergy => synergy.measures.some(id => newActions.some(action => action.measureId === id))),
    },
  }
}
