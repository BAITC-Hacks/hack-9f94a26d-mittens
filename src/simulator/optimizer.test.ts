import assert from 'node:assert/strict'
import { test } from 'node:test'
import { performance } from 'node:perf_hooks'
import { counterfactual, count_valid, optimize, compareResults } from './optimizer'
import { simulate } from './simulate'
import { validateScenario } from './validator'
import { MEASURES } from './measures'
import type { Constraints, Result, Selection } from './optimizer'

const actions = (set: Selection[]) => set.map(m => ({ measureId: m.id, ...(m.district == null ? {} : { district: m.district }) }))
const started = performance.now()
const best = optimize()
const elapsed = performance.now() - started
console.log(`Unconstrained exhaustive search: ${elapsed.toFixed(1)} ms`)

test('exact optimum and default valid count', () => {
  assert.ok(Math.abs(best[0].score - 57.24) < 0.01)
  assert.deepEqual(best[0].measures, [
    { id: 'M14', district: null }, { id: 'M2', district: null },
    { id: 'M3', district: 'Nura' }, { id: 'M8', district: 'Nura' }, { id: 'M9', district: 'Nura' },
  ])
  assert.equal(count_valid(), 694395)
  assert.equal(best.length, 10)
})
test('all winners validate and match the existing simulation output', () => {
  for (const result of best) {
    const input = { actions: actions(result.measures) }
    validateScenario(input)
    const simulation = simulate(input)
    assert.equal(result.score, simulation.finalScore)
    assert.equal(result.d_avg, simulation.scoring.after.weightedAverage)
    assert.deepEqual(result.district_scores, simulation.scoring.after.districtScores)
    assert.equal(result.n_crit, simulation.criticalIndicatorsAfter)
    assert.equal(result.cost, simulation.budget.spent)
  }
})
test('order and top-N prefix are deterministic', () => {
  assert.deepEqual(optimize(null, 12).slice(0, 10), best)
  assert.deepEqual([...best].sort(compareResults), best)
  const tied = { ...best[0], cost: 99 }
  assert.ok(compareResults(best[0], tied) < 0)
  const other = { ...best[0], measures: [{ id: 'M1', district: 'Nura' }, ...best[0].measures.slice(1)] } as Result
  assert.ok(compareResults(other, best[0]) < 0)
})
test('combined constraints and all direction codes are respected', () => {
  const c: Constraints = { budget: 90, include: [{ id: 'M8', district: 'Nura' }, { id: 'M12' }], exclude: ['M3'], exclude_districts: ['Esil'], min_directions: 4, direction_min: { B: 1, S: 1, C: 1 }, direction_max: { T: 0, E: 1 }, max_per_district: 1 }
  const results = optimize(c)
  assert.ok(results.length > 0)
  for (const r of results) {
    validateScenario({ actions: actions(r.measures) })
    assert.ok(r.cost <= 90)
    assert.ok(r.measures.some(m => m.id === 'M8' && m.district === 'Nura'))
    assert.ok(r.measures.some(m => m.id === 'M12'))
    assert.ok(!r.measures.some(m => m.id === 'M3' || m.district === 'Esil'))
    const districts = r.measures.flatMap(m => m.district ? [m.district] : [])
    assert.equal(new Set(districts).size, districts.length)
    const categories = r.measures.map(m => MEASURES.find(x => x.id === m.id)!.category)
    assert.ok(new Set(categories).size >= 4)
    assert.ok(!categories.includes('transport'))
    assert.ok(categories.includes('safety') && categories.includes('social') && categories.includes('services'))
    assert.ok(categories.filter(c => c === 'ecology').length <= 1)
  }
})
test('impossible constraints return empty; malformed constraints fail clearly', () => {
  for (const c of [
    { budget: 0 }, { include: [{ id: 'M1' }], exclude: ['M1'] },
    { include: [{ id: 'M1' }, { id: 'M3' }] }, { max_per_district: 0 },
    { exclude_districts: ['Esil', 'Almaty', 'Saryarka', 'Baikonur', 'Nura'] },
    { direction_min: { T: 3 } }, { include: [{ id: 'M4', district: 'Nura' }, { id: 'M7', district: 'Nura' }] },
    { include: [{ id: 'M8', district: 'Nura' }], exclude_districts: ['Nura'] },
  ] as Constraints[]) assert.deepEqual(optimize(c), [])
  for (const c of [{ budget: 101 }, { budget: -1 }, { include: [{ id: 'M99' }] }, { exclude: ['M99'] }, { exclude_districts: ['Atlantis'] }, { direction_min: { X: 1 } }, { include: [{ id: 'M12', district: 'Nura' }] }, { typo: 1 }]) assert.throws(() => optimize(c as Constraints))
  for (const n of [0, -1, 1.5, NaN]) assert.throws(() => optimize(null, n))
})
test('single swaps are exact, valid, distinct, ordered, and include district-only moves', () => {
  const current = best[0].measures.map(m => m.id === 'M3' ? { ...m, district: 'Esil' as const } : m)
  const baseline = simulate({ actions: actions(current) }).finalScore
  const swaps = counterfactual(current, 1000)
  assert.ok(swaps.length > 3)
  assert.equal(new Set(swaps.map(r => JSON.stringify(r.measures))).size, swaps.length)
  assert.deepEqual(counterfactual(current), swaps.slice(0, 3))
  assert.deepEqual([...swaps].sort(compareResults), swaps)
  assert.ok(swaps.some(r => r.removed.id === 'M3' && r.added.id === 'M3' && r.added.district === 'Nura'))
  for (const r of swaps) {
    validateScenario({ actions: actions(r.measures) })
    assert.ok(Math.abs(r.score_delta - (r.score - baseline)) < 1e-10)
    assert.equal(r.measures.filter(m => current.some(a => a.id === m.id && a.district === m.district)).length, 4)
  }
  // Independent neighborhood enumeration checks that the heap did not miss a better swap.
  const expected: number[] = []
  current.forEach((_, index) => {
    for (const m of MEASURES) for (const district of m.scope === 'city' ? [null] : ['Esil', 'Almaty', 'Saryarka', 'Baikonur', 'Nura'] as const) {
      if (m.id === current[index].id && district === current[index].district) continue
      const candidate = current.map((a, i) => i === index ? { id: m.id, district } : a)
      try { expected.push(simulate({ actions: actions(candidate) }).finalScore) } catch { /* invalid neighbor */ }
    }
  })
  assert.equal(swaps.length, expected.length)
  assert.equal(swaps[0].score, Math.max(...expected))
  assert.throws(() => counterfactual([]))
})
