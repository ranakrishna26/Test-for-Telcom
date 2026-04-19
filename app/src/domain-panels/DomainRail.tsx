import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { DOMAINS } from '../data/domains'
import {
  computeDomainHealth,
  healthDeltaPercent,
  rankIncidentsGlobal,
  sampleHealthSeries,
} from '../lib/health'
import type { DomainId, Incident, TimeWindow } from '../types'
import { DomainDetailPanel } from './DomainDetailPanel'

const SPARK = 32

const severityClass: Record<Incident['severity'], string> = {
  critical: 'domain-panel__sev--critical',
  major: 'domain-panel__sev--major',
  minor: 'domain-panel__sev--minor',
}

type Props = {
  incidents: Incident[]
  window: TimeWindow
  previousWindow: TimeWindow
  selectedDomain: DomainId | null
  /** Hover or click — used to highlight the active row and drive chart/Sankey preview. */
  highlightIncidentId: string | null
  onSelectDomain: (id: DomainId) => void
  onFocusIncident: Dispatch<SetStateAction<string | null>>
  onHoverIncident: (id: string | null) => void
  /** Top incidents list: opens Jira panel + focus; same incident again closes. */
  onTopIncidentClick: (incidentId: string) => void
}

export function DomainRail({
  incidents,
  window,
  previousWindow,
  selectedDomain,
  highlightIncidentId,
  onSelectDomain,
  onFocusIncident,
  onHoverIncident,
  onTopIncidentClick,
}: Props) {
  const globalTop = useMemo(
    () => rankIncidentsGlobal(incidents, window).slice(0, 8),
    [incidents, window],
  )

  const overview = selectedDomain === null

  return (
    <div className="domain-rail" aria-label="Domain modules">
      {overview ? (
        <section
          className="domain-rail__global"
          aria-label="Top incidents across all domains"
        >
          <h3 className="domain-rail__global-title">Top incidents</h3>
          <p className="domain-rail__global-sub">
            Highest impact this window.
          </p>
          {globalTop.length === 0 ? (
            <p className="domain-rail__global-empty">None active.</p>
          ) : (
            <ul
              className="domain-rail__global-list"
              onMouseLeave={() => onHoverIncident(null)}
            >
              {globalTop.map((inc) => {
                const isActive = highlightIncidentId === inc.id
                return (
                  <li key={inc.id}>
                    <button
                      type="button"
                      className={`domain-rail__global-item${isActive ? ' domain-rail__global-item--focused' : ''}`}
                      onClick={() => onTopIncidentClick(inc.id)}
                      onMouseEnter={() => onHoverIncident(inc.id)}
                    >
                      <span
                        className={`domain-panel__sev ${severityClass[inc.severity]}`}
                      >
                        {inc.severity}
                      </span>
                      <span className="domain-rail__global-name">{inc.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}
      {DOMAINS.map((domain) => {
        const nowHealth = computeDomainHealth(incidents, domain.id, {
          start: window.end,
          end: window.end,
        })
        const prevEndHealth = computeDomainHealth(incidents, domain.id, {
          start: previousWindow.end,
          end: previousWindow.end,
        })
        const delta = healthDeltaPercent(nowHealth, prevEndHealth)
        const spark = sampleHealthSeries(incidents, domain.id, window, SPARK)

        return (
          <DomainDetailPanel
            key={domain.id}
            domain={domain}
            health={nowHealth}
            deltaPercent={delta}
            sparklineValues={spark}
            incidents={incidents}
            window={window}
            selected={selectedDomain === domain.id}
            showDrivers={!overview}
            highlightIncidentId={highlightIncidentId}
            onSelect={() => onSelectDomain(domain.id)}
            onFocusIncident={onFocusIncident}
            onHoverIncident={onHoverIncident}
          />
        )
      })}
    </div>
  )
}
