import type { Dispatch, SetStateAction } from 'react'
import type { DomainInfo, Incident, TimeWindow } from '../types'
import { Sparkline } from '../components/Sparkline'
import { rankIncidentsForDomain } from '../lib/health'
const severityClass: Record<Incident['severity'], string> = {
  critical: 'domain-panel__sev--critical',
  major: 'domain-panel__sev--major',
  minor: 'domain-panel__sev--minor',
}

type Props = {
  domain: DomainInfo
  health: number
  deltaPercent: number
  sparklineValues: number[]
  incidents: Incident[]
  window: TimeWindow
  selected: boolean
  /** When false (overview), hide the Top drivers block entirely. */
  showDrivers: boolean
  highlightIncidentId: string | null
  onSelect: () => void
  onFocusIncident: Dispatch<SetStateAction<string | null>>
  onHoverIncident: (id: string | null) => void
}

export function DomainDetailPanel({
  domain,
  health,
  deltaPercent,
  sparklineValues,
  incidents,
  window,
  selected,
  showDrivers,
  highlightIncidentId,
  onSelect,
  onFocusIncident,
  onHoverIncident,
}: Props) {
  const top = showDrivers
    ? rankIncidentsForDomain(incidents, domain.id, window).slice(0, 4)
    : []

  return (
    <article
      className={`domain-panel${selected ? ' domain-panel--selected' : ''}`}
    >
      <button
        type="button"
        className="domain-panel__select"
        onClick={onSelect}
        aria-pressed={selected}
      >
        <div className="domain-panel__head">
          <span className="domain-panel__name">{domain.label}</span>
          <span className="domain-panel__score">{health}</span>
        </div>
        <div className="domain-panel__meta">
          <span
            className={
              deltaPercent === 0
                ? 'domain-panel__delta domain-panel__delta--flat'
                : deltaPercent > 0
                  ? 'domain-panel__delta domain-panel__delta--up'
                  : 'domain-panel__delta domain-panel__delta--down'
            }
          >
            {deltaPercent === 0
              ? '—'
              : `${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`}{' '}
            <span className="domain-panel__delta-label">vs prior</span>
          </span>
        </div>
        <Sparkline values={sparklineValues} width={200} height={36} />
      </button>

      {showDrivers ? (
        <div className="domain-panel__drivers">
          <h3 className="domain-panel__drivers-title">Top drivers</h3>
          {top.length === 0 ? (
            <p className="domain-panel__drivers-empty">None in this window.</p>
          ) : (
            <ul
              className="domain-panel__driver-list"
              onMouseLeave={() => onHoverIncident(null)}
            >
              {top.map((inc) => {
                const isActive = highlightIncidentId === inc.id
                return (
                  <li key={inc.id}>
                    <button
                      type="button"
                      className={`domain-panel__driver${isActive ? ' domain-panel__driver--focused' : ''}`}
                      onClick={() =>
                        onFocusIncident((prev) =>
                          prev === inc.id ? null : inc.id,
                        )
                      }
                      onMouseEnter={() => onHoverIncident(inc.id)}
                    >
                      <span
                        className={`domain-panel__sev ${severityClass[inc.severity]}`}
                      >
                        {inc.severity}
                      </span>
                      <span className="domain-panel__driver-name">
                        {inc.name}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  )
}
