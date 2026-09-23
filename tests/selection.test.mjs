import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateSelection } from '../src/lib/selection.mjs'
const data = JSON.parse(readFileSync(new URL('../data/campaigns.json', import.meta.url)))
const r = (id, district = 'Nura') => ({ id, district })
const c = id => ({ id })
const optimum = [c('M2'), r('M3'), r('M8'), r('M9'), c('M14')]
test('multiple selections, reference sets and order independence', () => {
  for (let count = 0; count <= 5; count++) assert.equal(validateSelection(optimum.slice(0, count), data), null)
  assert.equal(validateSelection(optimum, data, true), null)
  assert.equal(validateSelection([...optimum].reverse(), data, true), null)
  assert.equal(validateSelection([r('M7'),r('M8'),r('M10'),c('M12'),r('M5','Saryarka')], data, true), null)
})
test('exact count required only at submission', () => {
  assert.ok(validateSelection(optimum.slice(0, 4), data, true))
  assert.ok(validateSelection([...optimum, r('M10')], data))
})
test('budget boundary and overrun', () => {
  const exact = [r('M3'),r('M7'),r('M8'),r('M11'),c('M14')]
  assert.equal(validateSelection(exact, data, true), null)
  assert.match(validateSelection([r('M3'),r('M7'),r('M8'),r('M10'),c('M14')], data), /бюджета/)
})
test('duplicates, unknown IDs and district requirements', () => {
  for (const list of [[r('M4'),r('M4','Esil')],[c('M1')],[r('M2')],[r('M4','invalid')],[c('invalid')]]) assert.ok(validateSelection(list,data))
})
test('direction limit and conflicts including location scope', () => {
  assert.match(validateSelection([r('M7'),r('M8'),r('M9')],data), /направления/)
  assert.ok(validateSelection([r('M1'),r('M3','Esil')],data))
  for (const ids of [['M4','M7'],['M5','M13']]) {
    assert.ok(validateSelection(ids.map(id => r(id)),data))
    assert.equal(validateSelection([r(ids[0]),r(ids[1],'Esil')],data),null)
  }
})
test('removal restores budget and releases constraints', () => {
  const full = [r('M3'),r('M7'),r('M8'),r('M11'),c('M14')]
  assert.ok(validateSelection([...full,r('M10')],data))
  assert.equal(validateSelection([...full.filter(item => item.id !== 'M3'),r('M10')],data,true),null)
})
