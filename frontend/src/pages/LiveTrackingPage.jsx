import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getLiveDriverLocation, getTourDetails, driverUploadUrl, cancelTour, submitFeedback, getRoute, addTourLocation, removeTourLocation } from '../services/api.js'
import CancellationModal from '../components/CancellationModal.jsx'
import FeedbackModal from '../components/FeedbackModal.jsx'
import RatingStars from '../components/RatingStars.jsx'

// Same geocoder/bias/filtering approach used for initial trip planning
// (Home.jsx) — duplicated here rather than shared, so this page doesn't
// depend on Home.jsx's internals just for one search box.
async function searchSriLankaPlaces(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '6',
    lang: 'en',
    lat: '7.8731',
    lon: '80.7718',
    bbox: '79.3,5.7,82.1,10.0',
  })
  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  const data = await response.json()
  const features = Array.isArray(data.features) ? data.features : []
  const NON_ROUTABLE_TYPES = new Set(['state', 'county', 'country', 'region'])
  return features
    .filter((f) => (f.properties?.countrycode || '').toUpperCase() === 'LK')
    .filter((f) => !NON_ROUTABLE_TYPES.has(f.properties?.type))
    .map((f) => {
      const p = f.properties || {}
      const [lon, lat] = f.geometry?.coordinates || []
      const nameParts = [p.name, p.street, p.district, p.city || p.county, p.state].filter(Boolean)
      const display = [...new Set(nameParts)].join(', ') || p.name || 'Unnamed location'
      return { display_name: display, lat: String(lat), lon: String(lon) }
    })
    .filter((r) => Number.isFinite(parseFloat(r.lat)) && Number.isFinite(parseFloat(r.lon)))
}

// Custom Pin Icons with elegant design
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const carIcon = new L.divIcon({
  className: 'custom-car-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-12 h-12 bg-orange-500/20 rounded-full animate-ping"></div>
      <div class="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-2xl border-2 border-white transform rotate-45">
        <i class="bi bi-car-front-fill transform -rotate-45 text-xl"></i>
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
})

// Helper to calculate distance and ETA
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function MapController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 2 })
  }, [center, zoom, map])
  return null
}

