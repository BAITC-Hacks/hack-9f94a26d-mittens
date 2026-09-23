import { Hammer, RotateCcw } from 'lucide-react'
import { limitAnalysisWords } from '../lib/analysis-text'
import type { AnalysisMessage } from '../lib/analysis-text'

export function AIExplanation({ message, scope = 'ход', onRetry }: { message: AnalysisMessage | null; scope?: 'ход' | 'раунд'; onRetry?: () => void }) {
  if (!message) return null
  return <section className="ai-explanation" aria-label={'Объяснение GPT за ' + scope}>
    <div className="ai-explanation-heading"><h3>Почему изменилось</h3><span>GPT · {scope} · до 50 слов</span></div>
    <div role="status" aria-live="polite" aria-busy={message.status === 'loading'}>
      {message.status === 'loading' ? <div className="construction-loading">
        <div className="construction-status">
          <span className="construction-scene" aria-hidden="true"><span className="construction-building" /><span className="construction-building" /><span className="construction-building" /><Hammer className="construction-hammer" size={19} strokeWidth={1.7} /></span>
          <div><p>Идёт стройка по вашим решениям…</p><span className="construction-caption">Готовим короткое объяснение результата.</span></div>
        </div>
        <div className="construction-track" aria-hidden="true"><span /></div>
      </div> : <p className={message.status === 'ready' ? '' : 'ai-explanation-placeholder'}>{message.status === 'ready' ? limitAnalysisWords(message.text ?? '') : 'Объяснение GPT сейчас недоступно. Все изменения и итоговые показатели рассчитаны.'}</p>}
    </div>
    {onRetry && <button className="analysis-retry" type="button" onClick={onRetry} disabled={message.status === 'loading'} aria-label={'Обновить отчёт GPT за ' + scope}><RotateCcw size={13} aria-hidden="true" />{message.status === 'loading' ? 'Обновляем…' : 'Обновить отчёт'}</button>}
  </section>
}
