export const DISTRICT_IDS = ['Esil', 'Almaty', 'Saryarka', 'Baikonur', 'Nura'] as const
export type DistrictId = (typeof DISTRICT_IDS)[number]

export const INDICATOR_IDS = ['T1', 'T2', 'E1', 'E2', 'S1', 'S2', 'B1', 'B2', 'C1', 'C2'] as const
export type IndicatorId = (typeof INDICATOR_IDS)[number]
export type Indicators = Record<IndicatorId, number>
export type District = { populationShare: number; indicators: Indicators }
export type Districts = Record<DistrictId, District>
export type Category = 'transport' | 'ecology' | 'social' | 'safety' | 'services'
export type MeasureId = `M${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14}`
export type Measure = {
  id: MeasureId
  category: Category
  name: string
  scope: 'district' | 'city'
  cost: number
  lag: number
  effects: Partial<Indicators>
}
export type Action = { measureId: MeasureId; district?: DistrictId }
export type Scenario = { actions: Action[] }
export type IndicatorChange = {
  district: DistrictId
  indicator: IndicatorId
  indicatorName: string
  before: number
  after: number
  delta: number
  weight: number
  populationShare: number
  districtScoreDelta: number
  weightedAverageDelta: number
  /** Contribution to the 70% city-average term, not the whole final score. */
  cityAverageScoreDelta: number
  criticalBefore: boolean
  criticalAfter: boolean
  /** +1 when leaving the critical range, -1 when entering it, otherwise 0. */
  criticalPenaltyScoreDelta: number
}
export type ScoreComponent = { before: number; after: number; delta: number }
export type ScoreBreakdown = {
  formula: string
  /** Already multiplied by its coefficient; contributions add up to total. */
  weightedAverage: ScoreComponent & { weight: number }
  /** Kept separate because the weakest district can change between scenarios. */
  weakestDistrict: ScoreComponent & { weight: number; districtsBefore: DistrictId[]; districtsAfter: DistrictId[] }
  /** Negative critical-indicator count, so a positive delta is an improvement. */
  criticalPenalty: ScoreComponent
  total: ScoreComponent
}
export type ScoreSummary = {
  districtScores: Record<DistrictId, number>
  weightedAverage: number
  minimumDistrictScore: number
  criticalIndicators: number
  score: number
}
export type SimulationResult = {
  baselineScore: number
  finalScore: number
  scoreDelta: number
  horizon: number
  budget: { total: number; spent: number; remaining: number }
  actions: (Action & { name: string; cost: number; lag: number; effectFactor: number })[]
  districts: Record<DistrictId, {
    populationShare: number
    before: Indicators
    after: Indicators
    delta: Indicators
    scoreBefore: number
    scoreAfter: number
    scoreDelta: number
  }>
  scoring: { before: ScoreSummary; after: ScoreSummary }
  scoreBreakdown: ScoreBreakdown
  criticalIndicatorsBefore: number
  criticalIndicatorsAfter: number
  changes: IndicatorChange[]
  synergies: { measures: MeasureId[]; district: DistrictId; effects: Partial<Indicators> }[]
}
export type SimulationResponse = SimulationResult & { aiAnalysis: string | null; aiError: string | null }
