import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialDistricts, districtIds, districtScenarios, summarizeIndicators } from '../src/lib/scenario-districts.ts'
import { districtCatalogIds, loadDistrictBoundaries } from '../src/lib/astana-districts.ts'
import { DISTRICT_IDS } from '../src/simulator/types.ts'
import { INITIAL_DISTRICTS } from '../src/simulator/districts.ts'

const data = JSON.parse(readFileSync(new URL('../data/campaigns.json', import.meta.url)))

test('UI, map, selection rules and simulation have exactly the same five districts', () => {
  assert.deepEqual(data.rules.districts, DISTRICT_IDS)
  assert.deepEqual(initialDistricts.map(district => districtIds[district.id]), DISTRICT_IDS)
  assert.deepEqual(initialDistricts.map(district => district.name), ['Есиль', 'Алматы', 'Сарыарка', 'Байконур', 'Нура'])
  assert.deepEqual(Object.keys(districtCatalogIds).sort(), initialDistricts.map(district => district.id).sort())
  assert.equal(initialDistricts.length, 5)
  assert.equal(Object.keys(districtScenarios).length, 5)
})

test('frontend indicators and population shares come from the backend baseline', () => {
  for (const district of initialDistricts) {
    const source = INITIAL_DISTRICTS[districtIds[district.id]]
    assert.deepEqual(district.indicators, summarizeIndicators(source.indicators))
    assert.equal(district.population, Math.round(source.populationShare * 100) + '% населения модели')
  }
  const source = structuredClone(INITIAL_DISTRICTS.Nura.indicators)
  const summary = summarizeIndicators(source)
  assert.equal(summary.social, 36.5)
  summary.social = 100
  assert.deepEqual(source, INITIAL_DISTRICTS.Nura.indicators)
})

test('scenario priorities match the requested district characters', () => {
  const find = id => initialDistricts.find(district => district.id === id)
  for (const district of initialDistricts.filter(item => item.id !== 'nura')) {
    assert.ok(find('nura').indicators.transport < district.indicators.transport)
    assert.ok(find('nura').indicators.social < district.indicators.social)
  }
  for (const district of initialDistricts.filter(item => item.id !== 'saryarka')) {
    assert.ok(find('saryarka').indicators.green < district.indicators.green)
  }
  assert.ok(find('yesil').indicators.service > find('almaty').indicators.service)
  const balanced = Object.values(find('baikonyr').indicators)
  assert.ok(Math.max(...balanced) - Math.min(...balanced) <= 10)
  assert.match(districtScenarios.yesil, /мостах.*школами/)
  assert.match(districtScenarios.almaty, /ЖКХ.*пробки/)
  assert.match(districtScenarios.saryarka, /Смог.*озеленение/)
  assert.match(districtScenarios.baikonyr, /без ярких перекосов/)
  assert.match(districtScenarios.nura, /аутсайдер/)
})

test('map ignores districts outside the scenario groups returned by 2GIS', async context => {
  const items = [...Object.values(districtCatalogIds).flat(), 'unrelated-district'].map(id => ({
    id, geometry: { centroid: 'POINT(71.4 51.1)', selection: 'POLYGON((71 51,72 51,72 52,71 51))' },
  }))
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ meta: { code: 200 }, result: { items } })))
  const boundaries = await loadDistrictBoundaries('test-key', new AbortController().signal)
  assert.equal(boundaries.length, 5)
  assert.deepEqual(boundaries.map(boundary => boundary.id).sort(), Object.keys(districtCatalogIds).sort())
})

function catalogItems() {
  return Object.values(districtCatalogIds).flat().map(id => ({
    id, geometry: { centroid: 'POINT(71.5 51.5)', selection: 'POLYGON((71 51,72 51,72 52,71 52,71 51))' },
  }))
}

test('Saraishyk is merged into a single Almaty polygon without the internal border', async context => {
  const items = catalogItems()
  items.find(item => item.id === districtCatalogIds.almaty[1]).geometry = {
    centroid: 'POINT(72.5 51.5)', selection: 'POLYGON((72 51,73 51,73 52,72 52,72 51))',
  }
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ meta: { code: 200 }, result: { items } })))
  const boundaries = await loadDistrictBoundaries('test-key', new AbortController().signal)
  const almaty = boundaries.find(boundary => boundary.id === 'almaty')
  assert.equal(boundaries.length, 5)
  assert.deepEqual(almaty.polygons, [[[[71, 51], [73, 51], [73, 52], [71, 52], [71, 51]]]])
  assert.deepEqual(almaty.center, [71.5, 51.5])
  assert.ok(boundaries.every(boundary => boundary.id !== 'saraishyk'))
})

test('Almaty merge retains disconnected territory instead of dropping it', async context => {
  const items = catalogItems()
  items.find(item => item.id === districtCatalogIds.almaty[1]).geometry.selection =
    'MULTIPOLYGON(((74 51,75 51,75 52,74 52,74 51)),((76 51,77 51,77 52,76 52,76 51)))'
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ meta: { code: 200 }, result: { items } })))
  const boundaries = await loadDistrictBoundaries('test-key', new AbortController().signal)
  const almaty = boundaries.find(boundary => boundary.id === 'almaty')
  assert.equal(almaty.polygons.length, 3)
})

test('missing Saraishyk geometry is an error, not a silently incomplete Almaty', async context => {
  const items = catalogItems().filter(item => item.id !== districtCatalogIds.almaty[1])
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ meta: { code: 200 }, result: { items } })))
  await assert.rejects(loadDistrictBoundaries('test-key', new AbortController().signal), /неполные границы/)
})
