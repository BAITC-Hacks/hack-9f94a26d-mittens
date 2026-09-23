import OpenAI from 'openai'
import type { SimulationResult } from '../simulator/types'
import { limitAnalysisWords } from '../lib/analysis-text'
import type { AnalysisResult } from '../lib/analysis-text'
import type { buildAnalysisContext } from './analysis-context'

export const ANALYSIS_INSTRUCTIONS = `You are an urban-policy simulation analyst for a synthetic hackathon demo.
The numerical result below has already been calculated by a deterministic TypeScript engine.
Do not modify, recalculate, or invent numbers. All indicators are 0–100, higher is better, including T1.
Explain in concise Russian natural language, at most 50 words in one short paragraph.
Explain WHY the applied measures caused the observed changes. Mention the main improvement and any deterioration or important trade-off shown in the data.
Respect the supplied scope: for a step explain only the latest submission, including new synergies with earlier measures; for a completed round explain the whole round.
Use only the supplied numerical results. Do not claim real-world forecasts or introduce unexpected events.
Explain observed outcomes only, not unselected measures or hypothetical future scores.
Return plain text.`

async function requestAnalysis(result: unknown): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { aiAnalysis: null, aiError: 'AI-анализ недоступен: на сервере не задан OPENAI_API_KEY. Численный расчёт выполнен.' }
  try {
    const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 })
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: ANALYSIS_INSTRUCTIONS,
      input: JSON.stringify(result),
      max_output_tokens: 350,
      store: false,
    })
    const text = response.output_text?.trim()
    if (response.status !== 'completed' || !text) throw new Error('Incomplete analysis')
    return { aiAnalysis: limitAnalysisWords(text), aiError: null }
  } catch {
    // Never leak API errors/credentials or turn an optional explanation into a failed simulation.
    return { aiAnalysis: null, aiError: 'AI-анализ временно недоступен. Численный расчёт выполнен.' }
  }
}

export const analyzeSimulation = (result: SimulationResult) => requestAnalysis(result)
export const analyzeStep = (context: ReturnType<typeof buildAnalysisContext>['step']) => requestAnalysis(context)
