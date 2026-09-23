import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeIndicatorChange } from './breakdown'
import { EXAMPLE_SCENARIO } from './example'
import { simulate } from './simulate'
import { DISTRICT_IDS, INDICATOR_IDS } from './types'
import type { SimulationResult } from './types'

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

function assertReconciles(result: SimulationResult) {
  const breakdown = result.scoreBreakdown
  for (const key of ['before', 'after', 'delta'] as const) {
    close(breakdown.weightedAverage[key] + breakdown.weakestDistrict[key] + breakdown.criticalPenalty[key], breakdown.total[key])
  }
  close(breakdown.total.before, result.baselineScore)
  close(breakdown.total.after, result.finalScore)
  close(breakdown.total.delta, result.scoreDelta)
  close(result.changes.reduce((sum, change) => sum + change.cityAverageScoreDelta, 0), breakdown.weightedAverage.delta)
  close(result.changes.reduce((sum, change) => sum + change.criticalPenaltyScoreDelta, 0), breakdown.criticalPenalty.delta)
  for (const district of DISTRICT_IDS) {
    close(result.changes.filter((change) => change.district === district).reduce((sum, change) => sum + change.districtScoreDelta, 0), result.districts[district].scoreDelta)
    for (const indicator of INDICATOR_IDS) {
      const changed = result.changes.find((change) => change.district === district && change.indicator === indicator)
      assert.equal(Boolean(changed), result.districts[district].delta[indicator] !== 0)
      if (changed) {
        close(changed.before, result.districts[district].before[indicator])
        close(changed.after, result.districts[district].after[indicator])
      }
    }
  }
}

test('example exposes changed attributes and contributions that add up to the final score', () => {
  const result = simulate(EXAMPLE_SCENARIO)
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result)
  assertReconciles(result)
  const schools = result.changes.find((change) => change.district === 'Nura' && change.indicator === 'S1')!
  assert.equal(schools.indicatorName, 'Schools and kindergartens')
  assert.equal(schools.before, 38)
  assert.equal(schools.after, 48)
  assert.equal(schools.delta, 10)
  close(schools.weight, 0.11)
  close(schools.districtScoreDelta, 1.1)
  close(schools.weightedAverageDelta, 0.176)
  close(schools.cityAverageScoreDelta, 0.1232)
  assert.equal(schools.criticalBefore, true)
  assert.equal(schools.criticalAfter, false)
  assert.equal(schools.criticalPenaltyScoreDelta, 1)
  close(result.scoreBreakdown.weightedAverage.delta, 0.85064)
  close(result.scoreBreakdown.weakestDistrict.delta, 1.13475)
  assert.equal(result.scoreBreakdown.criticalPenalty.delta, 2)
  close(result.scoreBreakdown.total.delta, 3.98539)
})

test('breakdown correctly accounts for a switch in the weakest district', () => {
  const result = simulate({ actions: ['M3', 'M7', 'M8', 'M10', 'M11'].map((measureId) => ({ measureId, district: 'Nura' })) })
  assert.deepEqual(result.scoreBreakdown.weakestDistrict.districtsBefore, ['Nura'])
  assert.deepEqual(result.scoreBreakdown.weakestDistrict.districtsAfter, ['Saryarka'])
  close(result.scoreBreakdown.weakestDistrict.delta, 0.3 * (54.65 - 49.18))
  assertReconciles(result)
})

test('negative effects and newly critical indicators are returned with negative contributions', () => {
  const result = simulate({ actions: [
    { measureId: 'M5', district: 'Saryarka' }, { measureId: 'M6' },
    { measureId: 'M11', district: 'Almaty' }, { measureId: 'M9', district: 'Nura' }, { measureId: 'M12' },
  ] })
  const roads = result.changes.find((change) => change.district === 'Almaty' && change.indicator === 'T1')!
  close(roads.delta, -1.75)
  close(roads.districtScoreDelta, -0.175)
  close(roads.cityAverageScoreDelta, -0.0294)
  assert.equal(roads.criticalBefore, false)
  assert.equal(roads.criticalAfter, true)
  assert.equal(roads.criticalPenaltyScoreDelta, -1)
  assertReconciles(result)
})

test('exactly 40 removes the critical penalty and contributions use actual final values', () => {
  const crossing = describeIndicatorChange('Nura', 'S1', 39, 40, 0.16)
  assert.equal(crossing.criticalPenaltyScoreDelta, 1)
  const capped = describeIndicatorChange('Esil', 'T1', 99, 100, 0.27)
  assert.equal(capped.delta, 1)
  close(capped.districtScoreDelta, 0.1)
  assert.equal(capped.criticalPenaltyScoreDelta, 0)
})
