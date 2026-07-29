import { useEffect, useState, useCallback, useRef } from 'react'
import { getTourDetails, acceptDriverPrice, rejectDriverPrice, replyToDriver, getRoute } from '../services/api.js'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon for Driver
const driverIcon = new L.divIcon({
  className: 'custom-driver-icon',
  html: `<div style="background-color: #f59e0b; width: 36px; height: 36px; border-radius: 12px; border: 3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px; color: white;"><i class="bi bi-car-front-fill"></i></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

// Haversine distance calculation in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

export default function TourDetailsModal({ tourId, token, isOpen, onClose, userRole = 'user' }) {
  const [tour, setTour] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [driverLocation, setDriverLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [routeCoords, setRouteCoords] = useState([])
  const [pickupDistanceKm, setPickupDistanceKm] = useState(null)
  const [pickupDistanceLive, setPickupDistanceLive] = useState(false)
  const [toPickupRouteCoords, setToPickupRouteCoords] = useState([])
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)
  const lastTapRef = useRef(0)
  const touchHandledRef = useRef(false)

  // Double-tap (or double-click, for desktop testing) toggles the map
  // between its normal embedded size and a fullscreen overlay. Leaflet's own
  // double-click-zoom is disabled on both map instances below so the two
  // behaviors don't fire at once on the same gesture.
  //
  // A single physical tap on mobile fires BOTH a `touchend` and a synthetic
  // `click` shortly after — without the guard below, one real tap gets
  // counted twice (touchend + click), which looks exactly like a double-tap
  // and opens fullscreen after only one touch. touchHandledRef makes the
  // click handler ignore the ghost click that follows a touch we already
  // processed.
  const handleMapTap = useCallback((e) => {
    // A pinch-to-zoom gesture lifts two fingers, firing touchend more than
    // once for what is really one continuous gesture — ignore those so
    // zooming the small embedded map can never be misread as a double-tap.
    // e.touches still holds any fingers that haven't lifted yet; a genuine
    // single-finger tap always ends with none remaining.
    if (e.type === 'touchend' && e.touches && e.touches.length > 0) return

    if (e.type === 'click' && touchHandledRef.current) {
      touchHandledRef.current = false
      return
    }
    if (e.type === 'touchend') {
      touchHandledRef.current = true
      setTimeout(() => { touchHandledRef.current = false }, 500)
    }

    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setIsMapFullscreen((prev) => !prev)
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }, [])

  // Let Escape close fullscreen too, since a keyboard/mouse user has no
  // "double-tap" gesture to fall back on.
  useEffect(() => {
    if (!isMapFullscreen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsMapFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMapFullscreen])

  // Closing the modal, or switching to a different tour while it's open,
  // should always leave fullscreen map mode behind.
  useEffect(() => {
    setIsMapFullscreen(false)
  }, [isOpen, tourId])

  const handleAccept = async () => {
    setActionLoading(true)
    try {
      await acceptDriverPrice(tourId, token)
      const data = await getTourDetails(tourId, token)
      setTour(data || {})
    } catch (err) {
      setError(err.message || 'Failed to accept price')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await rejectDriverPrice(tourId, token)
      const data = await getTourDetails(tourId, token)
      setTour(data || {})
    } catch (err) {
      setError(err.message || 'Failed to reject price')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyMessage.trim()) return
    setActionLoading(true)
    try {
      await replyToDriver(tourId, replyMessage, token)
      setReplyMessage('')
      setShowReplyInput(false)
      alert('Reply sent successfully!')
    } catch (err) {
      setError(err.message || 'Failed to send reply')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    // SECURITY/UX FIX: Only attempt to get GPS if the viewer is the DRIVER.
    // Users should not be prompted for GPS inside this details modal.
    if (isOpen && userRole === 'driver' && navigator.geolocation) {
      setLocationError('')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDriverLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn("Could not get driver geolocation:", error)
          // No fake fallback location — a substituted position would silently
          // produce a wrong "distance to pickup" with no indication it's fake.
          setDriverLocation(null)
          setLocationError('Enable location access to see distance to pickup.')
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      // Clear location state if user is not driver so it doesn't show the user's location as the driver's!
      setDriverLocation(null)
      setLocationError('')
    }
  }, [isOpen, userRole])

  // Real road-routed distance from the driver's current location to the pickup
  // point, via OSRM — replaces the old straight-line haversine estimate, which
  // under-reports actual driving distance (especially around Sri Lanka's
  // winding roads/coastline) and was showing as "inaccurate".
  useEffect(() => {
    const pickup = locations.filter((loc) => loc.latitude && loc.longitude)[0]
    if (!driverLocation || !pickup) {
      setPickupDistanceKm(null)
      setPickupDistanceLive(false)
      setToPickupRouteCoords([])
      return undefined
    }

    let cancelled = false
    getRoute([[driverLocation.lng, driverLocation.lat], [pickup.longitude, pickup.latitude]])
      .then((data) => {
        if (cancelled) return
        if (!data.geometry?.length) throw new Error('No route found')
        setPickupDistanceKm(data.distance_km.toFixed(1))
        setPickupDistanceLive(true)
        setToPickupRouteCoords(data.geometry)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('Pickup routing failed, falling back to straight-line estimate:', err)
        const straightLineKm = calculateDistance(driverLocation.lat, driverLocation.lng, pickup.latitude, pickup.longitude)
        setPickupDistanceKm((straightLineKm * 1.25).toFixed(1))
        setPickupDistanceLive(false)
        setToPickupRouteCoords([[driverLocation.lat, driverLocation.lng], [pickup.latitude, pickup.longitude]])
      })

    return () => { cancelled = true }
  }, [driverLocation, locations])

  useEffect(() => {
    if (!isOpen || !tourId || !token) return

    const loadTourDetails = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getTourDetails(tourId, token)
        setTour(data || {})
        const locs = Array.isArray(data?.locations) ? data.locations : []
        setLocations(locs)

        // Fetch the tour's road route
        const validLocs = locs.filter(loc => loc.latitude && loc.longitude)
        if (validLocs.length >= 2) {
          try {
            const routeData = await getRoute(validLocs.map(l => [l.longitude, l.latitude]))
            if (routeData.geometry?.length) setRouteCoords(routeData.geometry)
          } catch (routeErr) {
            console.warn('Tour route fetch failed:', routeErr)
          }
        }
      } catch (err) {
        setError(err.message || 'Could not load tour details')
      } finally {
        setLoading(false)
      }
    }

    loadTourDetails()
  }, [isOpen, tourId, token])

  if (!isOpen) return null

  const validLocations = locations.filter(loc => loc.latitude && loc.longitude);
  const polylinePositions = validLocations.map(loc => [loc.latitude, loc.longitude]);

  // Adjust map center: focus on driver location or pickup location
  let mapCenter = [7.8731, 80.7718]; // Default
  if (driverLocation) {
    mapCenter = [driverLocation.lat, driverLocation.lng];
  } else if (polylinePositions.length > 0) {
    mapCenter = polylinePositions[0];
  }

  // Shared between the embedded map and the fullscreen overlay so the two
  // views never drift out of sync with each other.
  const mapLegend = (toPickupRouteCoords.length > 1 || routeCoords.length > 1) && (
    <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-2xl px-4 py-3 shadow-lg border border-slate-100 space-y-1.5">
      {toPickupRouteCoords.length > 1 && (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span className="w-4 h-0.5 rounded-full bg-red-500"></span>
          To Pickup
        </div>
      )}
      {routeCoords.length > 1 && (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span className="w-4 h-0.5 rounded-full bg-blue-600"></span>
          Tour Route
        </div>
      )}
    </div>
  )

  // doubleClickZoom is disabled so a double-tap/double-click always toggles
  // fullscreen instead of also zooming the map in at the same time.
  const mapView = (
    <MapContainer center={mapCenter} zoom={9} scrollWheelZoom={isMapFullscreen} doubleClickZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
          <Popup>Your current location</Popup>
        </Marker>
      )}

      {/* Driver → Pickup route (red) */}
      {toPickupRouteCoords.length > 1 && (
        <Polyline
          positions={toPickupRouteCoords}
          color="#ef4444"
          weight={5}
          opacity={0.85}
          lineJoin="round"
          dashArray={pickupDistanceLive ? undefined : '8, 8'}
        />
      )}

      {/* Tour route across all stops (blue) */}
      {routeCoords.length > 1 && (
        <Polyline positions={routeCoords} color="#2563eb" weight={5} opacity={0.8} lineJoin="round" />
      )}

      {/* Destination Markers */}
      {validLocations.map((loc, idx) => (
        <Marker key={loc.id || idx} position={[loc.latitude, loc.longitude]}
          icon={new L.divIcon({
            className: 'custom-stop-icon',
            html: `<div style="background-color: ${idx === 0 ? '#10b981' : '#1a2e6f'}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: 900;">${idx === 0 ? '<i class="bi bi-person-fill"></i>' : idx}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })}
        >
          <Popup>
            <div className="p-2">
              <p className="font-black text-slate-800">{loc.place_name}</p>
              <p className="text-xs text-slate-400 mt-1">{idx === 0 ? "Pickup Location" : `Stop ${idx}`}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-6xl transform rounded-[2rem] bg-white shadow-2xl transition-all border border-slate-200 overflow-hidden flex flex-col h-[90vh]">
          
          {/* Header */}
          <div className="border-b border-slate-100 bg-white px-8 py-6 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 text-2xl">
                <i className="bi bi-geo-fill"></i>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Tour Itinerary</h2>
                <p className="text-sm text-slate-400 font-bold tracking-wide">ID: #{tourId} • Active Request</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100"
            >
              <i className="bi bi-x-lg text-lg"></i>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

            {/* Left: Map — fixed height on mobile so it can't be squeezed to
                nothing by the details panel's content below it; only becomes
                flex-1 (fills remaining width) once the two sit side-by-side
                at the lg breakpoint. Double-tap (or double-click) opens the
                fullscreen view below. */}
            <div
              className="h-72 shrink-0 lg:h-auto lg:flex-1 relative bg-slate-50 border-r border-slate-100"
              onClick={handleMapTap}
              onTouchEnd={handleMapTap}
            >
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-50/80">
                  <div className="text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-500" />
                    <p className="mt-4 text-slate-500 font-bold">Rendering route map...</p>
                  </div>
                </div>
              ) : isMapFullscreen ? (
                // The fullscreen overlay below covers the whole screen while
                // open, so this slot is only ever visible for an instant
                // during the transition — deliberately left empty rather
                // than mounting a second live Leaflet instance (which was
                // also the cause of the duplicated "To Pickup"/"Tour Route"
                // legend: two legends, one per map instance, both fixed
                // z-[1000] and each compared in its own stacking context).
                null
              ) : (
                <>
                  {mapLegend}
                  {(toPickupRouteCoords.length > 1 || routeCoords.length > 1) && (
                    <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/70 text-white text-[10px] font-bold px-3 py-1.5 rounded-full pointer-events-none">
                      Double-tap map to expand
                    </div>
                  )}
                  {mapView}
                </>
              )}
            </div>

            {/* Right: Details Panel — flex-1 + min-h-0 so it takes exactly the
                remaining vertical space left by the fixed-height map above it
                on mobile, and scrolls its own content instead of pushing the
                map's height down to fit. */}
            <div className="flex-1 min-h-0 lg:flex-none lg:w-[400px] bg-white overflow-y-auto p-8 space-y-8">
              
              {/* Distance to Pickup (Driver Only) */}
              {userRole === 'driver' && pickupDistanceKm && (
                <div className="bg-orange-50 rounded-2xl p-6 border-2 border-orange-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                      <i className="bi bi-cursor-fill text-xl"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">To Pickup</p>
                      <p className="text-xl font-black text-slate-900">{pickupDistanceKm} km</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase">Approaching</span>
                    <p className={`text-[10px] font-bold mt-1 flex items-center justify-end gap-1 ${pickupDistanceLive ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <i className={`bi ${pickupDistanceLive ? 'bi-signpost-split-fill' : 'bi-rulers'}`}></i>
                      {pickupDistanceLive ? 'Real road route' : 'Estimated'}
                    </p>
                  </div>
                </div>
              )}

              {userRole === 'driver' && !pickupDistanceKm && locationError && (
                <div className="bg-amber-50 rounded-2xl p-6 border-2 border-amber-100 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <i className="bi bi-geo-alt-fill text-xl"></i>
                  </div>
                  <p className="text-sm font-bold text-amber-700">{locationError}</p>
                </div>
              )}

              {/* Main Stats Card */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Distance</p>
                  <p className="text-2xl font-black text-slate-900">{tour?.total_distance_km || 0} km</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Actual Covered</p>
                  <p className="text-2xl font-black text-emerald-600">{tour?.actual_distance_km?.toFixed(1) || 0.0} km</p>
                </div>
                <div className="col-span-2 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Trip Duration</p>
                  <p className="text-2xl font-black text-slate-900">{tour?.total_days || 0} days</p>
                </div>
              </div>

              {/* Price Display */}
              <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {userRole === 'driver' ? 'Potential Earnings' : 'Current Price'}
                  </span>
                  <i className="bi bi-wallet2 text-orange-400"></i>
                </div>
                <p className="text-4xl font-black">
                  <span className="text-xl text-slate-400 mr-2 font-bold">Rs.</span>
                  {(tour?.driver_price || tour?.estimated_price || 0).toLocaleString()}
                </p>
              </div>

              {/* Trip Info List */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Trip Details</h3>
                <div className="space-y-3">
                  {[
                    { icon: 'bi-geo-alt-fill', label: 'Pickup Location', value: validLocations[0]?.place_name },
                    { icon: 'bi-calendar3', label: 'Start Date', value: tour?.start_date },
                    { icon: 'bi-calendar-check', label: 'End Date', value: tour?.end_date },
                    { icon: 'bi-people', label: 'Passengers', value: `${tour?.vehicle?.max_passengers || 0} max` },
                    { icon: 'bi-truck', label: 'Vehicle Type', value: tour?.vehicle?.type },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <i className={`bi ${item.icon} text-orange-500`}></i>
                        <span className="text-sm font-bold text-slate-500">{item.label}</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{item.value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Itinerary Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Route Stops</h3>
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {locations.map((loc, idx) => (
                    <div key={loc.id || idx} className="relative">
                      <div className={`absolute -left-[30px] top-1 h-4 w-4 rounded-full border-4 border-white shadow-sm z-10 ${idx === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Stop {idx + 1}</p>
                        <p className="text-sm font-black text-slate-800 leading-tight">{loc.place_name || 'Unknown'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action for Driver/User */}
              {userRole === 'user' && tour?.status === 'price_sent_by_driver' && (
                <div className="pt-4 space-y-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Negotiation Active</p>
                  <div className="flex gap-2">
                    <button onClick={handleAccept} className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-2xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20">Accept</button>
                    <button onClick={handleReject} className="flex-1 bg-rose-500 text-white font-black py-3 rounded-2xl hover:bg-rose-600 transition shadow-lg shadow-rose-500/20">Reject</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen map — opened by double-tapping/double-clicking the
          embedded map above. Sits above the modal itself (higher z-index)
          so it covers the whole screen, which is what makes it useful for
          actually reading the route on a small phone display.
          Deliberately has NO tap-to-exit on the map area itself — pinch-to-
          zoom lifts multiple fingers in quick succession, which fired
          several touchend events close together and was being misread as a
          double-tap, closing fullscreen mid-gesture. Only the close button
          (or Escape, for desktop) exits fullscreen now, so zooming in/out
          is always safe. */}
      {isMapFullscreen && !loading && (
        <div className="fixed inset-0 z-[60] bg-slate-900">
          {mapLegend}
          <button
            onClick={() => setIsMapFullscreen(false)}
            className="absolute top-4 right-4 z-[1000] h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-all"
            aria-label="Exit fullscreen map"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
          {mapView}
        </div>
      )}
    </div>
  )
}