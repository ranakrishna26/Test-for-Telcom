import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { DOMAIN_IDS, DOMAINS } from '../data/domains'
import {
  buildSankeyAdjacency,
  buildSankeyGraph,
  domainTooltipRows,
  getTopImpactIncidentId,
  parseSankeyNodeId,
  sankeyDomainNodeId,
  sankeyIncidentNodeId,
  type DomainSankeyTooltipRow,
  type SankeyAdjacency,
  type SankeyLinkMeta,
} from '../lib/sankeyData'
import type { DomainId, Incident, Severity, TimeWindow } from '../types'

type SankeyTip =
  | { kind: 'link'; meta: SankeyLinkMeta; x: number; y: number }
  | {
      kind: 'incident'
      incident: Incident
      totalImpact: number
      x: number
      y: number
    }
  | {
      kind: 'domain'
      label: string
      rows: DomainSankeyTooltipRow[]
      x: number
      y: number
    }

function formatSeverity(s: Severity): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const SANKEY_HEIGHT = 400

const SANKEY_MIN_FLOW_INNER_WIDTH = 280

const SANKEY_MIN_CHART_WIDTH = 12 + 12 + SANKEY_MIN_FLOW_INNER_WIDTH

function severityHex(sev: Severity): string {
  switch (sev) {
    case 'critical':
      return '#f87171'
    case 'major':
      return '#fbbf24'
    default:
      return '#94a3b8'
  }
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      setWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

type Hover =
  | { kind: 'domain'; domainId: DomainId }
  | { kind: 'incident'; incidentId: string }
  | { kind: 'link'; linkIndex: number }
  | null

function linkOpacity(
  hover: Hover,
  meta: SankeyLinkMeta,
  linkIndex: number,
  topIncidentId: string | null,
  selectedDomain: DomainId | null,
  highlightIncidentId: string | null,
): number {
  if (!hover) {
    if (highlightIncidentId) {
      if (meta.incidentId === highlightIncidentId) return 0.98
      return 0.06
    }
    if (selectedDomain) {
      if (meta.domainId !== selectedDomain) return 0.06
      return topIncidentId && meta.incidentId === topIncidentId ? 0.98 : 0.58
    }
    if (topIncidentId && meta.incidentId === topIncidentId) return 0.98
    return 0.62
  }
  if (hover.kind === 'domain' && meta.domainId === hover.domainId) return 0.96
  if (hover.kind === 'incident' && meta.incidentId === hover.incidentId)
    return 0.96
  if (hover.kind === 'link' && hover.linkIndex === linkIndex) return 1
  return 0.05
}

function nodeOpacityEchartsFixed(
  hover: Hover,
  parsed:
    | { kind: 'domain'; id: DomainId }
    | { kind: 'incident'; id: string },
  linkMeta: SankeyLinkMeta[],
  selectedDomain: DomainId | null,
  adj: SankeyAdjacency,
  highlightIncidentId: string | null,
): number {
  if (parsed.kind === 'domain') {
    const did = parsed.id
    if (!hover) {
      if (highlightIncidentId) {
        return adj.fromIncident.get(highlightIncidentId)?.has(did) ? 1 : 0.14
      }
      if (selectedDomain) return did === selectedDomain ? 1 : 0.4
      return 1
    }
    if (hover.kind === 'domain') return did === hover.domainId ? 1 : 0.32
    if (hover.kind === 'incident') {
      return adj.fromIncident.get(hover.incidentId)?.has(did) ? 1 : 0.12
    }
    if (hover.kind === 'link') {
      const meta = linkMeta[hover.linkIndex]
      if (!meta) return 1
      return meta.domainId === did ? 1 : 0.12
    }
    return 1
  }

  const incId = parsed.id
  if (!hover) {
    if (highlightIncidentId) {
      return incId === highlightIncidentId ? 1 : 0.12
    }
    if (selectedDomain) {
      return adj.fromDomain.get(selectedDomain)?.has(incId) ? 1 : 0.32
    }
    return 1
  }
  if (hover.kind === 'domain') {
    return adj.fromDomain.get(hover.domainId)?.has(incId) ? 1 : 0.08
  }
  if (hover.kind === 'incident') {
    return incId === hover.incidentId ? 1 : 0.08
  }
  if (hover.kind === 'link') {
    const meta = linkMeta[hover.linkIndex]
    if (!meta) return 1
    return meta.incidentId === incId ? 1 : 0.08
  }
  return 1
}

type Props = {
  incidents: Incident[]
  window: TimeWindow
  selectedDomain: DomainId | null
  highlightIncidentId: string | null
  onSelectDomain: (id: DomainId) => void
  onFocusLink: (domainId: DomainId, incidentId: string) => void
  /** Syncs rail/trends/map when hovering nodes or links (same incident as click focus). */
  onHoverIncident: (id: string | null) => void
  /** Incident node click: open Jira side panel + dashboard focus (tooltip hover unchanged). */
  onIncidentNodeJiraOpen: (incidentId: string) => void
}

export function DomainSankey({
  incidents,
  window,
  selectedDomain,
  highlightIncidentId,
  onSelectDomain,
  onFocusLink,
  onHoverIncident,
  onIncidentNodeJiraOpen,
}: Props) {
  const graph = useMemo(
    () => buildSankeyGraph(incidents, window),
    [incidents, window],
  )
  const adjacency = useMemo(
    () => buildSankeyAdjacency(graph.linkMeta),
    [graph.linkMeta],
  )
  const topImpactIncidentId = useMemo(
    () => getTopImpactIncidentId(graph.linkMeta),
    [graph.linkMeta],
  )

  const [hover, setHover] = useState<Hover>(null)
  const [sankeyTip, setSankeyTip] = useState<SankeyTip | null>(null)
  const [detailIncidentId, setDetailIncidentId] = useState<string | null>(null)
  const { ref: wrapRef, width: wrapWidth } = useContainerWidth()
  const chartWidth = Math.max(wrapWidth, SANKEY_MIN_CHART_WIDTH)

  const graphRef = useRef(graph)
  graphRef.current = graph

  const option = useMemo((): EChartsOption => {
    const g = graph
    if (g.data.links.length === 0) return {}

    const nodeData: Record<string, unknown>[] = []

    for (const id of DOMAIN_IDS) {
      const nm = sankeyDomainNodeId(id)
      const label = DOMAINS.find((x) => x.id === id)?.label ?? id
      const op = nodeOpacityEchartsFixed(
        hover,
        { kind: 'domain', id },
        g.linkMeta,
        selectedDomain,
        adjacency,
        highlightIncidentId,
      )
      let borderColor = 'transparent'
      let borderWidth = 0
      if (selectedDomain === id) {
        borderColor = '#38bdf8'
        borderWidth = 2
      }
      nodeData.push({
        name: nm,
        depth: 0,
        itemStyle: {
          color: '#27272a',
          opacity: Math.max(0.06, op),
          borderColor,
          borderWidth,
        },
        label: {
          show: true,
          color: '#f4f4f5',
          fontSize: 11,
          fontWeight: 700,
          formatter: label,
        },
        emphasis: { label: { show: true } },
      })
    }

    for (const incId of g.incidentIdsInOrder) {
      const nm = sankeyIncidentNodeId(incId)
      const op = nodeOpacityEchartsFixed(
        hover,
        { kind: 'incident', id: incId },
        g.linkMeta,
        selectedDomain,
        adjacency,
        highlightIncidentId,
      )
      let borderColor = 'transparent'
      let borderWidth = 0
      if (highlightIncidentId === incId) {
        borderColor = '#fb7185'
        borderWidth = 2
      } else if (topImpactIncidentId === incId) {
        borderColor = '#f4f4f5'
        borderWidth = 2
      }
      nodeData.push({
        name: nm,
        depth: 1,
        itemStyle: {
          color: '#27272a',
          opacity: Math.max(0.06, op),
          borderColor,
          borderWidth,
        },
        // Incident names live in the hover tip; right-side SVG labels clip and duplicate.
        label: { show: false },
        emphasis: { label: { show: false } },
      })
    }

    const links = g.linkMeta.map((meta, i) => {
      const baseOp = linkOpacity(
        hover,
        meta,
        i,
        topImpactIncidentId,
        selectedDomain,
        highlightIncidentId,
      )
      const fillOp = Math.min(1, baseOp * 0.8)
      const layoutValue = g.data.links[i]!.value
      return {
        source: sankeyDomainNodeId(meta.domainId),
        target: sankeyIncidentNodeId(meta.incidentId),
        value: layoutValue,
        lineStyle: {
          color: severityHex(meta.severity),
          opacity: fillOp,
          curveness: 0.5,
        },
      }
    })

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 280,
      tooltip: { show: false },
      series: [
        {
          type: 'sankey',
          left: 8,
          right: 8,
          top: 8,
          bottom: 8,
          width: Math.max(chartWidth - 16, 200),
          height: SANKEY_HEIGHT - 16,
          orient: 'horizontal',
          nodeWidth: 16,
          nodeGap: 14,
          nodeAlign: 'left',
          layoutIterations: 48,
          emphasis: { focus: 'none' },
          data: nodeData,
          links,
          lineStyle: {
            curveness: 0.5,
          },
          label: {
            show: false,
          },
          itemStyle: {
            borderRadius: 4,
          },
        },
      ],
    }
  }, [
    graph,
    incidents,
    hover,
    selectedDomain,
    highlightIncidentId,
    topImpactIncidentId,
    adjacency,
    chartWidth,
  ])

  const onEvents = useMemo(
    () => ({
      mouseover: (params: {
        componentType?: string
        seriesType?: string
        dataType?: string
        name?: string
        dataIndex?: number
        event?: { event?: MouseEvent }
      }) => {
        if (params.seriesType !== 'sankey') return
        const ev = params.event?.event
        const cx = ev?.clientX ?? 0
        const cy = ev?.clientY ?? 0
        const g = graphRef.current

        if (params.dataType === 'edge' && params.dataIndex !== undefined) {
          const idx = params.dataIndex
          const meta = g.linkMeta[idx]
          if (meta) {
            setSankeyTip({ kind: 'link', meta, x: cx, y: cy })
            setHover({ kind: 'link', linkIndex: idx })
            onHoverIncident(meta.incidentId)
          }
          return
        }

        if (params.dataType === 'node' && params.name) {
          const parsed = parseSankeyNodeId(params.name)
          if (!parsed) return
          if (parsed.kind === 'domain') {
            const rows = domainTooltipRows(parsed.id, g.linkMeta, incidents)
            setSankeyTip({
              kind: 'domain',
              label: DOMAINS.find((d) => d.id === parsed.id)?.label ?? parsed.id,
              rows,
              x: cx,
              y: cy,
            })
            setHover({ kind: 'domain', domainId: parsed.id })
            onHoverIncident(null)
          } else {
            const inc = incidents.find((i) => i.id === parsed.id)
            if (inc) {
              const totalImpact = g.linkMeta
                .filter((m) => m.incidentId === parsed.id)
                .reduce((s, m) => s + m.value, 0)
              setSankeyTip({
                kind: 'incident',
                incident: inc,
                totalImpact,
                x: cx,
                y: cy,
              })
              setHover({ kind: 'incident', incidentId: parsed.id })
              onHoverIncident(parsed.id)
            }
          }
        }
      },
      globalout: () => {
        setHover(null)
        setSankeyTip(null)
        onHoverIncident(null)
      },
      click: (params: {
        seriesType?: string
        dataType?: string
        name?: string
        dataIndex?: number
      }) => {
        if (params.seriesType !== 'sankey') return
        const g = graphRef.current

        if (params.dataType === 'edge' && params.dataIndex !== undefined) {
          const meta = g.linkMeta[params.dataIndex]
          if (meta) {
            onFocusLink(meta.domainId, meta.incidentId)
            setDetailIncidentId(meta.incidentId)
          }
          return
        }

        if (params.dataType === 'node' && params.name) {
          const parsed = parseSankeyNodeId(params.name)
          if (!parsed) return
          if (parsed.kind === 'domain') {
            onSelectDomain(parsed.id)
          } else {
            onIncidentNodeJiraOpen(parsed.id)
          }
        }
      },
    }),
    [incidents, onFocusLink, onSelectDomain, onHoverIncident, onIncidentNodeJiraOpen],
  )

  const detailIncident = detailIncidentId
    ? incidents.find((i) => i.id === detailIncidentId)
    : undefined

  if (graph.data.links.length === 0) {
    return (
      <section className="panel domain-sankey" aria-label="Domain incident map">
        <div className="panel__head">
          <h2 className="panel__title">Domain ↔ incident map</h2>
          <p className="panel__sub">No flows in this window.</p>
        </div>
        <div className="domain-sankey__empty">
          Widen the range or wait.
        </div>
      </section>
    )
  }

  return (
    <section className="panel domain-sankey" aria-label="Domain incident map">
      <div className="panel__head">
        <h2 className="panel__title">Domain ↔ incident map</h2>
        <p className="panel__sub">
          Hover for detail; click incident for Jira.
        </p>
      </div>
      <div
        ref={wrapRef}
        className="domain-sankey__wrap domain-sankey__wrap--echarts"
        onMouseLeave={() => {
          setHover(null)
          setSankeyTip(null)
        }}
      >
        <ReactECharts
          option={option}
          style={{ width: chartWidth, height: SANKEY_HEIGHT }}
          opts={{ renderer: 'canvas' }}
          notMerge
          lazyUpdate={false}
          onEvents={onEvents}
        />
        {sankeyTip ? (
          <div
            className="sankey-floating-tip"
            style={{
              position: 'fixed',
              left: sankeyTip.x + 14,
              top: sankeyTip.y + 14,
              zIndex: 60,
            }}
            role="tooltip"
          >
            {sankeyTip.kind === 'link' ? (
              <>
                <div className="sankey-floating-tip__title">
                  {incidents.find((i) => i.id === sankeyTip.meta.incidentId)
                    ?.name ?? 'Incident'}
                </div>
                <div className="sankey-floating-tip__row">
                  <span className="sankey-floating-tip__muted">Severity</span>
                  <span
                    className={`sankey-floating-tip__sev sankey-floating-tip__sev--${sankeyTip.meta.severity}`}
                  >
                    {formatSeverity(sankeyTip.meta.severity)}
                  </span>
                </div>
                <div className="sankey-floating-tip__row">
                  <span className="sankey-floating-tip__muted">Impact</span>
                  <strong>{sankeyTip.meta.value.toFixed(1)}</strong>
                  <span className="sankey-floating-tip__muted">
                    {' '}
                    on{' '}
                    {DOMAINS.find((d) => d.id === sankeyTip.meta.domainId)
                      ?.label ?? sankeyTip.meta.domainId}
                  </span>
                </div>
              </>
            ) : sankeyTip.kind === 'incident' ? (
              <>
                <div className="sankey-floating-tip__title">
                  {sankeyTip.incident.name}
                </div>
                <div className="sankey-floating-tip__row">
                  <span className="sankey-floating-tip__muted">Severity</span>
                  <span
                    className={`sankey-floating-tip__sev sankey-floating-tip__sev--${sankeyTip.incident.severity}`}
                  >
                    {formatSeverity(sankeyTip.incident.severity)}
                  </span>
                </div>
                <div className="sankey-floating-tip__row">
                  <span className="sankey-floating-tip__muted">
                    Total impact
                  </span>
                  <strong>{sankeyTip.totalImpact.toFixed(1)}</strong>
                  <span className="sankey-floating-tip__muted">
                    {' '}
                    (all domains)
                  </span>
                </div>
              </>
            ) : sankeyTip.kind === 'domain' ? (
              <>
                <div className="sankey-floating-tip__title">
                  {sankeyTip.label}
                </div>
                <ul className="sankey-floating-tip__list">
                  {sankeyTip.rows.map((row) => (
                    <li key={row.incidentId} className="sankey-floating-tip__li">
                      <span className="sankey-floating-tip__li-name">
                        {row.name}
                      </span>
                      <div className="sankey-floating-tip__li-meta">
                        <span
                          className={`sankey-floating-tip__sev sankey-floating-tip__sev--${row.severity}`}
                        >
                          {formatSeverity(row.severity)}
                        </span>
                        <span className="sankey-floating-tip__li-impact">
                          {row.impact.toFixed(1)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {detailIncident ? (
        <div
          className="sankey-detail-backdrop"
          role="presentation"
          onClick={() => setDetailIncidentId(null)}
        >
          <div
            className="sankey-detail"
            role="dialog"
            aria-modal
            aria-labelledby="sankey-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="sankey-detail__close"
              onClick={() => setDetailIncidentId(null)}
            >
              Close
            </button>
            <h3 id="sankey-detail-title">{detailIncident.name}</h3>
            <p className="sankey-detail__sev">{detailIncident.severity}</p>
            {detailIncident.impactSummary ? (
              <p className="sankey-detail__body">{detailIncident.impactSummary}</p>
            ) : null}
            {detailIncident.affectedRegions &&
            detailIncident.affectedRegions.length > 0 ? (
              <p className="sankey-detail__regions">
                <strong>Regions:</strong>{' '}
                {detailIncident.affectedRegions.join(', ')}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
