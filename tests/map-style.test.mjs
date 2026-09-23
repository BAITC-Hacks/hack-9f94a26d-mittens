import test from 'node:test'
import assert from 'node:assert/strict'
import { applyLightMapStyle } from '../src/lib/map-style.ts'

function mockMap(ids) {
  const layers = new Set(ids)
  const operations = []
  return {
    layers, operations,
    hasLayer: id => layers.has(id),
    addLayer(layer, beforeId) {
      assert.ok(layers.has(beforeId))
      operations.push(['add', layer, beforeId])
      layers.add(layer.id)
    },
    removeLayer(id) { operations.push(['remove', id]); layers.delete(id) },
  }
}

test('light map replaces only land layers in place and keeps geographic detail', () => {
  const originals = ['726018', '740420', 'background', 'substrate', '904990', '523344']
  const map = mockMap([...originals, 'roads', 'water', 'parks', 'buildings', 'labels'])
  applyLightMapStyle(map)
  assert.equal(map.operations.length, originals.length * 2)
  originals.forEach((id, index) => {
    const added = map.operations[index * 2]
    assert.equal(added[0], 'add')
    assert.equal(added[1].id, 'astana-light-' + id)
    assert.equal(added[2], id)
    assert.deepEqual(map.operations[index * 2 + 1], ['remove', id])
  })
  for (const id of ['roads', 'water', 'parks', 'buildings', 'labels']) assert.ok(map.layers.has(id))
})

test('light map is idempotent and tolerates missing upstream layers', () => {
  const map = mockMap(['background', 'water'])
  applyLightMapStyle(map)
  applyLightMapStyle(map)
  assert.equal(map.operations.length, 2)
  assert.ok(map.layers.has('water'))
})

test('a failed light-layer insertion does not remove the original', () => {
  const map = mockMap(['background'])
  map.addLayer = () => { throw new Error('invalid layer') }
  assert.throws(() => applyLightMapStyle(map), /invalid layer/)
  assert.ok(map.layers.has('background'))
  assert.equal(map.operations.length, 0)
})
