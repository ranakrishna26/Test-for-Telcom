import { DOMAIN_IDS, DOMAINS } from '../data/domains'
import { resolveRegion } from '../data/regions'
import type { DomainId, Incident, TimeWindow } from '../types'
import {
  getActiveIncidents,
  incidentDomainPenalty,
  totalIncidentImpact,
} from './health'
import { convexHullLatLng, twoPointCorridor, type LatLng } from './mapGeometry'

const SEV_WEIGHT = { critical: 3, major: 2, minor: 1 } as const

export type RegionPin = {
  lat: number
  lng: number
  label: string
  incidentIds: string[]
}

export type SeverityHeatBuckets = {
  critical: [number, number, number][]
  major: [number, number, number][]
  minor: [number, number, number][]
  regions: RegionPin[]
}

function cellKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

/**
 * Per-severity heat layers (normalized independently) + region pins for map clicks.
 * Critical → red, major (warning) → yellow, minor (normal) → green in the map UI.
 */
export function buildSeverityHeatData(
  incidents: Incident[],
  window: TimeWindow,
): SeverityHeatBuckets {
  const active = getActiveIncidents(incidents, window)
  const cells = new Map<
    string,
    { lat: number; lng: number; c: number; m: number; n: number }
  >()

  for (const inc of active) {
    let domainLoad = 0
    for (const d of DOMAIN_IDS) {
      domainLoad += incidentDomainPenalty(inc, d as DomainId, window)
    }
    const base = 0.12 + Math.min(domainLoad / 120, 1)
    const w = SEV_WEIGHT[inc.severity] * base

    for (const name of inc.affectedRegions ?? []) {
      const r = resolveRegion(name)
      if (!r) continue
      const key = cellKey(r.lat, r.lng)
      const prev = cells.get(key) ?? {
        lat: r.lat,
        lng: r.lng,
        c: 0,
        m: 0,
        n: 0,
      }
      if (inc.severity === 'critical') prev.c += w
      else if (inc.severity === 'major') prev.m += w
      else prev.n += w
      cells.set(key, prev)
    }
  }

  let maxC = 0.001
  let maxM = 0.001
  let maxN = 0.001
  for (const v of cells.values()) {
    maxC = Math.max(maxC, v.c)
    maxM = Math.max(maxM, v.m)
    maxN = Math.max(maxN, v.n)
  }

  const critical: [number, number, number][] = []
  const major: [number, number, number][] = []
  const minor: [number, number, number][] = []

  for (const v of cells.values()) {
    if (v.c > 0) {
      critical.push([v.lat, v.lng, Math.min(1, v.c / maxC)])
    }
    if (v.m > 0) {
      major.push([v.lat, v.lng, Math.min(1, v.m / maxM)])
    }
    if (v.n > 0) {
      minor.push([v.lat, v.lng, Math.min(1, v.n / maxN)])
    }
  }

  const regionMap = new Map<
    string,
    { lat: number; lng: number; label: string; incidentIds: Set<string> }
  >()
  for (const inc of active) {
    for (const name of inc.affectedRegions ?? []) {
      const r = resolveRegion(name)
      if (!r) continue
      const key = cellKey(r.lat, r.lng)
      let entry = regionMap.get(key)
      if (!entry) {
        entry = {
          lat: r.lat,
          lng: r.lng,
          label: r.label,
          incidentIds: new Set(),
        }
        regionMap.set(key, entry)
      }
      entry.incidentIds.add(inc.id)
    }
  }

  const regions: RegionPin[] = [...regionMap.values()].map((e) => ({
    lat: e.lat,
    lng: e.lng,
    label: e.label,
    incidentIds: [...e.incidentIds],
  }))

  return { critical, major, minor, regions }
}

/** @deprecated use buildSeverityHeatData */
export function buildHeatmapPoints(
  incidents: Incident[],
  window: TimeWindow,
): [number, number, number][] {
  const { critical, major, minor } = buildSeverityHeatData(incidents, window)
  return [...critical, ...major, ...minor]
}

export function countMultiDomainIncidents(
  incidents: Incident[],
  window: TimeWindow,
): number {
  return getActiveIncidents(incidents, window).filter((inc) => {
    const n = DOMAIN_IDS.filter(
      (d) => incidentDomainPenalty(inc, d as DomainId, window) > 0.01,
    ).length
    return n >= 2
  }).length
}

export type IncidentMapFeature = {
  id: string
  incident: Incident
  points: { lat: number; lng: number; label: string }[]
  impact: number
  /** Closed ring [lat,lng][] for shaded spread; empty if only one point. */
  spreadRing: [number, number][]
}

