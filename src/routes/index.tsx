import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Activity, Building2, BusFront, Check, Globe2, HeartPulse, Landmark, MapPin, ShieldCheck, Trees, X } from 'lucide-react'
import { AstanaMap } from '../components/AstanaMap'
import { IndicatorStatistics, MetricValue } from '../components/IndicatorStatistics'
import campaignData from '../../data/campaigns.json'
import { validateSelection, validateSubmission } from '../lib/selection.mjs'
import { districtIds, districtScenarios, initialDistricts, presentDistricts } from '../lib/scenario-districts'
import { belongsToTab, initiativeTabs, nextInitiativeTab } from '../lib/initiative-tabs'
import type { InitiativeTabId } from '../lib/initiative-tabs'
import { getMeasure } from '../simulator/measures'
import { simulateCity } from '../server/simulateCity'

type Selection = { id: string; district?: string }
const initiatives = campaignData.measures
const directionLabels: Record<string, string> = Object.fromEntries(initiativeTabs.map(tab => [tab.id, tab.label]))
const directionIcons = { T: BusFront, E: Trees, S: HeartPulse, B: ShieldCheck, C: Building2, CITY: Globe2 }
const formatValue = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 3 })
const formatScore = (value: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const selectionTarget = (selection: Selection) => selection.district ? initialDistricts.find(district => districtIds[district.id] === selection.district)!.name : 'Весь город'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [districts, setDistricts] = useState(initialDistricts)
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null)
  const [applied, setApplied] = useState<Selection[]>([])
  const [draft, setDraft] = useState<Selection[]>([])
  const [selectedTab, setSelectedTab] = useState<InitiativeTabId>('T')
  const [score, setScore] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const dock = useRef<HTMLElement>(null)
  const [dockHeight, setDockHeight] = useState(0)
  const allSelections = [...applied, ...draft]
  const budget = campaignData.rules.budget - allSelections.reduce((sum, item) => sum + initiatives.find(measure => measure.id === item.id)!.cost, 0)
  const selectedDistrict = districts.find(district => district.id === selectedDistrictId) ?? null
  const baselineDistrict = initialDistricts.find(district => district.id === selectedDistrictId)
  const validationError = validateSubmission(applied, draft, campaignData)
  const complete = applied.length === campaignData.rules.count

  useEffect(() => {
    if (!dock.current) { setDockHeight(0); return }
    const element = dock.current
    const measure = () => setDockHeight(Math.ceil(element.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [selectedDistrictId])

  const selectDistrict = useCallback((id: string) => setSelectedDistrictId(id), [])

  function closeDistrict() {
    setSelectedDistrictId(null)
    document.getElementById('district-picker-' + selectedDistrictId)?.focus()
  }

  function resetRound() {
    setApplied([])
    setDraft([])
    setDistricts(initialDistricts)
    setScore(null)
    setMessage('Новый раунд. Бюджет — 100 единиц, нужно применить ровно 5 решений.')
  }

  async function submitDecision() {
    if (isSending) return
    const error = validateSubmission(applied, draft, campaignData)
    if (error) { setMessage(error); return }
    const cumulative = [...applied, ...draft]
    setIsSending(true)
    setMessage('Применяем выбранные меры…')
    try {
      // Recompute the cumulative set from the baseline; no double effects or spending.
      const response = await simulateCity({ data: { actions: cumulative.map(item => ({ measureId: item.id, ...(item.district ? { district: item.district } : {}) })) } })
      if (!response.ok) { setMessage(response.error); return }
      setApplied(cumulative)
      setDraft([])
      setDistricts(presentDistricts(response.result.districts))
      if (response.complete) {
        setScore(response.result.finalScore)
        setMessage('Раунд завершён. Score ' + formatScore(response.result.finalScore) + '; изменение к базе: ' + (response.result.scoreDelta >= 0 ? '+' : '') + formatScore(response.result.scoreDelta) + '. ' + (response.result.aiAnalysis ?? response.result.aiError ?? ''))
      } else {
        setMessage('Применено ' + cumulative.length + ' из 5 решений. Показатели обновлены. Итоговый Score будет рассчитан после пятого решения.')
      }
    } catch {
      setMessage('Не удалось получить расчёт. Выбор сохранён — повторите отправку. Проверьте локальный сервер приложения.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className={'city-workspace' + (selectedDistrict ? ' district-is-selected' : '')} style={{ '--dock-height': dockHeight + 'px' } as CSSProperties}>
      <section className="command-map" aria-label="Карта Астаны">
        <AstanaMap districts={districts} selectedDistrictId={selectedDistrictId} onSelect={selectDistrict} bottomInset={selectedDistrict ? dockHeight + 56 : 0} />
      </section>

      <header className="city-hud">
        <div className="city-brand hud-panel">
          <Landmark className="brand-icon" size={27} strokeWidth={1.5} aria-hidden="true" />
          <div><h1>Астана</h1><p>Аким на 5 часов</p></div>
          <span className="simulation-label">Симулятор города</span>
        </div>
        <div className="city-resources hud-panel" aria-label="Показатели сценария">
          <div className="resource budget-resource"><span>Бюджет с учётом выбора</span><strong>{budget}<small> ед.</small></strong></div>
          <div className="resource"><span>Применено{draft.length ? ' · ещё ' + draft.length + ' выбрано' : ''}</span><strong>{applied.length}<small> / 5</small></strong></div>
          <div className="resource"><span>Итоговый Score</span><strong>{score === null ? '—' : formatScore(score)}<small> / 100</small></strong></div>
        </div>
      </header>

      {selectedDistrict ? <>
        <aside className="district-panel hud-panel" aria-label="Показатели района">
          <div className="district-panel-head">
            <span className="eyebrow"><MapPin size={14} aria-hidden="true" /> Выбранный район</span>
            <button className="icon-button" type="button" onClick={closeDistrict} aria-label="Закрыть район"><X size={18} aria-hidden="true" /></button>
          </div>
          <h2>{selectedDistrict.name}</h2>
          <p className="district-population">{selectedDistrict.population}</p>
          <div className="district-index"><Activity size={19} aria-hidden="true" /><span>Индекс района D</span><MetricValue before={baselineDistrict!.score} after={selectedDistrict.score} /></div>
          <IndicatorStatistics before={baselineDistrict!.rawIndicators} after={selectedDistrict.rawIndicators} />
          <div className="district-scenario"><span>Стартовые условия</span><p>{districtScenarios[selectedDistrict.id]}</p>{selectedDistrict.id === 'almaty' && <p>Включает территорию Сарайшыка.</p>}</div>
          <p className="synthetic-note">Все показатели: 0–100, больше — лучше. Общий балл направления учитывает веса его двух показателей; экология = 45% E1 + 55% E2. Игровые данные, не городская статистика.</p>
        </aside>

        <section className="decision-dock hud-panel" ref={dock} aria-label="Выбор инициативы">
          <div className="initiative-tabs" role="tablist" aria-label="Категории инициатив">{initiativeTabs.map(tab => {
            const Icon = directionIcons[tab.id]
            const count = allSelections.filter(selection => belongsToTab(initiatives.find(item => item.id === selection.id)!, tab.id)).length
            return <button id={'initiative-tab-' + tab.id} className={'initiative-tab' + (tab.id === 'CITY' ? ' city-tab' : '')} key={tab.id} role="tab" type="button" aria-selected={selectedTab === tab.id} tabIndex={selectedTab === tab.id ? 0 : -1} aria-controls="initiative-panel" onClick={() => setSelectedTab(tab.id)} onKeyDown={event => {
              const next = nextInitiativeTab(tab.id, event.key)
              if (!next) return
              event.preventDefault()
              setSelectedTab(next)
              document.getElementById('initiative-tab-' + next)?.focus()
            }}><Icon size={20} strokeWidth={1.6} aria-hidden="true" /><span>{tab.label}</span>{count > 0 && <b className="category-count">{count}</b>}</button>
          })}</div>

          <div id="initiative-panel" className="initiative-panel" role="tabpanel" aria-labelledby={'initiative-tab-' + selectedTab}>
            <div className="dock-context"><span>{selectedTab === 'CITY' ? <><Globe2 size={14} aria-hidden="true" /> Все 5 районов</> : <><MapPin size={14} aria-hidden="true" /> {selectedDistrict.name}</>}</span><p>{selectedTab === 'CITY' ? 'Общегородские меры · лимит 2 считается по исходному направлению' : 'Выберите одну или несколько мер · не более 2 из одного направления'}</p></div>
            <div className="initiative-list">{initiatives.filter(initiative => belongsToTab(initiative, selectedTab)).map(initiative => {
              const appliedSelection = applied.find(item => item.id === initiative.id)
              const draftSelection = draft.find(item => item.id === initiative.id)
              const existing = appliedSelection ?? draftSelection
              const candidate: Selection = initiative.type === 'R' ? { id: initiative.id, district: districtIds[selectedDistrict.id] } : { id: initiative.id }
              const reason = existing ? null : validateSelection([...allSelections, candidate], campaignData)
              const measure = getMeasure(initiative.id)!
              return <button className={'initiative' + (existing ? ' selected' : '') + (appliedSelection ? ' applied' : '')} aria-pressed={Boolean(existing)} disabled={Boolean(reason) || Boolean(appliedSelection) || isSending} key={initiative.id} onClick={() => {
                setDraft(current => draftSelection ? current.filter(item => item.id !== initiative.id) : [...current, candidate])
                setMessage('')
              }} type="button">
                <span className="initiative-meta"><span>{initiative.id} · {initiative.type === 'C' ? directionLabels[initiative.direction] : existing ? selectionTarget(existing) : selectedDistrict.name}</span><b>{initiative.cost} ед.</b></span>
                <strong>{initiative.title}</strong>
                <span className="initiative-effects">Полный эффект: {Object.entries(measure.effects).map(([key, value]) => key + ' ' + (value > 0 ? '+' : '−') + Math.abs(value)).join(' · ')}</span>
                <span className="initiative-lag">Лаг {measure.lag} кв. · за 8 кв. реализуется {formatValue((8 - measure.lag) / 8 * 100)}%</span>
                <small className="initiative-state">{existing && <Check size={13} aria-hidden="true" />}{appliedSelection ? 'Применено' : draftSelection ? 'Выбрано · нажмите, чтобы убрать' : reason ?? 'Добавить к отправке'}</small>
              </button>
            })}</div>
          </div>

          <div className="decision-footer">
            <div className="scenario-summary">
              <div className="scenario-heading"><strong>{applied.length} / 5 применено</strong><span>{draft.length ? 'К отправке: ' + draft.length : complete ? 'Раунд завершён' : 'Можно отправлять по одной'}</span></div>
              {allSelections.length > 0 && <ul className="selected-campaigns">{allSelections.map(selection => {
                const committed = applied.some(item => item.id === selection.id)
                const title = initiatives.find(item => item.id === selection.id)!.title
                return <li key={selection.id} className={committed ? 'committed' : ''} title={title}>
                  {committed && <Check size={13} aria-label="Применено" />}<span>{selection.id} · {selectionTarget(selection)}</span>
                  {!committed && <button className="icon-button" type="button" disabled={isSending} aria-label={'Убрать ' + selection.id} onClick={() => { setDraft(current => current.filter(item => item.id !== selection.id)); setMessage('') }}><X size={14} aria-hidden="true" /></button>}
                </li>
              })}</ul>}
              <p className="scenario-hint">{complete ? 'Итоговый набор: ровно 5 решений. Остаток бюджета не даёт бонуса.' : 'Общий набор — ровно 5 решений. На карте и сбоку показаны только применённые изменения.'}</p>
            </div>
            <div className="decision-buttons">
              {applied.length > 0 && <button className="reset-button" type="button" disabled={isSending} onClick={resetRound}>Новый раунд</button>}
              <button className="command-button" disabled={Boolean(validationError) || isSending} onClick={submitDecision} type="button">{isSending ? 'Считаем…' : complete ? 'Все 5 применены' : draft.length ? 'Применить (' + draft.length + ')' : 'Выберите меру'}</button>
            </div>
          </div>
          <div className="calculation-status" role="status">{message}</div>
        </section>
      </> : <div className="selection-prompt hud-panel">
        <MapPin size={23} strokeWidth={1.6} aria-hidden="true" />
        <div><strong>С какого района начнём?</strong><p>Выберите район на карте, чтобы перейти к действиям</p></div>
      </div>}
    </main>
  )
}
