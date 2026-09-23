import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

type IndicatorKey = 'transport' | 'green' | 'social' | 'safety' | 'service'

type District = {
  id: string
  name: string
  population: string
  position: { left: string; top: string }
  indicators: Record<IndicatorKey, number>
}

type Initiative = {
  id: string
  category: IndicatorKey
  title: string
  cost: number
  description: string
}

type SimulationResponse = {
  budgetRemaining: number
  qualityOfLifeScore: number
  districts: District[]
  analysis: string
  event?: string
}

const initialDistricts: District[] = [
  { id: 'saryarka', name: 'Сарыарка', population: '340 тыс.', position: { left: '23%', top: '49%' }, indicators: { transport: 34, green: 46, social: 61, safety: 58, service: 48 } },
  { id: 'almaty', name: 'Алматы', population: '410 тыс.', position: { left: '46%', top: '32%' }, indicators: { transport: 52, green: 56, social: 38, safety: 62, service: 55 } },
  { id: 'yesil', name: 'Есиль', population: '290 тыс.', position: { left: '68%', top: '50%' }, indicators: { transport: 49, green: 63, social: 57, safety: 51, service: 65 } },
  { id: 'baikonyr', name: 'Байқоңыр', population: '185 тыс.', position: { left: '40%', top: '70%' }, indicators: { transport: 55, green: 31, social: 51, safety: 55, service: 45 } },
  { id: 'nura', name: 'Нұра', population: '220 тыс.', position: { left: '73%', top: '76%' }, indicators: { transport: 46, green: 50, social: 47, safety: 34, service: 52 } },
]

const initiatives: Initiative[] = [
  { id: 'brt', category: 'transport', title: 'BRT-коридор', cost: 18, description: 'Выделенная полоса и умные остановки' },
  { id: 'park', category: 'green', title: 'Городской парк', cost: 12, description: 'Озеленение и общественное пространство' },
  { id: 'school', category: 'social', title: 'Школа на 1 200 мест', cost: 22, description: 'Снижение нагрузки на инфраструктуру' },
  { id: 'lights', category: 'safety', title: 'Умное освещение', cost: 10, description: 'Свет, камеры и безопасные маршруты' },
  { id: 'service', category: 'service', title: 'Единый сервис района', cost: 8, description: 'Заявки жителей и городские услуги' },
]

const indicatorLabels: Record<IndicatorKey, string> = {
  transport: 'Транспорт', green: 'Озеленение', social: 'Инфраструктура', safety: 'Безопасность', service: 'Сервисы',
}

const indicatorOrder: IndicatorKey[] = ['transport', 'green', 'social', 'safety', 'service']

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [districts, setDistricts] = useState(initialDistricts)
  const [selectedDistrictId, setSelectedDistrictId] = useState('saryarka')
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | null>(null)
  const [budget, setBudget] = useState(100)
  const [score, setScore] = useState(54)
  const [message, setMessage] = useState('Выберите район, затем инициативу. Расчёт выполнит backend.')
  const [isSending, setIsSending] = useState(false)

  const selectedDistrict = districts.find((district) => district.id === selectedDistrictId) ?? districts[0]
  const selectedInitiative = initiatives.find((initiative) => initiative.id === selectedInitiativeId)
  const average = useMemo(() => Math.round(indicatorOrder.reduce((sum, key) => sum + selectedDistrict.indicators[key], 0) / indicatorOrder.length), [selectedDistrict])

  async function submitDecision() {
    if (!selectedInitiative || isSending) return
    if (selectedInitiative.cost > budget) {
      setMessage('Недостаточно бюджета для этой инициативы.')
      return
    }

    setIsSending(true)
    setMessage('Отправляем сценарий на backend для расчёта…')
    const payload = { sessionId: 'demo-team-01', budgetRemaining: budget, selectedDistrictId, decision: selectedInitiative, districts }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/simulation/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Calculation service returned an error')
      const result = (await response.json()) as SimulationResponse
      setBudget(result.budgetRemaining)
      setScore(result.qualityOfLifeScore)
      setDistricts(result.districts)
      setMessage(result.analysis || result.event || 'Расчёт получен от backend.')
      setSelectedInitiativeId(null)
    } catch {
      setMessage('Backend пока недоступен. Запустите сервис на http://localhost:8000 или задайте VITE_API_BASE_URL.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">Городская стратегия · synthetic demo</p><h1>Аким на 5 часов</h1></div>
        <div className="budget-card" aria-label="Остаток бюджета"><span>Остаток бюджета</span><strong>₸ {budget} млрд</strong><small>Astana QoL: {score}/100</small></div>
      </header>

      <section className="game-grid">
        <aside className="city-rail" aria-label="Состояние выбранного района">
          <p className="section-kicker">Район</p><h2>{selectedDistrict.name}</h2><p className="population">Население: {selectedDistrict.population}</p>
          <div className="health-score"><span>Индекс района</span><strong>{average}</strong><small>из 100</small></div>
          <div className="indicator-list">
            {indicatorOrder.map((key) => <div className="indicator-row" key={key}><div><span>{indicatorLabels[key]}</span><b>{selectedDistrict.indicators[key]}</b></div><div className="meter"><i style={{ width: `${selectedDistrict.indicators[key]}%` }} /></div></div>)}
          </div>
          <div className="backend-note"><span>AI / backend ответ</span><p>{message}</p></div>
        </aside>

        <section className="map-stage" aria-label="Условная карта районов Астаны">
          <div className="map-copy"><span>Карта решений</span><p>Нажмите на район, чтобы изменить его сценарий</p></div>
          <div className="river" />
          <div className="district-field">
            {districts.map((district) => {
              const isSelected = district.id === selectedDistrictId
              const districtScore = Math.round(indicatorOrder.reduce((sum, key) => sum + district.indicators[key], 0) / indicatorOrder.length)
              return <button className={`district-node ${isSelected ? 'selected' : ''}`} key={district.id} onClick={() => setSelectedDistrictId(district.id)} style={district.position} type="button"><strong>{district.name}</strong><span>{districtScore}</span></button>
            })}
          </div>
          <div className="map-legend"><i className="good" /> развивается <i className="warning" /> требует внимания</div>
        </section>

        <section className="action-panel" aria-label="Городские инициативы">
          <div className="action-heading"><div><p className="section-kicker">Ход игрока</p><h2>Выберите инициативу</h2></div><span className="turn-badge">1 / 5</span></div>
          <div className="initiative-list">
            {initiatives.map((initiative) => {
              const selected = initiative.id === selectedInitiativeId
              return <button className={`initiative ${selected ? 'selected' : ''}`} disabled={initiative.cost > budget || isSending} key={initiative.id} onClick={() => setSelectedInitiativeId(initiative.id)} type="button"><span className="initiative-category">{indicatorLabels[initiative.category]}</span><strong>{initiative.title}</strong><small>{initiative.description}</small><b>₸ {initiative.cost} млрд</b></button>
            })}
          </div>
          <div className="decision-summary"><p>{selectedInitiative ? `${selectedInitiative.title} → ${selectedDistrict.name}` : 'Инициатива не выбрана'}</p><button className="primary-button" disabled={!selectedInitiative || isSending} onClick={submitDecision} type="button">{isSending ? 'Считаем…' : 'Отправить на расчёт'}</button></div>
        </section>
      </section>
    </main>
  )
}
