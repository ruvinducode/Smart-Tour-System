import { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, Marker, Popup, Polyline, useMap, useMapEvent } from 'react-leaflet'
import L from 'leaflet'
import { cachedTileLayer } from '../utils/cachedTileLayer.js'
import 'leaflet-rotate'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  MapPin, 
  Navigation, 
  Play, 
  CheckCircle2, 
  Flag, 
  AlertCircle, 
  Compass, 
  Info,
  Maximize2,
  Focus,
  Target,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import {
  updateDriverLocation,
  getTourDetails,
  markTourArrived,
  startTour,
  completeTour,
  driverCancelTour,
  markTourEnRoute,
  getRoute,
  getDriverIncomingTourRequests,
  approveDriverTourRequest,
  sendDriverNegotiatedPrice
} from '../services/api.js'
import { isTourScheduleLocked, formatTourSchedule } from '../utils/tourSchedule.js'
import CancellationModal from '../components/CancellationModal.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'
import IncomingTourRequestModal from '../components/driver/IncomingTourRequestModal.jsx'

const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap');

  :root {
    --sri-green: #064e3b;
    --sri-gold: #d97706;
    --sri-sand: #fffbeb;
  }

  body {
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .font-serif {
    font-family: 'Playfair Display', serif;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  }

  .premium-shadow {
    box-shadow: 0 10px 40px -10px rgba(6, 78, 59, 0.2);
  }

  .leaflet-container {
    border-radius: 0;
    z-index: 1;
  }

  .custom-user-icon div, .custom-driver-icon div {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pulse-emerald {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
    animation: pulse-emerald 2s infinite;
  }

  @keyframes pulse-emerald {
    0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
    100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }

`

if (typeof document !== 'undefined' && !document.getElementById('live-hire-premium-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'live-hire-premium-styles'
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function(...args) {
    const context = this;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Custom User Pin (Emerald)
const userIcon = new L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #064e3b; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function DriverTracker({ currentLoc, targetLoc, autoFollow, navMode, resetViewTrigger }) {
  const map = useMap();
  const hasSetInitialView = useRef(false);

  useEffect(() => {
    if (!currentLoc) return;
    if (autoFollow) {
      if (!hasSetInitialView.current) {
        hasSetInitialView.current = true;
        if (navMode) {
          map.setView(currentLoc, 19, { animate: true, duration: 1.5 });
        } else {
          const dist = targetLoc ? L.latLng(currentLoc).distanceTo(L.latLng(targetLoc)) : 0;
          if (dist < 1000) {
            map.setView(currentLoc, 18, { animate: true, duration: 1.5 });
          } else if (targetLoc) {
            const bounds = L.latLngBounds([currentLoc, targetLoc]);
            map.fitBounds(bounds, { padding: [100, 100], animate: true, duration: 1.5 });
          } else {
            map.setView(currentLoc, 18, { animate: true, duration: 1.5 });
          }
        }
      } else {
        map.panTo(currentLoc, { animate: true, duration: 1.0 });
      }
    }
  }, [currentLoc, targetLoc, map, autoFollow, navMode]);

  useEffect(() => {
    hasSetInitialView.current = false;
  }, [navMode, resetViewTrigger]);

  return null;
}

// Rotates the map so the driver's direction of travel points to the top of
// the screen in nav mode (heading-up navigation), and resets to north-up
// otherwise. leaflet-rotate's bearing is the clockwise rotation applied to
// the map pane, so to bring compass heading θ to the top we rotate by -θ.
//
// The rotation itself is driven frame-by-frame here (not left to a CSS
// transition) because CSS can't be told an angle is circular: transitioning
// between two static values like 359deg and 1deg sometimes animates the long
// way around (~358deg) instead of the real 2deg turn. Animating the applied
// bearing ourselves, always along the shortest signed delta, guarantees a
// continuous 360-degree wrap with no full-spin glitches at due north.
// Tiles the driver has already seen (anywhere along the route so far) stay
// visible even if the network drops mid-drive — see cachedTileLayer.js.
// Plain react-leaflet <TileLayer> can't do this, so the layer is added
// imperatively via useMap() instead.
function OfflineCapableTileLayer({ url, maxZoom }) {
  const map = useMap();
  useEffect(() => {
    const layer = cachedTileLayer(url, { maxZoom });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, url, maxZoom]);
  return null;
}

function MapBearingController({ heading, navMode }) {
  const map = useMap();
  const appliedRef = useRef(0);
  const animRef = useRef({ raf: null });

  useEffect(() => {
    if (typeof map.setBearing !== 'function') return;
    const target = navMode ? (360 - heading) % 360 : 0;
    const current = appliedRef.current;
    // Shortest signed delta from current to target, in (-180, 180].
    const delta = ((target - current + 540) % 360) - 180;

    const anim = animRef.current;
    if (anim.raf) cancelAnimationFrame(anim.raf);
    const start = performance.now();
    const duration = 350;
    const from = current;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const wrapped = ((from + delta * t) % 360 + 360) % 360;
      map.setBearing(wrapped);
      appliedRef.current = wrapped;
      if (t < 1) anim.raf = requestAnimationFrame(step);
    };
    anim.raf = requestAnimationFrame(step);
    return () => { if (anim.raf) cancelAnimationFrame(anim.raf) };
  }, [map, heading, navMode]);
  return null;
}

// Forces the route polylines to reproject on every map rotation, from
// whatever triggered it — our own heading-driven rotation (MapBearingController)
// or the two-finger touch-rotate gesture, which calls map.setBearing()
// directly through the plugin's own handler and bypasses that component
// entirely. Without this, the SVG paths' drawn coordinates can lag a frame
// or two behind the pane's CSS rotation, showing up as the route line
// drifting off the road while actively rotating.
function RouteRedrawOnRotate({ layerRefs }) {
  useMapEvent('rotate', () => {
    layerRefs.forEach((ref) => {
      if (ref.current && typeof ref.current.redraw === 'function') {
        ref.current.redraw();
      }
    });
  });
  return null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Finds where [lat,lng] projects onto the segment a→b (flat-plane
// approximation — fine at city-block scale, which is all this needs).
function closestPointOnSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return a
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return [a[0] + t * dx, a[1] + t * dy]
}

// Trims a fetched route down to just what's still ahead of the driver, by
// snapping to the nearest point on the route and dropping everything before
// it. Pure client-side geometry, so it updates instantly on every GPS fix
// instead of waiting on the next network route refetch (~6s) — that lag is
// what made the "erase completed road" effect feel slow.
function trimRouteToPosition(routePoints, pos) {
  if (!pos || !routePoints || routePoints.length < 2) return routePoints || []
  let minDist = Infinity
  let bestIdx = 0
  let bestPoint = routePoints[0]
  for (let i = 0; i < routePoints.length - 1; i++) {
    const point = closestPointOnSegment(pos, routePoints[i], routePoints[i + 1])
    const d = haversineKm(pos[0], pos[1], point[0], point[1])
    if (d < minDist) {
      minDist = d
      bestIdx = i
      bestPoint = point
    }
  }
  return [bestPoint, ...routePoints.slice(bestIdx + 1)]
}

export default function LiveHireDriver({ tourId, token, onBack }) {
  const [headingAngle, setHeadingAngle] = useState(0);
  const [tour, setTour] = useState(null);
  const [locations, setLocations] = useState([]);
  const [currentLoc, setCurrentLoc] = useState(null);
  const [approachRoute, setApproachRoute] = useState([]);
  const [tourRoute, setTourRoute] = useState([]);
  const [remainingTourRoute, setRemainingTourRoute] = useState([]);
  const [gpsError, setGpsError] = useState('');
  const [rideStatus, setRideStatus] = useState('Heading to Pickup');
  const [actualDistance, setActualDistance] = useState(0.0);
  const [distanceToDestination, setDistanceToDestination] = useState(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [selectedActionBtn, setSelectedActionBtn] = useState(null); // holds button data for confirmation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [navMode, setNavMode] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);
  const [scheduleTick, setScheduleTick] = useState(0);
  // The header's height isn't constant — it grows when a GPS error message
  // wraps to two lines, when "Synced HH:MM:SS" appears, or when the "Start
  // Simulation" button shows up, all independently of viewport width. The
  // distance panel below it used to assume a fixed header height via a
  // hardcoded top offset, so whenever the header actually rendered taller
  // than that guess, it overlapped the panel — intermittently, only under
  // whatever content/error state happened to make the header grow that day.
  // Measuring the real height and positioning off of it removes the guess.
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(88);
  const latestLocRef = useRef(null);
  const latestHeadingRef = useRef(0);
  const smoothedHeadingRef = useRef(0);
  const headingBaselineRef = useRef(null);
  const lastRouteFetchRef = useRef(0);
  const lastTourRouteFetchRef = useRef(0);
  const [animatedLoc, setAnimatedLoc] = useState(null);
  const markerAnimRef = useRef({ raf: null });
  const tourRouteOuterRef = useRef(null);
  const tourRouteInnerRef = useRef(null);
  const approachRouteOuterRef = useRef(null);
  const approachRouteInnerRef = useRef(null);

  // New-request interruption popup, mirrored from the dashboard's own
  // version — needed here too because a driver who's actively mid-trip is
  // on THIS screen, not the dashboard, so the "near completion" case (an
  // ongoing tour within ~1km of its final stop) would otherwise never
  // actually be visible to them.
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeIncomingTour, setActiveIncomingTour] = useState(null);
  const [incomingActionBusy, setIncomingActionBusy] = useState(false);
  const [incomingActionMessage, setIncomingActionMessage] = useState('');
  const [dismissedIncomingIds, setDismissedIncomingIds] = useState(() => new Set());
  // See DriverDashboardPage.jsx for why this exists — negotiating flips the
  // tour's status, dropping it out of the next incoming-requests poll, which
  // would otherwise auto-close this popup before the driver sees the
  // pending-offer confirmation.
  const [awaitingOfferConfirmationIds, setAwaitingOfferConfirmationIds] = useState(() => new Set());

  // Memoize driver icon. In nav mode the map itself rotates to keep the
  // direction of travel pointing up, so the arrow glyph stays static
  // (pointing up); otherwise (north-up map) the arrow rotates to show heading.
  const driverIcon = useMemo(() => {
    const arrowRotation = navMode ? 0 : headingAngle;
    return new L.divIcon({
      className: 'custom-driver-icon',
      html: `
        <div class="pulse-emerald" style="position:relative;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;">
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid #4285F4;transform: rotate(${arrowRotation}deg);margin-top:-6px;transition: transform 0.3s linear;"></div>
        </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, [headingAngle, navMode]);

  useEffect(() => {
    const interval = setInterval(() => setScheduleTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Track the header's real rendered height so content below it never gets
  // covered, no matter what causes the header to grow.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isScheduleLocked = useMemo(
    () => isTourScheduleLocked(tour),
    [tour, scheduleTick]
  );

  useEffect(() => {
    const loadTour = async () => {
      try {
        const data = await getTourDetails(tourId, token)
        setTour(data)
        const locs = Array.isArray(data?.locations) ? data.locations : []
        setLocations(locs)
        setActualDistance(data?.actual_distance_km || 0.0)
        
        if (data.status === 'arrived') setRideStatus('Arrived at Pickup')
        else if (data.status === 'ongoing') setRideStatus('Tour in Progress')
        else if (data.status === 'en_route') setRideStatus('Heading to Pickup')
        else if (data.status === 'confirmed' || data.status === 'driver_approved') setRideStatus('Ready to Start')
        else setRideStatus(data.status)
      } catch (err) {
        console.error("Failed to load tour details:", err)
      }
    }
    loadTour()
  }, [tourId, token])

  // Tour details (and specifically the stop list) were previously fetched
  // once at mount only — a traveler adding/removing a stop mid-trip would
  // never actually reach this screen's map. Poll periodically so an edited
  // route shows up live, and surface it as a toast since it's a real change
  // to what the driver is expected to do, not just a silent refresh.
  useEffect(() => {
    const locationIdsRef = { current: null }
    const poll = async () => {
      try {
        const data = await getTourDetails(tourId, token)
        const locs = Array.isArray(data?.locations) ? data.locations : []
        const ids = locs.map((l) => l.id).join(',')
        if (locationIdsRef.current !== null && locationIdsRef.current !== ids) {
          setLocations(locs)
          setIncomingActionMessage('Traveler updated the trip stops — route refreshed')
          setTimeout(() => setIncomingActionMessage(''), 4000)
        }
        locationIdsRef.current = ids
        if (data?.actual_distance_km !== undefined) setActualDistance(data.actual_distance_km)
      } catch {
        // Silent — this is a background refresh, the main GPS/status flow
        // already surfaces connectivity issues.
      }
    }
    const id = setInterval(poll, 15000)
    return () => clearInterval(id)
  }, [tourId, token])

  useEffect(() => {
    if (isSimulating) return;
    if (!navigator.geolocation) {
      setGpsError('GPS not supported')
      return
    }
  // Throttle GPS updates to improve performance (max one update per 500 ms)
  const fn = (pos) => {
    const newCoords = [pos.coords.latitude, pos.coords.longitude];
    const prev = latestLocRef.current;
    const headingBase = headingBaselineRef.current;

    // Consecutive GPS fixes wobble by a few metres from receiver noise alone,
    // even when standing still. Computing bearing from that noise produced a
    // wildly swinging ("dancing") arrow. Prefer the device's own GPS-course
    // value once it's actually moving fast enough to be reliable; otherwise
    // only recompute bearing once real movement clears a minimum distance
    // from a dedicated baseline point — kept separate from the position
    // shown on the map so small accepted position updates below the bearing
    // threshold don't keep resetting it (that bug made heading freeze, since
    // the baseline never accumulated enough distance to trigger a recompute).
    const MIN_BEARING_MOVE_METERS = 4;
    let rawBearing = null;

    if (typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading) && (pos.coords.speed || 0) > 0.8) {
      rawBearing = pos.coords.heading;
      headingBaselineRef.current = newCoords;
    } else if (!headingBase) {
      headingBaselineRef.current = newCoords;
    } else {
      const movedFromHeadingBase = haversineKm(headingBase[0], headingBase[1], newCoords[0], newCoords[1]) * 1000;
      if (movedFromHeadingBase >= MIN_BEARING_MOVE_METERS) {
        rawBearing = ((Math.atan2(
          Math.sin((newCoords[1] - headingBase[1]) * Math.PI / 180) * Math.cos(newCoords[0] * Math.PI / 180),
          Math.cos(headingBase[0] * Math.PI / 180) * Math.sin(newCoords[0] * Math.PI / 180) -
          Math.sin(headingBase[0] * Math.PI / 180) * Math.cos(newCoords[0] * Math.PI / 180) * Math.cos((newCoords[1] - headingBase[1]) * Math.PI / 180)
        ) * 180 / Math.PI) + 360) % 360;
        headingBaselineRef.current = newCoords;
      }
    }

    if (rawBearing !== null) {
      // Circular smoothing (EWMA over sin/cos, not the raw degrees) so the
      // heading eases toward the new bearing via the shortest turn instead
      // of potentially spinning the long way around through 0/360.
      const prevRad = smoothedHeadingRef.current * Math.PI / 180;
      const rawRad = rawBearing * Math.PI / 180;
      const alpha = 0.35;
      const sin = Math.sin(prevRad) * (1 - alpha) + Math.sin(rawRad) * alpha;
      const cos = Math.cos(prevRad) * (1 - alpha) + Math.cos(rawRad) * alpha;
      const smoothed = ((Math.atan2(sin, cos) * 180 / Math.PI) + 360) % 360;
      smoothedHeadingRef.current = smoothed;
      setHeadingAngle(smoothed);
      latestHeadingRef.current = smoothed;
    }

    // Position display has its own, much smaller dead-zone — just enough to
    // stop the marker twitching from noise while standing still, without
    // holding back real movement the way the heading baseline needs to.
    const movedMeters = prev ? haversineKm(prev[0], prev[1], newCoords[0], newCoords[1]) * 1000 : Infinity;
    if (movedMeters < 1.5) {
      setGpsError('');
      return;
    }

    setCurrentLoc(newCoords);
    latestLocRef.current = newCoords;
    setGpsError('');
    if (locations.length > 0) {
      const dest = locations[locations.length - 1];
      const dist = haversineKm(newCoords[0], newCoords[1], dest.latitude, dest.longitude);
      setDistanceToDestination(dist);
    }
  };
  const throttledPositionUpdate = throttle(fn, 500);
    const watchId = navigator.geolocation.watchPosition(
      throttledPositionUpdate,
      (err) => {
        if (!isSimulating) setGpsError('Enable GPS to start driving')
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [isSimulating, locations])

  // Smoothly tween the marker from wherever it's currently drawn to each new
  // GPS fix, instead of it teleporting instantly — raw fixes only arrive
  // every ~500ms (throttled above), which reads as a jump without this.
  useEffect(() => {
    if (!currentLoc) return
    const anim = markerAnimRef.current
    const from = animatedLoc || currentLoc
    const to = currentLoc
    const start = performance.now()
    const duration = 450 // just under the ~500ms GPS cadence so it settles before the next fix

    if (anim.raf) cancelAnimationFrame(anim.raf)
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setAnimatedLoc([
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ])
      if (t < 1) anim.raf = requestAnimationFrame(step)
    }
    anim.raf = requestAnimationFrame(step)
    return () => { if (anim.raf) cancelAnimationFrame(anim.raf) }
    // Intentionally excludes animatedLoc — each tween should start from
    // wherever it's currently drawn at the moment currentLoc changes, not
    // restart the effect every animation frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLoc])

  useEffect(() => {
    const interval = setInterval(() => {
      if (latestLocRef.current) {
        const [lat, lng] = latestLocRef.current
        updateDriverLocation(tourId, lat, lng, token, latestHeadingRef.current)
          .then((data) => {
            setLastSync(new Date().toLocaleTimeString())
            if (data.actual_distance_km !== undefined) {
              setActualDistance(data.actual_distance_km)
            }
          })
          .catch(() => {})
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [tourId, token])

  // Poll for popup-eligible new requests. The backend already gates this on
  // the driver not being busy (or, if on this very ongoing tour, being
  // within ~1km of the final stop), so no extra client-side filtering is
  // needed here beyond the session-only dismiss list.
  useEffect(() => {
    let cancelled = false
    const poll = () => {
      getDriverIncomingTourRequests(token)
        .then((data) => { if (!cancelled) setIncomingRequests(Array.isArray(data) ? data : []) })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [token])

  useEffect(() => {
    setActiveIncomingTour((prevActive) => {
      if (prevActive && !incomingRequests.some((t) => t.id === prevActive.id)) {
        if (awaitingOfferConfirmationIds.has(prevActive.id)) return prevActive
        return null
      }
      if (prevActive) return prevActive
      return incomingRequests.find((t) => !dismissedIncomingIds.has(t.id)) || null
    })
  }, [incomingRequests, dismissedIncomingIds, awaitingOfferConfirmationIds])

  const handleIncomingAccept = async (incomingTourId) => {
    setIncomingActionBusy(true)
    try {
      const data = await approveDriverTourRequest(incomingTourId, token)
      setIncomingActionMessage(data.message || 'Tour accepted — find it in your Upcoming list once this trip ends.')
      setDismissedIncomingIds((prev) => new Set(prev).add(incomingTourId))
      setActiveIncomingTour(null)
    } catch (err) {
      setIncomingActionMessage(err.message || 'Could not accept tour')
      setActiveIncomingTour(null)
    } finally {
      setIncomingActionBusy(false)
      setTimeout(() => setIncomingActionMessage(''), 4000)
    }
  }

  const handleIncomingNegotiate = async (incomingTourId, price) => {
    setIncomingActionBusy(true)
    try {
      const data = await sendDriverNegotiatedPrice(incomingTourId, Number(price), token)
      // Popup stays open to show the pending-offer confirmation instead of
      // closing on a toast the driver might miss.
      setAwaitingOfferConfirmationIds((prev) => new Set(prev).add(incomingTourId))
      return data
    } catch (err) {
      throw err
    } finally {
      setIncomingActionBusy(false)
    }
  }

  const handleIncomingDismiss = (incomingTourId) => {
    setDismissedIncomingIds((prev) => new Set(prev).add(incomingTourId))
    setAwaitingOfferConfirmationIds((prev) => {
      const next = new Set(prev)
      next.delete(incomingTourId)
      return next
    })
    setActiveIncomingTour(null)
  }

  const handleSimulate = () => {
    setIsSimulating(true)
    setGpsError('')
    const base = pickupLocation || [6.9271, 79.8612]
    const simulated = [base[0] + 0.005, base[1] + 0.005]
    setCurrentLoc(simulated)
    latestLocRef.current = simulated
    if (locations.length > 0) {
      const dest = locations[locations.length - 1]
      const dist = haversineKm(simulated[0], simulated[1], dest.latitude, dest.longitude)
      setDistanceToDestination(dist)
    }
  }

  const pickupLocation = locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [6.9271, 79.8612]

  useEffect(() => {
    if (!currentLoc || locations.length === 0 || rideStatus === 'Tour in Progress') {
      setApproachRoute([])
      return
    }
    // Recompute the approach route at most once every 6s — currentLoc changes
    // on nearly every GPS fix (throttled to 500ms), which would otherwise
    // hit the routing API far more often than the route line needs to update.
    const now = Date.now()
    if (now - lastRouteFetchRef.current < 6000) return
    lastRouteFetchRef.current = now
    const target = locations[0]
    getRoute([[currentLoc[1], currentLoc[0]], [target.longitude, target.latitude]])
      .then(route => {
        if (route.geometry?.length) {
          setApproachRoute(route.geometry)
          // Kept live through "Arrived at Pickup" too (not just "Heading to
          // Pickup") — the Start Tour button gates on real-time proximity to
          // the pickup point, not just a one-time check at the moment the
          // driver tapped Arrived.
          if (rideStatus === 'Heading to Pickup' || rideStatus === 'Arrived at Pickup') {
            setDistanceToPickup(route.distance_km);
          }
        }
      }).catch(() => {
        // Routing service unavailable (e.g. rate-limited) — show a straight
        // line so the driver always sees some path rather than a blank map.
        setApproachRoute([currentLoc, [target.latitude, target.longitude]])
        if (rideStatus === 'Heading to Pickup' || rideStatus === 'Arrived at Pickup') {
          setDistanceToPickup(haversineKm(currentLoc[0], currentLoc[1], target.latitude, target.longitude))
        }
      })
  }, [currentLoc, locations, rideStatus])

  useEffect(() => {
    if (locations.length < 2) return
    getRoute(locations.map(l => [l.longitude, l.latitude]))
      .then(route => {
        if (route.geometry?.length) setTourRoute(route.geometry)
      }).catch(() => {
        // Routing service unavailable — fall back to straight lines between
        // stops so the tour path is never left blank.
        setTourRoute(locations.map(l => [l.latitude, l.longitude]))
      })
  }, [locations])

  // Once the driver is actually driving the tour, recompute the remaining
  // path from their live position every ~6s — the same technique already
  // used for the pickup-approach route above. Without this, the static
  // full-route fetch above never changes again, so the line kept showing
  // the entire original path with no sense of what's already been driven.
  useEffect(() => {
    if (!currentLoc || rideStatus !== 'Tour in Progress' || locations.length < 2) {
      setRemainingTourRoute([])
      return
    }
    const now = Date.now()
    if (now - lastTourRouteFetchRef.current < 6000 && remainingTourRoute.length >= 2) return
    lastTourRouteFetchRef.current = now
    const remainingStops = locations.slice(1) // pickup is already behind us
    const waypoints = [[currentLoc[1], currentLoc[0]], ...remainingStops.map(l => [l.longitude, l.latitude])]
    getRoute(waypoints)
      .then(route => {
        if (route.geometry?.length) setRemainingTourRoute(route.geometry)
      }).catch(() => {
        setRemainingTourRoute([currentLoc, ...remainingStops.map(l => [l.latitude, l.longitude])])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLoc, rideStatus, locations])

  // Trimmed against the smoothly-animated marker position (not the raw,
  // ~500ms-stepped GPS fix) so the "erased" trailing edge moves in the same
  // continuous motion as the marker itself, instead of jumping in visible
  // steps every time a new GPS fix arrives.
  const liveTrimPos = animatedLoc || currentLoc;
  const memoizedTourRoute = useMemo(() => {
    const base = rideStatus === 'Tour in Progress' ? remainingTourRoute : tourRoute;
    return rideStatus === 'Tour in Progress' ? trimRouteToPosition(base, liveTrimPos) : base;
  }, [rideStatus, remainingTourRoute, tourRoute, liveTrimPos]);
  const memoizedApproachRoute = useMemo(
    () => trimRouteToPosition(approachRoute, liveTrimPos),
    [approachRoute, liveTrimPos],
  );

  const hasDistanceAlert = 
    (rideStatus === 'Heading to Pickup' && distanceToPickup) || 
    (rideStatus === 'Tour in Progress' && distanceToDestination !== null);
  
  const alertDistance = 
    rideStatus === 'Heading to Pickup' ? distanceToPickup : distanceToDestination?.toFixed(1);
    
  const alertLabel = 
    rideStatus === 'Heading to Pickup' ? 'To Pickup' : 'To Destination';

  return (
    <div className="flex h-screen flex-col bg-[#fffbeb] text-slate-900 overflow-hidden">
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-5 border-b border-amber-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 sm:gap-6">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-white shadow-xl"
          >
            <ChevronLeft size={24} />
          </motion.button>
          <div>
            <h1 className="text-xl font-extrabold text-emerald-950 uppercase tracking-tight">Active Tour</h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${gpsError ? 'bg-rose-500' : 'bg-emerald-500 pulse-emerald'}`}></span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {gpsError || (isSimulating ? 'SIMULATED GPS' : 'LIVE NAVIGATION')}
                </p>
              </div>
              {lastSync && (
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                  Synced {lastSync}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isSimulating && gpsError && (
            <button 
              onClick={handleSimulate}
              className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all border border-amber-200"
            >
              Start Simulation
            </button>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ride ID</p>
            <p className="text-xl font-black text-emerald-900">#{tourId}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 relative z-10" style={{ paddingTop: headerHeight }}>
        <AnimatePresence>
          {!currentLoc && !gpsError && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-[#fffbeb]/90 backdrop-blur-md"
            >
              <div className="text-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-900 border-t-amber-500 mx-auto mb-6"></div>
                <p className="font-serif text-3xl text-emerald-950">Connecting to Sattelites</p>
                <p className="text-slate-500 text-sm mt-2 font-medium">Securing your real-time path...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <MapContainer center={pickupLocation} zoom={18} zoomControl={false} className="h-full w-full" rotate={true} touchRotate={true} touchZoom={true} rotateControl={false}>
          <OfflineCapableTileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={20}
          />
          <MapBearingController heading={headingAngle} navMode={navMode} />
          <RouteRedrawOnRotate layerRefs={[tourRouteOuterRef, tourRouteInnerRef, approachRouteOuterRef, approachRouteInnerRef]} />

            {memoizedTourRoute.length > 0 && (
               <>
                 <Polyline ref={tourRouteOuterRef} positions={memoizedTourRoute} color="#ffffff" weight={11} opacity={0.9} lineJoin="round" lineCap="round" />
                 <Polyline ref={tourRouteInnerRef} positions={memoizedTourRoute} color="#2563eb" weight={6} opacity={1.0} lineJoin="round" lineCap="round" />
               </>
            )}

            {memoizedApproachRoute.length > 0 && (
               <>
                 <Polyline ref={approachRouteOuterRef} positions={memoizedApproachRoute} color="#ffffff" weight={12} opacity={0.9} lineJoin="round" lineCap="round" />
                 <Polyline ref={approachRouteInnerRef} positions={memoizedApproachRoute} color="#dc2626" weight={7} opacity={1.0} lineJoin="round" lineCap="round" />
               </>
            )}

          <Marker position={pickupLocation} icon={userIcon}>
            <Popup>
              <div className="p-3">
                <p className="font-bold text-emerald-950">Pickup: {tour?.user_name || 'Traveler'}</p>
                <p className="text-xs text-slate-500">{locations[0]?.place_name}</p>
              </div>
            </Popup>
          </Marker>

          {locations.slice(1).map((loc, idx) => (
            <Marker key={loc.id || idx} position={[loc.latitude, loc.longitude]} 
              icon={new L.divIcon({
                className: 'custom-stop-icon',
                html: `<div style="background-color: #064e3b; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 900; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">${idx + 1}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
              })}
            />
          ))}

          {currentLoc && (
            <>
              <Marker position={animatedLoc || currentLoc} icon={driverIcon} />
              <DriverTracker
                currentLoc={currentLoc} 
                autoFollow={autoFollow}
                navMode={navMode}
                resetViewTrigger={resetViewTrigger}
                targetLoc={
                  (rideStatus === 'Heading to Pickup' || rideStatus === 'Arrived at Pickup') 
                  ? pickupLocation 
                  : [locations[locations.length-1].latitude, locations[locations.length-1].longitude]
                } 
              />
            </>
          )}
        </MapContainer>

        {/* Top Centered Distance Pill — anchored with both left and right
            offsets on mobile (rather than centered with a wide max-width) so
            its width is always exactly the space actually available before
            the floating button column on the right. A centered pill sized
            by percentage could extend far enough on a narrow phone to sit
            underneath those buttons, which is what was happening: the
            navigation arrow button was overlapping the Ride ID text. */}
        {(distanceToPickup != null || distanceToDestination !== null) && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ top: headerHeight + 16 }}
            className="absolute left-4 right-[76px] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[1000] sm:w-auto sm:min-w-[280px] sm:max-w-[90%] bg-white/95 backdrop-blur-xl rounded-[2rem] p-3 px-5 shadow-2xl border border-emerald-900/10 flex items-center justify-between gap-6"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{alertLabel}</span>
              <span className="text-xl font-black text-emerald-950">
                {rideStatus === 'Heading to Pickup' ? (distanceToPickup != null ? `${distanceToPickup.toFixed(1)} km` : '--') : `${distanceToDestination?.toFixed(1)} km`}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ride ID</span>
              <span className="text-sm font-black text-emerald-900">#{tourId}</span>
            </div>
          </motion.div>
        )}

        <div style={{ top: headerHeight + 16 }} className="absolute right-4 sm:right-8 z-[1000] flex flex-col gap-3 sm:gap-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setNavMode(!navMode); if(!navMode) setAutoFollow(true); }}
            className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-2xl border transition-all ${navMode ? 'bg-emerald-900 border-emerald-700 text-white' : 'bg-white border-amber-100 text-slate-400'}`}
          >
            <Navigation size={22} />
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setAutoFollow(!autoFollow)}
            className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-2xl border transition-all ${autoFollow && !navMode ? 'bg-amber-500 border-amber-400 text-emerald-950' : 'bg-white border-amber-100 text-slate-400'}`}
          >
            <Compass size={22} />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setAutoFollow(true); setResetViewTrigger(prev => prev + 1); }}
            className="h-12 w-12 rounded-2xl bg-white border border-amber-100 text-emerald-900 flex items-center justify-center shadow-2xl"
          >
            <Target size={22} />
          </motion.button>
        </div>

        {/* Bottom Sheet */}
        <div className="absolute bottom-0 left-0 right-0 z-[1001] pointer-events-none flex justify-center">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: isMinimized ? "calc(100% - 65px)" : "0%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-t-[1.5rem] rounded-b-none p-2 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-slate-200 pointer-events-auto flex flex-col"
          >
            {/* Drag Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2 cursor-pointer hover:bg-slate-400 transition-colors" onClick={() => setIsMinimized(!isMinimized)} />

            <div 
              className="px-4 py-2 flex items-center justify-between cursor-pointer mb-2"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-900 text-white flex items-center justify-center shadow-md">
                  <Info size={16} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Status:</span>
                  <h2 className="text-base font-black text-emerald-950 leading-none">{rideStatus}</h2>
                </div>
              </div>
              <div className="text-emerald-900 bg-emerald-50 rounded-full p-1">
                {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            <div className={`transition-all duration-300 px-3 ${isMinimized ? 'opacity-0 pointer-events-none hidden' : 'opacity-100 block'}`}>
              {isScheduleLocked && (
                <div className="mb-2 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Scheduled Tour</p>
                    <p className="text-[10px] font-medium text-amber-800 mt-0.5">
                      Start controls unlock on <span className="font-bold">{formatTourSchedule(tour)}</span>.
                      You can accept offers now; driving starts on the scheduled date.
                    </p>
                  </div>
                </div>
              )}

              {!isScheduleLocked && (
              <>
              <div className="flex gap-2 mb-2">
                {[
                  { label: 'Start', icon: Navigation, status: 'Ready to Start', color: 'bg-emerald-900', action: markTourEnRoute, next: 'Heading to Pickup', proximityOk: true },
                  // Requires the driver to actually be near the pickup point —
                  // previously this only checked ride status, so a driver
                  // could tap "Arrived" from anywhere, well before really
                  // reaching the pickup location.
                  { label: 'Arrived', icon: MapPin, status: 'Heading to Pickup', color: 'bg-amber-600', action: markTourArrived, next: 'Arrived at Pickup', proximityOk: distanceToPickup != null && distanceToPickup <= 1.0 },
                  // Same real-location requirement as Arrived — a driver who
                  // tapped Arrived from just inside 1km, then drove off
                  // before actually reaching the pickup, shouldn't be able
                  // to start the tour until they're really there.
                  { label: 'Tour', icon: Play, status: 'Arrived at Pickup', color: 'bg-emerald-700', action: startTour, next: 'Tour in Progress', proximityOk: distanceToPickup != null && distanceToPickup <= 1.0 }
                ].map((btn, i) => {
                  const statusMatches = rideStatus === btn.status
                  const enabled = statusMatches && btn.proximityOk
                  return (
                  <motion.button
                    key={i}
                    whileHover={enabled ? { scale: 1.02 } : {}}
                    whileTap={enabled ? { scale: 0.98 } : {}}
                    disabled={!enabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedActionBtn(btn);
                    }}
                    className={`flex-1 flex flex-row items-center justify-center py-2.5 rounded-lg gap-1.5 transition-all border ${
                      enabled
                        ? `${btn.color} text-white shadow-md border-transparent`
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <btn.icon size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{btn.label}</span>
                  </motion.button>
                  )
                })}
              </div>
              {rideStatus === 'Heading to Pickup' && distanceToPickup != null && distanceToPickup > 1.0 && (
                <p className="text-[10px] font-medium text-amber-700 -mt-1 mb-2 text-center">
                  Get within 1km of the pickup point to mark arrival ({distanceToPickup.toFixed(1)} km away)
                </p>
              )}
              {rideStatus === 'Arrived at Pickup' && distanceToPickup != null && distanceToPickup > 1.0 && (
                <p className="text-[10px] font-medium text-amber-700 -mt-1 mb-2 text-center">
                  Reach the pickup point to start the tour ({distanceToPickup.toFixed(1)} km away)
                </p>
              )}
              </>
              )}

              <div className="flex items-center justify-around bg-slate-50 border border-slate-100 rounded-lg p-2 mb-2 shadow-inner">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Current</span>
                  <p className="text-sm font-black text-emerald-900">{actualDistance.toFixed(1)}<span className="text-[9px] ml-0.5">KM</span></p>
                </div>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Goal</span>
                  <p className="text-sm font-black text-amber-600">{tour?.total_distance_km || 0}<span className="text-[9px] ml-0.5">KM</span></p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <motion.button
                  whileHover={rideStatus === 'Tour in Progress' && distanceToDestination <= 1.0 ? { scale: 1.02 } : {}}
                  whileTap={rideStatus === 'Tour in Progress' && distanceToDestination <= 1.0 ? { scale: 0.98 } : {}}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm("Finish tour?")) return
                    try {
                      const res = await completeTour(tourId, token)
                      alert(`Journey Completed Successfully!`)
                      onBack()
                    } catch (err) { alert(err.message) }
                  }}
                  disabled={rideStatus !== 'Tour in Progress' || distanceToDestination === null || distanceToDestination > 1.0}
                  className={`flex-[3] py-2.5 rounded-lg font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-[10px] ${
                    rideStatus === 'Tour in Progress' && distanceToDestination !== null && distanceToDestination <= 1.0
                      ? 'bg-amber-500 text-emerald-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Flag size={14} />
                  <span>Finish Journey</span>
                </motion.button>

                <button 
                  onClick={(e) => { e.stopPropagation(); setShowConfirmCancel(true); }}
                  className="flex-1 py-2.5 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors flex items-center justify-center"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider">Cancel</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setShowConfirmCancel(false)
          setShowCancelModal(true)
        }}
        title="Emergency Cancellation?"
        message="This will terminate the tour immediately. Are you sure you want to proceed?"
        confirmLabel="Force Cancel"
        type="danger"
      />

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!selectedActionBtn}
        onClose={() => setSelectedActionBtn(null)}
        onConfirm={async () => {
          if (!selectedActionBtn) return;
          try {
            await selectedActionBtn.action(tourId, token);
            setRideStatus(selectedActionBtn.next);
            if (selectedActionBtn.label === 'Start') { setNavMode(true); setAutoFollow(true); }
          } catch (err) { alert(err.message); }
          setSelectedActionBtn(null);
        }}
        title={`${selectedActionBtn?.label} Confirmation`}
        message={`Are you sure you want to ${selectedActionBtn?.label.toLowerCase()}?`}
        confirmLabel="Yes"
        type="info"
      />

      <CancellationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        userRole="driver"
        onConfirm={async (reason) => {
          setCancelling(true)
          try {
            await driverCancelTour(tourId, reason, token)
            onBack()
          } catch (err) { alert(err.message) }
          finally { setCancelling(false) }
        }}
        loading={cancelling}
      />

      <IncomingTourRequestModal
        tour={activeIncomingTour}
        busy={incomingActionBusy}
        onAccept={handleIncomingAccept}
        onNegotiate={handleIncomingNegotiate}
        onDismiss={handleIncomingDismiss}
      />

      <AnimatePresence>
        {incomingActionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2100] bg-slate-900 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-2xl"
          >
            {incomingActionMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}