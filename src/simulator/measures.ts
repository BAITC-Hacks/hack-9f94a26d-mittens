import data from '../../data/engine.json'
import type { Measure, MeasureId, Indicators } from './types'

export const MEASURES = data.measures as readonly Measure[]
const byId = new Map(MEASURES.map(measure => [measure.id, measure]))
export function getMeasure(id: string): Measure | undefined {
  return byId.get(id as MeasureId)
}
export const SYNERGIES = data.synergies as readonly { districtMeasure: MeasureId; cityMeasure: MeasureId; effects: Partial<Indicators> }[]
export const INCOMPATIBILITIES = data.incompatibilities as unknown as readonly { measures: readonly [MeasureId, MeasureId]; scope: 'city' | 'district' }[]
