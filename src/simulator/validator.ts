import { getMeasure, INCOMPATIBILITIES } from './measures'
import { DISTRICT_IDS } from './types'
import type { Action, Category, DistrictId, Scenario } from './types'

export const TOTAL_BUDGET = 100
export const REQUIRED_ACTIONS = 5

export class ScenarioValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScenarioValidationError'
  }
}

const invalid = (message: string): never => { throw new ScenarioValidationError(message) }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

// Accept unknown input: the browser is never trusted for IDs, costs or scores.
export function validateScenario(input: unknown): Scenario {
  if (!isRecord(input) || !Array.isArray(input.actions)) return invalid('Сценарий должен содержать массив actions.')
  if (input.actions.length !== REQUIRED_ACTIONS) return invalid('Выберите ровно 5 мер (exactly 5 measures).')

  const seen = new Set<string>()
  const categories = new Map<Category, number>()
  let cost = 0
  const actions: Action[] = input.actions.map((value: unknown) => {
    if (!isRecord(value) || typeof value.measureId !== 'string') return invalid('Каждая мера должна содержать measureId.')
    const measure = getMeasure(value.measureId)
    if (!measure) return invalid(`Неизвестная мера: ${value.measureId}.`)
    if (seen.has(measure.id)) return invalid(`Повтор меры (duplicate): ${measure.id}. Каждую меру можно выбрать только один раз.`)
    seen.add(measure.id)
    const count = (categories.get(measure.category) ?? 0) + 1
    if (count > 2) return invalid(`Не более 2 мер из категории ${measure.category}.`)
    categories.set(measure.category, count)
    cost += measure.cost
    if (measure.scope === 'district') {
      if (typeof value.district !== 'string' || !DISTRICT_IDS.includes(value.district as DistrictId)) {
        return invalid(`Для ${measure.id} выберите район: ${DISTRICT_IDS.join(', ')}.`)
      }
      return { measureId: measure.id, district: value.district as DistrictId }
    }
    // City measures need no district; discard an optional client-supplied one.
    return { measureId: measure.id }
  })
  if (cost > TOTAL_BUDGET) return invalid(`Превышен бюджет (budget): ${cost} из ${TOTAL_BUDGET}.`)

  for (const rule of INCOMPATIBILITIES) {
    const first = actions.find((action) => action.measureId === rule.measures[0])
    const second = actions.find((action) => action.measureId === rule.measures[1])
    if (first && second && (rule.scope === 'city' || first.district === second.district)) {
      return invalid(`Несовместимые меры: ${rule.measures.join(' + ')}${rule.scope === 'district' ? ` в районе ${first.district}` : ' в одном сценарии'}.`)
    }
  }
  return { actions }
}
