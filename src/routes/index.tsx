import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AstanaMap } from '../components/AstanaMap'
import campaignData from '../../data/campaigns.json'
import { validateSelection } from '../lib/selection.mjs'

type Selection = { id: string; district?: string }

type IndicatorKey = 'transport' | 'green' | 'social' | 'safety' | 'service'

type District = {
  id: string
  name: string
  population: string
  indicators: Record<IndicatorKey, number>
}

type SimulationResponse = {
  budgetRemaining: number
  qualityOfLifeScore: number
  districts: District[]
  analysis: string
  event?: string
}

const initialDistricts: District[] = [
  { id: 'saryarka', name: 'Сарыарка', population: '340 тыс.', indicators: { transport: 34, green: 46, social: 61, safety: 58, service: 48 } },
  { id: 'almaty', name: 'Алматы', population: '410 тыс.', indicators: { transport: 52, green: 56, social: 38, safety: 62, service: 55 } },
  { id: 'yesil', name: 'Есиль', population: '290 тыс.', indicators: { transport: 49, green: 63, social: 57, safety: 51, service: 65 } },
  { id: 'baikonyr', name: 'Байқоңыр', population: '185 тыс.', indicators: { transport: 55, green: 31, social: 51, safety: 55, service: 45 } },
  { id: 'nura', name: 'Нұра', population: '220 тыс.', indicators: { transport: 46, green: 50, social: 47, safety: 34, service: 52 } },
  { id: 'saraishyk', name: 'Сарайшык', population: '180 тыс.', indicators: { transport: 43, green: 48, social: 42, safety: 54, service: 46 } },
]

const initiatives = campaignData.measures
const districtIds: Record<string, string> = { saryarka: 'Saryarka', almaty: 'Almaty', yesil: 'Esil', baikonyr: 'Baikonur', nura: 'Nura', saraishyk: 'Saraishyk' }
const directionLabels: Record<string, string> = { T: 'Транспорт', E: 'Экология', S: 'Социальная сфера', B: 'Безопасность', C: 'Сервисы' }

const indicatorLabels: Record<IndicatorKey, string> = {
  transport: 'Транспорт', green: 'Озеленение', social: 'Инфраструктура', safety: 'Безопасность', service: 'Сервисы',
}

