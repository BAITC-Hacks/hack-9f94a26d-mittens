import { createServerFn } from '@tanstack/react-start'
import { INITIAL_DISTRICTS } from '../simulator/districts'
import { scoreCity } from '../simulator/scoring'
import { simulate } from '../simulator/simulate'
import { ScenarioValidationError } from '../simulator/validator'
import type { SimulationResponse } from '../simulator/types'

export type SimulateCityResponse =
  | { ok: true; result: SimulationResponse }
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
      result = simulate(data)
    } catch (error) {
      if (error instanceof ScenarioValidationError) return { ok: false, error: error.message }
      throw error
    }
    const { analyzeSimulation } = await import('./analysis.server')
    return { ok: true, result: { ...result, ...await analyzeSimulation(result) } }
  })
