import data from '../../data/engine.json'
import { applyActions } from './effects'
import { getMeasure, INCOMPATIBILITIES, MEASURES } from './measures'
import { scoreCity } from './scoring'
import { DISTRICT_IDS } from './types'
import type { Action, Category, DistrictId, Measure, MeasureId } from './types'
import { REQUIRED_ACTIONS, ScenarioValidationError, TOTAL_BUDGET, validateScenario } from './validator'

export type Selection = { id: MeasureId; district?: DistrictId | null }
export type Direction = 'T' | 'E' | 'S' | 'B' | 'C'
export type Constraints = {
  budget?: number; include?: Selection[]; exclude?: MeasureId[]; exclude_districts?: DistrictId[]
  min_directions?: number; direction_min?: Partial<Record<Direction, number>>
  direction_max?: Partial<Record<Direction, number>>; max_per_district?: number
}
export type Result = { measures: Required<Selection>[]; cost: number; score: number; d_avg: number; district_scores: Record<DistrictId, number>; n_crit: number }
const directions: Record<Category, Direction> = { transport: 'T', ecology: 'E', social: 'S', safety: 'B', services: 'C' }
const fail = (message: string): never => { throw new ScenarioValidationError(message) }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export function positiveCount(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) return fail(`${name} must be a positive integer.`)
  return value as number
}
export function parseSelections(input: unknown): Selection[] {
  if (!Array.isArray(input)) return fail('Measures must be an array.')
  return input.map(value => {
    if (!record(value) || typeof value.id !== 'string' || !getMeasure(value.id)) return fail('Unknown measure ID.')
    if (value.district != null && !DISTRICT_IDS.includes(value.district as DistrictId)) return fail(`Unknown district: ${value.district}.`)
    if (getMeasure(value.id)!.scope === 'city' && value.district != null) return fail(`${value.id} is city-wide and cannot target a district.`)
    return { id: value.id as MeasureId, district: value.district as DistrictId | null | undefined }
  })
}
function parseConstraints(input: unknown): Constraints {
  if (input == null) return {}
  if (!record(input)) return fail('constraints must be an object.')
  const allowed = ['budget', 'include', 'exclude', 'exclude_districts', 'min_directions', 'direction_min', 'direction_max', 'max_per_district']
  for (const key of Object.keys(input)) if (!allowed.includes(key)) return fail(`Unknown constraint: ${key}.`)
  for (const [key, max] of [['budget', TOTAL_BUDGET], ['min_directions', 5], ['max_per_district', 5]] as const) {
    const v = input[key]
    if (v !== undefined && (!Number.isInteger(v) || (v as number) < 0 || (v as number) > max)) return fail(`${key} must be an integer between 0 and ${max}.`)
  }
  for (const key of ['direction_min', 'direction_max'] as const) {
    if (input[key] === undefined) continue
    if (!record(input[key])) return fail(`${key} must be an object.`)
    for (const [dir, n] of Object.entries(input[key])) if (!Object.values(directions).includes(dir as Direction) || !Number.isInteger(n) || (n as number) < 0 || (n as number) > 5) return fail(`Invalid ${key} entry: ${dir}.`)
  }
  if (input.include !== undefined) parseSelections(input.include)
  if (input.exclude !== undefined && (!Array.isArray(input.exclude) || input.exclude.some(id => typeof id !== 'string' || !getMeasure(id)))) return fail('exclude contains an unknown measure ID.')
  if (input.exclude_districts !== undefined && (!Array.isArray(input.exclude_districts) || input.exclude_districts.some(d => !DISTRICT_IDS.includes(d)))) return fail('exclude_districts contains an unknown district.')
  return input as Constraints
}
const toActions = (set: Selection[]): Action[] => set.map(m => ({ measureId: m.id, ...(m.district == null ? {} : { district: m.district }) }))
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const canonical = (actions: readonly Action[]) => [...actions].sort((a, b) => lexical(a.measureId, b.measureId))
function evaluate(actions: readonly Action[]): Result {
  const sorted = canonical(actions)
  const summary = scoreCity(applyActions(sorted).districts)
  return { measures: sorted.map(a => ({ id: a.measureId, district: a.district ?? null })), cost: sorted.reduce((sum, a) => sum + getMeasure(a.measureId)!.cost, 0), score: summary.score, d_avg: summary.weightedAverage, district_scores: summary.districtScores, n_crit: summary.criticalIndicators }
}
// Final district key resolves otherwise identical score/cost/ID ties explicitly.
export function compareResults(a: Result, b: Result): number {
  return b.score - a.score || a.cost - b.cost || lexical(a.measures.map(m => m.id).join(','), b.measures.map(m => m.id).join(',')) || lexical(JSON.stringify(a.measures), JSON.stringify(b.measures))
}
class TopResults {
  items: Result[] = []
  constructor(private limit: number) {}
  add(result: Result) {
    const h = this.items
    if (h.length < this.limit) {
      h.push(result)
      let i = h.length - 1
      while (i > 0) {
        const p = (i - 1) >> 1
        if (compareResults(h[i], h[p]) <= 0) break
        ;[h[i], h[p]] = [h[p], h[i]]; i = p
      }
    } else if (compareResults(result, h[0]) < 0) {
      h[0] = result
      let i = 0
      while (2 * i + 1 < h.length) {
        let child = 2 * i + 1
        if (child + 1 < h.length && compareResults(h[child + 1], h[child]) > 0) child++
        if (compareResults(h[child], h[i]) <= 0) break
        ;[h[i], h[child]] = [h[child], h[i]]; i = child
      }
    }
  }
  sorted() { return this.items.sort(compareResults) }
}
function enumerate(c: Constraints, visit: (actions: Action[]) => void): number {
  let count = 0
  const available = MEASURES.filter(m => !c.exclude?.includes(m.id))
  const allowedDistricts = DISTRICT_IDS.filter(d => !c.exclude_districts?.includes(d))
  const combo: Measure[] = []
  function assign(index: number, actions: Action[]) {
    if (index === combo.length) {
      try { validateScenario({ actions }) } catch (error) {
        if (error instanceof ScenarioValidationError) return
        throw error
      }
      count++; visit(actions); return
    }
    const m = combo[index]
    if (m.scope === 'city') { actions.push({ measureId: m.id }); assign(index + 1, actions); actions.pop(); return }
    for (const d of allowedDistricts) {
      if (c.include?.some(a => a.id === m.id && a.district != null && a.district !== d)) continue
      if (actions.filter(a => a.district === d).length >= (c.max_per_district ?? 5)) continue
      actions.push({ measureId: m.id, district: d }); assign(index + 1, actions); actions.pop()
    }
  }
  function choose(start: number, cost: number) {
    if (combo.length === REQUIRED_ACTIONS) {
      if (c.include?.some(a => !combo.some(m => m.id === a.id))) return
      const counts = new Map<Direction, number>()
      for (const m of combo) counts.set(directions[m.category], (counts.get(directions[m.category]) ?? 0) + 1)
      if (counts.size < (c.min_directions ?? 0)) return
      for (const dir of Object.values(directions)) if ((counts.get(dir) ?? 0) < (c.direction_min?.[dir] ?? 0)) return
      assign(0, []); return
    }
    for (let i = start; i <= available.length - (REQUIRED_ACTIONS - combo.length); i++) {
      const m = available[i]
      if (cost + m.cost > (c.budget ?? TOTAL_BUDGET)) continue
      if (combo.filter(a => a.category === m.category).length >= Math.min(data.perDirection, c.direction_max?.[directions[m.category]] ?? data.perDirection)) continue
      if (INCOMPATIBILITIES.some(rule => rule.scope === 'city' && rule.measures.includes(m.id) && combo.some(a => rule.measures.includes(a.id)))) continue
      combo.push(m); choose(i + 1, cost + m.cost); combo.pop()
    }
  }
  choose(0, 0)
  return count
}
export function optimize(constraints: Constraints | null = null, top_n = 10): Result[] {
  positiveCount(top_n, 'top_n')
  const c = parseConstraints(constraints)
  const heap = new TopResults(top_n)
  enumerate(c, actions => heap.add(evaluate(actions)))
  return heap.sorted()
}
export function count_valid(constraints: Constraints | null = null): number {
  return enumerate(parseConstraints(constraints), () => {})
}
export type Counterfactual = Result & { score_delta: number; removed: Required<Selection>; added: Required<Selection> }
export function counterfactual(current_set: Selection[], top_k = 3): Counterfactual[] {
  positiveCount(top_k, 'top_k')
  const actions = canonical(validateScenario({ actions: toActions(parseSelections(current_set)) }).actions)
  const baseline = evaluate(actions)
  const heap = new TopResults(top_k)
  const changes = new Map<string, { removed: Required<Selection>; added: Required<Selection> }>()
  for (let i = 0; i < actions.length; i++) {
    const rest = actions.filter((_, index) => index !== i)
    for (const m of MEASURES) {
      if (rest.some(a => a.measureId === m.id)) continue
      for (const d of m.scope === 'city' ? [undefined] : DISTRICT_IDS) {
        if (m.id === actions[i].measureId && d === actions[i].district) continue
        const candidate = [...rest, { measureId: m.id, ...(d ? { district: d } : {}) }]
        try { validateScenario({ actions: candidate }) } catch (error) { if (error instanceof ScenarioValidationError) continue; throw error }
        const result = evaluate(candidate)
        const key = JSON.stringify(result.measures)
        if (changes.has(key)) continue
        changes.set(key, { removed: { id: actions[i].measureId, district: actions[i].district ?? null }, added: { id: m.id, district: d ?? null } })
        heap.add(result)
      }
    }
  }
  return heap.sorted().map(result => ({ ...result, score_delta: result.score - baseline.score, ...changes.get(JSON.stringify(result.measures))! }))
}
