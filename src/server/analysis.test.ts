import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { EXAMPLE_SCENARIO } from '../simulator/example'
import { simulate } from '../simulator/simulate'
import { analyzeSimulation } from './analysis.server'

function withApiKey(t: TestContext, apiKey?: string) {
  const original = process.env
  process.env = { ...original, OPENAI_API_KEY: apiKey, OPENAI_MODEL: 'gpt-4.1-mini' }
  t.after(() => { process.env = original })
}

test('without an API key the calculation succeeds and AI analysis is null', async (t) => {
  withApiKey(t)
  const result = simulate(EXAMPLE_SCENARIO)
  const analysis = await analyzeSimulation(result)
  assert.equal(analysis.aiAnalysis, null)
  assert.match(analysis.aiError!, /OPENAI_API_KEY/)
  assert.ok(result.finalScore > result.baselineScore)
})

test('official SDK receives calculated results and returns only an explanation', async (t) => {
  withApiKey(t, 'test-key')
  const result = simulate(EXAMPLE_SCENARIO)
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string)
    assert.deepEqual(JSON.parse(body.input), result)
    assert.match(body.instructions, /Do not modify, recalculate, or invent numbers/)
    assert.match(body.instructions, /at most 50 words/)
    assert.equal(body.max_output_tokens, 350)
    assert.equal(body.store, false)
    return new Response(JSON.stringify({ object: 'response', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Улучшилась доступность школ и поликлиник.', annotations: [] }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  assert.deepEqual(await analyzeSimulation(result), { aiAnalysis: 'Улучшилась доступность школ и поликлиник.', aiError: null })
})

test('overlong completed provider output is capped to 50 words on the server', async (t) => {
  withApiKey(t, 'test-key')
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ object: 'response', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: Array.from({ length: 70 }, () => 'улучшение').join(' '), annotations: [] }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  const analysis = await analyzeSimulation(simulate(EXAMPLE_SCENARIO))
  assert.equal(analysis.aiError, null)
  assert.equal(analysis.aiAnalysis!.split(/\s+/).length, 50)
})

test('API errors are non-fatal and do not expose provider details', async (t) => {
  withApiKey(t, 'test-key')
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: { message: 'private-provider-detail', type: 'server_error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } }))
  const result = simulate(EXAMPLE_SCENARIO)
  const analysis = await analyzeSimulation(result)
  assert.equal(analysis.aiAnalysis, null)
  assert.match(analysis.aiError!, /временно недоступен/)
  assert.ok(!analysis.aiError!.includes('private-provider-detail'))
  assert.ok(Number.isFinite(result.finalScore))
})

test('empty or incomplete model output falls back without changing calculated results', async (t) => {
  withApiKey(t, 'test-key')
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ object: 'response', status: 'incomplete', output: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  const analysis = await analyzeSimulation(simulate(EXAMPLE_SCENARIO))
  assert.equal(analysis.aiAnalysis, null)
  assert.match(analysis.aiError!, /временно недоступен/)
})
