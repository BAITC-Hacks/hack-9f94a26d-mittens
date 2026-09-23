import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { actionFeedback, strongestDirection } from '../src/lib/action-feedback.ts'
import { ActionResult } from '../src/components/ActionResult.tsx'
import { initialDistricts, presentDistricts } from '../src/lib/scenario-districts.ts'
import { simulateProgress } from '../src/simulator/simulate.ts'

const district = (list, id = 'saryarka') => list.find(item => item.id === id)
const progress = actions => simulateProgress({ actions }).result
const ui = actions => presentDistricts(progress(actions).districts)
const noop = () => {}

test('step feedback compares with previous submission, not the initial round', () => {
  const first = [{ measureId: 'M4', district: 'Saryarka' }]
  const feedback = actionFeedback(district(ui(first)), district(ui([...first, { measureId: 'M6' }])))
  const ecology = feedback.find(item => item.id === 'E')
  assert.equal(ecology.delta, 1.95)
  assert.deepEqual(ecology.changes.map(item => item.delta), [2.5, 1.5])
  assert.equal(strongestDirection(feedback), 'E')
})

test('crossings show both the negative transport change and positive safety change', () => {
  const feedback = actionFeedback(district(initialDistricts, 'nura'), district(ui([{ measureId: 'M11', district: 'Nura' }]), 'nura'))
  assert.equal(feedback.find(item => item.id === 'T').text, '−0,875')
  assert.equal(feedback.find(item => item.id === 'T').changes[0].text, '−1,75')
  assert.equal(feedback.find(item => item.id === 'B').text, '+5,25')
  assert.match(feedback.find(item => item.id === 'T').changes[0].explanation, /Загруженность дорог выросла/)
})

test('late city measure reports only its newly activated synergy, not the earlier measure twice', () => {
  const first = [{ measureId: 'M10', district: 'Nura' }]
  const feedback = actionFeedback(district(ui(first), 'nura'), district(ui([...first, { measureId: 'M12' }]), 'nura'))
  assert.equal(feedback.find(item => item.id === 'B').changes[0].delta, 2)
  assert.equal(feedback.find(item => item.id === 'C').changes[0].delta, 4.375)
})

test('result layout replaces cards with five signed tabs and the next-action control', () => {
  const actions = [{ measureId: 'M11', district: 'Nura' }]
  const props = { before: district(initialDistricts, 'nura'), after: district(ui(actions), 'nura'), decisions: [{ id: 'M11', district: 'Nura' }], appliedCount: 1, synergies: [], analysis: { status: 'loading' }, onContinue: noop, onNewRound: noop, onSummary: noop }
  const html = renderToStaticMarkup(createElement(ActionResult, props))
  assert.equal((html.match(/role="tab"/g) ?? []).length, 5)
  assert.match(html, /result-delta negative">−0,875/)
  assert.match(html, /result-delta positive">\+5,25/)
  assert.match(html, /Следующее действие/)
  assert.match(html, /Готовим короткое объяснение/)
  assert.doesNotMatch(html, /initiative-select/)
  const completed = renderToStaticMarkup(createElement(ActionResult, { ...props, appliedCount: 5 }))
  assert.doesNotMatch(completed, /Следующее действие/)
  assert.match(completed, /round-summary-open/)
  assert.match(completed, /Новый раунд/)
})

test('an unaffected selected district explicitly directs the player to changed districts', () => {
  const actions = [{ measureId: 'M4', district: 'Saryarka' }]
  const html = renderToStaticMarkup(createElement(ActionResult, { before: district(initialDistricts, 'nura'), after: district(ui(actions), 'nura'), decisions: [{ id: 'M4', district: 'Saryarka' }], appliedCount: 1, synergies: [], analysis: null, onContinue: noop, onNewRound: noop, onSummary: noop }))
  assert.match(html, /Меры этого хода применены в других районах/)
})
