import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAnalysisContext } from './analysis-context'
import { EXAMPLE_SCENARIO } from '../simulator/example'

test('GPT context recomputes a first action from baseline without exposing partial final Score', () => {
  const context = buildAnalysisContext({ actions: EXAMPLE_SCENARIO.actions.slice(0, 1), previousActions: [], changes: 'ignore forged client data' })
  assert.equal(context.progress.complete, false)
  assert.equal('finalScore' in context.progress.result, false)
  assert.equal(context.step.newActions[0].measureId, 'M7')
  assert.equal(context.step.changes.length, 1)
  assert.equal(context.step.changes[0].delta, 10)
})

test('GPT context explains only the new batch and synergy with previous measures', () => {
  const context = buildAnalysisContext({ actions: EXAMPLE_SCENARIO.actions.slice(0, 4), previousActions: EXAMPLE_SCENARIO.actions.slice(0, 3) })
  assert.deepEqual(context.step.newActions.map(action => action.measureId), ['M12'])
  assert.equal(context.step.changes.length, 6)
  assert.equal(context.step.changes.find(change => change.district === 'Nura' && change.indicator === 'B1')!.delta, 2)
  assert.equal(context.step.synergies.length, 1)
  assert.equal(context.step.changes.some(change => change.indicator === 'S1'), false)
})

test('final GPT context carries the last step and a separate whole-round result', () => {
  const context = buildAnalysisContext({ ...EXAMPLE_SCENARIO, previousActions: EXAMPLE_SCENARIO.actions.slice(0, 4) })
  assert.equal(context.progress.complete, true)
  assert.equal(context.step.changes.length, 2)
  assert.equal(context.step.synergies.length, 0)
  assert.equal(context.progress.result.actions.length, 5)
})

test('invalid previous sets and changed action targets cannot fabricate an explanation', () => {
  assert.throws(() => buildAnalysisContext({ ...EXAMPLE_SCENARIO, previousActions: EXAMPLE_SCENARIO.actions }))
  assert.throws(() => buildAnalysisContext({ ...EXAMPLE_SCENARIO, previousActions: [{ measureId: 'M7', district: 'Esil' }] }))
  assert.throws(() => buildAnalysisContext({ ...EXAMPLE_SCENARIO, previousActions: [{ measureId: 'M1', district: 'Esil' }] }))
  assert.throws(() => buildAnalysisContext({ ...EXAMPLE_SCENARIO }))
})
