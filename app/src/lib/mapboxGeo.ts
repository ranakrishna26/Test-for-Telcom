import type { IncidentMapFeature } from './regionHeatmap'

type PointFeature = {
  type: 'Feature'
  properties: { weight: number }
  geometry: { type: 'Point'; coordinates: [number, number] }
}

type PolygonFeature = {
  type: 'Feature'
  properties: {
    id: string
    severity: string
    dim: number
    highlight: number
  }
  geometry: { type: 'Polygon'; coordinates: [number, number][][] }
}

export function heatPointsToGeoJSON(points: [number, number, number][]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map(([lat, lng, weight]): PointFeature => ({
      type: 'Feature',
      properties: { weight },
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    })),
  }
}

export function spreadRingsToGeoJSON(
  features: IncidentMapFeature[],
  options: {
    highlightId: string | null
    dimFeature: (f: IncidentMapFeature) => boolean
  },
) {
  const feats: PolygonFeature[] = []
  for (const f of features) {
    if (f.spreadRing.length < 3) continue
    const ring = f.spreadRing.map(([lat, lng]) => [lng, lat] as [number, number])
    if (
      ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1]
    ) {
      ring.push(ring[0])
    }
    feats.push({
      type: 'Feature',
      properties: {
        id: f.id,
        severity: f.incident.severity,
        dim: options.dimFeature(f) ? 1 : 0,
        highlight: options.highlightId === f.id ? 1 : 0,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    })
  }
  return { type: 'FeatureCollection' as const, features: feats }
}

export function boundsFromFeatures(
  features: IncidentMapFeature[],
): [[number, number], [number, number]] | null {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const f of features) {
    for (const p of f.points) {
      minLng = Math.min(minLng, p.lng)
      minLat = Math.min(minLat, p.lat)
      maxLng = Math.max(maxLng, p.lng)
      maxLat = Math.max(maxLat, p.lat)
    }
  }
  if (!Number.isFinite(minLng)) return null
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

export const SEVERITY_MARKER_COLOR = {
  critical: '#f87171',
  major: '#fbbf24',
  minor: '#94a3b8',
} as const

export function markerRadiusPx(impact: number): number {
  return Math.min(18, Math.max(8, 6 + Math.sqrt(Math.max(impact, 0.35)) * 2.5))
}
