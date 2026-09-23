import { ChevronDown } from 'lucide-react'
import { changeSegments, directionScore, formatMetric, metricChange } from '../lib/indicator-stats'
import { INDICATOR_DESCRIPTIONS, INDICATOR_GROUPS, INDICATOR_LABELS } from '../simulator/presentation'
import type { Indicators } from '../simulator/types'

export function MetricValue({ before, after }: { before: number; after: number }) {
  const change = metricChange(before, after)
  return <span className="metric-value"><b>{formatMetric(after)}</b>{change.delta !== 0 && <span className={'metric-delta ' + change.tone} title="Изменение к началу раунда">{change.text}</span>}</span>
}

export function ChangeMeter({ label, before, after }: { label: string; before: number; after: number }) {
  const segments = changeSegments(before, after)
  const change = metricChange(before, after)
  return <span className="change-meter" role="meter" aria-label={label} aria-valuenow={after} aria-valuemin={0} aria-valuemax={100} aria-valuetext={formatMetric(after) + ' из 100; в начале ' + formatMetric(before) + '; изменение ' + change.text}>
    <span className="meter-retained" style={{ width: segments.retained + '%' }} aria-hidden="true" />
    {segments.gain > 0 && <span className="meter-gain" style={{ width: segments.gain + '%' }} aria-hidden="true" />}
    {segments.loss > 0 && <span className="meter-loss" style={{ width: segments.loss + '%' }} aria-hidden="true" />}
  </span>
}

export function IndicatorStatistics({ before, after }: { before: Indicators; after: Indicators }) {
  return <>
    <p className="indicator-comparison-note">0–100 · изменения к началу раунда</p>
    <div className="indicator-list">{INDICATOR_GROUPS.map(group => {
      const baseline = directionScore(before, group.indicators)
      const current = directionScore(after, group.indicators)
      return <details className="indicator-group" key={group.id}>
        <summary>
          <span className="indicator-group-copy">
            <span className="indicator-group-title"><span>{group.label}</span><MetricValue before={baseline} after={current} /></span>
            <ChangeMeter label={group.label + ' · общий балл'} before={baseline} after={current} />
          </span>
          <ChevronDown size={19} className="indicator-chevron" aria-hidden="true" />
        </summary>
        <div className="indicator-details">{group.indicators.map(key => {
          const value = after[key]
          return <div className={'indicator-row' + (value < 40 ? ' critical' : '')} key={key}>
            <div className="indicator-title"><span className="indicator-code">{key}</span><span>{INDICATOR_LABELS[key]}</span><MetricValue before={before[key]} after={value} /></div>
            <ChangeMeter label={key + ' · ' + INDICATOR_LABELS[key]} before={before[key]} after={value} />
            {value < 40 && <small className="critical-label">Критично · ниже 40</small>}
          </div>
        })}
          <details className="indicator-help">
            <summary>Что означают показатели?<ChevronDown size={12} aria-hidden="true" /></summary>
            {group.indicators.map(key => <p key={key}><b>{key}</b> · {INDICATOR_DESCRIPTIONS[key]}</p>)}
          </details>
        </div>
      </details>
    })}</div>
  </>
}
