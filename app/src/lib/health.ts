import { DOMAIN_IDS, DOMAINS } from '../data/domains'
import type {
  DomainId,
  Incident,
  Severity,
  ImpactScope,
  Trend,
  TimeWindow,
} from '../types'
import { windowsOverlap } from './timeRange'

const SEVERITY: Record<Severity, number> = {
  critical: 38,
  major: 22,
  minor: 9,
}

const SCOPE: Record<ImpactScope, number> = {
  localized: 1,
  widespread: 1.38,
}

const TREND: Record<Trend, number> = {
  worsening: 1.12,
  improving: 0.86,
  stable: 1,
}

export function isIncidentActiveInWindow(
  incident: Incident,
  window: TimeWindow,
): boolean {
  const active: TimeWindow = {
    start: incident.activeFrom,
    end: incident.activeTo,
  }
  return windowsOverlap(active, window)
}

export function getActiveIncidents(
  incidents: Incident[],
  window: TimeWindow,
): Incident[] {
  return incidents.filter((i) => isIncidentActiveInWindow(i, window))
}

function penaltyForIncidentOnDomain(
  incident: Incident,
  domainId: DomainId,
): number {
  const share = incident.domainImpact[domainId] ?? 0
  if (share <= 0) return 0
  return (
    SEVERITY[incident.severity] *
    SCOPE[incident.impactScope] *
    TREND[incident.trend] *
    share
  )
}

/** Raw penalty sum before clamping — useful for ranking contributors. */
export function incidentDomainPenalty(
  incident: Incident,
  domainId: DomainId,
  window: TimeWindow,
): number {
  if (!isIncidentActiveInWindow(incident, window)) return 0
  return penaltyForIncidentOnDomain(incident, domainId)
}

/** Unrounded health (0–100) so trend lines can show subtle movement instead of plateaus. */
export function computeDomainHealthFloat(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
): number {
  const active = getActiveIncidents(incidents, window)
  let total = 0
  for (const inc of active) {
    total += penaltyForIncidentOnDomain(inc, domainId)
  }
  return Math.max(0, Math.min(100, 100 - total))
}

export function computeDomainHealth(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
): number {
  return Math.round(computeDomainHealthFloat(incidents, domainId, window))
}

/**
 * Deterministic smooth “telemetry” ripple per domain so lines feel live when
 * underlying health is piecewise-constant (distinct phase per domain avoids
 * identical curves).
 */
export function telemetryMicroRipple(
  domainId: DomainId,
  t: number,
  window: TimeWindow,
): number {
  const span = Math.max(1, window.end - window.start)
  const u = (t - window.start) / span
  const phase = {
    ran: 0.35,
    core: 2.15,
    security: 3.85,
    transport: 5.4,
  }[domainId]
  return (
    Math.sin(u * Math.PI * 12 + phase) * 1.2 +
    Math.sin(u * Math.PI * 31 + phase * 1.4) * 0.65 +
    Math.sin(u * Math.PI * 5 + phase * 0.7) * 0.9
  )
}

export function trendHealthAtInstant(
  incidents: Incident[],
  domainId: DomainId,
  instant: TimeWindow,
  range: TimeWindow,
): number {
  const base = computeDomainHealthFloat(incidents, domainId, instant)
  const t = instant.start
  const rip = telemetryMicroRipple(domainId, t, range)
  return Math.max(0, Math.min(100, base + rip))
}

export function computeDomainHealthAverage(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
  samplePoints: number,
): number {
  if (samplePoints < 2) {
    return computeDomainHealth(incidents, domainId, window)
  }
  const step = (window.end - window.start) / (samplePoints - 1)
  let sum = 0
  for (let i = 0; i < samplePoints; i++) {
    const t = window.start + i * step
    const slice: TimeWindow = { start: t, end: t }
    const atPoint = incidents.filter((inc) =>
      isIncidentActiveInWindow(inc, slice),
    )
    sum += computeDomainHealth(atPoint, domainId, slice)
  }
  return Math.round(sum / samplePoints)
}

export function rankIncidentsForDomain(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
): Incident[] {
  const active = getActiveIncidents(incidents, window).filter(
    (i) => (i.domainImpact[domainId] ?? 0) > 0,
  )
  return [...active].sort(
    (a, b) =>
      incidentDomainPenalty(b, domainId, window) -
      incidentDomainPenalty(a, domainId, window),
  )
}

/** % change of current health vs previous window (positive = improvement). */
export function healthDeltaPercent(
  currentHealth: number,
  previousHealth: number,
): number {
  if (previousHealth === 0) return currentHealth > 0 ? 100 : 0
  return Math.round(
    ((currentHealth - previousHealth) / Math.max(previousHealth, 1)) * 100,
  )
}

/**
 * Sample health at evenly spaced instants for sparklines.
 * At each instant, health is computed from incidents active at that instant.
 */
