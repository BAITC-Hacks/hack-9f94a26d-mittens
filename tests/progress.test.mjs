import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { simulate, simulateProgress } from '../src/simulator/simulate.ts'
import { EXAMPLE_SCENARIO } from '../src/simulator/example.ts'
import { validateSelection, validateSubmission } from '../src/lib/selection.mjs'
import { initiativeTabs, belongsToTab, nextInitiativeTab } from '../src/lib/initiative-tabs.ts'

const data = JSON.parse(readFileSync(new URL('../data/campaigns.json', import.meta.url)))
const selections = EXAMPLE_SCENARIO.actions.map(({ measureId, ...target }) => ({ id: measureId, ...target }))

test('1 + 2 + 2 submissions produce the same final calculation as one batch of five', () => {
  let applied = []
  for (const draft of [selections.slice(0, 1), selections.slice(1, 3), selections.slice(3)]) {
    assert.equal(validateSubmission(applied, draft, data), null)
    applied = [...applied, ...draft]
    const input = { actions: applied.map(({ id, ...target }) => ({ measureId: id, ...target })) }
    const progress = simulateProgress(input)
    assert.equal(progress.complete, applied.length === 5)
    assert.equal(progress.result.budget.spent, applied.reduce((sum, action) => sum + data.measures.find(m => m.id === action.id).cost, 0))
    if (progress.complete) assert.deepEqual(progress.result, simulate(EXAMPLE_SCENARIO))
    else {
      assert.equal('finalScore' in progress.result, false)
      assert.equal('scoreDelta' in progress.result, false)
      assert.equal('scoring' in progress.result, false)
    }
  }
  assert.match(validateSubmission(applied, [{ id: 'M4', district: 'Esil' }], data), /ровно 5/)
})

test('each of five measures can be submitted individually, and retries do not double effects', () => {
  for (let count = 1; count <= 5; count++) {
    const input = { actions: EXAMPLE_SCENARIO.actions.slice(0, count) }
    assert.deepEqual(simulateProgress(input), simulateProgress(input))
  }
  const first = simulateProgress({ actions: EXAMPLE_SCENARIO.actions.slice(0, 1) })
  assert.equal(first.result.districts.Nura.after.S1, 48)
  assert.equal(first.result.budget.remaining, 76)
  assert.equal(first.complete, false)
})

test('partial submission rejects empty/duplicate/over-budget/category/conflict violations', () => {
  assert.match(validateSubmission([], [], data), /хотя бы одну/)
  assert.throws(() => simulateProgress({ actions: [] }), /хотя бы одну/)
  const cases = [
    [{ measureId: 'M7', district: 'Nura' }, { measureId: 'M7', district: 'Esil' }],
    [{ measureId: 'M1', district: 'Nura' }, { measureId: 'M3', district: 'Esil' }],
    [{ measureId: 'M4', district: 'Nura' }, { measureId: 'M7', district: 'Nura' }],
    [{ measureId: 'M5', district: 'Nura' }, { measureId: 'M13', district: 'Nura' }],
    [{ measureId: 'M7', district: 'Nura' }, { measureId: 'M8', district: 'Nura' }, { measureId: 'M9', district: 'Nura' }],
    [{ measureId: 'M3', district: 'Nura' }, { measureId: 'M13', district: 'Nura' }, { measureId: 'M7', district: 'Nura' }, { measureId: 'M5', district: 'Esil' }],
    [...EXAMPLE_SCENARIO.actions, { measureId: 'M4', district: 'Esil' }],
    [{ measureId: 'M12', district: 'Nura' }],
  ]
  for (const actions of cases) assert.throws(() => simulateProgress({ actions }))
  assert.throws(() => simulate({ actions: EXAMPLE_SCENARIO.actions.slice(0, 1) }), /ровно 5/)
})

test('city effects reach every district and synergy appears even when its pair is sent later', () => {
  const prefix = simulateProgress({ actions: EXAMPLE_SCENARIO.actions.slice(0, 3) })
  const withCity = simulateProgress({ actions: EXAMPLE_SCENARIO.actions.slice(0, 4) })
  assert.equal(prefix.result.districts.Nura.after.B1, 65.5)
  assert.equal(withCity.result.districts.Nura.after.B1, 67.5)
  assert.equal(withCity.result.synergies.length, 1)
  for (const district of Object.values(withCity.result.districts)) assert.equal(district.delta.C2, 4.375)
})

test('CITY includes exactly four measures; every measure belongs to one tab, preserving original category limits', () => {
  assert.deepEqual(data.measures.filter(m => belongsToTab(m, 'CITY')).map(m => m.id), ['M2', 'M6', 'M12', 'M14'])
  for (const measure of data.measures) assert.equal(initiativeTabs.filter(tab => belongsToTab(measure, tab.id)).length, 1)
  assert.equal(validateSelection([{ id: 'M2' }, { id: 'M6' }, { id: 'M12' }, { id: 'M14' }], data), null)
  assert.match(validateSelection([{ id: 'M12' }, { id: 'M14' }, { id: 'M13', district: 'Nura' }], data), /Не более 2/)
})

test('category tabs support keyboard navigation and wrap around', () => {
  assert.equal(nextInitiativeTab('T', 'ArrowLeft'), 'CITY')
  assert.equal(nextInitiativeTab('CITY', 'ArrowRight'), 'T')
  assert.equal(nextInitiativeTab('E', 'Home'), 'T')
  assert.equal(nextInitiativeTab('E', 'End'), 'CITY')
  assert.equal(nextInitiativeTab('E', 'ArrowRight'), 'S')
  assert.equal(nextInitiativeTab('E', 'Tab'), null)
})
