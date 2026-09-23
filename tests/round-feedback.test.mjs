import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { simulate } from '../src/simulator/simulate.ts'
import { EXAMPLE_SCENARIO } from '../src/simulator/example.ts'
import { roundFeedback } from '../src/lib/round-feedback.ts'
import { RoundSummary } from '../src/components/RoundSummary.tsx'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)

test('whole-round report reproduces the documented example and counts all 50 indicators', () => {
  const result = simulate(EXAMPLE_SCENARIO)
  const report = roundFeedback(result)
  close(result.baselineScore, 52.55768)
  close(result.finalScore, 56.54307)
  assert.equal(report.directions.length, 5)
  assert.equal(report.districts.length, 5)
  assert.equal(report.improved, 11)
  assert.equal(report.worsened, 0)
  assert.equal(report.unchanged, 39)
  assert.equal(result.criticalIndicatorsBefore, 2)
  assert.equal(result.criticalIndicatorsAfter, 0)
  assert.match(report.conclusion, /Вы сделали город лучше/)
  const ecology = report.directions.find(item => item.id === 'E')
  close(ecology.after - ecology.before, 0.20 * 0.55 * 14 * 5 / 8)
  const social = report.directions.find(item => item.id === 'S')
  close(social.after - social.before, 0.16 * (16 + 14) * 5 / 8 / 2)
})

test('round report retains worsening and marks it red rather than counting only gains', () => {
  const result = simulate({ actions: [
    { measureId: 'M9', district: 'Nura' }, { measureId: 'M11', district: 'Almaty' },
    { measureId: 'M10', district: 'Nura' }, { measureId: 'M12' }, { measureId: 'M4', district: 'Saryarka' },
  ] })
  const report = roundFeedback(result)
  assert.equal(report.worsened, 1)
  assert.equal(report.directions.find(item => item.id === 'T').tone, 'negative')
  assert.equal(report.directions.find(item => item.id === 'T').text, '−0,21')
  assert.equal(report.improved + report.worsened + report.unchanged, 50)
})

test('congratulations do not claim growth when score fell or remained unchanged', () => {
  const result = simulate(EXAMPLE_SCENARIO)
  assert.match(roundFeedback({ ...result, finalScore: result.baselineScore - 1, scoreDelta: -1 }).conclusion, /Score снизился/)
  assert.match(roundFeedback({ ...result, finalScore: result.baselineScore, scoreDelta: 0 }).conclusion, /Score сохранился/)
})

test('summary keeps city results and report refresh without the district table or unchanged count', () => {
  const html = renderToStaticMarkup(createElement(RoundSummary, { result: simulate(EXAMPLE_SCENARIO), open: false, analysis: { status: 'ready', text: 'Город стал лучше.' }, onClose() {}, onNewRound() {}, onRetryAnalysis() {} }))
  assert.match(html, /<dialog[^>]*aria-labelledby="round-summary-title"/)
  assert.match(html, /52,56/)
  assert.match(html, /56,54/)
  assert.doesNotMatch(html, /<table|Результат по районам|Индекс D до и после решений|Без изменений:/)
  for (const category of ['Транспорт', 'Экология', 'Социальная сфера', 'Безопасность', 'Сервисы']) assert.match(html, new RegExp(category))
  assert.match(html, /Поздравляем с завершением раунда/)
  assert.match(html, /Вернуться к карте/)
  assert.match(html, /Новый раунд/)
  assert.match(html, /Объяснение GPT за раунд/)
  assert.match(html, /Обновить отчёт GPT за раунд/)
})
