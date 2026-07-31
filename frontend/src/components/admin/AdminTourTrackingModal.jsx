import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { getLiveDriverLocation, getRoute, getTourDetails } from '../../services/api.js'

const POLL_MS = 5000
const ROUTE_REFRESH_MS = 45000
const ROUTE_MOVE_KM = 0.15
const TRAIL_MIN_METERS = 20
const TRAIL_MAX_POINTS = 60
const TRAIL_SNAP_DEBOUNCE_MS = 1200

const OSRM_BASES = [
  '/osrm',
  'https://routing.openstreetmap.de/routed-car',
  'https://router.project-osrm.org',
]

async function osrmJson(path) {
  for (const base of OSRM_BASES) {
    try {
      const res = await fetch(`${base}${path}`)
      if (!res.ok) continue
      const data = await res.json()
      if (data?.code === 'Ok') return data
    } catch {
      // try next mirror
    }
  }
  return null
}

function sampleTrailPoints(points, max = 40) {
  if (points.length <= max) return points
  const step = (points.length - 1) / (max - 1)
  const sampled = []
  for (let i = 0; i < max; i += 1) {
    sampled.push(points[Math.round(i * step)])
  }
  return sampled
}

function coordsToOsrmString(latLngPoints) {
  return latLngPoints.map(([lat, lng]) => `${lng},${lat}`).join(';')
}

// Routed (road-following) path between stops — goes through the backend's
// own /routing/route endpoint (server-side OpenRouteService), the same
// reliable path every other tracking view in the app uses. The old version
// of this called public OSRM demo servers directly from the browser via a
// "/osrm" prefix that only exists as a local Vite dev-server proxy — in
// production there's no such route, so those requests silently failed and,
// unlike other pages, nothing here drew a fallback line, leaving the route
// blank with no visible error.
async function fetchBackendRoute(latLngPoints) {
  if (!latLngPoints || latLngPoints.length < 2) return null
  try {
    const coords = latLngPoints.map(([lat, lng]) => [lng, lat])
    const data = await getRoute(coords)
    if (!data?.geometry?.length) return null
    return {
      positions: data.geometry,
      distanceKm: data.distance_km || 0,
      durationMin: Math.round(data.duration_min || 0),
    }
  } catch {
    return null
  }
}

async function fetchOsrmMatch(latLngPoints) {
  if (!latLngPoints || latLngPoints.length < 2) return null
  const sampled = sampleTrailPoints(latLngPoints, 40)
  const coordStr = coordsToOsrmString(sampled)
  const radiuses = sampled.map(() => '40').join(';')
  const data = await osrmJson(
    `/match/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false&gaps=ignore&radiuses=${radiuses}`,
  )
  const match = data?.matchings?.[0]
  if (!match?.geometry?.coordinates) return null
  return match.geometry.coordinates.map(([lng, lat]) => [lat, lng])
}

