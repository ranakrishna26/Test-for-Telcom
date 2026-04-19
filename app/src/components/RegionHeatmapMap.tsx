import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import type { DomainId, Incident, TimeWindow } from '../types'
import {
  buildImpactHeatPoints,
  buildIncidentMapFeatures,
  domainsAffectedLabels,
  incidentTouchesDomainFilter,
  type IncidentMapFeature,
} from '../lib/regionHeatmap'
import { HEAT_GRADIENT_IMPACT } from './map/heatGradients'
import { HeatLayer } from './map/HeatLayer'

const CENTER: [number, number] = [-28.5, 134.5]
const DEFAULT_ZOOM = 4.5

const SEVERITY_COLOR = {
  critical: '#f87171',
  major: '#fbbf24',
  minor: '#94a3b8',
} as const

/** Small pins above the canvas heat layer (impact size hint, not the heat fill). */
function markerRadiusPx(impact: number): number {
  return Math.min(
    9,
    Math.max(4, 3.2 + Math.sqrt(Math.max(impact, 0.35)) * 1.35),
  )
}

function MapViewController({
  features,
  window,
  flyToIncidentId,
}: {
  features: IncidentMapFeature[]
  window: TimeWindow
  /** Zoom target only when user commits focus (click); hover does not pan the map. */
  flyToIncidentId: string | null
}) {
  const map = useMap()
  useEffect(() => {
    if (features.length === 0) return
    if (flyToIncidentId) {
      const f = features.find((x) => x.id === flyToIncidentId)
      if (!f?.points.length) return
      const pts = f.points.map((p) => L.latLng(p.lat, p.lng))
      map.flyToBounds(L.latLngBounds(pts), {
        padding: [52, 52],
        maxZoom: 9,
        duration: 0.75,
      })
      return
    }
    const pts = features.flatMap((f) =>
      f.points.map((p) => L.latLng(p.lat, p.lng)),
    )
    map.flyToBounds(L.latLngBounds(pts), {
      padding: [44, 44],
      maxZoom: 6,
      duration: 0.55,
    })
  }, [features, window.start, window.end, flyToIncidentId, map])
  return null
}

function IncidentTooltip({
  incident,
  window,
}: {
  incident: Incident
  window: TimeWindow
}) {
  const sev = incident.severity
  const domains = domainsAffectedLabels(incident, window)
  return (
    <Tooltip
      direction="top"
      offset={[0, -8]}
      opacity={1}
      className="region-map__leaflet-tooltip"
    >
      <div className="region-map__tooltip">
        <div className="region-map__tooltip-name">{incident.name}</div>
        <div className="region-map__tooltip-row">
          <span
            className={`region-map__tooltip-sev region-map__tooltip-sev--${sev}`}
          >
            {sev.charAt(0).toUpperCase() + sev.slice(1)}
          </span>
        </div>
        {domains.length > 0 ? (
          <div className="region-map__tooltip-domains">
            Affects: {domains.join(', ')}
          </div>
        ) : null}
      </div>
    </Tooltip>
  )
}

type LayerProps = {
  feature: IncidentMapFeature
  selectedDomain: DomainId | null
  highlightId: string | null
  /** Hover or click focus — dims other incidents on the map. */
  storyFocusIncidentId: string | null
  window: TimeWindow
  onMarkerClick: (id: string) => void
  onMarkerHover: (id: string | null) => void
}

