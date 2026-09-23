import { createServerFn } from '@tanstack/react-start'
import { INITIAL_DISTRICTS } from '../simulator/districts'
import { scoreCity } from '../simulator/scoring'
import { simulateProgress } from '../simulator/simulate'
import type { SimulationProgress } from '../simulator/simulate'
import { ScenarioValidationError } from '../simulator/validator'
import type { SimulationResult } from '../simulator/types'
import type { AnalysisResult } from '../lib/analysis-text'
import { buildAnalysisContext } from './analysis-context'

export type SimulateCityResponse =
  | { ok: true; complete: true; result: SimulationResult }
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
    return { ok: true, ...result }
  })

// Optional text runs after the numerical result is already on screen.
export const explainCityActions = createServerFn({ method: 'POST' })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<{ step: AnalysisResult; round: AnalysisResult | null }> => {
    const context = buildAnalysisContext(data)
    const { analyzeSimulation, analyzeStep } = await import('./analysis.server')
    const [step, round] = await Promise.all([
      analyzeStep(context.step),
      context.progress.complete ? analyzeSimulation(context.progress.result) : Promise.resolve(null),
    ])
    return { step, round }
  })
