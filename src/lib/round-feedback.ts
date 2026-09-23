import { directionScore, metricChange } from './indicator-stats'
import { DISTRICT_PRESENTATION, INDICATOR_GROUPS } from '../simulator/presentation'
import { DISTRICT_IDS, INDICATOR_IDS } from '../simulator/types'
import type { SimulationResult } from '../simulator/types'

export function roundFeedback(result: SimulationResult) {
  const directions = INDICATOR_GROUPS.map(group => {
    const before = DISTRICT_IDS.reduce((sum, id) => sum + result.districts[id].populationShare * directionScore(result.districts[id].before, group.indicators), 0)
    const after = DISTRICT_IDS.reduce((sum, id) => sum + result.districts[id].populationShare * directionScore(result.districts[id].after, group.indicators), 0)
    return { id: group.id, label: group.label, before, after, ...metricChange(before, after) }
  })
  const districts = DISTRICT_IDS.map(id => ({
    id, name: DISTRICT_PRESENTATION[id].name,
    before: result.districts[id].scoreBefore, after: result.districts[id].scoreAfter,
    ...metricChange(result.districts[id].scoreBefore, result.districts[id].scoreAfter),
  }))
  const deltas = DISTRICT_IDS.flatMap(id => INDICATOR_IDS.map(key => result.districts[id].after[key] - result.districts[id].before[key]))
  const improved = deltas.filter(delta => delta > 1e-9).length
  const worsened = deltas.filter(delta => delta < -1e-9).length
  const unchanged = deltas.length - improved - worsened
  const score = metricChange(result.baselineScore, result.finalScore)
  const conclusion = result.scoreDelta > 1e-9
    ? 'Вы сделали город лучше по итогам модели: общий Score вырос. Пять решений — и видимый результат.'
    : result.scoreDelta < -1e-9
      ? 'Все пять решений приняты, но общий Score снизился. Попробуйте другой план, чтобы улучшить результат.'
      : 'Все пять решений приняты. Общий Score сохранился — попробуйте другой план, чтобы добиться роста.'
  return { directions, districts, improved, worsened, unchanged, score, conclusion }
}
