import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Activity, Building2, BusFront, Check, ChevronDown, Globe2, HeartPulse, Landmark, Layers3, MapPin, ShieldCheck, Trees, X } from 'lucide-react'
import { AstanaMap } from '../components/AstanaMap'
import { IndicatorStatistics, MetricValue } from '../components/IndicatorStatistics'
import { InitiativeCard } from '../components/InitiativeCard'
import { ActionResult } from '../components/ActionResult'
import { RoundSummary } from '../components/RoundSummary'
import { formatScore } from '../lib/indicator-stats'
import campaignData from '../../data/campaigns.json'
import { validateSelection, validateSubmission } from '../lib/selection.mjs'
import { districtIds, districtScenarios, initialDistricts, presentDistricts } from '../lib/scenario-districts'
import type { District } from '../lib/scenario-districts'
import type { SimulationResult } from '../simulator/types'
import { belongsToTab, initiativeTabs, nextInitiativeTab } from '../lib/initiative-tabs'
import type { InitiativeTabId } from '../lib/initiative-tabs'
import { simulateCity, explainCityActions } from '../server/simulateCity'
import { analysisMessage } from '../lib/analysis-text'
import type { AnalysisMessage } from '../lib/analysis-text'

type Selection = { id: string; district?: string }
type CompletedStep = { before: District[]; after: District[]; decisions: Selection[]; synergies: SimulationResult['synergies'] }
const initiatives = campaignData.measures
const directionIcons = { T: BusFront, E: Trees, S: HeartPulse, B: ShieldCheck, C: Building2, CITY: Globe2 }
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
  const [analysis, setAnalysis] = useState<AnalysisMessage | null>(null)
  const [roundAnalysis, setRoundAnalysis] = useState<AnalysisMessage | null>(null)
  const analysisRequest = useRef(0)
  const [completedStep, setCompletedStep] = useState<CompletedStep | null>(null)
  const [roundResult, setRoundResult] = useState<SimulationResult | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
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
    setAnalysis(null)
    setRoundAnalysis(null)
    analysisRequest.current++
    setCompletedStep(null)
    setSummaryOpen(false)
    setRoundResult(null)
    setSelectedTab('T')
    setMessage('Новый раунд начат.')
    requestAnimationFrame(() => document.getElementById('initiative-tab-T')?.focus())
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
      const nextDistricts = presentDistricts(response.result.districts)
      setDistricts(nextDistricts)
      setCompletedStep({ before: districts, after: nextDistricts, decisions: draft, synergies: response.result.synergies })
      setAnalysis({ status: 'loading' })
      if (response.complete) {
        setRoundResult(response.result)
        // A single submission of all five first shows its step result and GPT text.
        setSummaryOpen(applied.length > 0)
        setScore(response.result.finalScore)
        setMessage('Раунд завершён · Score ' + formatScore(response.result.finalScore) + ' (' + (response.result.scoreDelta >= 0 ? '+' : '') + formatScore(response.result.scoreDelta) + ')')
        setRoundAnalysis({ status: 'loading' })
      } else {
        setMessage('Применено решений: ' + cumulative.length + ' / 5')
      }
      const requestId = ++analysisRequest.current
      void explainCityActions({ data: {
        actions: cumulative.map(({ id, ...target }) => ({ measureId: id, ...target })),
        previousActions: applied.map(({ id, ...target }) => ({ measureId: id, ...target })),
      } }).then(explanation => {
        if (requestId !== analysisRequest.current) return
        setAnalysis(analysisMessage(explanation.step))
        if (explanation.round) setRoundAnalysis(analysisMessage(explanation.round))
      }).catch(() => {
        if (requestId !== analysisRequest.current) return
        setAnalysis({ status: 'unavailable' })
        if (response.complete) setRoundAnalysis({ status: 'unavailable' })
      })
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
          <Landmark className="brand-icon" size={23} strokeWidth={1.5} aria-hidden="true" />
          <div><h1>Астана</h1><p>Аким на 5 часов</p></div>
        </div>
        <div className="city-resources hud-panel" aria-label="Показатели сценария">
          <div className="resource budget-resource"><span>Бюджет</span><strong>{budget}<small> ед.</small></strong></div>
          <div className="resource"><span>Решения</span><strong>{applied.length}<small> / 5</small></strong></div>
          {score !== null && <div className="resource-score"><span>Итоговый Score</span><strong>{formatScore(score)}</strong></div>}
        </div>
      </header>

      {selectedDistrict ? <>
        <aside className="district-panel hud-panel" aria-label="Показатели района">
          <div className="district-panel-head">
            <span className="eyebrow">Район</span>
            <button className="icon-button" type="button" onClick={closeDistrict} aria-label="Закрыть район"><X size={18} aria-hidden="true" /></button>
          </div>
          <h2>{selectedDistrict.name}</h2>
          <div className="district-index"><Activity size={17} aria-hidden="true" /><span>Индекс района</span><MetricValue before={baselineDistrict!.score} after={selectedDistrict.score} /></div>
          <IndicatorStatistics before={baselineDistrict!.rawIndicators} after={selectedDistrict.rawIndicators} />
          <details className="district-about">
            <summary>О районе и показателях<ChevronDown size={14} aria-hidden="true" /></summary>
            <div>
              <p>{selectedDistrict.population}. {districtScenarios[selectedDistrict.id]}</p>
              {selectedDistrict.id === 'almaty' && <p>Включает территорию Сарайшыка.</p>}
              <p>Больше — лучше. Общий балл направления учитывает веса его двух показателей: экология = 45% E1 + 55% E2. Индекс D учитывает все 10 показателей.</p>
              <p>Зелёный — прирост, красный — потеря к началу раунда. Каждый показатель ниже 40 даёт штраф −1 к Score.</p>
              <p>Игровые данные, не городская статистика.</p>
            </div>
          </details>
        </aside>

        <section className="decision-dock hud-panel" ref={dock} aria-label={completedStep ? 'Результат хода' : 'Выбор инициативы'}>
          {completedStep ? <ActionResult key={selectedDistrict.id} before={completedStep.before.find(district => district.id === selectedDistrict.id)!} after={completedStep.after.find(district => district.id === selectedDistrict.id)!} decisions={completedStep.decisions} synergies={completedStep.synergies} appliedCount={applied.length} analysis={analysis} onContinue={() => { setCompletedStep(null); setMessage(''); requestAnimationFrame(() => document.getElementById('initiative-tab-' + selectedTab)?.focus()) }} onNewRound={resetRound} onSummary={() => setSummaryOpen(true)} /> : <>
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
            <div className="dock-context"><span>{selectedTab === 'CITY' ? <><Globe2 size={13} aria-hidden="true" /> Весь город · 5 районов</> : <><MapPin size={13} aria-hidden="true" /> {selectedDistrict.name}</>}</span><span>{draft.length ? 'К отправке: ' + draft.length : 'Выберите инициативу'}</span></div>
            <div className="initiative-list">{initiatives.filter(initiative => belongsToTab(initiative, selectedTab)).map(initiative => {
              const appliedSelection = applied.find(item => item.id === initiative.id)
              const draftSelection = draft.find(item => item.id === initiative.id)
              const existing = appliedSelection ?? draftSelection
              const candidate: Selection = initiative.type === 'R' ? { id: initiative.id, district: districtIds[selectedDistrict.id] } : { id: initiative.id }
              const reason = existing ? null : validateSelection([...allSelections, candidate], campaignData)
              return <InitiativeCard key={initiative.id} id={initiative.id} title={initiative.title} cost={initiative.cost} selected={Boolean(existing)} applied={Boolean(appliedSelection)} pending={isSending} reason={reason} scopeLabel={existing ? selectionTarget(existing) : initiative.type === 'C' ? 'Весь город' : selectedDistrict.name} onToggle={() => {
                setDraft(current => draftSelection ? current.filter(item => item.id !== initiative.id) : [...current, candidate])
                setMessage('')
              }} />
            })}</div>
          </div>

          <div className="decision-footer">
            <details className="scenario-summary">
              <summary><Layers3 size={15} aria-hidden="true" /> План <b>{allSelections.length}/5</b><ChevronDown size={13} aria-hidden="true" /></summary>
              {allSelections.length > 0 && <ul className="selected-campaigns">{allSelections.map(selection => {
                const committed = applied.some(item => item.id === selection.id)
                const title = initiatives.find(item => item.id === selection.id)!.title
                return <li key={selection.id} className={committed ? 'committed' : ''} title={title}>
                  {committed && <Check size={13} aria-label="Применено" />}<span>{title}<small>{selection.id} · {selectionTarget(selection)}{committed ? ' · применено' : ''}</small></span>
                  {!committed && <button className="icon-button" type="button" disabled={isSending} aria-label={'Убрать ' + selection.id} onClick={() => { setDraft(current => current.filter(item => item.id !== selection.id)); setMessage('') }}><X size={14} aria-hidden="true" /></button>}
                </li>
              })}</ul>}
              {allSelections.length === 0 && <p className="empty-plan">Здесь появятся выбранные инициативы.</p>}
              {applied.length > 0 && <button className="reset-button" type="button" disabled={isSending} onClick={resetRound}>Начать заново</button>}
            </details>
            <div className="decision-buttons">
              <button className="command-button" disabled={Boolean(validationError) || isSending} onClick={submitDecision} type="button">{isSending ? 'Считаем…' : complete ? 'Все 5 применены' : draft.length ? 'Применить (' + draft.length + ')' : 'Выберите меру'}</button>
            </div>
          </div>
          <div className="calculation-status" role="status">{message}</div>
          </>}
        </section>
      </> : <div className="selection-prompt hud-panel">
        <MapPin size={23} strokeWidth={1.6} aria-hidden="true" />
        <div><strong>С какого района начнём?</strong><p>Выберите район на карте, чтобы перейти к действиям</p></div>
      </div>}
      {roundResult && <RoundSummary result={roundResult} open={summaryOpen} analysis={roundAnalysis} onClose={() => { setSummaryOpen(false); requestAnimationFrame(() => document.getElementById('round-summary-open')?.focus()) }} onNewRound={resetRound} />}
    </main>
  )
}
