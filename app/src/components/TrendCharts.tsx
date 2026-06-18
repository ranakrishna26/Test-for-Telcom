import { useMemo } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DomainId, Incident, Severity, TimeRangePreset, TimeWindow } from '../types'
import {
  buildDomainTrendMarkers,
  buildOverviewTrendData,
  buildSingleDomainTrendData,
  domainsWithImpactFromIncident,
} from '../lib/health'
import {
  formatTrendAxisTime,
  formatTrendTooltipTime,
  trendPointCount,
} from '../lib/chartFormat'

type Props = {
  incidents: Incident[]
  domainId: DomainId | null
  /** Used when a single domain is selected */
  domainLabel: string
  window: TimeWindow
  range: TimeRangePreset
  /** Hover or committed focus — drives domain dimming, marker ghosting, Sankey/map sync. */
  highlightIncidentId: string | null
  onHoverIncident?: (id: string | null) => void
}

const GRID = { stroke: 'var(--chart-grid)', strokeDasharray: '3 3' as const }

/** Max hue separation so lines never read as merged (esp. RAN vs Core). */
const DOMAIN_LINE: Record<DomainId, { stroke: string; name: string }> = {
  ran: { stroke: '#38bdf8', name: 'RAN' },
  core: { stroke: '#fb923c', name: 'Core' },
  security: { stroke: '#e879f9', name: 'Security' },
  transport: { stroke: '#4ade80', name: 'Transport' },
}

function markerFill(sev: Severity): string {
  switch (sev) {
    case 'critical':
      return '#f87171'
    case 'major':
      return '#fbbf24'
    default:
      return '#94a3b8'
  }
}

function formatSeverityLabel(s: Severity): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function IncidentDotShape(props: {
  cx?: number
  cy?: number
  payload?: { severity: Severity; name: string; incidentId?: string }
  storyFocusIncidentId?: string | null
}) {
  const { cx, cy, payload, storyFocusIncidentId } = props
  if (cx === undefined || cy === undefined || !payload) return null
  const ghost =
    storyFocusIncidentId != null &&
    payload.incidentId != null &&
    payload.incidentId !== storyFocusIncidentId
  return (
    <g opacity={ghost ? 0.22 : 1}>
      <title>{payload.name}</title>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={markerFill(payload.severity)}
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
    </g>
  )
}

