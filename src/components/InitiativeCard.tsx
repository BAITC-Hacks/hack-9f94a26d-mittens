type InitiativeCardProps = {
  id: string
  title: string
  cost: number
  scopeLabel: string
  selected: boolean
  applied: boolean
  reason: string | null
  pending: boolean
  onToggle: () => void
}

export function InitiativeCard({ id, title, cost, scopeLabel, selected, applied, reason, pending, onToggle }: InitiativeCardProps) {
  const blocked = Boolean(reason) || applied || pending
  return <article className={'initiative' + (selected ? ' selected' : '') + (applied ? ' applied' : '') + (reason ? ' unavailable' : '')}>
    <button className="initiative-select" aria-pressed={selected} aria-label={id + ' · ' + title + ' · ' + cost + ' ед. · ' + scopeLabel} aria-describedby={reason ? 'constraint-' + id : undefined} disabled={blocked} type="button" onClick={onToggle}>
      <span className="initiative-copy"><strong>{title}</strong><span className="initiative-scope">{scopeLabel}</span></span>
      <span className="initiative-price"><b>{cost}<small> ед.</small></b>{selected && <span className="initiative-state">{applied ? 'Применено' : 'Выбрано'}</span>}</span>
    </button>
    {reason && <p className="constraint-reason" id={'constraint-' + id}>{reason}</p>}
  </article>
}
