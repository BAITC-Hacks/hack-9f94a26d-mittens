import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cachedOptimize, handleOptimizerRequest, initializeOptimizerCache } from './optimizer.server'

initializeOptimizerCache()
const post = (path: string, body: unknown) => handleOptimizerRequest(new Request(`http://localhost${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
test('POST /optimize returns cached results without mutable cache leakage', async () => {
  const response = (await post('/optimize', { top_n: 2 }))!
  assert.equal(response.status, 200)
  const results = await response.json()
  assert.equal(results.length, 2)
  assert.ok(Math.abs(results[0].score - 57.24) < 0.01)
  const copy = cachedOptimize(null)
  copy[0].score = -1
  assert.ok(cachedOptimize({})[0].score > 57)
})
test('POST /counterfactual returns swaps with deltas', async () => {
  const response = (await post('/counterfactual', { set: cachedOptimize(null, 1)[0].measures, top_k: 3 }))!
  assert.equal(response.status, 200)
  const swaps = await response.json()
  assert.equal(swaps.length, 3)
  assert.equal(typeof swaps[0].score_delta, 'number')
})
test('422 for impossible or invalid requests; 405 for GET', async () => {
  for (const body of [{ constraints: { budget: 1 } }, { constraints: { budget: 101 } }, { top_n: 0 }, { top_n: null }, { constraints: [] }, null]) {
    const response = (await post('/optimize', body))!
    assert.equal(response.status, 422)
    assert.equal(typeof (await response.json()).error, 'string')
  }
  assert.equal((await post('/counterfactual', { set: [] }))!.status, 422)
  assert.equal((await handleOptimizerRequest(new Request('http://localhost/optimize')))!.status, 405)
  assert.equal((await handleOptimizerRequest(new Request('http://localhost/optimize', { method: 'POST', body: '{' })))!.status, 422)
  assert.equal(await handleOptimizerRequest(new Request('http://localhost/elsewhere')), undefined)
})
