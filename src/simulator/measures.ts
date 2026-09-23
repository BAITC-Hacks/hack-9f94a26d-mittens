import type { Measure, MeasureId, Indicators } from './types'

export const MEASURES: readonly Measure[] = [
  { id: 'M1', category: 'transport', name: 'Dedicated bus lanes', scope: 'district', cost: 18, lag: 2, effects: { T1: 6, T2: 9 } },
  { id: 'M2', category: 'transport', name: 'Smart traffic lights', scope: 'city', cost: 22, lag: 2, effects: { T1: 4, B2: 3 } },
  { id: 'M3', category: 'transport', name: 'LRT line / expansion', scope: 'district', cost: 30, lag: 4, effects: { T1: 16, T2: 20, E2: 4 } },
  { id: 'M4', category: 'ecology', name: 'Park / public square', scope: 'district', cost: 15, lag: 2, effects: { E1: 12, E2: 3, B1: 2 } },
  { id: 'M5', category: 'ecology', name: 'Convert private-sector heating to clean fuel', scope: 'district', cost: 25, lag: 3, effects: { E2: 14, C1: 4 } },
  { id: 'M6', category: 'ecology', name: 'City greening and windbreak program', scope: 'city', cost: 20, lag: 4, effects: { E1: 5, E2: 3 } },
  { id: 'M7', category: 'social', name: 'School + kindergarten', scope: 'district', cost: 24, lag: 3, effects: { S1: 16 } },
  { id: 'M8', category: 'social', name: 'Family health center / clinic', scope: 'district', cost: 20, lag: 3, effects: { S2: 14 } },
  { id: 'M9', category: 'social', name: 'Neighborhood sports hubs', scope: 'district', cost: 10, lag: 1, effects: { S1: 3, S2: 3, B1: 3 } },
  { id: 'M10', category: 'safety', name: 'Lighting and cameras / Safe City', scope: 'district', cost: 12, lag: 1, effects: { B1: 12, B2: 2 } },
  { id: 'M11', category: 'safety', name: 'Safe pedestrian crossings and school zones', scope: 'district', cost: 10, lag: 1, effects: { B2: 12, T1: -2 } },
  { id: 'M12', category: 'services', name: 'Unified digital citizen request platform', scope: 'city', cost: 14, lag: 1, effects: { C2: 5 } },
  { id: 'M13', category: 'services', name: 'Heating and water network modernization', scope: 'district', cost: 28, lag: 4, effects: { C1: 18, E2: 2 } },
  { id: 'M14', category: 'services', name: 'Utility emergency teams + early warning', scope: 'city', cost: 16, lag: 1, effects: { C1: 5, C2: 2 } },
]

export function getMeasure(id: string): Measure | undefined {
  return MEASURES.find((measure) => measure.id === id)
}

export const SYNERGIES: readonly { districtMeasure: MeasureId; cityMeasure: MeasureId; effects: Partial<Indicators> }[] = [
  { districtMeasure: 'M1', cityMeasure: 'M2', effects: { T1: 2 } },
  { districtMeasure: 'M10', cityMeasure: 'M12', effects: { B1: 2 } },
  { districtMeasure: 'M5', cityMeasure: 'M6', effects: { E2: 2 } },
]

export const INCOMPATIBILITIES: readonly { measures: readonly [MeasureId, MeasureId]; scope: 'city' | 'district' }[] = [
  { measures: ['M1', 'M3'], scope: 'city' },
  { measures: ['M4', 'M7'], scope: 'district' },
  { measures: ['M5', 'M13'], scope: 'district' },
]