function IncidentMapLayers({
  feature,
  selectedDomain,
  highlightId,
  storyFocusIncidentId,
  window,
  onMarkerClick,
  onMarkerHover,
}: LayerProps) {
  const { incident, points, spreadRing, impact } = feature
  const sev = incident.severity
  const fill = SEVERITY_COLOR[sev]
  const inDomain = incidentTouchesDomainFilter(
    incident,
    selectedDomain,
    window,
  )
  const dim = selectedDomain !== null && !inDomain
  const unfocused =
    storyFocusIncidentId !== null &&
    incident.id !== storyFocusIncidentId
  const isHi = highlightId === incident.id
  const baseOpacity =
    dim || unfocused ? 0.12 : isHi ? 1 : 0.92

  const hover = {
    mouseover: () => {
      onMarkerHover(incident.id)
    },
    mouseout: () => {
      onMarkerHover(null)
    },
  }
  const click = {
    click: (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e)
      onMarkerClick(incident.id)
    },
  }
  const markerEvents = { ...hover, ...click }

  const circleOpacity = dim || unfocused ? 0.18 : isHi ? 1 : 0.92

  return (
    <>
      {spreadRing.length >= 3 ? (
        <Polygon
          positions={spreadRing}
          pathOptions={{
            color: fill,
            weight: isHi ? 2.5 : 1.25,
            fillColor: fill,
            fillOpacity: 0,
            opacity: dim || unfocused ? 0.1 : isHi ? 0.5 : 0.32,
          }}
          eventHandlers={markerEvents}
        >
          <IncidentTooltip incident={incident} window={window} />
        </Polygon>
      ) : null}
      {points.map((p, i) => (
        <CircleMarker
          key={`${incident.id}-${i}`}
          center={[p.lat, p.lng]}
          radius={markerRadiusPx(impact)}
          pathOptions={{
            color: fill,
            fillColor: fill,
            fillOpacity: circleOpacity,
            weight: isHi ? 3 : 1.5,
            opacity: baseOpacity,
          }}
          eventHandlers={markerEvents}
        >
          <IncidentTooltip incident={incident} window={window} />
        </CircleMarker>
      ))}
    </>
  )
}

type Props = {
  incidents: Incident[]
  window: TimeWindow
  selectedDomain: DomainId | null
  /** Pan/zoom target only on click commit; hover does not move the map. */
  flyToIncidentId: string | null
  highlightIncidentId: string | null
  onFocusIncident: Dispatch<SetStateAction<string | null>>
  onHoverIncident: (id: string | null) => void
}

export function RegionHeatmapMap({
  incidents,
  window,
  selectedDomain,
  flyToIncidentId,
  highlightIncidentId,
  onFocusIncident,
  onHoverIncident,
}: Props) {
  const features = useMemo(
    () => buildIncidentMapFeatures(incidents, window),
    [incidents, window],
  )

  const heatPoints = useMemo(
    () =>
      buildImpactHeatPoints(features, selectedDomain, window, highlightIncidentId),
    [features, selectedDomain, window, highlightIncidentId],
  )

  const orderedFeatures = useMemo(() => {
    const list = [...features]
    if (highlightIncidentId) {
      list.sort((a, b) => {
        if (a.id === highlightIncidentId) return 1
        if (b.id === highlightIncidentId) return -1
        return 0
      })
    }
    return list
  }, [features, highlightIncidentId])

  const handleMarkerClick = (id: string) => {
    onFocusIncident((prev) => (prev === id ? null : id))
  }

  return (
    <section className="panel region-map" aria-label="Regional impact map">
      <div className="panel__head">
        <h2 className="panel__title">Regional map</h2>
        <p className="panel__sub">
          Heat shows impact; markers show severity.
        </p>
        <div className="region-map__legend" aria-hidden>
          <span className="region-map__legend-item region-map__legend-item--sev-critical">
            Critical
          </span>
          <span className="region-map__legend-item region-map__legend-item--sev-major">
            Major
          </span>
          <span className="region-map__legend-item region-map__legend-item--sev-minor">
            Minor
          </span>
        </div>
      </div>
      <div className="region-map__frame">
        <MapContainer
          center={CENTER}
          zoom={DEFAULT_ZOOM}
          className="region-map__leaflet"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {heatPoints.length > 0 ? (
            <HeatLayer
              points={heatPoints}
              gradient={HEAT_GRADIENT_IMPACT}
              radius={46}
              blur={34}
              minOpacity={0.07}
            />
          ) : null}
          <MapViewController
            features={features}
            window={window}
            flyToIncidentId={flyToIncidentId}
          />
          {orderedFeatures.map((f) => (
            <IncidentMapLayers
              key={f.id}
              feature={f}
              selectedDomain={selectedDomain}
              highlightId={highlightIncidentId}
              storyFocusIncidentId={highlightIncidentId}
              window={window}
              onMarkerClick={handleMarkerClick}
              onMarkerHover={onHoverIncident}
            />
          ))}
        </MapContainer>
      </div>
    </section>
  )
}
