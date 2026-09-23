import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { InitiativeCard } from '../src/components/InitiativeCard.tsx'

const props = {
  id: 'M1', title: 'Автобусные полосы', cost: 18,
  scopeLabel: 'Нура', selected: false,
  applied: false, reason: null, pending: false, onToggle() {},
}
const render = (overrides = {}) => renderToStaticMarkup(createElement(InitiativeCard, { ...props, ...overrides }))

test('minimal card shows title and district on the left, price on the right without preview details', () => {
  const html = render()
  assert.match(html, /M1 · Автобусные полосы · 18 ед. · Нура/)
  assert.match(html, /aria-pressed="false"/)
  assert.match(html, /initiative-copy.*Автобусные полосы.*initiative-scope.*Нура.*initiative-price.*18/)
  assert.doesNotMatch(html, /<details|Полный эффект|Лаг|T1|T2|Эффекты и детали/)
})

test('unavailable card explains its constraint without showing measure effects', () => {
  const html = render({ reason: 'Недостаточно бюджета.' })
  assert.match(html, /aria-describedby="constraint-M1" disabled/)
  assert.match(html, /<p class="constraint-reason" id="constraint-M1">Недостаточно бюджета\.<\/p>/)
  assert.doesNotMatch(html, /<summary|T1|T2/)
  assert.equal((html.match(/disabled=/g) ?? []).length, 1)
})

test('applied and pending states lock selection while retaining title and cost', () => {
  assert.match(render({ applied: true, selected: true }), /aria-pressed="true"[^>]* disabled/)
  assert.match(render({ applied: true, selected: true }), /Применено/)
  assert.match(render({ pending: true }), /disabled/)
  assert.doesNotMatch(render({ selected: true }), /disabled/)
  assert.match(render({ selected: true }), /Выбрано/)
})

test('city card names its citywide target and hides effect magnitude and lag', () => {
  const html = render({ id: 'M12', title: 'Платформа обращений', cost: 14, scopeLabel: 'Весь город' })
  assert.match(html, /initiative-scope">Весь город/)
  assert.doesNotMatch(html, /C2|87,5|Лаг|Эффект/)
})