const indicatorOrder: IndicatorKey[] = ['transport', 'green', 'social', 'safety', 'service']

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [districts, setDistricts] = useState(initialDistricts)
  const [selectedDistrictId, setSelectedDistrictId] = useState('saryarka')
  const [selections, setSelections] = useState<Selection[]>([])
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null)
  const directionHeading = useRef<HTMLHeadingElement>(null)
  const lastDirection = useRef<string | null>(null)
  const budget = campaignData.rules.budget - selections.reduce((sum, item) => sum + initiatives.find(measure => measure.id === item.id)!.cost, 0)
  const [score, setScore] = useState<number | null>(null)
  const [message, setMessage] = useState('Добавьте 5 инициатив в пределах 100 млрд. Не более двух одного направления.')
  const [isSending, setIsSending] = useState(false)

  const selectedDistrict = districts.find((district) => district.id === selectedDistrictId) ?? districts[0]
  const validationError = validateSelection(selections, campaignData, true)
  const average = useMemo(() => Math.round(indicatorOrder.reduce((sum, key) => sum + selectedDistrict.indicators[key], 0) / indicatorOrder.length), [selectedDistrict])

  const mapDistricts = useMemo(() => districts.map(district => ({ ...district, score: Math.round(indicatorOrder.reduce((sum, key) => sum + district.indicators[key], 0) / indicatorOrder.length) })), [districts])

  useEffect(() => {
    if (selectedDirection) {
      lastDirection.current = selectedDirection
      directionHeading.current?.focus()
    } else if (lastDirection.current) {
      document.getElementById(`direction-${lastDirection.current}`)?.focus()
    }
  }, [selectedDirection])

  async function submitDecision() {
    if (isSending) return
    const error = validateSelection(selections, campaignData, true)
    if (error) { setMessage(error); return }
    setIsSending(true)
    setMessage('Отправляем сценарий на backend для расчёта…')
    const payload = { sessionId: 'demo-team-01', decisions: selections }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/simulation/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Calculation service returned an error')
      const result = (await response.json()) as SimulationResponse
      setScore(result.qualityOfLifeScore)
      setDistricts(result.districts)
      setMessage(result.analysis || result.event || 'Расчёт получен от backend.')
    } catch {
      setMessage('Backend пока недоступен. Запустите сервис на http://localhost:8000 или задайте VITE_API_BASE_URL.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="war-room">
      <aside className="intel-panel" aria-label="Панель развития города">
        <div className="intel-brand"><span>ASTANA</span><strong>Штаб управления</strong><small>Синтетическая модель районов</small></div>
        <div className="city-score"><span>Astana Quality of Life</span><strong>{score ?? '—'}</strong><small>/100 · выбрано {selections.length} из {campaignData.rules.count}</small></div>
        <div className="district-profile"><p className="panel-label">Выбранный район</p><h1>{selectedDistrict.name}</h1><span>{selectedDistrict.population} жителей</span><div className="district-index"><b>{average}</b><small>Индекс развития</small></div></div>
        <div className="indicator-list">{indicatorOrder.map((key) => <div className="indicator-row" key={key}><div><span>{indicatorLabels[key]}</span><b>{selectedDistrict.indicators[key]}</b></div><div className="meter"><i style={{ width: `${selectedDistrict.indicators[key]}%` }} /></div></div>)}</div>
        <div className="intel-report"><span>Сводка аналитика</span><p role="status">{message}</p></div>
      </aside>

      <section className="command-map" aria-label="Карта Астаны">
        <div className="map-title"><p>Карта сценария</p><h2>Астана · режим управления</h2></div>
        <AstanaMap districts={mapDistricts} selectedDistrictId={selectedDistrictId} onSelect={setSelectedDistrictId} />
        <div className="treasury-overlay" aria-label="Бюджет команды"><span>Казна города</span><strong>₸ {budget} млрд</strong><small>Доступно для решений</small></div>
        <div className="map-key"><i className="key-good" /> стабильно <i className="key-warning" /> зона риска <i className="key-danger" /> критично</div>

        <section className="decision-dock" aria-label="Выбор инициативы">
          <div className="dock-head"><div><p className="panel-label">{selectedDirection ? 'Выберите инициативы' : 'Выберите категорию'}</p><h2 ref={directionHeading} tabIndex={-1}>{selectedDirection ? directionLabels[selectedDirection] : 'Направления развития'}</h2></div><span>{selections.length} / {campaignData.rules.count}</span></div>
          {selectedDirection ? <>
            <button className="category-back" type="button" onClick={() => setSelectedDirection(null)}><span aria-hidden="true">←</span> Все категории</button>
            <div className="initiative-list" aria-label={`Инициативы: ${directionLabels[selectedDirection]}`} key={selectedDirection}>
            {initiatives.filter((initiative) => initiative.direction === selectedDirection).map((initiative) => {
              const selected = selections.some(item => item.id === initiative.id)
              const candidate: Selection = initiative.type === 'R' ? { id: initiative.id, district: districtIds[selectedDistrictId] } : { id: initiative.id }
              const reason = selected ? null : validateSelection([...selections, candidate], campaignData)
              return <button className={`initiative ${selected ? 'selected' : ''}`} aria-pressed={selected} disabled={Boolean(reason) || isSending} key={initiative.id} onClick={() => {
                setSelections(current => {
                  const next = selected ? current.filter(item => item.id !== initiative.id) : [...current, candidate]
                  return validateSelection(next, campaignData) ? current : next
                })
                setScore(null)
                setDistricts(initialDistricts)
                setMessage('Сценарий изменён. Добавьте ровно 5 инициатив и отправьте на расчёт.')
              }} type="button"><span className="initiative-category">{initiative.id} · {directionLabels[initiative.direction]}</span><strong>{initiative.title}</strong><small>{selected ? 'Выбрано · нажмите, чтобы убрать' : initiative.type === 'C' ? 'Весь город' : selectedDistrict.name}</small><b>₸ {initiative.cost} млрд</b>{reason && <small className="constraint-reason">{reason}</small>}</button>

            })}
            </div>
          </> : <div className="category-list" aria-label="Категории инициатив">
            {Object.entries(directionLabels).map(([direction, label]) => {
              const measures = initiatives.filter((initiative) => initiative.direction === direction)
              const selectedCount = selections.filter((selection) => measures.some((measure) => measure.id === selection.id)).length
              return <button className={`category-button${selectedCount ? ' has-selections' : ''}`} id={`direction-${direction}`} key={direction} type="button" onClick={() => setSelectedDirection(direction)}>
                <span><strong>{label}</strong><small>{measures.length} инициативы · выбрано {selectedCount} из {campaignData.rules.perDirection}</small></span>
                <span className="category-chevron" aria-hidden="true">›</span>
              </button>
            })}
          </div>}
          <div className="decision-footer">
            <ul className="selected-campaigns">{selections.map(selection => <li key={selection.id}>
              <span>{initiatives.find(item => item.id === selection.id)?.title} → {selection.district ? initialDistricts.find(item => districtIds[item.id] === selection.district)?.name : 'Весь город'}</span>
              <button type="button" disabled={isSending} aria-label={`Убрать ${selection.id}`} onClick={() => { setSelections(current => current.filter(item => item.id !== selection.id)); setScore(null); setDistricts(initialDistricts); setMessage('Сценарий изменён. Добавьте инициативу и повторите расчёт.') }}>Убрать</button>
            </li>)}</ul>
            <p>{validationError ?? 'Сценарий готов. Остаток бюджета не даёт бонуса.'}</p>
            <button className="command-button" disabled={Boolean(validationError) || isSending} onClick={submitDecision} type="button">{isSending ? 'Считаем…' : 'Отправить сценарий на расчёт'}</button>
          </div>
        </section>
      </section>
    </main>
  )
}
