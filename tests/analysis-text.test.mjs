import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { limitAnalysisWords, analysisMessage } from '../src/lib/analysis-text.ts'
import { AIExplanation } from '../src/components/AIExplanation.tsx'

test('explanations enforce at most 50 whitespace-delimited words including multiline Russian output', () => {
  assert.equal(limitAnalysisWords('  Дороги\nстали\tсвободнее.  '), 'Дороги стали свободнее.')
  assert.equal(limitAnalysisWords(''), '')
  const long = Array.from({ length: 80 }, (_, i) => `Слово${i}`).join('\n')
  const capped = limitAnalysisWords(long)
  assert.equal(capped.split(/\s+/).length, 50)
  assert.ok(capped.endsWith('Слово49…'))
  assert.equal(limitAnalysisWords(capped), capped)
  const message = analysisMessage({ aiAnalysis: long, aiError: null })
  const html = renderToStaticMarkup(createElement(AIExplanation, { message }))
  assert.match(html, /Слово49…/)
  assert.doesNotMatch(html, /Слово50/)
})

test('GPT area supports loading, success and safe unavailable states without blocking controls', () => {
  assert.match(renderToStaticMarkup(createElement(AIExplanation, { message: { status: 'loading' } })), /aria-busy="true"/)
  const unavailable = analysisMessage({ aiAnalysis: null, aiError: 'sensitive-provider-error' })
  const html = renderToStaticMarkup(createElement(AIExplanation, { message: unavailable }))
  assert.match(html, /Объяснение GPT сейчас недоступно/)
  assert.doesNotMatch(html, /sensitive-provider-error/)
})

test('report can be refreshed after success or failure but not while loading', () => {
  for (const message of [{ status: 'ready', text: 'Воздух стал чище.' }, { status: 'unavailable' }]) {
    const html = renderToStaticMarkup(createElement(AIExplanation, { message, onRetry() {} }))
    assert.match(html, /aria-label="Обновить отчёт GPT за ход"/)
    assert.match(html, />Обновить отчёт<\/button>/)
    assert.doesNotMatch(html, /disabled/)
  }
  const loading = renderToStaticMarkup(createElement(AIExplanation, { message: { status: 'loading' }, scope: 'раунд', onRetry() {} }))
  assert.match(loading, /disabled="" aria-label="Обновить отчёт GPT за раунд"/)
  assert.match(loading, /Обновляем…/)
})

test('waiting for GPT shows decorative construction and an indeterminate line in both report scopes', () => {
  for (const scope of ['ход', 'раунд']) {
    const html = renderToStaticMarkup(createElement(AIExplanation, { message: { status: 'loading' }, scope }))
    assert.match(html, /Идёт стройка по вашим решениям…/)
    assert.match(html, /Готовим короткое объяснение результата/)
    assert.match(html, /construction-scene" aria-hidden="true"/)
    assert.equal((html.match(/class="construction-building"/g) ?? []).length, 3)
    assert.match(html, /construction-track" aria-hidden="true"/)
    assert.doesNotMatch(html, /aria-valuenow|\d+%/)
  }
  for (const message of [{ status: 'ready', text: 'Город стал лучше.' }, { status: 'unavailable' }]) {
    const html = renderToStaticMarkup(createElement(AIExplanation, { message }))
    assert.doesNotMatch(html, /construction-loading|construction-track|Идёт стройка/)
    assert.match(html, /aria-busy="false"/)
  }
})