function dedupePoints(
  points: { lat: number; lng: number; label: string }[],
): { lat: number; lng: number; label: string }[] {
  const seen = new Set<string>()
  const out: typeof points = []
  for (const p of points) {
    const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(p)
  }
  return out
}

/** Per active incident: geo points + optional hull/corridor for multi-region spread. */
export function buildIncidentMapFeatures(
  incidents: Incident[],
  window: TimeWindow,
): IncidentMapFeature[] {
  const active = getActiveIncidents(incidents, window)
  const out: IncidentMapFeature[] = []
  for (const inc of active) {
    const raw: { lat: number; lng: number; label: string }[] = []
    for (const name of inc.affectedRegions ?? []) {
      const r = resolveRegion(name)
      if (r) raw.push({ lat: r.lat, lng: r.lng, label: r.label })
    }
    const points = dedupePoints(raw)
    if (points.length === 0) continue
    const impact = totalIncidentImpact(inc, window)
    let spreadRing: [number, number][] = []
    if (points.length === 2) {
      spreadRing = twoPointCorridor(
        points[0] as LatLng,
        points[1] as LatLng,
      )
    } else if (points.length >= 3) {
      spreadRing = convexHullLatLng(points)
    }
    out.push({
      id: inc.id,
      incident: inc,
      points,
      impact,
      spreadRing,
    })
  }
  return out
}

const SEV_INTENSITY = { critical: 1.12, major: 1, minor: 0.9 } as const

function addHeatCell(
  cell: Map<string, number>,
  lat: number,
  lng: number,
  amount: number,
): void {
  const k = `${lat.toFixed(4)},${lng.toFixed(4)}`
  cell.set(k, (cell.get(k) ?? 0) + amount)
}

/** Sample heat along great-circle-ish segments so multi-region incidents read on the map. */
function addSegmentHeat(
  cell: Map<string, number>,
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  amount: number,
  steps = 4,
): void {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    addHeatCell(
      cell,
      a.lat + (b.lat - a.lat) * t,
      a.lng + (b.lng - a.lng) * t,
      amount * (i === 0 || i === steps ? 1 : 0.55),
    )
  }
}

/**
 * Unified intensity per map cell for heatmap layers: higher = more impact at that pin.
 * Values are normalized to 0–1 by the caller’s max (see RegionHeatmapMap).
 */
export function buildImpactHeatPoints(
  features: IncidentMapFeature[],
  selectedDomain: DomainId | null,
  window: TimeWindow,
  focusedIncidentId?: string | null,
): [number, number, number][] {
  const cell = new Map<string, number>()
  for (const f of features) {
    const inDomain = incidentTouchesDomainFilter(
      f.incident,
      selectedDomain,
      window,
    )
    const dim = selectedDomain !== null && !inDomain ? 0.14 : 1
    const focusDim =
      focusedIncidentId != null && f.id !== focusedIncidentId ? 0.11 : 1
    const w = SEV_INTENSITY[f.incident.severity]
    const contribution = f.impact * w * dim * focusDim
    for (const p of f.points) {
      addHeatCell(cell, p.lat, p.lng, contribution)
    }
    if (f.points.length >= 2) {
      for (let i = 0; i < f.points.length; i++) {
        for (let j = i + 1; j < f.points.length; j++) {
          addSegmentHeat(cell, f.points[i]!, f.points[j]!, contribution * 0.45)
        }
      }
    }
  }
  let maxV = 0.001
  for (const v of cell.values()) maxV = Math.max(maxV, v)
  const out: [number, number, number][] = []
  for (const [k, v] of cell) {
    const [lat, lng] = k.split(',').map(Number)
    out.push([lat, lng, Math.min(1, v / maxV)])
  }
  return out
}

/** Domains with meaningful impact in the window (for map tooltips). */
export function domainsAffectedLabels(
  inc: Incident,
  window: TimeWindow,
): string[] {
  const labels: string[] = []
  for (const d of DOMAIN_IDS) {
    if (incidentDomainPenalty(inc, d, window) > 0.01) {
      const info = DOMAINS.find((x) => x.id === d)
      if (info) labels.push(info.label)
    }
  }
  return labels
}

export function incidentTouchesDomainFilter(
  inc: Incident,
  selectedDomain: DomainId | null,
  window: TimeWindow,
): boolean {
  if (!selectedDomain) return true
  return incidentDomainPenalty(inc, selectedDomain, window) > 0.01
}
