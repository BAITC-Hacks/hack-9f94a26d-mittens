import OpenAI from 'openai'
import type { SimulationResult } from '../simulator/types'

export const ANALYSIS_INSTRUCTIONS = `You are an urban-policy simulation analyst for a synthetic hackathon demo.
The numerical result below has already been calculated by a deterministic TypeScript engine.
Do not modify, recalculate, or invent numbers. All indicators are 0–100, higher is better, including T1.
Write one precise Russian paragraph of no more than 50 words. Prioritize:
1. The largest improvements.
2. Remaining weak areas, including indicators below 40.
3. Important trade-offs and risks, including lag and uneven district coverage.
4. One concrete improvement to the scenario, without predicting new scores.
Use only the supplied numerical results. Do not claim real-world forecasts or introduce unexpected events.
Keep suggestions qualitative; a scenario must contain exactly five unique measures within a budget of 100.
Use direct, specific wording. Omit introductions, filler, repetition, headings, and conclusions.
Return plain text.`

export async function analyzeSimulation(result: SimulationResult): Promise<{ aiAnalysis: string | null; aiError: string | null }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { aiAnalysis: null, aiError: 'AI-анализ недоступен: на сервере не задан OPENAI_API_KEY. Численный расчёт выполнен.' }
  try {
    const client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 })
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: ANALYSIS_INSTRUCTIONS,
      input: JSON.stringify(result),
      max_output_tokens: 900,
      store: false,
    })
    const text = response.output_text?.trim()
    if (response.status !== 'completed' || !text) throw new Error('Incomplete analysis')
    return { aiAnalysis: text, aiError: null }
  } catch {
    // Never leak API errors/credentials or turn an optional explanation into a failed simulation.
    return { aiAnalysis: null, aiError: 'AI-анализ временно недоступен. Численный расчёт выполнен.' }
  }
}
