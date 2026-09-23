import data from '../../data/engine.json'
import { INITIAL_DISTRICTS } from './districts'
import { MEASURES, SYNERGIES } from './measures'
import { clampIndicator } from './scoring'
import { DISTRICT_IDS, INDICATOR_IDS } from './types'
import type { Action, DistrictId, Districts, Indicators, SimulationResult } from './types'

export const HORIZON = data.horizon
// Precompute lag-scaled effects once; shared by simulation and exhaustive search.
const effects = new Map(MEASURES.map(m => [m.id, Object.entries(m.effects).map(([key, value]) => [key as keyof Indicators, value * (HORIZON - m.lag) / HORIZON] as const)]))
const city = new Set(MEASURES.filter(m => m.scope === 'city').map(m => m.id))
export function applyActions(actions: readonly Action[]): { districts: Districts; synergies: SimulationResult['synergies'] } {
  const districts = {} as Districts
  for (const d of DISTRICT_IDS) districts[d] = { populationShare: INITIAL_DISTRICTS[d].populationShare, indicators: { ...INITIAL_DISTRICTS[d].indicators } }
  const apply = (d: DistrictId, entries: readonly (readonly [keyof Indicators, number])[]) => {
    for (const [key, value] of entries) districts[d].indicators[key] += value
  }
  for (const action of actions) {
    for (const d of city.has(action.measureId) ? DISTRICT_IDS : [action.district!]) apply(d, effects.get(action.measureId)!)
  }
  const synergies: SimulationResult['synergies'] = []
  for (const synergy of SYNERGIES) {
    const first = actions.find(a => a.measureId === synergy.districtMeasure)
    if (first?.district && actions.some(a => a.measureId === synergy.cityMeasure)) {
      apply(first.district, Object.entries(synergy.effects) as [keyof Indicators, number][])
      synergies.push({ measures: [synergy.districtMeasure, synergy.cityMeasure], district: first.district, effects: { ...synergy.effects } })
    }
  }
  for (const d of DISTRICT_IDS) for (const k of INDICATOR_IDS) districts[d].indicators[k] = clampIndicator(districts[d].indicators[k])
  return { districts, synergies }
}
