import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INITIAL_DISTRICTS } from '../src/simulator/districts.ts'
import { MEASURES, SYNERGIES, INCOMPATIBILITIES } from '../src/simulator/measures.ts'
import { INDICATOR_WEIGHTS, scoreCity, scoreDistrict } from '../src/simulator/scoring.ts'
import { INDICATOR_IDS, DISTRICT_IDS } from '../src/simulator/types.ts'
import { INDICATOR_GROUPS, INDICATOR_LABELS, INDICATOR_DESCRIPTIONS } from '../src/simulator/presentation.ts'
import { initialDistricts, districtIds, presentDistricts } from '../src/lib/scenario-districts.ts'
import { simulate } from '../src/simulator/simulate.ts'
import { EXAMPLE_SCENARIO } from '../src/simulator/example.ts'

const catalog = JSON.parse(readFileSync(new URL('../data/campaigns.json', import.meta.url)))
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)
const reference = {
  Esil: [.27, [45, 62, 68, 72, 48, 55, 78, 60, 75, 70], 62.99],
  Almaty: [.24, [40, 75, 50, 55, 60, 65, 62, 52, 50, 60], 57.06],
  Saryarka: [.20, [50, 70, 42, 40, 62, 68, 58, 55, 45, 55], 54.65],
  Baikonur: [.13, [52, 68, 55, 50, 58, 60, 52, 58, 55, 58], 56.63],
  Nura: [.16, [55, 40, 45, 65, 38, 35, 55, 50, 60, 50], 49.18],
}

test('all 50 raw indicators, population shares and displayed district D match the supplied table', () => {
  assert.deepEqual(Object.keys(reference), DISTRICT_IDS)
  for (const [id, [population, values, score]] of Object.entries(reference)) {
    const raw = Object.fromEntries(INDICATOR_IDS.map((key, index) => [key, values[index]]))
    assert.deepEqual(INITIAL_DISTRICTS[id], { populationShare: population, indicators: raw })
    const ui = initialDistricts.find(district => districtIds[district.id] === id)
    assert.deepEqual(ui.rawIndicators, raw)
    close(ui.score, score)
    close(scoreDistrict(raw), score)
  }
  close(Object.values(INITIAL_DISTRICTS).reduce((sum, district) => sum + district.populationShare, 0), 1)
})

test('weights, five dropdowns and ten separately labelled indicator definitions match the model', () => {
  assert.deepEqual(INDICATOR_WEIGHTS, { T1: .10, T2: .10, E1: .09, E2: .11, S1: .11, S2: .11, B1: .09, B2: .09, C1: .10, C2: .10 })
  assert.deepEqual(INDICATOR_GROUPS.map(group => group.indicators), [['T1', 'T2'], ['E1', 'E2'], ['S1', 'S2'], ['B1', 'B2'], ['C1', 'C2']])
  for (const key of INDICATOR_IDS) {
    assert.ok(INDICATOR_LABELS[key])
    assert.match(INDICATOR_DESCRIPTIONS[key], /100/)
  }
})

test('all 14 measures match the supplied scope, cost, lag and full effects; UI catalog agrees', () => {
  const expected = [
    ['M1', 'transport', 'district', 18, 2, { T1: 6, T2: 9 }],
    ['M2', 'transport', 'city', 22, 2, { T1: 4, B2: 3 }],
    ['M3', 'transport', 'district', 30, 4, { T1: 16, T2: 20, E2: 4 }],
    ['M4', 'ecology', 'district', 15, 2, { E1: 12, E2: 3, B1: 2 }],
    ['M5', 'ecology', 'district', 25, 3, { E2: 14, C1: 4 }],
    ['M6', 'ecology', 'city', 20, 4, { E1: 5, E2: 3 }],
    ['M7', 'social', 'district', 24, 3, { S1: 16 }],
    ['M8', 'social', 'district', 20, 3, { S2: 14 }],
    ['M9', 'social', 'district', 10, 1, { S1: 3, S2: 3, B1: 3 }],
    ['M10', 'safety', 'district', 12, 1, { B1: 12, B2: 2 }],
    ['M11', 'safety', 'district', 10, 1, { B2: 12, T1: -2 }],
    ['M12', 'services', 'city', 14, 1, { C2: 5 }],
    ['M13', 'services', 'district', 28, 4, { C1: 18, E2: 2 }],
    ['M14', 'services', 'city', 16, 1, { C1: 5, C2: 2 }],
  ]
  assert.deepEqual(MEASURES.map(m => [m.id, m.category, m.scope, m.cost, m.lag, m.effects]), expected)
  const directions = { transport: 'T', ecology: 'E', social: 'S', safety: 'B', services: 'C' }
  assert.deepEqual(catalog.measures.map(({ title, ...measure }) => measure), MEASURES.map(m => ({ id: m.id, direction: directions[m.category], type: m.scope === 'city' ? 'C' : 'R', cost: m.cost })))
  assert.equal(catalog.rules.budget, 100)
  assert.equal(catalog.rules.count, 5)
  assert.equal(catalog.rules.perDirection, 2)
})

test('all fixed synergies and incompatibilities match the table', () => {
  assert.deepEqual(SYNERGIES.map(s => [s.districtMeasure, s.cityMeasure, s.effects]), [
    ['M1', 'M2', { T1: 2 }], ['M10', 'M12', { B1: 2 }], ['M5', 'M6', { E2: 2 }],
  ])
  assert.deepEqual(INCOMPATIBILITIES, [
    { measures: ['M1', 'M3'], scope: 'city' },
    { measures: ['M4', 'M7'], scope: 'district' },
    { measures: ['M5', 'M13'], scope: 'district' },
  ])
})

test('reference example costs 95 and scores 56.54307 against baseline 52.55768', () => {
  const baseline = scoreCity(INITIAL_DISTRICTS)
  close(baseline.score, 52.55768)
  assert.equal(baseline.criticalIndicators, 2)
  const result = simulate(EXAMPLE_SCENARIO)
  assert.equal(result.budget.spent, 95)
  close(result.finalScore, 56.54307)
  close(result.scoreDelta, 3.98539)
  assert.equal(result.synergies.length, 1)
  for (const ui of presentDistricts(result.districts)) {
    assert.deepEqual(ui.rawIndicators, result.districts[districtIds[ui.id]].after)
    close(ui.score, scoreDistrict(ui.rawIndicators))
  }
})

test('the supplied cheapest set is valid and costs 61', () => {
  const result = simulate({ actions: ['M9', 'M11', 'M10', 'M12', 'M4'].map(measureId => ({ measureId, ...(measureId === 'M12' ? {} : { district: 'Nura' }) })) })
  assert.equal(result.budget.spent, 61)
  assert.equal(result.budget.remaining, 39)
})
