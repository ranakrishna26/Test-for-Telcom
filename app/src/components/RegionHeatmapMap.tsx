import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import Map, {
  Layer,
  Marker,
  Popup,
  Source,
  type MapRef,
} from 'react-map-gl/mapbox'
import type { DomainId, Incident, TimeWindow } from '../types'
import {
  buildImpactHeatPoints,
  buildIncidentMapFeatures,
  domainsAffectedLabels,
  incidentTouchesDomainFilter,
} from '../lib/regionHeatmap'
import {
  boundsFromFeatures,
  heatPointsToGeoJSON,
  markerRadiusPx,
  SEVERITY_MARKER_COLOR,
  spreadRingsToGeoJSON,
} from '../lib/mapboxGeo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string
const CENTER = { longitude: 134.5, latitude: -28.5 }
const DEFAULT_ZOOM = 4.5
const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'

const heatmapPaint = {
  'heatmap-weight': ['get', 'weight'],
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(56, 189, 248, 0)',
    0.35,
    'rgba(56, 189, 248, 0.45)',
    0.65,
    'rgba(251, 191, 36, 0.65)',
    1,
    'rgba(248, 113, 113, 0.9)',
  ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 24, 5, 36, 8, 48],
  'heatmap-opacity': 0.75,
} as const

const spreadFillPaint = {
  'fill-color': [
    'match',
    ['get', 'severity'],
    'critical',
    SEVERITY_MARKER_COLOR.critical,
    'major',
    SEVERITY_MARKER_COLOR.major,
    SEVERITY_MARKER_COLOR.minor,
  ],
  'fill-opacity': [
    'case',
    ['==', ['get', 'dim'], 1],
    0.06,
    ['==', ['get', 'highlight'], 1],
    0.35,
    0.18,
  ],
} as const

const spreadLinePaint = {
  'line-color': [
    'match',
    ['get', 'severity'],
    'critical',
    SEVERITY_MARKER_COLOR.critical,
    'major',
    SEVERITY_MARKER_COLOR.major,
    SEVERITY_MARKER_COLOR.minor,
  ],
  'line-width': ['case', ['==', ['get', 'highlight'], 1], 2.5, 1.25],
  'line-opacity': ['case', ['==', ['get', 'dim'], 1], 0.12, 0.45],
} as const

