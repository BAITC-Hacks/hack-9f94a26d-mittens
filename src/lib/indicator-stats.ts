import { INDICATOR_WEIGHTS } from '../simulator/scoring'
import type { IndicatorId, Indicators } from '../simulator/types'

// Normalize the existing indicator weights to keep each direction on 0–100.
// Ecology is 45% E1 + 55% E2; all other pairs have equal weights.
export function directionScore(values: Indicators, keys: readonly IndicatorId[]) {
  const weight = keys.reduce((sum, key) => sum + INDICATOR_WEIGHTS[key], 0)
  return keys.reduce((sum, key) => sum + values[key] * INDICATOR_WEIGHTS[key], 0) / weight
}

export const formatMetric = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 3 })

export function metricChange(before: number, after: number) {
  const delta = Number((after - before).toFixed(3))
  return {
    delta,
    tone: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'unchanged',
    text: delta > 0 ? '+' + formatMetric(delta) : delta < 0 ? '−' + formatMetric(-delta) : '0',
  }
}

export function changeSegments(before: number, after: number) {
  const start = Math.max(0, Math.min(100, before))
  const current = Math.max(0, Math.min(100, after))
  return { retained: Math.min(start, current), gain: Math.max(0, current - start), loss: Math.max(0, start - current) }
}
