/**
 * Small helpers for incident “spread” shapes on Leaflet (lat/lng, ~local plane).
 */

export type LatLng = { lat: number; lng: number }

/** Quadrilateral around the segment AB so two regions form a visible shaded corridor. */
export function twoPointCorridor(
  a: LatLng,
  b: LatLng,
  halfWidthDeg = 0.05,
): [number, number][] {
  const dx = b.lng - a.lng
  const dy = b.lat - a.lat
  const len = Math.hypot(dx, dy) || 1e-9
  const nx = (-dy / len) * halfWidthDeg
  const ny = (dx / len) * halfWidthDeg
  return [
    [a.lat + ny, a.lng + nx],
    [b.lat + ny, b.lng + nx],
    [b.lat - ny, b.lng - nx],
    [a.lat - ny, a.lng - nx],
  ]
}

/** Andrew's monotone chain; points as [lat,lng] for Leaflet. Need at least 3 unique points. */
export function convexHullLatLng(points: LatLng[]): [number, number][] {
  if (points.length < 3) return []
  const pts: [number, number][] = points.map((p) => [p.lng, p.lat])
  pts.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))
  const cross = (
    o: [number, number],
    a: [number, number],
    b: [number, number],
  ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
    ) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0
    ) {
      upper.pop()
    }
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper).map(([lng, lat]) => [lat, lng] as [number, number])
}
