import { useMapEvents } from 'react-leaflet'
import type { RegionPin } from '../../lib/regionHeatmap'

type Props = {
  regions: RegionPin[]
  onFocusIncident: (id: string | null) => void
}

/** Click map to focus the nearest region’s first incident (no circle markers). */
export function MapRegionClick({ regions, onFocusIncident }: Props) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      let best: RegionPin | null = null
      let bestSq = Infinity
      const thresholdDeg = 1.15
      for (const r of regions) {
        const dLat = r.lat - lat
        const dLng = r.lng - lng
        const sq = dLat * dLat + dLng * dLng
        if (sq < bestSq && sq < thresholdDeg * thresholdDeg) {
          bestSq = sq
          best = r
        }
      }
      if (best?.incidentIds.length) {
        onFocusIncident(best.incidentIds[0])
      }
    },
  })
  return null
}
