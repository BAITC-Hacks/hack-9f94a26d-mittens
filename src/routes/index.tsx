import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AstanaMap } from '../components/AstanaMap'

type IndicatorKey = 'transport' | 'green' | 'social' | 'safety' | 'service'
type District = { id: string; name: string; population: string; mapCenter: [number, number]; position: { left: string; top: string }; indicators: Record<IndicatorKey, number> }
type Initiative = { id: string; category: IndicatorKey; title: string; cost: number; description: string }
type SimulationResponse = { budgetRemaining: number; qualityOfLifeScore: number; districts: District[]; analysis: string; event?: string }

const initialDistricts: District[] = [
  { id: 'saryarka', name: 'Сарыарка', population: '340 тыс.', mapCenter: [71.385, 51.154], position: { left: '26%', top: '52%' }, indicators: { transport: 34, green: 46, social: 61, safety: 58, service: 48 } },
  { id: 'almaty', name: 'Алматы', population: '410 тыс.', mapCenter: [71.443, 51.194], position: { left: '52%', top: '28%' }, indicators: { transport: 52, green: 56, social: 38, safety: 62, service: 55 } },
  { id: 'yesil', name: 'Есиль', population: '290 тыс.', mapCenter: [71.477, 51.147], position: { left: '76%', top: '47%' }, indicators: { transport: 49, green: 63, social: 57, safety: 51, service: 65 } },
  { id: 'baikonyr', name: 'Байқоңыр', population: '185 тыс.', mapCenter: [71.394, 51.183], position: { left: '37%', top: '33%' }, indicators: { transport: 55, green: 31, social: 51, safety: 55, service: 45 } },
  { id: 'nura', name: 'Нұра', population: '220 тыс.', mapCenter: [71.451, 51.107], position: { left: '57%', top: '76%' }, indicators: { transport: 46, green: 50, social: 47, safety: 34, service: 52 } },
]

const initiatives: Initiative[] = [
  { id: 'brt', category: 'transport', title: 'BRT-коридор', cost: 18, description: 'Выделенная полоса и умные остановки' },
  { id: 'park', category: 'green', title: 'Городской парк', cost: 12, description: 'Озеленение и общественное пространство' },
  { id: 'school', category: 'social', title: 'Школа на 1 200 мест', cost: 22, description: 'Снижение нагрузки на инфраструктуру' },
  { id: 'lights', category: 'safety', title: 'Умное освещение', cost: 10, description: 'Свет, камеры и безопасные маршруты' },
  { id: 'service', category: 'service', title: 'Единый сервис района', cost: 8, description: 'Заявки жителей и городские услуги' },
]

const indicatorLabels: Record<IndicatorKey, string> = { transport: 'Транспорт', green: 'Озеленение', social: 'Инфраструктура', safety: 'Безопасность', service: 'Сервисы' }
const indicatorOrder: IndicatorKey[] = ['transport', 'green', 'social', 'safety', 'service']

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [districts, setDistricts] = useState(initialDistricts)
  const [selectedDistrictId, setSelectedDistrictId] = useState('saryarka')
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | null>(null)
  const [budget, setBudget] = useState(100)
  const [score, setScore] = useState(54)
  const [message, setMessage] = useState('Районы отмечены синтетическими игровыми зонами. Выберите направление развития.')
  const [isSending, setIsSending] = useState(false)

  const selectedDistrict = districts.find((district) => district.id === selectedDistrictId) ?? districts[0]
  const selectedInitiative = initiatives.find((initiative) => initiative.id === selectedInitiativeId)
  const districtScore = (district: District) => Math.round(indicatorOrder.reduce((sum, key) => sum + district.indicators[key], 0) / indicatorOrder.length)
  const average = useMemo(() => districtScore(selectedDistrict), [selectedDistrict])
  const mapDistricts = districts.map((district) => ({ ...district, score: districtScore(district) }))

  async function submitDecision() {
    if (!selectedInitiative || isSending) return
    if (selectedInitiative.cost > budget) { setMessage('Недостаточно бюджета для этой инициативы.'); return }
    setIsSending(true); setMessage('Отправляем сценарий на backend для расчёта…')
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/simulation/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'demo-team-01', budgetRemaining: budget, selectedDistrictId, decision: selectedInitiative, districts }),
      })
      if (!response.ok) throw new Error('Calculation service returned an error')
      const result = (await response.json()) as SimulationResponse
      setBudget(result.budgetRemaining); setScore(result.qualityOfLifeScore); setDistricts(result.districts)
      setMessage(result.analysis || result.event || 'Расчёт получен от backend.'); setSelectedInitiativeId(null)
    } catch { setMessage('Backend пока недоступен. Запустите сервис на http://localhost:8000 или задайте VITE_API_BASE_URL.') } finally { setIsSending(false) }
  }

  return (
    <main className="war-room">
      <aside className="intel-panel" aria-label="Панель развития города">
        <div className="intel-brand"><span>ASTANA</span><strong>Штаб управления</strong><small>Синтетическая модель районов</small></div>
        <div className="city-score"><span>Astana Quality of Life</span><strong>{score}</strong><small>/100 · ход 1 из 5</small></div>
        <div className="district-profile"><p className="panel-label">Выбранный район</p><h1>{selectedDistrict.name}</h1><span>{selectedDistrict.population} жителей</span><div className="district-index"><b>{average}</b><small>Индекс развития</small></div></div>
        <div className="indicator-list">{indicatorOrder.map((key) => <div className="indicator-row" key={key}><div><span>{indicatorLabels[key]}</span><b>{selectedDistrict.indicators[key]}</b></div><div className="meter"><i style={{ width: `${selectedDistrict.indicators[key]}%` }} /></div></div>)}</div>
        <div className="intel-report"><span>Сводка аналитика</span><p>{message}</p></div>
      </aside>

      <section className="command-map" aria-label="Карта Астаны">
        <div className="map-title"><p>Карта сценария</p><h2>Астана · режим управления</h2></div>
        <AstanaMap districts={mapDistricts} selectedDistrictId={selectedDistrictId} onSelect={setSelectedDistrictId} />
        <div className="treasury-overlay" aria-label="Бюджет команды"><span>Казна города</span><strong>₸ {budget} млрд</strong><small>Доступно для решений</small></div>
        <div className="map-key"><i className="key-good" /> стабильно <i className="key-warning" /> зона риска <i className="key-danger" /> критично</div>

        <section className="decision-dock" aria-label="Выбор инициативы">
          <div className="dock-head"><div><p className="panel-label">Приказ на ход</p><h2>Инициативы развития</h2></div><span>01 / 05</span></div>
          <div className="initiative-list">{initiatives.map((initiative) => <button className={`initiative ${initiative.id === selectedInitiativeId ? 'selected' : ''}`} disabled={initiative.cost > budget || isSending} key={initiative.id} onClick={() => setSelectedInitiativeId(initiative.id)} type="button"><span>{indicatorLabels[initiative.category]}</span><strong>{initiative.title}</strong><small>{initiative.description}</small><b>₸ {initiative.cost} млрд</b></button>)}</div>
          <div className="decision-footer"><p>{selectedInitiative ? `${selectedInitiative.title} → ${selectedDistrict.name}` : 'Выберите инициативу'}</p><button className="command-button" disabled={!selectedInitiative || isSending} onClick={submitDecision} type="button">{isSending ? 'Расчёт…' : 'Передать в штаб'}</button></div>
        </section>
      </section>
    </main>
  )
}
