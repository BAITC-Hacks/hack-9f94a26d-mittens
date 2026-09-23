import { createServerFn } from '@tanstack/react-start'
import { INITIAL_DISTRICTS } from '../simulator/districts'
import { scoreCity } from '../simulator/scoring'
import { simulateProgress } from '../simulator/simulate'
import type { SimulationProgress } from '../simulator/simulate'
import { ScenarioValidationError } from '../simulator/validator'
import type { SimulationResponse } from '../simulator/types'

export type SimulateCityResponse =
  | { ok: true; complete: true; result: SimulationResponse }
  | ({ ok: true } & Extract<SimulationProgress, { complete: false }>)
  | { ok: false; error: string }

export const getCityBaseline = createServerFn({ method: 'GET' }).handler(() => ({
  districts: INITIAL_DISTRICTS,
  scoring: scoreCity(INITIAL_DISTRICTS),
}))

export const simulateCity = createServerFn({ method: 'POST' })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<SimulateCityResponse> => {
    // Return expected validation failures as data so readable messages survive production serialization.
    let result
    try {
      result = simulateProgress(data)
    } catch (error) {
      if (error instanceof ScenarioValidationError) return { ok: false, error: error.message }
      throw error
    }
    if (!result.complete) return { ok: true, ...result }
    const { analyzeSimulation } = await import('./analysis.server')
    return { ok: true, complete: true, result: { ...result.result, ...await analyzeSimulation(result.result) } }
  })