type Props = {
  incidents: Incident[]
  window: TimeWindow
  selectedDomain: DomainId | null
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
  const mapRef = useRef<MapRef>(null)
  const [popupFeatureId, setPopupFeatureId] = useState<string | null>(null)

  const features = useMemo(
    () => buildIncidentMapFeatures(incidents, window),
    [incidents, window],
  )

  const heatPoints = useMemo(
    () =>
      buildImpactHeatPoints(features, selectedDomain, window, highlightIncidentId),
    [features, selectedDomain, window, highlightIncidentId],
  )

  const heatGeoJSON = useMemo(
    () => heatPointsToGeoJSON(heatPoints),
    [heatPoints],
  )

  const isDimmed = useCallback(
    (f: (typeof features)[0]) => {
      const inDomain = incidentTouchesDomainFilter(
        f.incident,
        selectedDomain,
        window,
      )
      const domainDim = selectedDomain !== null && !inDomain
      const focusDim =
        highlightIncidentId !== null && f.id !== highlightIncidentId
      return domainDim || focusDim
    },
    [selectedDomain, window, highlightIncidentId],
  )

  const spreadGeoJSON = useMemo(
    () =>
      spreadRingsToGeoJSON(features, {
        highlightId: highlightIncidentId,
        dimFeature: isDimmed,
      }),
    [features, highlightIncidentId, isDimmed],
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

  useEffect(() => {
    const map = mapRef.current
    if (!map || features.length === 0) return

    map.resize()

    if (flyToIncidentId) {
      const f = features.find((x) => x.id === flyToIncidentId)
      if (!f?.points.length) return
      const bounds = boundsFromFeatures([f])
      if (bounds) {
        map.fitBounds(bounds, { padding: 52, maxZoom: 9, duration: 750 })
      }
      return
    }

    const bounds = boundsFromFeatures(features)
    if (bounds) {
      map.fitBounds(bounds, { padding: 44, maxZoom: 5, duration: 550 })
    }
  }, [features, window.start, window.end, flyToIncidentId])

  const handleMarkerClick = (id: string) => {
    onFocusIncident((prev) => (prev === id ? null : id))
    setPopupFeatureId(id)
  }

  const popupFeature = popupFeatureId
    ? features.find((f) => f.id === popupFeatureId)
    : null

  return (
    <Card className="flex h-full min-h-0 flex-col border-border/80 shadow-sm">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-base">Regional map</CardTitle>
        <div className="flex flex-col items-start gap-2.5">
          <CardDescription className="text-xs">
            Heat shows impact; markers show severity.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2" aria-hidden>
            <Badge variant="outline" className="border-red-500/40 text-red-300 text-[10px]">
              Critical
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
              Major
            </Badge>
            <Badge variant="outline" className="text-[10px] text-sky-300 border-sky-500/40">
              Minor
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-3 pt-0">
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          <Map
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{
              ...CENTER,
              zoom: DEFAULT_ZOOM,
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle={MAP_STYLE}
            scrollZoom
            attributionControl={false}
          >
            {heatPoints.length > 0 ? (
              <Source id="impact-heat" type="geojson" data={heatGeoJSON}>
                <Layer
                  id="impact-heat"
                  type="heatmap"
                  maxzoom={12}
                  paint={heatmapPaint as Record<string, unknown>}
                />
              </Source>
            ) : null}

            {spreadGeoJSON.features.length > 0 ? (
              <Source id="spread-rings" type="geojson" data={spreadGeoJSON}>
                <Layer
                  id="spread-fill"
                  type="fill"
                  paint={spreadFillPaint as Record<string, unknown>}
                />
                <Layer
                  id="spread-line"
                  type="line"
                  paint={spreadLinePaint as Record<string, unknown>}
                />
              </Source>
            ) : null}

            {orderedFeatures.flatMap((f) =>
              f.points.map((p, i) => {
                const dim = isDimmed(f)
                const isHi = highlightIncidentId === f.id
                const color = SEVERITY_MARKER_COLOR[f.incident.severity]
                const size = markerRadiusPx(f.impact)
                return (
                  <Marker
                    key={`${f.id}-${i}`}
                    longitude={p.lng}
                    latitude={p.lat}
                    anchor="center"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation()
                      handleMarkerClick(f.id)
                    }}
                  >
                    <button
                      type="button"
                      className={cn(
                        'rounded-full border-2 transition-opacity',
                        dim && !isHi ? 'opacity-20' : 'opacity-95',
                      )}
                      style={{
                        width: size,
                        height: size,
                        backgroundColor: color,
                        borderColor: isHi ? '#fff' : color,
                        boxShadow: isHi ? `0 0 12px ${color}` : undefined,
                      }}
                      onMouseEnter={() => {
                        onHoverIncident(f.id)
                        setPopupFeatureId(f.id)
                      }}
                      onMouseLeave={() => {
                        onHoverIncident(null)
                      }}
                      aria-label={f.incident.name}
                    />
                  </Marker>
                )
              }),
            )}

            {popupFeature ? (
              <Popup
                longitude={popupFeature.points[0]!.lng}
                latitude={popupFeature.points[0]!.lat}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={12}
              >
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    {popupFeature.incident.name}
                  </p>
                  <p className="mt-1 capitalize text-muted-foreground">
                    {popupFeature.incident.severity}
                  </p>
                  {domainsAffectedLabels(popupFeature.incident, window).length > 0 ? (
                    <p className="mt-1 text-muted-foreground">
                      Affects:{' '}
                      {domainsAffectedLabels(popupFeature.incident, window).join(', ')}
                    </p>
                  ) : null}
                </div>
              </Popup>
            ) : null}
          </Map>
        </div>
      </CardContent>
    </Card>
  )
}
