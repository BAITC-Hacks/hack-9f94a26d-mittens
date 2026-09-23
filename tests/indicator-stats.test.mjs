import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { changeSegments, directionScore, metricChange } from '../src/lib/indicator-stats.ts'
import { IndicatorStatistics } from '../src/components/IndicatorStatistics.tsx'
import { INITIAL_DISTRICTS } from '../src/simulator/districts.ts'
import { INDICATOR_GROUPS } from '../src/simulator/presentation.ts'
import { INDICATOR_WEIGHTS, scoreDistrict } from '../src/simulator/scoring.ts'
import { simulateProgress } from '../src/simulator/simulate.ts'
import { presentDistricts, initialDistricts } from '../src/lib/scenario-districts.ts'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

test('direction scores use normalized model weights and reproduce district D', () => {
  for (const district of Object.values(INITIAL_DISTRICTS)) {
    const weightedSum = INDICATOR_GROUPS.reduce((sum, group) => {
      const weight = group.indicators.reduce((total, key) => total + INDICATOR_WEIGHTS[key], 0)
      return sum + directionScore(district.indicators, group.indicators) * weight
    }, 0)
    close(weightedSum, scoreDistrict(district.indicators))
  }
  close(directionScore(INITIAL_DISTRICTS.Saryarka.indicators, ['E1', 'E2']), 40.9)
  close(directionScore(INITIAL_DISTRICTS.Nura.indicators, ['T1', 'T2']), 47.5)
})

test('a bar uses blue retained value, green gain and red lost value on a fixed 0–100 scale', () => {
  assert.deepEqual(changeSegments(50, 53), { retained: 50, gain: 3, loss: 0 })
  assert.deepEqual(changeSegments(50, 48), { retained: 48, gain: 0, loss: 2 })
  assert.deepEqual(changeSegments(50, 50), { retained: 50, gain: 0, loss: 0 })
  assert.deepEqual(changeSegments(95, 100), { retained: 95, gain: 5, loss: 0 })
  assert.deepEqual(changeSegments(2, 0), { retained: 0, gain: 0, loss: 2 })
  assert.deepEqual(changeSegments(-4, 108), { retained: 0, gain: 100, loss: 0 })
})

test('signed deltas preserve fractional effects and suppress floating-point negative zero', () => {
  assert.deepEqual(metricChange(50, 53), { delta: 3, tone: 'positive', text: '+3' })
  assert.deepEqual(metricChange(50, 48), { delta: -2, tone: 'negative', text: '−2' })
  assert.equal(metricChange(55, 53.25).text, '−1,75')
  assert.equal(metricChange(48, 48 - Number.EPSILON).tone, 'unchanged')
})

test('park raises both ecology sub-indicators and its visible aggregate with lag applied', () => {
  const progress = simulateProgress({ actions: [{ measureId: 'M4', district: 'Saryarka' }] })
  const { before, after } = progress.result.districts.Saryarka
  close(after.E1 - before.E1, 9)
  close(after.E2 - before.E2, 2.25)
  close(directionScore(after, ['E1', 'E2']) - directionScore(before, ['E1', 'E2']), 5.2875)
  const html = renderToStaticMarkup(createElement(IndicatorStatistics, { before, after }))
  assert.equal((html.match(/<details/g) ?? []).length, 5)
  assert.equal((html.match(/role="meter"/g) ?? []).length, 15)
  assert.match(html, /Экология · общий балл/)
  assert.match(html, /E1 · Озеленение/)
  assert.match(html, /E2 · Качество воздуха/)
  assert.match(html, />\+5,288</)
  assert.match(html, />\+9</)
  assert.match(html, />\+2,25</)
  assert.match(html, /meter-gain/)
})

test('safe crossings show a loss for transport and T1 but a gain for safety and B2', () => {
  const progress = simulateProgress({ actions: [{ measureId: 'M11', district: 'Nura' }] })
  const { before, after } = progress.result.districts.Nura
  const html = renderToStaticMarkup(createElement(IndicatorStatistics, { before, after }))
  assert.match(html, />−0,875</)
  assert.match(html, />−1,75</)
  assert.match(html, />\+5,25</)
  assert.match(html, />\+10,5</)
  assert.match(html, /meter-loss/)
  assert.match(html, /meter-gain/)
  assert.match(html, /в начале 55; изменение −1,75/)
})

test('city measures update aggregates in every district and reset baseline has no colored changes', () => {
  const progress = simulateProgress({ actions: [{ measureId: 'M6' }] })
  const ui = presentDistricts(progress.result.districts)
  for (let index = 0; index < ui.length; index++) close(ui[index].indicators.green - initialDistricts[index].indicators.green, 1.95)
  const before = INITIAL_DISTRICTS.Nura.indicators
  const html = renderToStaticMarkup(createElement(IndicatorStatistics, { before, after: before }))
  assert.doesNotMatch(html, /meter-gain|meter-loss|metric-delta/)
})
