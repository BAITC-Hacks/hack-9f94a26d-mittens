/** @typedef {{id: string, district?: string}} Selection */
/**
 * Validate drafts as they grow, and require exactly five for submission.
 * @param {Selection[]} selections
 * @param {{measures: {id: string, direction: string, type: string, cost: number}[], rules: {budget: number, count: number, perDirection: number, districts: string[], incompatible: {ids: string[], sameDistrict: boolean}[]}} data
 * @param {boolean} complete
 */
export function validateSelection(selections, data, complete = false) {
  const { measures, rules } = data
  if (selections.length > rules.count || (complete && selections.length !== rules.count)) return `Выберите ровно ${rules.count} инициатив.`
  const ids = new Set()
  /** @type {Record<string, number>} */
  const directions = {}
  let cost = 0
  for (const selection of selections) {
    const measure = measures.find(item => item.id === selection.id)
    if (!measure) return 'Неизвестная инициатива.'
    if (ids.has(selection.id)) return 'Эта инициатива уже выбрана.'
    ids.add(selection.id)
    if (measure.type === 'R' && !rules.districts.includes(selection.district ?? '')) return 'Выберите район.'
    if (measure.type === 'C' && selection.district !== undefined) return 'Общегородская инициатива не привязана к району.'
    cost += measure.cost
    directions[measure.direction] = (directions[measure.direction] ?? 0) + 1
    if (directions[measure.direction] > rules.perDirection) return `Не более ${rules.perDirection} инициатив одного направления.`
  }
  if (cost > rules.budget) return 'Недостаточно бюджета.'
  for (const conflict of rules.incompatible) {
    const first = selections.find(item => item.id === conflict.ids[0])
    const second = selections.find(item => item.id === conflict.ids[1])
    if (first && second && (!conflict.sameDistrict || first.district === second.district)) return `${first.id} и ${second.id} несовместимы${conflict.sameDistrict ? ' в одном районе' : ''}.`
  }
  return null
}
