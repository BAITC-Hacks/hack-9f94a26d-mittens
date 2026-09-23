import { limitAnalysisWords } from '../lib/analysis-text'
import type { AnalysisMessage } from '../lib/analysis-text'

export function AIExplanation({ message, scope = 'ход' }: { message: AnalysisMessage | null; scope?: 'ход' | 'раунд' }) {
  if (!message) return null
  return <section className="ai-explanation" aria-label={'Объяснение GPT за ' + scope}>
    <div className="ai-explanation-heading"><h3>Почему изменилось</h3><span>GPT · {scope} · до 50 слов</span></div>
    <p role="status" aria-busy={message.status === 'loading'} className={message.status === 'ready' ? '' : 'ai-explanation-placeholder'}>
      {message.status === 'loading' ? 'Готовим короткое объяснение ваших решений…' : message.status === 'ready' ? limitAnalysisWords(message.text ?? '') : 'Объяснение GPT сейчас недоступно. Все изменения и итоговые показатели рассчитаны.'}
    </p>
  </section>
}
