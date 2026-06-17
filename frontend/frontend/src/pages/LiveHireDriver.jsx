import { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
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
  markTourEnRoute 
} from '../services/api.js'
import { isTourScheduleLocked, formatTourSchedule } from '../utils/tourSchedule.js'
import CancellationModal from '../components/CancellationModal.jsx'
import ConfirmationModal from '../components/ConfirmationModal.jsx'

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

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function LiveHireDriver({ tourId, token, onBack }) {
  const [headingAngle, setHeadingAngle] = useState(0);
  const [tour, setTour] = useState(null);
  const [locations, setLocations] = useState([]);
  const [currentLoc, setCurrentLoc] = useState(null);
  const [approachRoute, setApproachRoute] = useState([]);
  const [tourRoute, setTourRoute] = useState([]);
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
  const latestLocRef = useRef(null);

  // Memoize driver icon – updates only when headingAngle changes
  const driverIcon = useMemo(() => {
    return new L.divIcon({
      className: 'custom-driver-icon',
      html: `
        <div class="pulse-emerald" style="position:relative;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;">
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid #4285F4;transform: rotate(${headingAngle}deg);margin-top:-6px;"></div>
        </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }, [headingAngle]);

  useEffect(() => {
    const interval = setInterval(() => setScheduleTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    if (isSimulating) return;
    if (!navigator.geolocation) {
      setGpsError('GPS not supported')
      return
    }
  // Throttle GPS updates to improve performance (max one update per 500 ms)
  const fn = (pos) => {
    const newCoords = [pos.coords.latitude, pos.coords.longitude];
    if (latestLocRef.current) {
      const prev = latestLocRef.current;
      const bearing = ((Math.atan2(
        Math.sin((newCoords[1] - prev[1]) * Math.PI / 180) * Math.cos(newCoords[0] * Math.PI / 180),
        Math.cos(prev[0] * Math.PI / 180) * Math.sin(newCoords[0] * Math.PI / 180) -
        Math.sin(prev[0] * Math.PI / 180) * Math.cos(newCoords[0] * Math.PI / 180) * Math.cos((newCoords[1] - prev[1]) * Math.PI / 180)
      ) * 180 / Math.PI + 360) % 360);
      setHeadingAngle(bearing);
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (latestLocRef.current) {
        const [lat, lng] = latestLocRef.current
        updateDriverLocation(tourId, lat, lng, token)
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
    const target = locations[0]
    const url = `https://router.project-osrm.org/route/v1/driving/${currentLoc[1]},${currentLoc[0]};${target.longitude},${target.latitude}?overview=full&geometries=geojson`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const route = data?.routes?.[0]
        if (route && route.geometry?.coordinates) {
          setApproachRoute(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]))
          if (rideStatus === 'Heading to Pickup') {
            const distKm = route.distance / 1000
            setDistanceToPickup(distKm);
          }
        }
      }).catch(() => {})
  }, [currentLoc, locations, rideStatus])

  useEffect(() => {
    if (locations.length < 2) return
    const coords = locations.map(l => `${l.longitude},${l.latitude}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const route = data?.routes?.[0]
        if (route && route.geometry?.coordinates) {
          setTourRoute(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]))
        }
      }).catch(() => {})
  }, [locations])

  const memoizedTourRoute = useMemo(() => tourRoute, [tourRoute]);
  const memoizedApproachRoute = useMemo(() => approachRoute, [approachRoute]);

  const hasDistanceAlert = 
    (rideStatus === 'Heading to Pickup' && distanceToPickup) || 
    (rideStatus === 'Tour in Progress' && distanceToDestination !== null);
  
  const alertDistance = 
    rideStatus === 'Heading to Pickup' ? distanceToPickup : distanceToDestination?.toFixed(1);
    
  const alertLabel = 
    rideStatus === 'Heading to Pickup' ? 'To Pickup' : 'To Destination';

  return (
    <div className="flex h-screen flex-col bg-[#fffbeb] text-slate-900 overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-5 border-b border-amber-100 flex items-center justify-between shadow-sm">
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

      <div className="flex-1 relative z-10 pt-24">
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

        <MapContainer center={pickupLocation} zoom={18} zoomControl={false} className="h-full w-full">
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            maxZoom={20}
          />
          
            {memoizedTourRoute.length > 0 && (
               <>
                 <Polyline positions={memoizedTourRoute} color="#ffffff" weight={11} opacity={0.9} lineJoin="round" lineCap="round" renderer={L.canvas()} />
                 <Polyline positions={memoizedTourRoute} color="#2563eb" weight={6} opacity={1.0} lineJoin="round" lineCap="round" renderer={L.canvas()} />
               </>
            )}

            {memoizedApproachRoute.length > 0 && (
               <>
                 <Polyline positions={memoizedApproachRoute} color="#ffffff" weight={12} opacity={0.9} lineJoin="round" lineCap="round" renderer={L.canvas()} />
                 <Polyline positions={memoizedApproachRoute} color="#dc2626" weight={7} opacity={1.0} lineJoin="round" lineCap="round" renderer={L.canvas()} />
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
              <Marker position={currentLoc} icon={driverIcon} />
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

        {/* Top Centered Distance Pill */}
        {(distanceToPickup != null || distanceToDestination !== null) && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[1000] w-auto min-w-[280px] max-w-[90%] bg-white/95 backdrop-blur-xl rounded-[2rem] p-3 px-5 shadow-2xl border border-emerald-900/10 flex items-center justify-between gap-6"
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

        <div className="absolute top-[100px] sm:top-28 right-4 sm:right-8 z-[1000] flex flex-col gap-3 sm:gap-4">
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
              <div className="flex gap-2 mb-2">
                {[
                  { label: 'Start', icon: Navigation, status: 'Ready to Start', color: 'bg-emerald-900', action: markTourEnRoute, next: 'Heading to Pickup' },
                  { label: 'Arrived', icon: MapPin, status: 'Heading to Pickup', color: 'bg-amber-600', action: markTourArrived, next: 'Arrived at Pickup' },
                  { label: 'Tour', icon: Play, status: 'Arrived at Pickup', color: 'bg-emerald-700', action: startTour, next: 'Tour in Progress' }
                ].map((btn, i) => (
                  <motion.button 
                    key={i}
                    whileHover={rideStatus === btn.status ? { scale: 1.02 } : {}}
                    whileTap={rideStatus === btn.status ? { scale: 0.98 } : {}}
                    disabled={rideStatus !== btn.status}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedActionBtn(btn);
                    }}
                    className={`flex-1 flex flex-row items-center justify-center py-2.5 rounded-lg gap-1.5 transition-all border ${
                      rideStatus === btn.status 
                        ? `${btn.color} text-white shadow-md border-transparent` 
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <btn.icon size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{btn.label}</span>
                  </motion.button>
                ))}
              </div>
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
                  whileHover={rideStatus === 'Tour in Progress' && distanceToDestination <= 0.5 ? { scale: 1.02 } : {}}
                  whileTap={rideStatus === 'Tour in Progress' && distanceToDestination <= 0.5 ? { scale: 0.98 } : {}}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm("Finish tour?")) return
                    try {
                      const res = await completeTour(tourId, token)
                      alert(`Journey Completed Successfully!`)
                      onBack()
                    } catch (err) { alert(err.message) }
                  }}
                  disabled={rideStatus !== 'Tour in Progress' || distanceToDestination === null || distanceToDestination > 0.5}
                  className={`flex-[3] py-2.5 rounded-lg font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-[10px] ${
                    rideStatus === 'Tour in Progress' && distanceToDestination !== null && distanceToDestination <= 0.5
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
    </div>
  )
}