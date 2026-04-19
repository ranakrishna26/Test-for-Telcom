import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SetStateAction,
} from 'react'
import { DOMAINS } from './data/domains'
import { getMockIncidents } from './data/incidents'
import { DomainRail } from './domain-panels/DomainRail'
import { getActiveIncidents } from './lib/health'
import { getPreviousWindow, getWindowForPreset } from './lib/timeRange'
import type { DomainId, TimeRangePreset } from './types'
const RegionHeatmapMap = lazy(() =>
  import('./components/RegionHeatmapMap').then((m) => ({
    default: m.RegionHeatmapMap,
  })),
)
import { TimeRangeSelector } from './components/TimeRangeSelector'
import { TrendCharts } from './components/TrendCharts'
import { DomainSankey } from './components/DomainSankey'
import { JiraIncidentPanel } from './components/JiraIncidentPanel'
import './App.css'

export default function App() {
  const incidents = useMemo(() => getMockIncidents(), [])
  const [range, setRange] = useState<TimeRangePreset>('24h')
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null)
  const [focusedIncidentId, setFocusedIncidentId] = useState<string | null>(
    null,
  )
  /** Hover preview on incident lists (top incidents / drivers); overrides click focus while active. */
  const [hoverIncidentId, setHoverIncidentId] = useState<string | null>(null)
  /** Jira side panel (Top incidents list or Sankey incident node). */
  const [jiraPanelIncidentId, setJiraPanelIncidentId] = useState<string | null>(
    null,
  )

  const timeWindow = useMemo(() => getWindowForPreset(range), [range])
  const previousWindow = useMemo(() => getPreviousWindow(timeWindow), [timeWindow])
  const activeIncidentCount = useMemo(
    () => getActiveIncidents(incidents, timeWindow).length,
    [incidents, timeWindow],
  )

  const selectedMeta = selectedDomain
    ? DOMAINS.find((d) => d.id === selectedDomain)
    : undefined

  const selectDomain = (id: DomainId) => {
    setSelectedDomain((prev) => (prev === id ? null : id))
    setFocusedIncidentId(null)
    setHoverIncidentId(null)
  }

  const focusLink = (domainId: DomainId, incidentId: string) => {
    setSelectedDomain(domainId)
    setFocusedIncidentId(incidentId)
    setHoverIncidentId(null)
  }

  /** Sets focused incident and clears hover preview so “story” mode (dimming) applies. */
  const commitIncidentFocus = useCallback(
    (next: SetStateAction<string | null>) => {
      setFocusedIncidentId(next)
      setHoverIncidentId(null)
    },
    [],
  )

  const highlightIncidentId = hoverIncidentId ?? focusedIncidentId

  const jiraPanelIncident = jiraPanelIncidentId
    ? incidents.find((i) => i.id === jiraPanelIncidentId)
    : undefined

  /** Open Jira panel + focus; click same incident again closes panel and clears focus. */
  const activateJiraForIncident = useCallback(
    (incidentId: string) => {
      if (jiraPanelIncidentId === incidentId) {
        setJiraPanelIncidentId(null)
        setFocusedIncidentId(null)
        setHoverIncidentId(null)
        return
      }
      setJiraPanelIncidentId(incidentId)
      setFocusedIncidentId(incidentId)
      setHoverIncidentId(null)
    },
    [jiraPanelIncidentId],
  )

  const closeJiraPanel = useCallback(() => {
    setJiraPanelIncidentId(null)
    setFocusedIncidentId(null)
    setHoverIncidentId(null)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (jiraPanelIncidentId) {
          closeJiraPanel()
          return
        }
        setFocusedIncidentId(null)
        setHoverIncidentId(null)
      }
    }
    globalThis.window.addEventListener('keydown', onKey)
    return () => globalThis.window.removeEventListener('keydown', onKey)
  }, [jiraPanelIncidentId, closeJiraPanel])

  return (
    <div className="dashboard">
      <header
        className="dashboard__header"
        aria-label="Telecom health — domain and incident overview"
      >
        <div className="dashboard__header-inner">
          <div className="dashboard__title-row">
            <span className="dashboard__kicker">Operations</span>
            <h1 className="dashboard__title">Telecom health</h1>
          </div>
          <div className="dashboard__toolbar" aria-label="Dashboard controls">
            <div
              className="dashboard__stat"
              role="status"
              title="Incidents active in the selected time window"
            >
              <span className="dashboard__stat-label">Active incidents</span>
              <span className="dashboard__stat-value">{activeIncidentCount}</span>
            </div>
            <div className="dashboard__toolbar-divider" aria-hidden />
            <TimeRangeSelector value={range} onChange={setRange} />
          </div>
        </div>
      </header>

      <div className="dashboard__body">
        <aside
          className="dashboard__rail"
          aria-label="Domain modules"
        >
          <DomainRail
            incidents={incidents}
            window={timeWindow}
            previousWindow={previousWindow}
            selectedDomain={selectedDomain}
            highlightIncidentId={highlightIncidentId}
            onSelectDomain={selectDomain}
            onFocusIncident={commitIncidentFocus}
            onHoverIncident={setHoverIncidentId}
            onTopIncidentClick={activateJiraForIncident}
          />
        </aside>

        <main className="dashboard__center" aria-label="Trends and correlation">
          <TrendCharts
            incidents={incidents}
            domainId={selectedDomain}
            domainLabel={selectedMeta?.label ?? 'All domains'}
            window={timeWindow}
            range={range}
            highlightIncidentId={highlightIncidentId}
            onHoverIncident={setHoverIncidentId}
          />
          <DomainSankey
            incidents={incidents}
            window={timeWindow}
            selectedDomain={selectedDomain}
            highlightIncidentId={highlightIncidentId}
            onSelectDomain={selectDomain}
            onFocusLink={focusLink}
            onHoverIncident={setHoverIncidentId}
            onIncidentNodeJiraOpen={activateJiraForIncident}
          />
        </main>

        <aside
          className="dashboard__map-col"
          aria-label="Regional map"
        >
          <Suspense
            fallback={
              <div className="panel region-map region-map--loading">
                <p className="region-map__loading">Loading map…</p>
              </div>
            }
          >
            <RegionHeatmapMap
              incidents={incidents}
              window={timeWindow}
              selectedDomain={selectedDomain}
              flyToIncidentId={focusedIncidentId}
              highlightIncidentId={highlightIncidentId}
              onFocusIncident={commitIncidentFocus}
              onHoverIncident={setHoverIncidentId}
            />
          </Suspense>
        </aside>
      </div>

      {jiraPanelIncidentId && jiraPanelIncident ? (
        <>
          <div
            className="jira-backdrop"
            role="presentation"
            aria-hidden
            onClick={closeJiraPanel}
          />
          <aside
            className="jira-panel"
            aria-label="Jira integration"
            aria-modal="true"
            role="dialog"
          >
            <JiraIncidentPanel
              incident={jiraPanelIncident}
              range={range}
              onClose={closeJiraPanel}
            />
          </aside>
        </>
      ) : null}
    </div>
  )
}
