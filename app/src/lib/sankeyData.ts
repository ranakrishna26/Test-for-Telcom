import { DOMAIN_IDS, DOMAINS } from '../data/domains'
import { getActiveIncidents, incidentDomainPenalty } from './health'
import type { DomainId, Incident, Severity, TimeWindow } from '../types'

export const SANKEY_DOMAIN_COUNT = DOMAINS.length

/** Stable graph IDs for ECharts (source/target strings must be unique). */
export function sankeyDomainNodeId(domainId: DomainId): string {
  return `domain:${domainId}`
}

export function sankeyIncidentNodeId(incidentId: string): string {
  return `incident:${incidentId}`
}

export function parseSankeyNodeId(
  name: string,
): { kind: 'domain'; id: DomainId } | { kind: 'incident'; id: string } | null {
  if (name.startsWith('domain:')) {
    const id = name.slice(7) as DomainId
    if (DOMAIN_IDS.includes(id)) return { kind: 'domain', id }
    return null
  }
  if (name.startsWith('incident:')) {
    return { kind: 'incident', id: name.slice(9) }
  }
  return null
}

export type SankeyLinkMeta = {
  domainId: DomainId
  incidentId: string
  /** Raw penalty used for tooltips */
  value: number
  severity: Severity
}

export type DomainSankeyTooltipRow = {
  incidentId: string
  name: string
  severity: Severity
  /** Raw domain penalty (impact on this domain) */
  impact: number
}

/**
 * ECharts Sankey scales ribbon width by link value. Raw penalties can span a huge
 * range (e.g. transport critical vs core minor), which makes smaller domains
 * effectively invisible. This compresses the scale while keeping order.
 */
export function sankeyLayoutWeight(raw: number): number {
  const r = Math.max(raw, 0.001)
  return Math.max(Math.pow(r, 0.52), 0.12)
}

/** Rows for domain node hover: linked incidents with severity and impact on that domain. */
export function domainTooltipRows(
  domainId: DomainId,
  linkMeta: SankeyLinkMeta[],
  incidents: Incident[],
): DomainSankeyTooltipRow[] {
  const byIncident = new Map<string, SankeyLinkMeta>()
  for (const m of linkMeta) {
    if (m.domainId !== domainId) continue
    byIncident.set(m.incidentId, m)
  }
  const rows: DomainSankeyTooltipRow[] = []
  for (const [incidentId, m] of byIncident) {
    const inc = incidents.find((i) => i.id === incidentId)
    rows.push({
      incidentId,
      name: inc?.name ?? incidentId,
      severity: m.severity,
      impact: m.value,
    })
  }
  rows.sort((a, b) => b.impact - a.impact)
  return rows
}

function truncateLabel(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

export type SankeyGraph = {
  data: {
    nodes: Array<{ name: string }>
    links: Array<{ source: number; target: number; value: number }>
  }
  linkMeta: SankeyLinkMeta[]
  /** Right-column incidents in node order */
  incidentIdsInOrder: string[]
}

export type SankeyAdjacency = {
  fromDomain: Map<DomainId, Set<string>>
  fromIncident: Map<string, Set<DomainId>>
}

/** Incident with highest total linked impact stands out in the Sankey. */
export function getTopImpactIncidentId(
  linkMeta: SankeyLinkMeta[],
): string | null {
  const sum = new Map<string, number>()
  for (const l of linkMeta) {
    sum.set(l.incidentId, (sum.get(l.incidentId) ?? 0) + l.value)
  }
  let best: string | null = null
  let max = 0
  for (const [id, v] of sum) {
    if (v > max) {
      max = v
      best = id
    }
  }
  return best
}

export function buildSankeyAdjacency(linkMeta: SankeyLinkMeta[]): SankeyAdjacency {
  const fromDomain = new Map<DomainId, Set<string>>()
  const fromIncident = new Map<string, Set<DomainId>>()
  for (const l of linkMeta) {
    if (!fromDomain.has(l.domainId)) fromDomain.set(l.domainId, new Set())
    fromDomain.get(l.domainId)!.add(l.incidentId)
    if (!fromIncident.has(l.incidentId)) fromIncident.set(l.incidentId, new Set())
    fromIncident.get(l.incidentId)!.add(l.domainId)
  }
  return { fromDomain, fromIncident }
}

/**
 * Domains are left column (indices 0..n-1); incidents with any impact in the
 * window are right column. Link value is proportional to penalty on that domain.
 */
export function buildSankeyGraph(
  incidents: Incident[],
  window: TimeWindow,
): SankeyGraph {
  const active = getActiveIncidents(incidents, window)
  const incidentNodes: Incident[] = []
  for (const inc of active) {
    const touches = DOMAIN_IDS.some(
      (did) => incidentDomainPenalty(inc, did, window) > 0.001,
    )
    if (touches) incidentNodes.push(inc)
  }

  const nodes: Array<{ name: string }> = [
    ...DOMAINS.map((d) => ({ name: d.shortLabel })),
    ...incidentNodes.map((inc) => ({ name: truncateLabel(inc.name, 42) })),
  ]

  const links: SankeyGraph['data']['links'] = []
  const linkMeta: SankeyLinkMeta[] = []

  incidentNodes.forEach((inc, j) => {
    const target = SANKEY_DOMAIN_COUNT + j
    DOMAIN_IDS.forEach((did, di) => {
      const raw = incidentDomainPenalty(inc, did, window)
      if (raw > 0.001) {
        const layoutValue = sankeyLayoutWeight(raw)
        links.push({
          source: di,
          target,
          value: layoutValue,
        })
        linkMeta.push({
          domainId: did,
          incidentId: inc.id,
          value: raw,
          severity: inc.severity,
        })
      }
    })
  })

  /** Widen the highest-impact incident in the layout so it reads as the dominant bundle. */
  const topId = getTopImpactIncidentId(linkMeta)
  const TOP_LAYOUT_BOOST = 1.38
  if (topId) {
    for (let i = 0; i < links.length; i++) {
      if (linkMeta[i].incidentId === topId) {
        links[i] = { ...links[i], value: links[i].value * TOP_LAYOUT_BOOST }
      }
    }
  }

  return {
    data: { nodes, links },
    linkMeta,
    incidentIdsInOrder: incidentNodes.map((i) => i.id),
  }
}