export function TrendCharts({
  incidents,
  domainId,
  domainLabel,
  window,
  range,
  highlightIncidentId,
  onHoverIncident,
}: Props) {
  const points = trendPointCount(range)

  const overviewData = useMemo(
    () => buildOverviewTrendData(incidents, window, points),
    [incidents, window, points],
  )

  const detailLine = useMemo(
    () =>
      domainId
        ? buildSingleDomainTrendData(incidents, domainId, window, points)
        : [],
    [incidents, domainId, window, points],
  )

  const detailMarkers = useMemo(
    () =>
      domainId && detailLine.length > 0
        ? buildDomainTrendMarkers(incidents, domainId, window, detailLine)
        : [],
    [incidents, domainId, window, detailLine],
  )

  const overviewMarkersRan = useMemo(
    () => buildDomainTrendMarkers(incidents, 'ran', window, overviewData),
    [incidents, window, overviewData],
  )
  const overviewMarkersCore = useMemo(
    () => buildDomainTrendMarkers(incidents, 'core', window, overviewData),
    [incidents, window, overviewData],
  )
  const overviewMarkersSecurity = useMemo(
    () => buildDomainTrendMarkers(incidents, 'security', window, overviewData),
    [incidents, window, overviewData],
  )
  const overviewMarkersTransport = useMemo(
    () => buildDomainTrendMarkers(incidents, 'transport', window, overviewData),
    [incidents, window, overviewData],
  )

  const tickFormatter = (v: number) => formatTrendAxisTime(v, range)

  const isOverview = domainId === null
  const storyFocus = highlightIncidentId !== null

  const affectedDomains = useMemo(() => {
    if (!highlightIncidentId) return null
    const inc = incidents.find((i) => i.id === highlightIncidentId)
    if (!inc) return null
    return domainsWithImpactFromIncident(inc, window)
  }, [highlightIncidentId, incidents, window])

  const detailLineStrokeOpacity =
    !isOverview &&
    storyFocus &&
    affectedDomains &&
    domainId &&
    !affectedDomains.has(domainId)
      ? 0.12
      : 1

  const sub = isOverview
    ? storyFocus
      ? 'Focused incident; others dimmed.'
      : `Health by domain · ${range}`
    : storyFocus
      ? 'Incident focus; chart dimmed elsewhere.'
      : `Health trend · ${range}`

  return (
    <section className="panel trend-charts" aria-label="Trend charts">
      <div className="panel__head">
        <h2 className="panel__title">Trends</h2>
        <p className="panel__sub">{sub}</p>
      </div>

      <div className="trend-charts__chart trend-charts__chart--single">
        <div className="trend-charts__chart-head">
          <h3 className="trend-charts__label">
            {isOverview ? 'Domain health' : `${domainLabel} health & incidents`}
          </h3>
          {isOverview ? (
            <div
              className="trend-charts__legend-custom"
              aria-label="Chart legend"
            >
              {(['ran', 'core', 'security', 'transport'] as const).map((id) => (
                <span key={id} className="trend-charts__legend-item">
                  <span
                    className="trend-charts__legend-swatch"
                    style={{ background: DOMAIN_LINE[id].stroke }}
                  />
                  {DOMAIN_LINE[id].name}
                </span>
              ))}
              <span className="trend-charts__legend-item trend-charts__legend-item--muted">
                <span className="trend-charts__legend-dot-swatch" aria-hidden>
                  ●
                </span>
                Incident start
              </span>
            </div>
          ) : null}
        </div>
        <div className="trend-charts__frame">
          {isOverview ? (
            <div className="trend-charts__plot">
              <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                  data={overviewData}
                  syncId="telcom-trends"
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  onMouseLeave={() => onHoverIncident?.(null)}
                >
                <CartesianGrid {...GRID} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={tickFormatter}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  minTickGap={24}
                />
                <YAxis
                  domain={[0, 100]}
                  width={36}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  content={
                    <OverviewTooltip range={range} />
                  }
                  cursor={{ stroke: '#38bdf8', strokeOpacity: 0.35 }}
                />
                {(['ran', 'core', 'security', 'transport'] as const).map(
                  (id) => {
                    const emphasis =
                      storyFocus && affectedDomains && affectedDomains.has(id)
                    const dimOthers = storyFocus && affectedDomains && !emphasis
                    return (
                      <Line
                        key={id}
                        type="linear"
                        dataKey={id}
                        name={DOMAIN_LINE[id].name}
                        stroke={DOMAIN_LINE[id].stroke}
                        strokeWidth={emphasis ? 3 : 2.25}
                        strokeOpacity={dimOthers ? 0.14 : 1}
                        dot={false}
                        isAnimationActive
                        animationDuration={380}
                      />
                    )
                  },
                )}
                <Scatter
                  data={overviewMarkersRan}
                  dataKey="health"
                  fill="#f87171"
                  isAnimationActive={false}
                  onMouseEnter={(d) => {
                    const id = (d as { payload?: { incidentId?: string } })
                      ?.payload?.incidentId
                    if (id) onHoverIncident?.(id)
                  }}
                  shape={(p) => (
                    <IncidentDotShape
                      {...p}
                      storyFocusIncidentId={
                        storyFocus ? highlightIncidentId : null
                      }
                    />
                  )}
                />
                <Scatter
                  data={overviewMarkersCore}
                  dataKey="health"
                  fill="#f87171"
                  isAnimationActive={false}
                  onMouseEnter={(d) => {
                    const id = (d as { payload?: { incidentId?: string } })
                      ?.payload?.incidentId
                    if (id) onHoverIncident?.(id)
                  }}
                  shape={(p) => (
                    <IncidentDotShape
                      {...p}
                      storyFocusIncidentId={
                        storyFocus ? highlightIncidentId : null
                      }
                    />
                  )}
                />
                <Scatter
                  data={overviewMarkersSecurity}
                  dataKey="health"
                  fill="#f87171"
                  isAnimationActive={false}
                  onMouseEnter={(d) => {
                    const id = (d as { payload?: { incidentId?: string } })
                      ?.payload?.incidentId
                    if (id) onHoverIncident?.(id)
                  }}
                  shape={(p) => (
                    <IncidentDotShape
                      {...p}
                      storyFocusIncidentId={
                        storyFocus ? highlightIncidentId : null
                      }
                    />
                  )}
                />
                <Scatter
                  data={overviewMarkersTransport}
                  dataKey="health"
                  fill="#f87171"
                  isAnimationActive={false}
                  onMouseEnter={(d) => {
                    const id = (d as { payload?: { incidentId?: string } })
                      ?.payload?.incidentId
                    if (id) onHoverIncident?.(id)
                  }}
                  shape={(p) => (
                    <IncidentDotShape
                      {...p}
                      storyFocusIncidentId={
                        storyFocus ? highlightIncidentId : null
                      }
                    />
                  )}
                />
              </ComposedChart>
                </ResponsiveContainer>
            </div>
          ) : (
            <div className="trend-charts__plot">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                data={detailLine}
                syncId="telcom-trends"
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                onMouseLeave={() => onHoverIncident?.(null)}
              >
                <CartesianGrid {...GRID} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={tickFormatter}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  minTickGap={24}
                />
                <YAxis
                  domain={[0, 100]}
                  width={36}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border)"
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  content={
                    <DetailTooltip range={range} domainLabel={domainLabel} />
                  }
                  cursor={{ stroke: 'var(--accent)', strokeOpacity: 0.35 }}
                />
                <Line
                  type="linear"
                  dataKey="health"
                  name="Health"
                  stroke={
                    domainId ? DOMAIN_LINE[domainId].stroke : 'var(--accent)'
                  }
                  strokeWidth={2.25}
                  strokeOpacity={detailLineStrokeOpacity}
                  dot={false}
                  isAnimationActive
                  animationDuration={380}
                />
                <Scatter
                  data={detailMarkers}
                  dataKey="health"
                  fill="#f87171"
                  isAnimationActive={false}
                  onMouseEnter={(d) => {
                    const id = (d as { payload?: { incidentId?: string } })
                      ?.payload?.incidentId
                    if (id) onHoverIncident?.(id)
                  }}
                  shape={(p) => (
                    <IncidentDotShape
                      {...p}
                      storyFocusIncidentId={
                        storyFocus ? highlightIncidentId : null
                      }
                    />
                  )}
                />
              </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

type OverviewTipProps = {
  active?: boolean
  payload?: Array<{
    dataKey?: string
    value?: number
    name?: string
    color?: string
    payload?: Record<string, unknown>
  }>
  label?: number
  range: TimeRangePreset
}

function OverviewTooltip({ active, payload, label, range }: OverviewTipProps) {
  if (!active || !payload?.length) return null

  const incidentEntry = payload.find(
    (p) =>
      p.payload &&
      typeof p.payload === 'object' &&
      p.payload !== null &&
      'incidentId' in p.payload,
  )
  if (incidentEntry?.payload && typeof incidentEntry.payload === 'object') {
    const pl = incidentEntry.payload as {
      t: number
      health: number
      name: string
      severity: Severity
      domainLabel?: string
      healthDrop?: number
    }
    const t = typeof label === 'number' ? label : pl.t
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip__time">
          {formatTrendTooltipTime(t, range)}
        </div>
        <div className="chart-tooltip__row">
          <span
            className="chart-tooltip__swatch"
            style={{ background: markerFill(pl.severity) }}
          />
          <span className="chart-tooltip__incident-title">{pl.name}</span>
        </div>
        <div className="chart-tooltip__incident-meta">
          {pl.domainLabel ? (
            <>
              <strong>{pl.domainLabel}</strong>
              {' · '}
            </>
          ) : null}
          {formatSeverityLabel(pl.severity)}
        </div>
        <div className="chart-tooltip__incident-detail">
          Line health at start: <strong>{Math.round(pl.health)}</strong>
          {typeof pl.healthDrop === 'number' ? (
            <>
              <br />
              Est. drop at start on this domain:{' '}
              <strong>−{pl.healthDrop.toFixed(1)}</strong> pts
            </>
          ) : null}
        </div>
      </div>
    )
  }

  const row = payload[0]?.payload as
    | { t?: number; ran?: number; core?: number; security?: number; transport?: number }
    | undefined
  const t = typeof label === 'number' ? label : row?.t
  if (t === undefined || !row) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__time">
        {formatTrendTooltipTime(t, range)}
      </div>
      {(['ran', 'core', 'security', 'transport'] as const).map((id) => {
        const v = row[id]
        if (v === undefined) return null
        const meta = DOMAIN_LINE[id]
        return (
          <div key={id} className="chart-tooltip__row">
            <span
              className="chart-tooltip__swatch"
              style={{ background: meta.stroke }}
            />
            <span>{meta.name}</span>
            <strong>{Math.round(v as number)}</strong>
          </div>
        )
      })}
    </div>
  )
}

type DetailTipProps = {
  active?: boolean
  payload?: Array<{
    dataKey?: string
    value?: number
    name?: string
    payload?: Record<string, unknown>
  }>
  label?: number
  range: TimeRangePreset
  domainLabel: string
}

function DetailTooltip({ active, payload, label, range, domainLabel }: DetailTipProps) {
  if (!active || !payload?.length) return null

  const incidentEntry = payload.find(
    (p) =>
      p.payload &&
      typeof p.payload === 'object' &&
      p.payload !== null &&
      'incidentId' in p.payload,
  )
  if (incidentEntry?.payload && typeof incidentEntry.payload === 'object') {
    const pl = incidentEntry.payload as {
      t: number
      health: number
      name: string
      severity: Severity
      domainLabel?: string
      healthDrop?: number
    }
    const t = typeof label === 'number' ? label : pl.t
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip__time">
          {formatTrendTooltipTime(t, range)}
        </div>
        <div className="chart-tooltip__row">
          <span
            className="chart-tooltip__swatch"
            style={{ background: markerFill(pl.severity) }}
          />
          <span className="chart-tooltip__incident-title">{pl.name}</span>
        </div>
        <div className="chart-tooltip__incident-meta">
          {pl.domainLabel ? (
            <>
              <strong>{pl.domainLabel}</strong>
              {' · '}
            </>
          ) : null}
          {formatSeverityLabel(pl.severity)}
        </div>
        <div className="chart-tooltip__incident-detail">
          Line health at start: <strong>{Math.round(pl.health)}</strong>
          {typeof pl.healthDrop === 'number' ? (
            <>
              <br />
              Est. drop at start on this domain:{' '}
              <strong>−{pl.healthDrop.toFixed(1)}</strong> pts
            </>
          ) : null}
        </div>
      </div>
    )
  }

  const linePoint =
    payload.find((p) => p.dataKey === 'health' && !('incidentId' in (p.payload ?? {}))) ??
    payload.find((p) => p.dataKey === 'health') ??
    payload[0]
  const row = linePoint?.payload as { t?: number; health?: number } | undefined
  const t = typeof label === 'number' ? label : row?.t
  const health = row?.health
  if (t === undefined || health === undefined) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__time">
        {formatTrendTooltipTime(t, range)}
      </div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__swatch chart-tooltip__swatch--health" />
        <span>{domainLabel} health</span>
        <strong>{Math.round(health)}</strong>
      </div>
    </div>
  )
}
