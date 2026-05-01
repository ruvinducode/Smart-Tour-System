import { useState, useEffect, useRef } from 'react'
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
  Target
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

// Custom User Pin (Emerald)
const userIcon = new L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #064e3b; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Custom Driver Car Icon (Gold)
const carIcon = new L.divIcon({
  className: 'custom-driver-icon',
  html: `<div style="background-color: #d97706; width: 44px; height: 44px; border-radius: 14px; border: 3px solid white; box-shadow: 0 8px 25px rgba(217, 119, 6, 0.4); transform: rotate(0deg);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg></div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

function DriverTracker({ currentLoc, targetLoc, autoFollow, navMode }) {
  const map = useMap();
  useEffect(() => {
    if (!autoFollow) return;
    if (currentLoc) {
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
    }
  }, [currentLoc, targetLoc, map, autoFollow, navMode]);
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
  const [tour, setTour] = useState(null)
  const [locations, setLocations] = useState([])
  const [currentLoc, setCurrentLoc] = useState(null)
  const [approachRoute, setApproachRoute] = useState([])
  const [tourRoute, setTourRoute] = useState([])
  const [gpsError, setGpsError] = useState('')
  const [rideStatus, setRideStatus] = useState('Heading to Pickup')
  const [actualDistance, setActualDistance] = useState(0.0)
  const [distanceToDestination, setDistanceToDestination] = useState(null)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [distanceToPickup, setDistanceToPickup] = useState(null)
  
  const [lastSync, setLastSync] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [autoFollow, setAutoFollow] = useState(true)
  const [navMode, setNavMode] = useState(false)
  
  const latestLocRef = useRef(null)

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
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude]
        setCurrentLoc(coords)
        latestLocRef.current = coords
        setGpsError('')
        if (locations.length > 0) {
          const dest = locations[locations.length - 1]
          const dist = haversineKm(pos.coords.latitude, pos.coords.longitude, dest.latitude, dest.longitude)
          setDistanceToDestination(dist)
        }
      },
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
        if (route) {
          setApproachRoute(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]))
          if (rideStatus === 'Heading to Pickup') {
            setDistanceToPickup((route.distance / 1000).toFixed(1))
          }
        }
      })
  }, [currentLoc, locations, rideStatus])

  useEffect(() => {
    if (locations.length < 2) return
    const coords = locations.map(l => `${l.longitude},${l.latitude}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data?.routes?.[0]) {
          setTourRoute(data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]))
        }
      })
  }, [locations])

  return (
    <div className="flex h-screen flex-col bg-[#fffbeb] text-slate-900 overflow-hidden">
      {/* Light Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg px-8 py-5 border-b border-amber-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
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

      {/* Map Area */}
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
          
          {tourRoute.length > 0 && (
            <Polyline positions={tourRoute} color="#064e3b" weight={7} opacity={0.8} />
          )}

          {approachRoute.length > 0 && (
            <Polyline positions={approachRoute} color="#d97706" weight={6} opacity={0.6} dashArray="10, 15" />
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
              <Marker position={currentLoc} icon={carIcon} />
              <DriverTracker 
                currentLoc={currentLoc} 
                autoFollow={autoFollow}
                navMode={navMode}
                targetLoc={
                  (rideStatus === 'Heading to Pickup' || rideStatus === 'Arrived at Pickup') 
                  ? pickupLocation 
                  : [locations[locations.length-1].latitude, locations[locations.length-1].longitude]
                } 
              />
            </>
          )}
        </MapContainer>

        {/* Floating Direction Alert */}
        {distanceToPickup && rideStatus === 'Heading to Pickup' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 glass-card px-10 py-6 rounded-[2.5rem] z-[1000] flex items-center gap-6"
          >
            <div className="h-16 w-16 rounded-[1.5rem] bg-amber-500 flex items-center justify-center text-emerald-950 shadow-xl shadow-amber-500/20">
              <Navigation size={32} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600 mb-1">Estimated Arrival</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-emerald-950 tabular-nums">{distanceToPickup}</span>
                <span className="text-lg font-bold text-slate-400">km</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Map Control Buttons */}
        <div className="absolute top-10 right-8 z-[1000] flex flex-col gap-4">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { setNavMode(!navMode); if(!navMode) setAutoFollow(true); }}
            className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl border transition-all ${navMode ? 'bg-emerald-900 border-emerald-700 text-white' : 'bg-white border-amber-100 text-slate-400'}`}
          >
            <Navigation size={24} />
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
            onClick={() => setAutoFollow(true)}
            className="h-12 w-12 rounded-2xl bg-white border border-amber-100 text-emerald-900 flex items-center justify-center shadow-2xl"
          >
            <Target size={22} />
          </motion.button>
        </div>

        {/* Driver Control Panel - Bottom Floating */}
        <div className="absolute bottom-12 left-0 right-0 z-[1001] px-6">
           <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-xl mx-auto glass-card rounded-[3rem] p-4 premium-shadow"
           >
              <div className="bg-emerald-900/5 p-6 rounded-[2.5rem] flex items-center gap-6 mb-4 border border-emerald-900/5">
                 <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-900 text-white flex items-center justify-center shadow-xl">
                    <Info size={32} />
                 </div>
                 <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 mb-1 block">Live Status</span>
                    <h2 className="text-3xl font-serif text-emerald-950 leading-none">{rideStatus}</h2>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                 {[
                   { label: 'Start', icon: Navigation, status: 'Ready to Start', color: 'bg-emerald-900', action: markTourEnRoute, next: 'Heading to Pickup' },
                   { label: 'Arrived', icon: MapPin, status: 'Heading to Pickup', color: 'bg-amber-600', action: markTourArrived, next: 'Arrived at Pickup' },
                   { label: 'Start Tour', icon: Play, status: 'Arrived at Pickup', color: 'bg-emerald-700', action: startTour, next: 'Tour in Progress' }
                 ].map((btn, i) => (
                   <motion.button 
                     key={i}
                     whileHover={rideStatus === btn.status ? { scale: 1.05 } : {}}
                     whileTap={rideStatus === btn.status ? { scale: 0.95 } : {}}
                     disabled={rideStatus !== btn.status}
                     onClick={async () => {
                        try {
                          await btn.action(tourId, token)
                          setRideStatus(btn.next)
                          if (btn.label === 'Start') { setNavMode(true); setAutoFollow(true); }
                        } catch (err) { alert(err.message) }
                     }}
                     className={`flex flex-col items-center justify-center py-6 rounded-[2rem] gap-2 transition-all border ${
                       rideStatus === btn.status 
                       ? `${btn.color} text-white shadow-xl border-transparent` 
                       : 'bg-slate-100 border-slate-200 text-slate-300'
                     }`}
                   >
                     <btn.icon size={24} />
                     <span className="text-[10px] font-black uppercase tracking-widest">{btn.label}</span>
                   </motion.button>
                 ))}
              </div>

              <div className="flex gap-4 mb-4">
                 <div className="flex-1 bg-white border border-amber-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current</span>
                    <p className="text-2xl font-black text-emerald-900">{actualDistance.toFixed(1)} <span className="text-xs">KM</span></p>
                 </div>
                 <div className="flex-1 bg-white border border-amber-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Goal</span>
                    <p className="text-2xl font-black text-amber-600">{tour?.total_distance_km || 0} <span className="text-xs">KM</span></p>
                 </div>
              </div>

              <motion.button 
                whileHover={rideStatus === 'Tour in Progress' && distanceToDestination <= 0.5 ? { scale: 1.02 } : {}}
                whileTap={rideStatus === 'Tour in Progress' && distanceToDestination <= 0.5 ? { scale: 0.98 } : {}}
                onClick={async () => {
                  if (!window.confirm("Finish tour?")) return
                  try {
                    const res = await completeTour(tourId, token)
                    alert(`Journey Completed Successfully!`)
                    onBack()
                  } catch (err) { alert(err.message) }
                }}
                disabled={rideStatus !== 'Tour in Progress' || distanceToDestination === null || distanceToDestination > 0.5}
                className={`w-full py-6 rounded-[2rem] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 ${
                  rideStatus === 'Tour in Progress' && distanceToDestination !== null && distanceToDestination <= 0.5
                    ? 'bg-amber-500 text-emerald-950 shadow-2xl' 
                    : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                }`}
              >
                <Flag size={20} />
                <span>{rideStatus === 'Tour in Progress' && distanceToDestination > 0.5 ? 'Approach Destination to Finish' : 'Complete Journey'}</span>
              </motion.button>

              <div className="mt-4 text-center">
                <button 
                  onClick={() => setShowConfirmCancel(true)}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500/40 hover:text-rose-500 transition-colors p-2"
                >
                  Emergency Cancellation
                </button>
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