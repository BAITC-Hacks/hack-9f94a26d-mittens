export const ANALYSIS_WORD_LIMIT = 50

export type AnalysisMessage = { status: 'loading' | 'ready' | 'unavailable'; text?: string }
export type AnalysisResult = { aiAnalysis: string | null; aiError: string | null }

// A token budget is not a word limit; enforce the visible limit deterministically.
export function limitAnalysisWords(text: string) {
  const words = text.trim().split(/\s+/u).filter(Boolean)
  return words.length <= ANALYSIS_WORD_LIMIT ? words.join(' ') : words.slice(0, ANALYSIS_WORD_LIMIT).join(' ').replace(/[.,;:!?…]+$/u, '') + '…'
}

export function analysisMessage(result: AnalysisResult): AnalysisMessage {
  return result.aiAnalysis
    ? { status: 'ready', text: limitAnalysisWords(result.aiAnalysis) }
    : { status: 'unavailable' }
}
