import type { District } from './scenario-districts'
import { directionScore, metricChange } from './indicator-stats'
import { INDICATOR_GROUPS, INDICATOR_LABELS } from '../simulator/presentation'
import type { IndicatorId } from '../simulator/types'

// Explain observed server-calculated changes, never preview a catalog effect.
const descriptions: Record<IndicatorId, [string, string]> = {
  T1: ['Дороги стали свободнее.', 'Загруженность дорог выросла.'],
  T2: ['Общественный транспорт стал доступнее.', 'Доступность общественного транспорта снизилась.'],
  E1: ['Озеленение района улучшилось.', 'Показатель озеленения снизился.'],
  E2: ['Качество воздуха улучшилось.', 'Качество воздуха ухудшилось.'],
  S1: ['Обеспеченность школами и детсадами выросла.', 'Обеспеченность школами и детсадами снизилась.'],
  S2: ['Первичная медицинская помощь стала доступнее.', 'Доступность первичной медицинской помощи снизилась.'],
  B1: ['Улицы стали безопаснее.', 'Безопасность улиц снизилась.'],
  B2: ['Дорожное движение стало безопаснее.', 'Безопасность дорожного движения снизилась.'],
  C1: ['Надёжность коммунальных сетей повысилась.', 'Надёжность коммунальных сетей снизилась.'],
  C2: ['Обращения жителей решаются быстрее.', 'Обращения жителей решаются медленнее.'],
}

export function actionFeedback(before: District, after: District) {
  return INDICATOR_GROUPS.map(group => {
    const start = directionScore(before.rawIndicators, group.indicators)
    const current = directionScore(after.rawIndicators, group.indicators)
    return {
      id: group.id, label: group.label, before: start, after: current,
      ...metricChange(start, current),
      changes: group.indicators.flatMap(indicator => {
        const previous = before.rawIndicators[indicator]
        const value = after.rawIndicators[indicator]
        const change = metricChange(previous, value)
        return change.delta === 0 ? [] : [{
          indicator, label: INDICATOR_LABELS[indicator], before: previous, after: value,
          ...change, explanation: descriptions[indicator][change.delta > 0 ? 0 : 1],
        }]
      }),
    }
  })
}

export function strongestDirection(feedback: ReturnType<typeof actionFeedback>) {
  return feedback.reduce((strongest, item) => Math.abs(item.delta) > Math.abs(strongest.delta) ? item : strongest).id
}