export default function LiveTrackingPage({ tourId, token, userLat, userLng, onBack }) {
  const [tourDetails, setTourDetails] = useState(null)
  const [driverLoc, setDriverLoc] = useState(null)
  const [route, setRoute] = useState([])
  const [eta, setEta] = useState(null)
  const [distKm, setDistKm] = useState(null)
  const [distanceIsLive, setDistanceIsLive] = useState(false)
  const [status, setStatus] = useState('Locating your driver...')
  const [panelOpen, setPanelOpen] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  // Trip-stops editing — only meaningful while the tour is actually ongoing
  // (matches the backend's own guard on the add/remove-stop endpoints).
  const [showAddStop, setShowAddStop] = useState(false)
  const [stopQuery, setStopQuery] = useState('')
  const [stopResults, setStopResults] = useState([])
  const [stopSearching, setStopSearching] = useState(false)
  const [stopSaving, setStopSaving] = useState(false)
  const [stopError, setStopError] = useState('')
  const stopSearchTimerRef = useRef(null)

  const imgUrl = (path) => driverUploadUrl(path)

  const feedbackShownRef = useRef(false)

  // Tracks the driver's actual recent pace (km/h), derived from consecutive
  // GPS fixes, so ETA reflects how fast they're really moving right now
  // rather than OSRM's generic road-speed assumption or a flat guess.
  const prevLocRef = useRef(null) // { lat, lng, time }
  const speedKmhRef = useRef(30) // sensible default until we have real samples
  const speedSamplesRef = useRef(0)
  const lastRouteFetchRef = useRef(0)

  // 1. Fetch Tour Details (includes driver & stops)
  useEffect(() => {
    if (!tourId || !token) return
    getTourDetails(tourId, token).then(setTourDetails).catch(console.error)
    // Reset speed tracking for the new tour
    prevLocRef.current = null
    lastRouteFetchRef.current = 0
    speedKmhRef.current = 30
    speedSamplesRef.current = 0
  }, [tourId, token])

  // 2. Poll Driver GPS & Status
  useEffect(() => {
    const poll = async () => {
      try {
        // Fetch details first to check status
        const details = await getTourDetails(tourId, token)
        setTourDetails(details)
        
        // Auto-show feedback modal only for completed tours — the backend only
        // accepts reviews for completed tours, so showing this for a cancelled
        // tour would let the user submit a rating that always fails with 400.
        if (details.status === 'completed' && !feedbackShownRef.current && details.driver) {
          setShowFeedbackModal(true)
          feedbackShownRef.current = true
        }

        // Handle Status Labels
        if (details.status === 'arrived') setStatus('Driver has arrived')
        else if (details.status === 'ongoing') setStatus('Tour in progress')
        else if (details.status === 'en_route') setStatus('Driver is en route')
        else setStatus(details.status.replace(/_/g, ' '))

        // Fetch location separately so it doesn't block status updates
        try {
          const locData = await getLiveDriverLocation(tourId, token)
          if (locData.latitude && locData.longitude) {
            const loc = [locData.latitude, locData.longitude]
            setDriverLoc(loc)

            // Update the driver's actual pace from how far they moved since the
            // last GPS fix, smoothed to ignore single-sample GPS noise/jumps.
            const now = Date.now()
            const prev = prevLocRef.current
            if (prev) {
              const elapsedHours = (now - prev.time) / 3_600_000
              if (elapsedHours > 0) {
                const movedKm = haversineKm(prev.lat, prev.lng, locData.latitude, locData.longitude)
                const rawSpeedKmh = movedKm / elapsedHours
                // Discard implausible spikes (GPS jump) or noise near-zero movement;
                // a driver briefly stopped in traffic just won't update the average much.
                if (rawSpeedKmh >= 1 && rawSpeedKmh <= 120) {
                  speedKmhRef.current = speedSamplesRef.current === 0
                    ? rawSpeedKmh
                    : speedKmhRef.current * 0.6 + rawSpeedKmh * 0.4
                  speedSamplesRef.current += 1
                }
              }
            }
            prevLocRef.current = { lat: locData.latitude, lng: locData.longitude, time: now }

            if (userLat && userLng) {
              if (details.status === 'arrived') {
                setEta('At Pickup')
              } else if (details.status === 'ongoing') {
                setEta('On Trip')
              }

              if (details.status !== 'ongoing') {
                // Only actually re-fetch the route at most once every 10s
                // (the location poll itself runs every 4s) — but the route
                // already on screen must stay visible in between fetches.
                // This used to fall through to the "clear the route" branch
                // below on every throttled-out poll, wiping the red path off
                // the map for most of each 10s window instead of only when
                // the trip actually starts.
                if (Date.now() - lastRouteFetchRef.current >= 10000) {
                  // Real road-routed distance via our backend (OpenRouteService) —
                  // a straight-line haversine estimate understated real driving
                  // distance on winding roads.
                  lastRouteFetchRef.current = Date.now()
                  getRoute([[locData.longitude, locData.latitude], [userLng, userLat]])
                    .then(routeResult => {
                      if (!routeResult.geometry?.length) throw new Error('No route found')
                      setRoute(routeResult.geometry)
                      const routeKm = routeResult.distance_km
                      setDistKm(routeKm.toFixed(1))
                      setDistanceIsLive(true)
                      if (details.status !== 'arrived') {
                        // ETA from the driver's actual current pace, not OSRM's generic
                        // road-speed assumption — reflects real traffic/conditions.
                        const mins = Math.round((routeKm / speedKmhRef.current) * 60)
                        setEta(mins < 1 ? 'Arriving' : `${mins} min`)
                      }
                    })
                    .catch(() => {
                      // Fall back to a straight-line estimate, clearly marked as such.
                      const km = haversineKm(locData.latitude, locData.longitude, userLat, userLng) * 1.25
                      setDistKm(km.toFixed(1))
                      setDistanceIsLive(false)
                      if (details.status !== 'arrived') {
                        const mins = Math.round((km / speedKmhRef.current) * 60)
                        setEta(mins < 1 ? 'Arriving' : `${mins} min`)
                      }
                      setRoute([[locData.latitude, locData.longitude], [userLat, userLng]])
                    })
                }
              } else {
                setRoute([])
              }
            }
          }
        } catch (locErr) {
          // Location might fail if tour just started or just ended, ignore
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [tourId, token, userLat, userLng])

  const handleCancelConfirm = async (reason) => {
    setCancelling(true)
    try {
      await cancelTour(tourId, reason, token)
      setShowCancelModal(false)
      // Cancelled tours are never eligible for a review (backend only accepts
      // feedback for completed tours), so just exit back to the dashboard.
      onBack()
    } catch (err) {
      alert(err.message || 'Failed to cancel tour')
    } finally {
      setCancelling(false)
    }
  }

  const handleFeedbackSubmit = async (rating, comment) => {
    setSubmittingFeedback(true)
    try {
      await submitFeedback(tourId, rating, comment, token)
      setShowFeedbackModal(false)
      onBack() // Exit to dashboard
    } catch (err) {
      alert(err.message || 'Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const handleStopSearchChange = (value) => {
    setStopQuery(value)
    if (stopSearchTimerRef.current) clearTimeout(stopSearchTimerRef.current)
    if (!value.trim()) { setStopResults([]); return }
    stopSearchTimerRef.current = setTimeout(async () => {
      setStopSearching(true)
      try {
        const results = await searchSriLankaPlaces(value)
        setStopResults(results)
      } catch {
        setStopResults([])
      } finally {
        setStopSearching(false)
      }
    }, 400)
  }

  const handleAddStop = async (place) => {
    setStopSaving(true)
    setStopError('')
    try {
      const updated = await addTourLocation(tourId, {
        place_name: place.display_name,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
      }, token)
      setTourDetails((prev) => prev ? { ...prev, locations: updated.locations, total_distance_km: updated.total_distance_km, estimated_price: updated.estimated_price } : prev)
      setShowAddStop(false)
      setStopQuery('')
      setStopResults([])
    } catch (err) {
      setStopError(err.message || 'Could not add stop')
    } finally {
      setStopSaving(false)
    }
  }

  const handleRemoveStop = async (locationId) => {
    setStopSaving(true)
    setStopError('')
    try {
      const updated = await removeTourLocation(tourId, locationId, token)
      setTourDetails((prev) => prev ? { ...prev, locations: updated.locations, total_distance_km: updated.total_distance_km, estimated_price: updated.estimated_price } : prev)
    } catch (err) {
      setStopError(err.message || 'Could not remove stop')
    } finally {
      setStopSaving(false)
    }
  }

  const userCenter = userLat && userLng ? [userLat, userLng] : [6.9271, 79.8612]
  const driver = tourDetails?.driver
  const canEditStops = tourDetails?.status === 'ongoing'
  const stops = Array.isArray(tourDetails?.locations) ? tourDetails.locations : []

  return (
    <div className="flex h-screen flex-col bg-white font-['Inter',sans-serif] overflow-hidden text-slate-900">
      
      {/* ── Minimal Header ── */}
      <header className="bg-white/90 backdrop-blur-xl px-8 py-5 flex items-center justify-between border-b border-slate-100 z-[1100]">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Air B&C</h1>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{status}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!panelOpen && (
            <div 
              onClick={() => setPanelOpen(true)}
              className="bg-white rounded-2xl p-3 shadow-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-md">
                <i className="bi bi-info-circle text-sm"></i>
              </div>
              <div className="pr-1">
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Journey</p>
                <p className="text-[10px] font-black text-slate-900 leading-none">{status}</p>
              </div>
            </div>
          )}
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking ID</p>
            <p className="text-base font-black text-slate-900 leading-none">#{tourId}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
            <i className="bi bi-shield-check text-xl"></i>
          </div>
        </div>
      </header>

      {/* ── Map Container ── */}
      <div className="flex-1 relative">
        <MapContainer center={userCenter} zoom={13} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          
          <MapController center={driverLoc || userCenter} zoom={14} />

          {/* User Marker */}
          <Marker position={userCenter} icon={userIcon}>
            <Popup><span className="font-bold">Your Location</span></Popup>
          </Marker>

          {/* Driver Marker */}
          {driverLoc && (
            <>
              <Marker position={driverLoc} icon={carIcon} />
              {route.length > 0 && (
                <Polyline positions={route} color="#ef4444" weight={5} opacity={0.75} dashArray={distanceIsLive ? undefined : '10, 15'} />
              )}
            </>
          )}

          {/* Remaining stops (pickup at index 0 is already the "Your Location"
              marker above) — lets the traveler see exactly what they're
              editing, not just a list. */}
          {stops.slice(1).map((stop, idx) => (
            <Marker
              key={stop.id}
              position={[stop.latitude, stop.longitude]}
              icon={new L.divIcon({
                className: 'custom-stop-icon',
                html: `<div style="background-color:#0f172a;width:26px;height:26px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:900;box-shadow:0 4px 10px rgba(0,0,0,0.15);">${idx + 2}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13],
              })}
            >
              <Popup>{stop.place_name}</Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ── Top ETA Badge ── */}
        {driverLoc && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md rounded-3xl px-8 py-4 shadow-2xl border border-slate-100 flex items-center gap-6">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
              tourDetails?.status === 'arrived' ? 'bg-emerald-500 shadow-emerald-500/20' : 
              tourDetails?.status === 'ongoing' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-blue-500 shadow-blue-500/20'
            }`}>
              <i className={`bi ${tourDetails?.status === 'arrived' ? 'bi-check-circle-fill' : 'bi-lightning-charge-fill'} text-xl`}></i>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {tourDetails?.status === 'ongoing' ? 'Distance Covered' : 'Arrival Status'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {tourDetails?.status === 'ongoing' ? `${tourDetails.actual_distance_km?.toFixed(1) || 0} km` : eta || '--'}
                </span>
                {tourDetails?.status !== 'ongoing' && distKm && (
                  <span className="text-xs font-bold text-slate-500 uppercase">{distKm} km away</span>
                )}
              </div>
              {tourDetails?.status !== 'ongoing' && distKm && (
                <p className={`text-[9px] font-bold mt-1 flex items-center gap-1 ${distanceIsLive ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <i className={`bi ${distanceIsLive ? 'bi-signpost-split-fill' : 'bi-rulers'}`}></i>
                  {distanceIsLive ? 'Real road route' : 'Estimated'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom Floating Panel ── */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-[1000] transition-all duration-700 ease-in-out ${panelOpen ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0 pointer-events-none'}`}>
          <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden">

            {/* Control Handle */}
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="w-full h-10 flex items-center justify-center hover:bg-slate-50 transition"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
            </button>

            {/* ── Driver Info Row ── */}
            <div className="px-8 pt-4 pb-7">
              
              {/* Main row: Profile | Name+Rating | Vehicle circle | Call */}
              <div className="flex items-center gap-4 mb-6">
                
                {/* Driver profile circle */}
                <div className="relative flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden border-[3px] border-white shadow-lg">
                    {driver?.profile_photo ? (
                      <img src={imgUrl(driver.profile_photo)} alt="Driver" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xl font-black text-slate-300">
                        {driver?.name?.charAt(0) || 'D'}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[8px]">
                    <i className="bi bi-check-lg"></i>
                  </div>
                </div>

                {/* Name & rating */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1 truncate">{driver?.name || 'Assigned Driver'}</h4>
                  <RatingStars rating={driver?.rating} totalRatings={driver?.total_ratings} />
                </div>

                {/* Vehicle image circle */}
                {driver?.vehicle_front_image && (
                  <div className="relative flex-shrink-0">
                    <div className="h-24 w-24 rounded-full overflow-hidden border-[3px] border-slate-100 shadow-xl bg-slate-50">
                      <img
                        src={imgUrl(driver.vehicle_front_image)}
                        alt="Vehicle"
                        className="h-full w-full object-cover"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    </div>
                    {/* Vehicle type micro-badge */}
                    <div className="absolute -bottom-1 -left-0.5 bg-orange-500 text-white text-[7px] font-black px-2 py-1 rounded-full shadow-md leading-none whitespace-nowrap">
                      {(driver?.vehicle_type || 'Car').toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Call button */}
                <a
                  href={`tel:${driver?.phone}`}
                  className="h-14 w-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                >
                  <i className="bi bi-telephone-fill"></i>
                </a>
              </div>

              {/* Vehicle detail chips */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0">
                    <i className="bi bi-car-front-fill text-sm"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-0.5">Vehicle</p>
                    <p className="text-base font-black text-slate-900 truncate leading-tight">{driver?.vehicle_brand || 'Standard'} · {driver?.vehicle_color || ''}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-[2rem] p-6 flex items-center gap-5">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                    <i className="bi bi-card-text text-xl"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-0.5">Plate</p>
                    <p className="text-base font-black text-slate-900 truncate leading-tight">{driver?.vehicle_number || 'WP XXX-XXXX'}</p>
                  </div>
                </div>
              </div>

              {/* Trip stops — editable only while the tour is genuinely
                  ongoing, matching the backend's own guard. */}
              {canEditStops && stops.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em]">Trip Stops</p>
                    <button
                      type="button"
                      onClick={() => setShowAddStop((v) => !v)}
                      className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition uppercase tracking-widest"
                    >
                      <i className="bi bi-plus-lg mr-1" /> Add Stop
                    </button>
                  </div>

                  <div className="space-y-2">
                    {stops.map((stop, idx) => (
                      <div key={stop.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                        <span className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0 ${idx === 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}>{idx + 1}</span>
                        <span className="flex-1 min-w-0 text-sm font-bold text-slate-700 truncate">{stop.place_name || `${stop.latitude?.toFixed(3)}, ${stop.longitude?.toFixed(3)}`}</span>
                        {idx === 0 ? (
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Pickup</span>
                        ) : (
                          <button
                            type="button"
                            disabled={stopSaving || stops.length <= 2}
                            onClick={() => handleRemoveStop(stop.id)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition disabled:opacity-30"
                          >
                            <i className="bi bi-trash text-xs" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {showAddStop && (
                    <div className="mt-3 relative">
                      <input
                        type="text"
                        autoFocus
                        value={stopQuery}
                        onChange={(e) => handleStopSearchChange(e.target.value)}
                        placeholder="Search a place to add…"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-400"
                      />
                      {stopSearching && <p className="text-[10px] text-slate-400 mt-1 px-1">Searching…</p>}
                      {stopResults.length > 0 && (
                        <ul className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-lg">
                          {stopResults.map((r, i) => (
                            <li key={i}>
                              <button
                                type="button"
                                disabled={stopSaving}
                                onClick={() => handleAddStop(r)}
                                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-orange-50 transition disabled:opacity-50"
                              >
                                {r.display_name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {stopError && <p className="text-[10px] font-bold text-rose-500 mt-2">{stopError}</p>}
                </div>
              )}

              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-100"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      </div>

      <CancellationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        loading={cancelling}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => onBack()}
        onSubmit={handleFeedbackSubmit}
        tourId={tourId}
        driverName={driver?.name}
        loading={submittingFeedback}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { font-family: 'Inter', sans-serif; }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}} />
    </div>
  )
}
