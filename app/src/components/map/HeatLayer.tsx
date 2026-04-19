import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat/dist/leaflet-heat.js'

export type HeatGradient = Record<number, string>

const defaultGradient: HeatGradient = {
  0.4: '#38bdf8',
  0.7: '#fbbf24',
  1: '#fb7185',
}

type Props = {
  points: [number, number, number][]
  /** leaflet.heat gradient: position 0–1 → color (status-based presets in RegionHeatmapMap). */
  gradient?: HeatGradient
  radius?: number
  blur?: number
  /** Passed to simpleheat draw(); floor for low-intensity pixels (so edges stay faint, not solid). */
  minOpacity?: number
  max?: number
}

export function HeatLayer({
  points,
  gradient = defaultGradient,
  radius = 42,
  blur = 32,
  minOpacity = 0.06,
  max = 1,
}: Props) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    const heatLayer = (
      L as unknown as {
        heatLayer: (
          p: [number, number, number][],
          o: Record<string, unknown>,
        ) => L.Layer
      }
    ).heatLayer(points, {
      radius,
      blur,
      maxZoom: 14,
      max,
      minOpacity,
      gradient,
    })
    heatLayer.addTo(map)
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, points, gradient, radius, blur, minOpacity, max])
  return null
}
