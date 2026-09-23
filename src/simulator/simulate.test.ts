import assert from 'node:assert/strict'
import { test } from 'node:test'
import { INITIAL_DISTRICTS } from './districts'
import { EXAMPLE_SCENARIO } from './example'
import { clampIndicator, scoreCity } from './scoring'
import { simulate } from './simulate'
import { DISTRICT_IDS, INDICATOR_IDS } from './types'
import { validateScenario } from './validator'

const close = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)

test('baseline follows the weighted formula, approximately 52.56', () => {
  const baseline = scoreCity(INITIAL_DISTRICTS)
  close(baseline.score, 52.56, 0.005)
  assert.equal(baseline.criticalIndicators, 2)
  close(baseline.score, 52.55768)
  close(baseline.districtScores.Nura, 49.18)
})

test('rejects spending above 100, using catalogue costs instead of client values', () => {
  assert.throws(() => simulate({ actions: [
    { measureId: 'M3', district: 'Nura', cost: 0 }, { measureId: 'M5', district: 'Saryarka' },
    { measureId: 'M7', district: 'Nura' }, { measureId: 'M8', district: 'Nura' }, { measureId: 'M14' },
  ] }), /budget/)
})

test('rejects duplicate measures even in different districts', () => {
  const actions = structuredClone(EXAMPLE_SCENARIO.actions)
  actions[1] = { measureId: 'M7', district: 'Esil' }
  assert.throws(() => simulate({ actions }), /duplicate/)
})

test('rejects M1 + M3 anywhere in the city', () => {
  assert.throws(() => simulate({ actions: [
    { measureId: 'M1', district: 'Nura' }, { measureId: 'M3', district: 'Esil' },
    { measureId: 'M9', district: 'Almaty' }, { measureId: 'M10', district: 'Nura' }, { measureId: 'M12' },
  ] }), /M1 \+ M3/)
})

test('example costs 95, uses full synergy, and produces a finite final score', () => {
  const result = simulate(EXAMPLE_SCENARIO)
  assert.deepEqual(result.budget, { total: 100, spent: 95, remaining: 5 })
  assert.ok(Number.isFinite(result.finalScore))
  close(result.districts.Nura.after.S1, 48)
  close(result.districts.Nura.after.S2, 43.75)
  close(result.districts.Nura.after.B1, 67.5)
  close(result.districts.Saryarka.after.E2, 48.75)
  assert.equal(result.criticalIndicatorsAfter, 0)
  // 0.7 * 58.0776 + 0.3 * 52.9625 - 0 = 56.54307, or 56.5 to one decimal.
  close(result.scoring.after.weightedAverage, 58.0776)
  close(result.scoring.after.minimumDistrictScore, 52.9625)
  close(result.finalScore, 56.54307)
  close(result.scoreDelta, 3.98539)
  close(result.finalScore, 56.5, 0.05)
})

test('all 50 indicators remain in bounds; clamp handles both limits', () => {
  const result = simulate(EXAMPLE_SCENARIO)
  for (const district of DISTRICT_IDS) for (const key of INDICATOR_IDS) {
    assert.ok(result.districts[district].after[key] >= 0 && result.districts[district].after[key] <= 100)
  }
  assert.equal(clampIndicator(-4), 0)
  assert.equal(clampIndicator(104), 100)
  assert.equal(clampIndicator(43.75), 43.75)
})

test('rejects malformed input, unknown IDs, missing or invalid districts and wrong action counts', () => {
  for (const input of [null, {}, { actions: [] }, { actions: [...EXAMPLE_SCENARIO.actions, { measureId: 'M14' }] }]) {
    assert.throws(() => simulate(input))
  }
  for (const action of [null, { measureId: 'M99' }, { measureId: 'toString' }, { measureId: 'M7' }, { measureId: 'M7', district: 'Atlantis' }]) {
    assert.throws(() => simulate({ actions: [action, ...EXAMPLE_SCENARIO.actions.slice(1)] }))
  }
})

test('city measures forbid districts, while null means no district', () => {
  const actions = structuredClone(EXAMPLE_SCENARIO.actions)
  actions[3] = { measureId: 'M12', district: 'Nura' }
  assert.throws(() => validateScenario({ actions }), /район запрещён/)
  assert.deepEqual(validateScenario({ actions: EXAMPLE_SCENARIO.actions.map(a => a.measureId === 'M12' ? { ...a, district: null } : a) }), EXAMPLE_SCENARIO)
  for (const district of DISTRICT_IDS) close(simulate(EXAMPLE_SCENARIO).districts[district].delta.C2, 4.375)
})

test('rejects more than two measures in a category', () => {
  assert.throws(() => simulate({ actions: [
    { measureId: 'M7', district: 'Nura' }, { measureId: 'M8', district: 'Nura' },
    { measureId: 'M9', district: 'Nura' }, { measureId: 'M10', district: 'Nura' }, { measureId: 'M12' },
  ] }), /категории social/)
})

for (const [first, second] of [['M4', 'M7'], ['M5', 'M13']]) {
  test(`${first} + ${second} only conflict within the same district`, () => {
    const actions = [
      { measureId: first, district: 'Nura' }, { measureId: second, district: 'Nura' },
      { measureId: 'M9', district: 'Nura' }, { measureId: 'M10', district: 'Nura' }, { measureId: 'M11', district: 'Nura' },
    ]
    assert.throws(() => simulate({ actions }), /Несовместимые/)
    actions[1].district = 'Esil'
    assert.ok(Number.isFinite(simulate({ actions }).finalScore))
  })
}

test('transport synergy is district-local and is not reduced by lag', () => {
  const result = simulate({ actions: [
    { measureId: 'M1', district: 'Nura' }, { measureId: 'M2' }, { measureId: 'M4', district: 'Almaty' },
    { measureId: 'M10', district: 'Nura' }, { measureId: 'M12' },
  ] })
  close(result.districts.Nura.delta.T1, 4.5 + 3 + 2)
  close(result.districts.Esil.delta.T1, 3)
  assert.equal(result.synergies.length, 2)
})

test('ecology synergy and negative pedestrian-crossing effects follow the rules', () => {
  const result = simulate({ actions: [
    { measureId: 'M5', district: 'Saryarka' }, { measureId: 'M6' }, { measureId: 'M11', district: 'Almaty' },
    { measureId: 'M9', district: 'Nura' }, { measureId: 'M12' },
  ] })
  close(result.districts.Saryarka.delta.E2, 8.75 + 1.5 + 2)
  close(result.districts.Esil.delta.E2, 1.5)
  close(result.districts.Almaty.delta.T1, -1.75)
  close(result.districts.Almaty.delta.B2, 10.5)
  // M9 lifts Nura S1 above 40; Nura S2 and Almaty T1 are still below 40.
  assert.equal(result.criticalIndicatorsAfter, 2)
})

test('exactly 40 is not critical; repeated runs do not mutate baseline and action order does not matter', () => {
  const original = structuredClone(INITIAL_DISTRICTS)
  const result = simulate(EXAMPLE_SCENARIO)
  assert.deepEqual(simulate(EXAMPLE_SCENARIO), result)
  const reversed = simulate({ actions: [...EXAMPLE_SCENARIO.actions].reverse() })
  assert.equal(result.finalScore, reversed.finalScore)
  assert.deepEqual(result.districts, reversed.districts)
  assert.deepEqual(INITIAL_DISTRICTS, original)
  original.Nura.indicators.S1 = 40
  original.Nura.indicators.S2 = 40
  assert.equal(scoreCity(original).criticalIndicators, 0)
})
