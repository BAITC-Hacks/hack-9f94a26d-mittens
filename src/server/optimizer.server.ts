import { counterfactual, optimize, positiveCount } from '../simulator/optimizer'
import type { Constraints, Result, Selection } from '../simulator/optimizer'
import { ScenarioValidationError } from '../simulator/validator'

// Initialized when the server entry is loaded. Never expose mutable cache objects.
let cached: Result[] | undefined
let cachedLimit = 0
export function initializeOptimizerCache() {
  if (!cached) { cached = optimize(); cachedLimit = 10 }
}
export function cachedOptimize(constraints: Constraints | null | undefined, top_n = 10): Result[] {
  positiveCount(top_n, 'top_n')
  if (constraints == null || (typeof constraints === 'object' && !Array.isArray(constraints) && Object.keys(constraints).length === 0)) {
    initializeOptimizerCache()
    if (top_n > cachedLimit) { cached = optimize(null, top_n); cachedLimit = top_n }
    return structuredClone(cached!.slice(0, top_n))
  }
  return optimize(constraints, top_n)
}
export async function handleOptimizerRequest(request: Request): Promise<Response | undefined> {
  const path = new URL(request.url).pathname
  if (path !== '/optimize' && path !== '/counterfactual') return undefined
  if (request.method !== 'POST') return Response.json({ error: 'Use POST.' }, { status: 405, headers: { Allow: 'POST' } })
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ScenarioValidationError('Request body must be an object.')
    const input = body as Record<string, unknown>
    const result = path === '/optimize'
      ? cachedOptimize(input.constraints as Constraints | null | undefined, input.top_n === undefined ? 10 : positiveCount(input.top_n, 'top_n'))
      : counterfactual(input.set as Selection[], input.top_k === undefined ? 3 : positiveCount(input.top_k, 'top_k'))
    if (path === '/optimize' && result.length === 0) throw new ScenarioValidationError('No valid set satisfies the supplied constraints.')
    return Response.json(result)
  } catch (error) {
    if (error instanceof ScenarioValidationError || error instanceof SyntaxError) return Response.json({ error: error.message }, { status: 422 })
    throw error
  }
}
