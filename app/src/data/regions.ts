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
  /* Sydney / NSW */
  { id: 'metro-north', label: 'Metro North', lat: -33.86, lng: 151.2 },
  { id: 'ring-corridor', label: 'Ring corridor', lat: -33.88, lng: 151.15 },
  { id: 'finance-edge', label: 'Finance edge', lat: -33.865, lng: 151.209 },
  { id: 'east-ring', label: 'East ring', lat: -33.92, lng: 151.25 },
  { id: 'coastal-pops', label: 'Coastal PoPs', lat: -34.05, lng: 151.15 },
  { id: 'stadium-cluster', label: 'Stadium cluster', lat: -33.89, lng: 151.225 },
  { id: 'api-edge', label: 'API edge', lat: -33.87, lng: 151.205 },
  { id: 'suburban-west', label: 'Suburban west', lat: -33.82, lng: 151.0 },
  /* National backbone */
  { id: 'national', label: 'National', lat: -25.27, lng: 133.775 },
  /* Melbourne / VIC */
  { id: 'core-site-b', label: 'Core site B', lat: -37.81, lng: 144.96 },
  { id: 'melbourne-metro', label: 'Melbourne metro', lat: -37.8136, lng: 144.9631 },
  /* Other states & territories */
  { id: 'brisbane-core', label: 'Brisbane core', lat: -27.4698, lng: 153.0251 },
  { id: 'gold-coast', label: 'Gold Coast', lat: -28.0167, lng: 153.4 },
  { id: 'perth-metro', label: 'Perth metro', lat: -31.9505, lng: 115.8605 },
  { id: 'adelaide-ring', label: 'Adelaide ring', lat: -34.9285, lng: 138.6007 },
  { id: 'darwin-edge', label: 'Darwin edge', lat: -12.4634, lng: 130.8456 },
  { id: 'hobart-pop', label: 'Hobart PoP', lat: -42.8821, lng: 147.3272 },
  { id: 'cairns-north', label: 'Cairns north', lat: -16.9186, lng: 145.7781 },
  { id: 'canberra-hub', label: 'Canberra hub', lat: -35.2809, lng: 149.13 },
]

const byLabel = new Map(
  REGION_CATALOG.map((r) => [r.label.toLowerCase(), r] as const),
)

/** Resolve a region label from incident data to catalog entry (fuzzy by label text). */
export function resolveRegion(label: string): RegionEntry | undefined {
  const key = label.trim().toLowerCase()
  return byLabel.get(key)
}