async function fetchRouteLeg(from, to) {
  return fetchBackendRoute([[from[0], from[1]], [to[0], to[1]]])
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const stopIconCache = {}
function getStopIcon(index, isStart) {
  const key = `${index}-${isStart}`
  if (!stopIconCache[key]) {
    stopIconCache[key] = L.divIcon({
      className: 'admin-track-stop-icon',
      html: `<div style="width:26px;height:26px;border-radius:50%;background:${isStart ? '#10b981' : '#1a2e6f'};color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2)">${index + 1}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })
  }
  return stopIconCache[key]
}

const carIcon = L.divIcon({
  className: 'admin-track-car-icon',
  html: `<div style="width:32px;height:32px;background:#f97316;border-radius:10px;border:2px solid #fff;box-shadow:0 4px 12px rgba(249,115,22,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px"><i class="bi bi-car-front-fill"></i></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function MapUserInteraction({ onUserInteract }) {
  useMapEvents({
    dragstart: onUserInteract,
    zoomstart: onUserInteract,
    touchstart: onUserInteract,
  })
  return null
}

function MapFollowDriver({ center, enabled }) {
  const map = useMap()
  const lastPanRef = useRef(null)

  useEffect(() => {
    if (!enabled || !center) return
    const key = `${center[0].toFixed(4)},${center[1].toFixed(4)}`
    if (lastPanRef.current === key) return
    lastPanRef.current = key
    map.panTo(center, { animate: true, duration: 0.4, easeLinearity: 0.5 })
  }, [map, center, enabled])

  return null
}

function MapZoomControls() {
  const map = useMap()
  return (
    <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="h-11 w-11 rounded-xl bg-white shadow-lg border border-slate-200 text-slate-700 font-black text-xl hover:bg-slate-50 active:scale-95"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="h-11 w-11 rounded-xl bg-white shadow-lg border border-slate-200 text-slate-700 font-black text-xl hover:bg-slate-50 active:scale-95"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => {
          map.locate({ setView: true, maxZoom: 15 })
        }}
        className="h-11 w-11 rounded-xl bg-white shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 flex items-center justify-center"
        aria-label="My location"
      >
        <i className="bi bi-crosshair text-lg" />
      </button>
    </div>
  )
}

function formatLastUpdate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString()
}

export default function AdminTourTrackingModal({ tour, token, isOpen, onClose }) {
  const [driverLoc, setDriverLoc] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [details, setDetails] = useState(null)
  const [statusText, setStatusText] = useState('Connecting…')
  const [tourStatus, setTourStatus] = useState('')
  const [error, setError] = useState('')
  const [driverTrail, setDriverTrail] = useState([])
  const [snappedTrail, setSnappedTrail] = useState([])
  const [fullTourRoute, setFullTourRoute] = useState([])
  const [activeRoute, setActiveRoute] = useState([])
  const [etaMin, setEtaMin] = useState(null)
  const [distToNextKm, setDistToNextKm] = useState(null)
  const [speedKmh, setSpeedKmh] = useState(null)
  const [followDriver, setFollowDriver] = useState(true)

  const trailRef = useRef([])
  const prevLocRef = useRef(null)
  const prevTimeRef = useRef(null)
  const stopPositionsRef = useRef([])
  const lastRouteFetchRef = useRef({ at: 0, lat: null, lng: null })
  const userInteractedRef = useRef(false)
  const trailSnapTimerRef = useRef(null)
  const trailSnapInFlightRef = useRef(false)

  const stops = useMemo(
    () => (details?.locations || [])
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({ name: l.place_name, pos: [l.latitude, l.longitude] })),
    [details],
  )

  const stopPositions = useMemo(() => stops.map((s) => s.pos), [stops])

  useEffect(() => {
    stopPositionsRef.current = stopPositions
  }, [stopPositions])

  const scheduleTrailSnap = useCallback((points) => {
    if (trailSnapTimerRef.current) clearTimeout(trailSnapTimerRef.current)
    if (points.length < 2) {
      setSnappedTrail([])
      return
    }
    trailSnapTimerRef.current = setTimeout(async () => {
      if (trailSnapInFlightRef.current) return
      trailSnapInFlightRef.current = true
      try {
        const matched = await fetchOsrmMatch(points)
        if (matched && matched.length >= 2) {
          setSnappedTrail(matched)
          return
        }
        const legs = []
        for (let i = 1; i < points.length; i += 1) {
          const leg = await fetchRouteLeg(points[i - 1], points[i])
          if (leg?.positions?.length >= 2) {
            legs.push(...(legs.length ? leg.positions.slice(1) : leg.positions))
          }
        }
        if (legs.length >= 2) setSnappedTrail(legs)
      } finally {
        trailSnapInFlightRef.current = false
      }
    }, TRAIL_SNAP_DEBOUNCE_MS)
  }, [])

  useEffect(() => () => {
    if (trailSnapTimerRef.current) clearTimeout(trailSnapTimerRef.current)
  }, [])

  const resetTracking = useCallback(() => {
    trailRef.current = []
    prevLocRef.current = null
    prevTimeRef.current = null
    lastRouteFetchRef.current = { at: 0, lat: null, lng: null }
    userInteractedRef.current = false
    setDriverTrail([])
    setSnappedTrail([])
    setDriverLoc(null)
    setDetails(null)
    setFullTourRoute([])
    setActiveRoute([])
    setEtaMin(null)
    setDistToNextKm(null)
    setSpeedKmh(null)
    setError('')
  }, [])

  useEffect(() => {
    if (!isOpen) resetTracking()
  }, [isOpen, tour?.id, resetTracking])

  const applyStatus = useCallback((st) => {
    setTourStatus(st)
    if (st === 'arrived') setStatusText('Driver has arrived')
    else if (st === 'ongoing') setStatusText('Tour in progress')
    else if (st === 'en_route') setStatusText('Driver en route to pickup')
    else setStatusText(st.replace(/_/g, ' '))
  }, [])

  // Load tour details once when modal opens
  useEffect(() => {
    if (!isOpen || !tour?.id || !token) return undefined
    let cancelled = false
    getTourDetails(tour.id, token)
      .then((data) => {
        if (cancelled) return
        setDetails(data)
        applyStatus(data.status || '')
      })
      .catch(() => {
        if (!cancelled) setError('Could not load tour details')
      })
    return () => { cancelled = true }
  }, [isOpen, tour?.id, token, applyStatus])

  // Full tour route — fetch once when stops are known. Falls back to a
  // straight line between stops if routing is unavailable, so the map is
  // never left with no path drawn at all.
  useEffect(() => {
    if (!isOpen || stopPositions.length < 2) return undefined
    let cancelled = false
    fetchBackendRoute(stopPositions).then((route) => {
      if (cancelled) return
      setFullTourRoute(route ? route.positions : stopPositions)
    })
    return () => { cancelled = true }
  }, [isOpen, stopPositions])

  const maybeUpdateActiveRoute = useCallback(async (loc, status) => {
    const pts = stopPositionsRef.current
    if (!loc || pts.length === 0) return

    const now = Date.now()
    const last = lastRouteFetchRef.current
    const movedKm = last.lat != null
      ? haversineKm(last.lat, last.lng, loc.lat, loc.lng)
      : ROUTE_MOVE_KM + 1
    const stale = now - last.at > ROUTE_REFRESH_MS

    if (!stale && movedKm < ROUTE_MOVE_KM && activeRoute.length >= 2) return

    lastRouteFetchRef.current = { at: now, lat: loc.lat, lng: loc.lng }

    const driverPt = [loc.lat, loc.lng]
    const waypoints = status === 'ongoing' && pts.length >= 2
      ? [driverPt, ...pts.slice(1)]
      : [driverPt, pts[0]]

    const route = await fetchBackendRoute(waypoints)
    if (route) {
      setActiveRoute(route.positions)
      setEtaMin(route.durationMin)
      setDistToNextKm(+route.distanceKm.toFixed(1))
    } else {
      const dest = waypoints[waypoints.length - 1]
      const leg = await fetchRouteLeg(driverPt, dest)
      if (leg) {
        setActiveRoute(leg.positions)
        setEtaMin(leg.durationMin)
        setDistToNextKm(+leg.distanceKm.toFixed(1))
      } else {
        // Routing unavailable — still draw a straight line so "to next
        // stop" is never left completely blank.
        setActiveRoute([driverPt, dest])
      }
    }
  }, [activeRoute.length])

  // GPS polling — location only (no tour details refetch)
  useEffect(() => {
    if (!isOpen || !tour?.id || !token) return undefined

    const poll = async () => {
      try {
        const locRes = await getLiveDriverLocation(tour.id, token)
        if (locRes?.latitude == null) {
          setError('Waiting for driver GPS signal…')
          return
        }

        const lat = locRes.latitude
        const lng = locRes.longitude
        const now = Date.now()

        if (prevLocRef.current) {
          const [pLat, pLng] = prevLocRef.current
          const dtHours = (now - (prevTimeRef.current || now)) / 3600000
          const km = haversineKm(pLat, pLng, lat, lng)
          if (dtHours > 0 && km > 0.003) {
            setSpeedKmh(Math.min(120, Math.round((km / dtHours) * 10) / 10))
          }
          if (km * 1000 >= TRAIL_MIN_METERS) {
            trailRef.current = [...trailRef.current.slice(-(TRAIL_MAX_POINTS - 1)), [lat, lng]]
            const nextTrail = [...trailRef.current]
            setDriverTrail(nextTrail)
            scheduleTrailSnap(nextTrail)
          }
        } else {
          trailRef.current = [[lat, lng]]
          setDriverTrail([[lat, lng]])
        }

        prevLocRef.current = [lat, lng]
        prevTimeRef.current = now
        setDriverLoc({ lat, lng })
        setLastUpdate(locRes.last_update || new Date().toISOString())
        setError('')

        if (locRes.status) applyStatus(locRes.status)

        await maybeUpdateActiveRoute({ lat, lng }, locRes.status || tourStatus)
      } catch {
        setError('Waiting for driver GPS signal…')
      }
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [isOpen, tour?.id, token, tourStatus, applyStatus, maybeUpdateActiveRoute, scheduleTrailSnap])

  const handleUserInteract = useCallback(() => {
    userInteractedRef.current = true
    setFollowDriver(false)
  }, [])

  const handleRecenter = useCallback(() => {
    userInteractedRef.current = false
    setFollowDriver(true)
  }, [])

  const initialCenter = useMemo(() => {
    if (tour?.pickup_lat && tour?.pickup_lng) return [tour.pickup_lat, tour.pickup_lng]
    if (stopPositions[0]) return stopPositions[0]
    return [7.85, 80.65]
  }, [tour?.pickup_lat, tour?.pickup_lng, stopPositions])

  const followCenter = driverLoc ? [driverLoc.lat, driverLoc.lng] : null

  const drivenPath = snappedTrail.length >= 2 ? snappedTrail : driverTrail

  if (!isOpen || !tour) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[94vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl flex flex-col">
        <div className="bg-gradient-to-r from-[#1a2e6f] via-indigo-900 to-violet-900 px-5 sm:px-8 py-4 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/90">Live GPS Tracking</p>
            <h2 className="text-lg sm:text-xl font-black truncate">Tour #{tour.id} · {tour.driver_name || 'Driver'}</h2>
            <p className="text-xs sm:text-sm text-blue-100/80 truncate">Traveler: {tour.user_name || '—'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRecenter}
              className={`items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition hidden sm:flex ${followDriver ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <i className="bi bi-crosshair" /> Recenter
            </button>
            <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 shrink-0">
          {[
            { label: 'Status', value: statusText, icon: 'bi-broadcast-pin', accent: 'text-orange-600' },
            { label: 'ETA', value: etaMin != null ? (tourStatus === 'arrived' ? 'Arrived' : tourStatus === 'ongoing' ? 'On trip' : `${etaMin} min`) : '—', icon: 'bi-clock-history', accent: 'text-indigo-600' },
            { label: 'To next', value: distToNextKm != null ? `${distToNextKm} km` : '—', icon: 'bi-signpost-split', accent: 'text-emerald-600' },
            { label: 'Speed', value: speedKmh != null ? `${speedKmh} km/h` : '—', icon: 'bi-speedometer2', accent: 'text-violet-600' },
          ].map((item) => (
            <div key={item.label} className="bg-white px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <i className={`bi ${item.icon}`} /> {item.label}
              </p>
              <p className={`text-sm font-black mt-0.5 capitalize truncate ${item.accent}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 min-h-0">
          <div className="lg:col-span-2 relative bg-slate-200 min-h-[300px] touch-pan-y">
            <MapContainer
              key={tour.id}
              center={initialCenter}
              zoom={13}
              className="h-full w-full z-0"
              scrollWheelZoom
              zoomControl={false}
              doubleClickZoom
              touchZoom
              dragging
              preferCanvas
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
                maxZoom={19}
                updateWhenZooming={false}
                updateInterval={200}
              />
              <MapUserInteraction onUserInteract={handleUserInteract} />
              <MapFollowDriver center={followCenter} enabled={followDriver && !!driverLoc} />

              {fullTourRoute.length >= 2 && (
                <Polyline positions={fullTourRoute} pathOptions={{ color: '#94a3b8', weight: 4, opacity: 0.45, lineJoin: 'round', lineCap: 'round' }} />
              )}
              {drivenPath.length >= 2 && (
                <Polyline positions={drivenPath} pathOptions={{ color: '#c2410c', weight: 4, opacity: 0.85, lineJoin: 'round', lineCap: 'round' }} />
              )}
              {activeRoute.length >= 2 && (
                <Polyline positions={activeRoute} pathOptions={{ color: '#f97316', weight: 5, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }} />
              )}

              {stops.map((stop, i) => (
                <Marker key={`stop-${i}`} position={stop.pos} icon={getStopIcon(i, i === 0)}>
                  <Popup><strong>{i === 0 ? 'Pickup' : `Stop ${i + 1}`}</strong><br />{stop.name}</Popup>
                </Marker>
              ))}

              {driverLoc && (
                <Marker position={[driverLoc.lat, driverLoc.lng]} icon={carIcon} zIndexOffset={1000}>
                  <Popup><strong>{tour.driver_name || 'Driver'}</strong></Popup>
                </Marker>
              )}
              <MapZoomControls />
            </MapContainer>

            {!followDriver && driverLoc && (
              <button
                type="button"
                onClick={handleRecenter}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-black shadow-lg flex items-center gap-2"
              >
                <i className="bi bi-crosshair" /> Follow driver
              </button>
            )}

            <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 backdrop-blur px-3 py-2 shadow-lg border border-slate-100 text-[10px] font-bold space-y-1 z-[1000] pointer-events-none">
              <div className="flex items-center gap-2"><span className="w-5 h-1 rounded bg-orange-500" /> Active path</div>
              <div className="flex items-center gap-2"><span className="w-5 h-1 rounded bg-[#c2410c]" /> Driven trail</div>
              <div className="flex items-center gap-2"><span className="w-5 h-1 rounded bg-slate-400" /> Full route</div>
            </div>

            {lastUpdate && (
              <div className="absolute top-4 right-4 rounded-xl bg-white/95 backdrop-blur px-3 py-2 shadow-lg border border-slate-100 z-[1000] pointer-events-none">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">GPS</p>
                <p className="text-xs font-black text-slate-800">{formatLastUpdate(lastUpdate)}</p>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/50">
            {error && !driverLoc && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm font-semibold text-amber-800">
                {error}
              </div>
            )}

            <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Itinerary</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stops.length === 0 ? (
                  <p className="text-xs text-slate-500">Loading stops…</p>
                ) : stops.map((stop, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0 ${i === 0 ? 'bg-emerald-500' : 'bg-[#1a2e6f]'}`}>{i + 1}</span>
                    <span className="font-bold text-slate-800 truncate">{stop.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
                <p className="text-[9px] font-black uppercase text-sky-500">Traveler</p>
                <p className="font-black text-slate-900 mt-1 truncate">{tour.user_name || '—'}</p>
              </div>
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                <p className="text-[9px] font-black uppercase text-orange-500">Driver</p>
                <p className="font-black text-slate-900 mt-1 truncate">{tour.driver_name || '—'}</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold text-center pt-2">
              Pinch or scroll to zoom · Drag to pan · Tap +/− on map
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
