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
