import { useEffect, useRef } from 'react'
import { ArrowRight, RotateCcw, X } from 'lucide-react'
import { roundFeedback } from '../lib/round-feedback'
import { formatMetric, formatScore } from '../lib/indicator-stats'
import { ChangeMeter } from './IndicatorStatistics'
import type { SimulationResult } from '../simulator/types'
import { AIExplanation } from './AIExplanation'
import type { AnalysisMessage } from '../lib/analysis-text'

type RoundSummaryProps = {
  result: SimulationResult
  open: boolean
  onClose: () => void
  onNewRound: () => void
  analysis: AnalysisMessage | null
  onRetryAnalysis: () => void
}

export function RoundSummary({ result, open, onClose, onNewRound, analysis, onRetryAnalysis }: RoundSummaryProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const report = roundFeedback(result)
  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal()
      title.current?.focus()
    } else if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  return <dialog ref={dialog} className="round-summary" aria-labelledby="round-summary-title" aria-describedby="round-summary-description" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="round-summary-content">
      <header className="round-summary-header">
        <div><p>Астана · раунд завершён</p><h2 id="round-summary-title" tabIndex={-1} ref={title}>Итоги пяти решений</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть итоги раунда"><X size={20} aria-hidden="true" /></button>
      </header>
      <p className="round-summary-description" id="round-summary-description">Все изменения за раунд — от исходного состояния города до результата ваших решений.</p>

      <section className="round-score-card" aria-label="Итоговый Score города">
        <span>Score города</span><div><span>{formatScore(result.baselineScore)}</span><ArrowRight size={20} aria-hidden="true" /><strong>{formatScore(result.finalScore)}</strong><b className={'result-delta ' + report.score.tone}>{report.score.text}</b></div>
      </section>
      <div className="round-facts">
        <div><span>Улучшено показателей</span><b className="positive">{report.improved}<small> / 50</small></b></div>
        <div><span>Ухудшено</span><b className={report.worsened ? 'negative' : ''}>{report.worsened}<small> / 50</small></b></div>
        <div><span>Критичных значений</span><b>{result.criticalIndicatorsBefore} → {result.criticalIndicatorsAfter}</b></div>
        <div><span>Потрачено</span><b>{result.budget.spent}<small> / {result.budget.total} ед.</small></b></div>
      </div>

      <div className="round-comparison-grid">
        <section className="round-direction-summary" aria-label="Направления за весь раунд">
          <h3>Что изменилось в городе</h3><p>Средние значения с учётом населения</p>
          {report.directions.map(direction => <div className="round-direction-row" key={direction.id}>
            <div><span>{direction.label}</span><b className={'result-delta ' + direction.tone}>{direction.text}</b></div>
            <ChangeMeter label={direction.label + ' · итог раунда'} before={direction.before} after={direction.after} />
            <small>{formatMetric(direction.before)} → {formatMetric(direction.after)}</small>
          </div>)}
        </section>
      </div>

      <AIExplanation message={analysis} scope="раунд" onRetry={onRetryAnalysis} />
      <section className="round-congratulations"><h3>Поздравляем с завершением раунда!</h3><p>{report.conclusion}</p></section>
      <footer className="round-summary-footer"><button className="reset-button" type="button" onClick={onClose}>Вернуться к карте</button><button className="command-button" type="button" onClick={onNewRound}><RotateCcw size={15} aria-hidden="true" /> Новый раунд</button></footer>
    </div>
  </dialog>
}