export function sampleHealthSeries(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
  points: number,
): number[] {
  if (points < 2) {
    const instant: TimeWindow = { start: window.end, end: window.end }
    const v = trendHealthAtInstant(incidents, domainId, instant, window)
    return [Number(v.toFixed(2))]
  }
  const out: number[] = []
  const step = (window.end - window.start) / (points - 1)
  for (let i = 0; i < points; i++) {
    const t = Math.min(window.end, window.start + i * step)
    const instant: TimeWindow = { start: t, end: t }
    const v = trendHealthAtInstant(incidents, domainId, instant, window)
    out.push(Number(v.toFixed(2)))
  }
  return out
}

/** Sum of penalty contributions on a domain at an instant (before 100 − health clamp). */
export function domainPenaltySumAtInstant(
  incidents: Incident[],
  domainId: DomainId,
  instant: TimeWindow,
): number {
  const active = incidents.filter((inc) => isIncidentActiveInWindow(inc, instant))
  let total = 0
  for (const inc of active) {
    total += penaltyForIncidentOnDomain(inc, domainId)
  }
  return total
}

export function sampleDomainPenaltySumSeries(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
  points: number,
): number[] {
  if (points < 2) {
    const instant: TimeWindow = { start: window.end, end: window.end }
    return [domainPenaltySumAtInstant(incidents, domainId, instant)]
  }
  const out: number[] = []
  const step = (window.end - window.start) / (points - 1)
  for (let i = 0; i < points; i++) {
    const t = Math.min(window.end, window.start + i * step)
    const instant: TimeWindow = { start: t, end: t }
    const v = domainPenaltySumAtInstant(incidents, domainId, instant)
    out.push(Math.round(v * 10) / 10)
  }
  return out
}

export function sampleIncidentPenaltyOnDomainSeries(
  incidents: Incident[],
  incidentId: string,
  domainId: DomainId,
  window: TimeWindow,
  points: number,
): number[] | null {
  const incident = incidents.find((i) => i.id === incidentId)
  if (!incident) return null
  if (points < 2) {
    const instant: TimeWindow = { start: window.end, end: window.end }
    const v = isIncidentActiveInWindow(incident, instant)
      ? penaltyForIncidentOnDomain(incident, domainId)
      : 0
    return [Math.round(v * 10) / 10]
  }
  const out: number[] = []
  const step = (window.end - window.start) / (points - 1)
  for (let i = 0; i < points; i++) {
    const t = Math.min(window.end, window.start + i * step)
    const instant: TimeWindow = { start: t, end: t }
    const v = isIncidentActiveInWindow(incident, instant)
      ? penaltyForIncidentOnDomain(incident, domainId)
      : 0
    out.push(Math.round(v * 10) / 10)
  }
  return out
}

export type TrendDatum = {
  t: number
  health: number
  pressure: number
  focused?: number
}

export function buildTrendData(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
  points: number,
  focusedIncidentId: string | null,
): TrendDatum[] {
  const healthSeries = sampleHealthSeries(incidents, domainId, window, points)
  const pressureSeries = sampleDomainPenaltySumSeries(
    incidents,
    domainId,
    window,
    points,
  )
  const focusedSeries = focusedIncidentId
    ? sampleIncidentPenaltyOnDomainSeries(
        incidents,
        focusedIncidentId,
        domainId,
        window,
        points,
      )
    : null
  const step = points < 2 ? 0 : (window.end - window.start) / (points - 1)
  const out: TrendDatum[] = []
  for (let i = 0; i < points; i++) {
    const t =
      points < 2 ? window.end : Math.min(window.end, window.start + i * step)
    out.push({
      t,
      health: healthSeries[i] ?? 0,
      pressure: pressureSeries[i] ?? 0,
      focused: focusedSeries ? focusedSeries[i] ?? 0 : undefined,
    })
  }
  return out
}

export function totalIncidentImpact(
  incident: Incident,
  window: TimeWindow,
): number {
  if (!isIncidentActiveInWindow(incident, window)) return 0
  let s = 0
  for (const d of DOMAIN_IDS) {
    s += incidentDomainPenalty(incident, d, window)
  }
  return s
}

export function rankIncidentsGlobal(
  incidents: Incident[],
  window: TimeWindow,
): Incident[] {
  const active = getActiveIncidents(incidents, window)
  return [...active].sort(
    (a, b) => totalIncidentImpact(b, window) - totalIncidentImpact(a, window),
  )
}

/** Domains where this incident contributes material penalty in the window (for trend focus). */
export function domainsWithImpactFromIncident(
  incident: Incident,
  window: TimeWindow,
): Set<DomainId> {
  const out = new Set<DomainId>()
  for (const d of DOMAIN_IDS) {
    if (incidentDomainPenalty(incident, d, window) > 0.001) {
      out.add(d)
    }
  }
  return out
}

export type OverviewTrendRow = {
  t: number
  ran: number
  core: number
  security: number
  transport: number
}

export function buildOverviewTrendData(
  incidents: Incident[],
  window: TimeWindow,
  points: number,
): OverviewTrendRow[] {
  const ran = sampleHealthSeries(incidents, 'ran', window, points)
  const core = sampleHealthSeries(incidents, 'core', window, points)
  const security = sampleHealthSeries(incidents, 'security', window, points)
  const transport = sampleHealthSeries(incidents, 'transport', window, points)
  const step = points < 2 ? 0 : (window.end - window.start) / (points - 1)
  const out: OverviewTrendRow[] = []
  for (let i = 0; i < points; i++) {
    const t =
      points < 2 ? window.end : Math.min(window.end, window.start + i * step)
    out.push({
      t,
      ran: ran[i] ?? 0,
      core: core[i] ?? 0,
      security: security[i] ?? 0,
      transport: transport[i] ?? 0,
    })
  }
  return out
}

