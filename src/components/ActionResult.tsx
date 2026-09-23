import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import campaignData from '../../data/campaigns.json'
import type { District } from '../lib/scenario-districts'
import { districtIds } from '../lib/scenario-districts'
import { actionFeedback, strongestDirection } from '../lib/action-feedback'
import { formatMetric } from '../lib/indicator-stats'
import type { SimulationResult } from '../simulator/types'
import { AIExplanation } from './AIExplanation'
import type { AnalysisMessage } from '../lib/analysis-text'

type ActionResultProps = {
  before: District
  after: District
  decisions: { id: string; district?: string }[]
  appliedCount: number
  analysis: AnalysisMessage | null
  synergies: SimulationResult['synergies']
  onContinue: () => void
  onNewRound: () => void
  onSummary: () => void
}

export function ActionResult({ before, after, decisions, appliedCount, analysis, synergies, onContinue, onNewRound, onSummary }: ActionResultProps) {
  const feedback = actionFeedback(before, after)
  const [selected, setSelected] = useState(() => strongestDirection(feedback))
  const current = feedback.find(item => item.id === selected)!
  const localActions = decisions.filter(action => !action.district || action.district === districtIds[after.id])
  const names = localActions.map(action => campaignData.measures.find(measure => measure.id === action.id)!.title)
  const complete = appliedCount === campaignData.rules.count
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const activatedSynergies = synergies.filter(synergy => synergy.district === districtIds[after.id]
    && synergy.measures.some(id => decisions.some(action => action.id === id))
    && current.changes.some(change => (synergy.effects[change.indicator] ?? 0) !== 0))

  return <div className="action-result">
    <div className="result-heading"><h2 ref={heading} tabIndex={-1}>Результат хода · {after.name}</h2><span>{appliedCount} / 5 решений</span></div>
    <div className="result-tabs" role="tablist" aria-label="Изменения по направлениям">{feedback.map((item, index) => <button type="button" key={item.id} id={'result-tab-' + item.id} role="tab" aria-selected={selected === item.id} tabIndex={selected === item.id ? 0 : -1} aria-controls="result-panel" onClick={() => setSelected(item.id)} onKeyDown={event => {
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? feedback.length - 1 : event.key === 'ArrowRight' ? (index + 1) % feedback.length : event.key === 'ArrowLeft' ? (index - 1 + feedback.length) % feedback.length : null
      if (target === null) return
      event.preventDefault()
      setSelected(feedback[target].id)
      document.getElementById('result-tab-' + feedback[target].id)?.focus()
    }}><span>{item.label}</span><b className={'result-delta ' + item.tone}>{item.text}</b></button>)}</div>

    <section className="result-explanation" id="result-panel" role="tabpanel" aria-labelledby={'result-tab-' + selected}>
      <div className="result-score"><strong>{current.label}</strong><span>{formatMetric(current.before)} <ArrowRight size={14} aria-hidden="true" /> {formatMetric(current.after)}</span></div>
      {current.changes.length ? <>
        <p className="result-cause">После применения: {names.join('; ')}.</p>
        <ul className="result-change-list">{current.changes.map(change => <li key={change.indicator}>
          <p>{change.explanation}</p><span>{change.indicator} · {formatMetric(change.before)} → {formatMetric(change.after)} <b className={'result-delta ' + change.tone}>{change.text}</b></span>
        </li>)}</ul>
        {activatedSynergies.map(synergy => <p className="result-synergy" key={synergy.measures.join('-')}>Совместный эффект: {synergy.measures.map(id => '«' + campaignData.measures.find(measure => measure.id === id)!.title + '»').join(' и ')} усилили результат в этом районе.</p>)}
      </> : <p className="result-no-change">{localActions.length ? 'В этом направлении показатели за ход не изменились. Посмотрите другие категории.' : 'Меры этого хода применены в других районах. Выберите их на карте, чтобы увидеть результат.'}</p>}
      <p className="result-note">Изменения за последний ход, с учётом ранее применённых мер.</p>
    </section>

    <AIExplanation message={analysis} />
    <div className="result-footer">
      <span>{complete ? 'Все 5 решений применены' : 'Можно перейти к следующему решению'}</span>
      <div className="result-buttons">
        <button className="reset-button" type="button" onClick={onNewRound}>Новый раунд</button>
        <button className="command-button" id={complete ? 'round-summary-open' : undefined} type="button" onClick={complete ? onSummary : onContinue}>{complete ? 'Итоги раунда' : 'Следующее действие'} <ArrowRight size={15} aria-hidden="true" /></button>
      </div>
    </div>
  </div>
}
