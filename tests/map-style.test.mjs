import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDarkMapStyle, applyLightMapStyle, mapThemeOptions, BASE_MAP_STYLE, LIGHT_MAP_STYLE, MAP_BACKGROUND } from '../src/lib/map-style.ts'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ThemeToggle } from '../src/components/ThemeToggle.tsx'

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

test('night map darkens only matching land layers and keeps geographic detail', () => {
  const originals = ['124523', '999833', 'background', 'substrate', 'kvar_living', '799287']
  const map = mockMap([...originals, 'roads', 'water', 'parks', 'buildings', 'labels'])
  applyDarkMapStyle(map)
  assert.equal(map.operations.length, originals.length * 2)
  originals.forEach((id, index) => {
    const added = map.operations[index * 2]
    assert.equal(added[0], 'add')
    assert.equal(added[1].id, 'astana-dark-' + id)
    assert.equal(added[1].filter[1][1], 'sublayer')
    assert.ok(added[1].style.color.match(/^#[0-1][0-9a-f][0-1][0-9a-f][0-1][0-9a-f]$/))
    assert.equal(added[2], id)
    assert.deepEqual(map.operations[index * 2 + 1], ['remove', id])
  })
  for (const id of ['roads', 'water', 'parks', 'buildings', 'labels']) assert.ok(map.layers.has(id))
})

test('dark map is idempotent and tolerates missing upstream layers', () => {
  const map = mockMap(['background', 'water'])
  applyDarkMapStyle(map)
  applyDarkMapStyle(map)
  assert.equal(map.operations.length, 2)
  assert.ok(map.layers.has('water'))
})

test('a failed dark-layer insertion does not remove the original', () => {
  const map = mockMap(['background'])
  map.addLayer = () => { throw new Error('invalid layer') }
  assert.throws(() => applyDarkMapStyle(map), /invalid layer/)
  assert.ok(map.layers.has('background'))
  assert.equal(map.operations.length, 0)
})

test('map uses the official night style and near-black loading background', () => {
  assert.equal(BASE_MAP_STYLE, 'e05ac437-fcc2-4845-ad74-b1de9ce07555')
  assert.equal(MAP_BACKGROUND, '#080d12')
})

test('theme toggle selects matching day/night map and loading colors', () => {
  assert.deepEqual(mapThemeOptions('dark'), { style: BASE_MAP_STYLE, defaultBackgroundColor: MAP_BACKGROUND })
  assert.deepEqual(mapThemeOptions('light'), { style: LIGHT_MAP_STYLE, defaultBackgroundColor: '#f7f9fc' })
  const map = mockMap(['726018', 'background', 'roads', 'water'])
  applyLightMapStyle(map)
  applyLightMapStyle(map)
  assert.equal(map.operations.length, 4)
  assert.ok(map.layers.has('astana-light-background'))
  assert.ok(map.layers.has('roads'))
  assert.ok(map.layers.has('water'))
  for (const theme of ['light', 'dark']) {
    const html = renderToStaticMarkup(createElement(ThemeToggle, { theme, onToggle() {} }))
    assert.match(html, /role="switch"/)
    assert.match(html, new RegExp(`aria-checked="${theme === 'dark'}"`))
    assert.match(html, /aria-label="Тёмная тема"/)
  }
})
