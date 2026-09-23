import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Building2, BusFront, Check, ChevronLeft, ChevronRight, HeartPulse, Landmark, Layers3, MapPin, ShieldCheck, Trees, X } from 'lucide-react'
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

const directionIcons = { T: BusFront, E: Trees, S: HeartPulse, B: ShieldCheck, C: Building2 }

const indicatorLabels: Record<IndicatorKey, string> = {
  transport: 'Транспорт', green: 'Озеленение', social: 'Инфраструктура', safety: 'Безопасность', service: 'Сервисы',
}

const indicatorOrder: IndicatorKey[] = ['transport', 'green', 'social', 'safety', 'service']

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [districts, setDistricts] = useState(initialDistricts)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null)
  const [selections, setSelections] = useState<Selection[]>([])
  const [campaignDistricts, setCampaignDistricts] = useState<Record<string, string>>({})
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null)
  const directionHeading = useRef<HTMLHeadingElement>(null)
  const lastDirection = useRef<string | null>(null)
  const budget = campaignData.rules.budget - selections.reduce((sum, item) => sum + initiatives.find(measure => measure.id === item.id)!.cost, 0)
  const [score, setScore] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const selectedDistrict = districts.find((district) => district.id === selectedDistrictId) ?? null
  const validationError = validateSelection(selections, campaignData, true)
  const average = selectedDistrict ? Math.round(indicatorOrder.reduce((sum, key) => sum + selectedDistrict.indicators[key], 0) / indicatorOrder.length) : 0

  const mapDistricts = useMemo(() => districts.map(district => ({ ...district, score: Math.round(indicatorOrder.reduce((sum, key) => sum + district.indicators[key], 0) / indicatorOrder.length) })), [districts])

  useEffect(() => {
    if (selectedDirection) {
      lastDirection.current = selectedDirection
      directionHeading.current?.focus()
    } else if (lastDirection.current) {
      document.getElementById(`direction-${lastDirection.current}`)?.focus()
    }
  }, [selectedDirection])

  const selectDistrict = useCallback((id: string) => {
    lastDirection.current = null
    setSelectedDirection(null)
    setSelectedDistrictId(id)
  }, [])

  function closeDistrict() {
    lastDirection.current = null
    setSelectedDirection(null)
    setSelectedDistrictId(null)
    document.getElementById('district-picker-' + selectedDistrictId)?.focus()
  }

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
    <main className={'city-workspace' + (selectedDistrict ? ' district-is-selected' : '')}>
      <section className="command-map" aria-label="Карта Астаны">
        <AstanaMap districts={mapDistricts} selectedDistrictId={selectedDistrictId} onSelect={selectDistrict} />
      </section>

      <header className="city-hud">
        <div className="city-brand hud-panel">
          <Landmark className="brand-icon" size={27} strokeWidth={1.5} aria-hidden="true" />
          <div><h1>Астана</h1><p>Аким на 5 часов</p></div>
          <span className="simulation-label">Симулятор города</span>
        </div>
        <div className="city-resources hud-panel" aria-label="Показатели сценария">
          <div className="resource budget-resource"><span>Доступный бюджет</span><strong>{budget}<small> млрд ₸</small></strong></div>
          <div className="resource"><span>Инициативы</span><strong>{selections.length}<small> / {campaignData.rules.count}</small></strong></div>
          <div className="resource"><span>Качество жизни</span><strong>{score ?? '—'}<small> / 100</small></strong></div>
        </div>
      </header>

      {selectedDistrict ? <>
        <aside className="district-panel hud-panel" aria-label="Показатели района">
          <div className="district-panel-head">
            <span className="eyebrow"><MapPin size={14} aria-hidden="true" /> Выбранный район</span>
            <button className="icon-button" type="button" onClick={closeDistrict} aria-label="Закрыть район"><X size={18} aria-hidden="true" /></button>
          </div>
          <h2>{selectedDistrict.name}</h2>
          <p className="district-population">{selectedDistrict.population} жителей</p>
          <div className="district-index"><Activity size={20} aria-hidden="true" /><span>Индекс развития</span><strong>{average}<small> / 100</small></strong></div>
          <div className="indicator-list">{indicatorOrder.map((key) => <div className="indicator-row" key={key}>
            <div><span>{indicatorLabels[key]}</span><b>{selectedDistrict.indicators[key]}</b></div>
            <div className="meter" role="meter" aria-label={indicatorLabels[key]} aria-valuenow={selectedDistrict.indicators[key]} aria-valuemin={0} aria-valuemax={100}><i style={{ width: selectedDistrict.indicators[key] + '%' }} /></div>
          </div>)}</div>
          <p className="synthetic-note">Игровые показатели, не городская статистика</p>
        </aside>

        <section className="decision-dock hud-panel" aria-label="Выбор инициативы">
          <div className="dock-head">
            <div><p className="eyebrow">Развитие района · {selectedDistrict.name}</p><h2 ref={directionHeading} tabIndex={-1}>{selectedDirection ? directionLabels[selectedDirection] : 'Что изменим?'}</h2></div>
            <Layers3 size={22} strokeWidth={1.5} aria-hidden="true" />
          </div>
          {selectedDirection ? <>
            <button className="category-back" type="button" onClick={() => setSelectedDirection(null)}><ChevronLeft size={16} aria-hidden="true" /> Все категории</button>
            <div className="initiative-list" aria-label={'Инициативы: ' + directionLabels[selectedDirection]} key={selectedDirection}>
              {initiatives.filter((initiative) => initiative.direction === selectedDirection).map((initiative) => {
                const existing = selections.find(item => item.id === initiative.id)
                const selected = Boolean(existing)
                const campaignDistrict = existing?.district ?? campaignDistricts[initiative.id] ?? districtIds[selectedDistrict.id]
                const candidate: Selection = initiative.type === 'R' ? { id: initiative.id, district: campaignDistrict } : { id: initiative.id }
                const reason = selected ? null : validateSelection([...selections, candidate], campaignData)
                return <div className="campaign-card" key={initiative.id}>
                  {initiative.type === 'R' && <label className="campaign-district" htmlFor={'campaign-district-' + initiative.id}>
                    Район
                    <select id={'campaign-district-' + initiative.id} aria-label={'Район: ' + initiative.title} value={campaignDistrict} disabled={isSending} onChange={event => {
                      const district = event.target.value
                      if (existing) {
                        const next = selections.map(item => item.id === initiative.id ? { ...item, district } : item)
                        const error = validateSelection(next, campaignData)
                        if (error) { setMessage(error); return }
                        setSelections(next)
                        setScore(null)
                        setDistricts(initialDistricts)
                        setMessage('')
                      }
                      setCampaignDistricts(current => ({ ...current, [initiative.id]: district }))
                    }}>
                      {campaignData.rules.districts.map(district => {
                        const next = selections.filter(item => item.id !== initiative.id).concat({ id: initiative.id, district })
                        const conflict = existing ? validateSelection(next, campaignData) : null
                        return <option key={district} value={district} disabled={Boolean(conflict)}>{initialDistricts.find(item => districtIds[item.id] === district)?.name ?? district}{conflict ? ' — несовместимо' : ''}</option>
                      })}
                    </select>
                  </label>}
                  <button className={'initiative' + (selected ? ' selected' : '')} aria-pressed={selected} disabled={Boolean(reason) || isSending} key={initiative.id} onClick={() => {
                  setSelections(current => {
                    const next = selected ? current.filter(item => item.id !== initiative.id) : [...current, candidate]
                    return validateSelection(next, campaignData) ? current : next
                  })
                  setScore(null)
                  setDistricts(initialDistricts)
                  setMessage('')
                }} type="button">
                  <span className="initiative-meta"><span>{initiative.id} · {initiative.type === 'C' ? 'Весь город' : initialDistricts.find(item => districtIds[item.id] === campaignDistrict)?.name}</span><b>{initiative.cost} млрд ₸</b></span>
                  <strong>{initiative.title}</strong>
                  <small className="initiative-state">{selected ? <><Check size={14} aria-hidden="true" /> В сценарии · нажмите, чтобы убрать</> : 'Добавить в сценарий'}</small>
                  {reason && <small className="constraint-reason">{reason}</small>}
                </button>
                </div>
              })}
            </div>
          </> : <>
            <p className="dock-description">Сначала направление, затем инициатива</p>
            <div className="category-list" aria-label="Категории инициатив">
              {Object.entries(directionLabels).map(([direction, label]) => {
                const Icon = directionIcons[direction as keyof typeof directionIcons]
                const measures = initiatives.filter((initiative) => initiative.direction === direction)
                const selectedCount = selections.filter((selection) => measures.some((measure) => measure.id === selection.id)).length
                return <button className={'category-button' + (selectedCount ? ' has-selections' : '')} id={'direction-' + direction} key={direction} type="button" onClick={() => setSelectedDirection(direction)}>
                  <Icon className="category-icon" size={23} strokeWidth={1.6} aria-hidden="true" />
                  <span className="category-copy"><strong>{label}</strong><small>{measures.length} инициативы</small></span>
                  {selectedCount > 0 && <span className="category-count" aria-label={'Выбрано ' + selectedCount + ' из ' + campaignData.rules.perDirection}>{selectedCount}/{campaignData.rules.perDirection}</span>}
                  <ChevronRight size={17} className="category-chevron" aria-hidden="true" />
                </button>
              })}
            </div>
          </>}
          <div className="decision-footer">
            <div className="scenario-heading"><span>Ваш сценарий</span><strong>{selections.length} / {campaignData.rules.count}</strong></div>
            {selections.length > 0 && <ul className="selected-campaigns">{selections.map(selection => <li key={selection.id}>
              <span>{initiatives.find(item => item.id === selection.id)?.title}<small>{selection.district ? initialDistricts.find(item => districtIds[item.id] === selection.district)?.name : 'Весь город'}</small></span>
              <button className="icon-button" type="button" disabled={isSending} aria-label={'Убрать ' + selection.id} onClick={() => { setSelections(current => current.filter(item => item.id !== selection.id)); setScore(null); setDistricts(initialDistricts); setMessage('') }}><X size={15} aria-hidden="true" /></button>
            </li>)}</ul>}
            <p className="scenario-hint">{validationError ?? 'Готов к расчёту. Остаток бюджета не даёт бонуса.'}</p>
            <button className="command-button" disabled={Boolean(validationError) || isSending} onClick={submitDecision} type="button">{isSending ? 'Считаем…' : 'Рассчитать сценарий'}</button>
            <div className="calculation-status" role="status">{message}</div>
          </div>
        </section>
      </> : <div className="selection-prompt hud-panel">
        <MapPin size={23} strokeWidth={1.6} aria-hidden="true" />
        <div><strong>С какого района начнём?</strong><p>Выберите район на карте, чтобы перейти к действиям</p></div>
      </div>}
    </main>
  )
}
