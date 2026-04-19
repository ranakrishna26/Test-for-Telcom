import type { DomainInfo } from '../types'
import { Sparkline } from './Sparkline'

type Props = {
  domain: DomainInfo
  health: number
  /** Positive = health improved vs previous window */
  deltaPercent: number
  sparklineValues: number[]
  selected: boolean
  tooltipIncidents: string[]
  onSelect: () => void
}

function TrendArrow({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="domain-card__trend domain-card__trend--flat">→</span>
  }
  if (delta > 0) {
    return <span className="domain-card__trend domain-card__trend--up">↑</span>
  }
  return <span className="domain-card__trend domain-card__trend--down">↓</span>
}

export function DomainCard({
  domain,
  health,
  deltaPercent,
  sparklineValues,
  selected,
  tooltipIncidents,
  onSelect,
}: Props) {
  const tooltip =
    tooltipIncidents.length > 0
      ? `Top drivers: ${tooltipIncidents.slice(0, 2).join(' · ')}`
      : `${domain.label}: no active incidents in this range`

  return (
    <button
      type="button"
      className={`domain-card${selected ? ' domain-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      title={tooltip}
    >
      <div className="domain-card__header">
        <span className="domain-card__name">{domain.label}</span>
        <span className="domain-card__score">{health}</span>
      </div>
      <div className="domain-card__meta">
        <TrendArrow delta={deltaPercent} />
        <span className="domain-card__delta">
          {deltaPercent === 0 ? '—' : `${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`}
        </span>
        <span className="domain-card__delta-label">vs prior</span>
      </div>
      <Sparkline values={sparklineValues} className="domain-card__spark" />
    </button>
  )
}
