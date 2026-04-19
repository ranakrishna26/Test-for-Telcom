/**
 * Mock region catalog: string keys match `Incident.affectedRegions` entries.
 * Centroids are approximate for demo heatmap (not survey-grade).
 */
export type RegionEntry = {
  id: string
  label: string
  lat: number
  lng: number
}

export const REGION_CATALOG: RegionEntry[] = [
  { id: 'metro-north', label: 'Metro North', lat: -33.86, lng: 151.2 },
  { id: 'ring-corridor', label: 'Ring corridor', lat: -33.88, lng: 151.15 },
  { id: 'national', label: 'National', lat: -25.27, lng: 133.775 },
  { id: 'finance-edge', label: 'Finance edge', lat: -33.865, lng: 151.209 },
  { id: 'east-ring', label: 'East ring', lat: -33.92, lng: 151.25 },
  { id: 'coastal-pops', label: 'Coastal PoPs', lat: -34.05, lng: 151.15 },
  { id: 'stadium-cluster', label: 'Stadium cluster', lat: -33.89, lng: 151.225 },
  { id: 'core-site-b', label: 'Core site B', lat: -37.81, lng: 144.96 },
  { id: 'api-edge', label: 'API edge', lat: -33.87, lng: 151.205 },
  { id: 'suburban-west', label: 'Suburban west', lat: -33.82, lng: 151.0 },
]

const byLabel = new Map(
  REGION_CATALOG.map((r) => [r.label.toLowerCase(), r] as const),
)

/** Resolve a region label from incident data to catalog entry (fuzzy by label text). */
export function resolveRegion(label: string): RegionEntry | undefined {
  const key = label.trim().toLowerCase()
  return byLabel.get(key)
}
