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
import { TimeRangeSelector } from './components/TimeRangeSelector'
import { TrendCharts } from './components/TrendCharts'
import { DomainSankey } from './components/DomainSankey'
import { JiraIncidentPanel } from './components/JiraIncidentPanel'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import './App.css'

const RegionHeatmapMap = lazy(() =>
  import('./components/RegionHeatmapMap').then((m) => ({
    default: m.RegionHeatmapMap,
  })),
)

export default function App() {
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

  return (
    <div className="dashboard flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
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

      <div
        className={cn(
          'dashboard__body mx-auto grid w-full max-w-[1920px] flex-1 gap-4 p-4 lg:grid-cols-[minmax(280px,320px)_1fr_minmax(340px,420px)] lg:p-6',
          selectedDomain === null && 'dashboard__body--overview',
        )}
      >
        <aside aria-label="Domain modules" className="dashboard__rail min-h-0">
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

        <main className="dashboard__center flex min-h-0 min-w-0 flex-col gap-4" aria-label="Trends and correlation">
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

        <aside className="dashboard__map-col min-h-[360px]" aria-label="Regional map">
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
    </div>
  )
}