export type DomainTrendMarker = {
  t: number
  /** Y value on the drawn line (interpolated from the same samples as the line). */
  health: number
  severity: Severity
  incidentId: string
  name: string
  domainId: DomainId
  domainLabel: string
  /** Approximate health points lost on this domain at incident start (instant before vs at start). */
  healthDrop: number
}

/**
 * Health value on the overview chart line at `targetT` — matches Recharts’ monotone
 * interpolation between the same grid points as {@link buildOverviewTrendData}.
 */
export function interpolateOverviewHealthAtT(
  rows: OverviewTrendRow[],
  domainId: DomainId,
  targetT: number,
): number {
  if (rows.length === 0) return 0
  const k = domainId as keyof Pick<
    OverviewTrendRow,
    'ran' | 'core' | 'security' | 'transport'
  >
  if (rows.length === 1) return rows[0][k]
  if (targetT <= rows[0].t) return rows[0][k]
  const last = rows[rows.length - 1]
  if (targetT >= last.t) return last[k]
  let lo = 0
  let hi = rows.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (rows[mid].t <= targetT) lo = mid
    else hi = mid
  }
  const a = rows[lo]
  const b = rows[hi]
  const span = b.t - a.t
  if (span <= 0) return a[k]
  const u = (targetT - a.t) / span
  return a[k] + u * (b[k] - a[k])
}

export function interpolateDetailHealthAtT(
  rows: { t: number; health: number }[],
  targetT: number,
): number {
  if (rows.length === 0) return 0
  if (rows.length === 1) return rows[0].health
  if (targetT <= rows[0].t) return rows[0].health
  const last = rows[rows.length - 1]
  if (targetT >= last.t) return last.health
  let lo = 0
  let hi = rows.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (rows[mid].t <= targetT) lo = mid
    else hi = mid
  }
  const a = rows[lo]
  const b = rows[hi]
  const span = b.t - a.t
  if (span <= 0) return a.health
  const u = (targetT - a.t) / span
  return a.health + u * (b.health - a.health)
}

function healthDropAtIncidentStart(
  incidents: Incident[],
  domainId: DomainId,
  t: number,
  window: TimeWindow,
): number {
  const eps = 1
  const before: TimeWindow = { start: t - eps, end: t - eps }
  const at: TimeWindow = { start: t, end: t }
  const hBefore = trendHealthAtInstant(incidents, domainId, before, window)
  const hAfter = trendHealthAtInstant(incidents, domainId, at, window)
  return Math.max(0, hBefore - hAfter)
}

function isOverviewLineRows(
  lineRows: OverviewTrendRow[] | { t: number; health: number }[],
): lineRows is OverviewTrendRow[] {
  return (
    lineRows.length > 0 &&
    'ran' in (lineRows[0] as OverviewTrendRow)
  )
}

/**
 * One marker per (incident, domain) at start time, Y snapped to the rendered line.
 * Pass the same `lineRows` used to draw the chart so dots sit on the curve.
 */
export function buildDomainTrendMarkers(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
  lineRows: OverviewTrendRow[] | { t: number; health: number }[],
): DomainTrendMarker[] {
  const active = getActiveIncidents(incidents, window).filter(
    (inc) => (inc.domainImpact[domainId] ?? 0) > 0.001,
  )
  const domainLabel =
    DOMAINS.find((d) => d.id === domainId)?.label ?? domainId
  const markers: DomainTrendMarker[] = []
  for (const inc of active) {
    const t = Math.max(window.start, Math.min(window.end, inc.activeFrom))
    const health = isOverviewLineRows(lineRows)
      ? interpolateOverviewHealthAtT(lineRows, domainId, t)
      : interpolateDetailHealthAtT(lineRows, t)
    const healthDrop = healthDropAtIncidentStart(incidents, domainId, t, window)
    markers.push({
      t,
      health: Number(health.toFixed(3)),
      severity: inc.severity,
      incidentId: inc.id,
      name: inc.name,
      domainId,
      domainLabel,
      healthDrop: Number(healthDrop.toFixed(2)),
    })
  }
  return markers
}

export function buildSingleDomainTrendData(
  incidents: Incident[],
  domainId: DomainId,
  window: TimeWindow,
  points: number,
): { t: number; health: number }[] {
  const healthSeries = sampleHealthSeries(incidents, domainId, window, points)
  const step = points < 2 ? 0 : (window.end - window.start) / (points - 1)
  const out: { t: number; health: number }[] = []
  for (let i = 0; i < points; i++) {
    const t =
      points < 2 ? window.end : Math.min(window.end, window.start + i * step)
    out.push({
      t,
      health: healthSeries[i] ?? 0,
    })
  }
  return out
}
