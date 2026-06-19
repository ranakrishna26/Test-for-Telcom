import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from 'react'
import { DOMAINS } from './data/domains'
import { getMockIncidents } from './data/incidents'
import { DomainRail } from './domain-panels/DomainRail'
import { getActiveIncidents } from './lib/health'
import { getPreviousWindow, getWindowForPreset } from './lib/timeRange'
import type { DomainId, TimeRangePreset } from './types'
import { TimeRangeSelector } from './components/TimeRangeSelector'
import { TrendCharts } from './components/TrendCharts'
import { DomainSankey } from './components/DomainSankey'
import { JiraIncidentPanel } from './components/JiraIncidentPanel'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import './App.css'

const CANVAS_WIDTH = 1280

const RegionHeatmapMap = lazy(() =>
  import('./components/RegionHeatmapMap').then((m) => ({
    default: m.RegionHeatmapMap,
  })),
)

export default function App() {
  const scaleRootRef = useRef<HTMLDivElement>(null)
  const scaleInnerRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const incidents = useMemo(() => getMockIncidents(), [])
  const [range, setRange] = useState<TimeRangePreset>('24h')
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null)
  const [focusedIncidentId, setFocusedIncidentId] = useState<string | null>(
    null,
  )
  const [hoverIncidentId, setHoverIncidentId] = useState<string | null>(null)
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

  useEffect(() => {
    const root = scaleRootRef.current
    const inner = scaleInnerRef.current
    const dashboard = dashboardRef.current
    if (!root || !inner || !dashboard) return

    const applyScale = () => {
      const contentW = CANVAS_WIDTH
      const contentH = Math.ceil(dashboard.getBoundingClientRect().height)
      if (contentH <= 0) return

      const availableW = root.clientWidth
      const availableH = root.clientHeight > 0 ? root.clientHeight : contentH

      const scale = Math.min(1, availableW / contentW, availableH / contentH)
      inner.style.width = `${contentW}px`
      inner.style.height = `${contentH}px`
      root.style.setProperty('--embed-scale', String(scale))
      globalThis.window.dispatchEvent(new Event('resize'))
    }

    applyScale()
    const observer = new ResizeObserver(applyScale)
    observer.observe(root)
    observer.observe(dashboard)
    return () => observer.disconnect()
  }, [incidents, range, selectedDomain])

  return (
    <>
      <div ref={scaleRootRef} className="dashboard-scale-root">
        <div ref={scaleInnerRef} className="dashboard-scale-inner">
          <div ref={dashboardRef} className="dashboard bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Operations
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Telecom health</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-2 px-3 py-1.5 text-sm font-normal">
              <span className="text-muted-foreground">Active incidents</span>
              <span className="font-semibold tabular-nums">{activeIncidentCount}</span>
            </Badge>
            <Separator orientation="vertical" className="hidden h-8 sm:block" />
            <TimeRangeSelector value={range} onChange={setRange} />
          </div>
        </div>
      </header>

      <div className="dashboard__body">
        <aside aria-label="Domain modules" className="dashboard__rail">
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

        <aside className="dashboard__map-col" aria-label="Regional map">
          <Suspense
            fallback={
              <Card className="flex h-full min-h-[360px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading map…</p>
              </Card>
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
          </div>
        </div>
      </div>

      <Sheet
        open={Boolean(jiraPanelIncidentId && jiraPanelIncident)}
        onOpenChange={(open) => {
          if (!open) closeJiraPanel()
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
          {jiraPanelIncident ? (
            <JiraIncidentPanel
              incident={jiraPanelIncident}
              range={range}
              onClose={closeJiraPanel}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
