import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { updateDriverLocation, getTourDetails } from '../services/api.js'

// Custom User Pin (Teal)
const userIcon = new L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #0d9488; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px; color: white;"><i class="bi bi-person-fill"></i></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Custom Driver Car Icon (Orange)
const carIcon = new L.divIcon({
  className: 'custom-driver-icon',
  html: `<div style="background-color: #f97316; width: 44px; height: 44px; border-radius: 12px; border: 3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white;"><i class="bi bi-car-front-fill"></i></div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

// Helper to keep the map centered on the driver
function DriverTracker({ currentLoc }) {
  const map = useMap();
  useEffect(() => {
    if (currentLoc) {
      map.setView(currentLoc, map.getZoom(), { animate: true, duration: 1.5 });
    }
  }, [currentLoc, map]);
  return null;
}

export default function LiveHireDriver({ tourId, token, onBack }) {
  const [tour, setTour] = useState(null)
  const [locations, setLocations] = useState([])
  const [currentLoc, setCurrentLoc] = useState(null)
  const [approachRoute, setApproachRoute] = useState([])
  const [tourRoute, setTourRoute] = useState([])
  const [gpsError, setGpsError] = useState('')
  const [rideStatus, setRideStatus] = useState('Heading to Pickup')
  const [distanceToPickup, setDistanceToPickup] = useState(null)
  
  const latestLocRef = useRef(null)

  // 1. Fetch Tour Details
  useEffect(() => {
    const loadTour = async () => {
      try {
        const data = await getTourDetails(tourId, token)
        setTour(data)
        setLocations(Array.isArray(data?.locations) ? data.locations : [])
      } catch (err) {
        console.error("Failed to load tour details:", err)
      }
    }
    loadTour()
  }, [tourId, token])

  // 2. Watch GPS
  useEffect(() => {
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
      },
      (err) => setGpsError('Enable GPS to start driving'),
      { enableHighAccuracy: true, maximumAge: 0 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // 3. Sync Location to Server
  useEffect(() => {
    const interval = setInterval(() => {
      if (latestLocRef.current) {
        const [lat, lng] = latestLocRef.current
        updateDriverLocation(tourId, lat, lng, token).catch(() => {})
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [tourId, token])

  // 4. Fetch Approach Route (Driver -> Pickup)
  useEffect(() => {
    if (!currentLoc || locations.length === 0 || rideStatus !== 'Heading to Pickup') {
      setApproachRoute([])
      return
    }
    const pickup = locations[0]
    const url = `https://router.project-osrm.org/route/v1/driving/${currentLoc[1]},${currentLoc[0]};${pickup.longitude},${pickup.latitude}?overview=full&geometries=geojson`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const route = data?.routes?.[0]
        if (route) {
          setApproachRoute(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]))
          setDistanceToPickup((route.distance / 1000).toFixed(1))
        }
      })
  }, [currentLoc, locations, rideStatus])

  // 5. Fetch Tour Route (Full Path)
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

  const pickupLocation = locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [6.9271, 79.8612]

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md px-8 py-5 shadow-2xl z-20 border-b border-slate-800">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 shadow-lg"
          >
            <i className="bi bi-chevron-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Navigating to Pickup</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${gpsError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
              <p className={`text-xs font-bold uppercase tracking-widest ${gpsError ? 'text-rose-400' : 'text-emerald-400'}`}>
                {gpsError || 'Live GPS Sync Active'}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-500 uppercase">Tour ID</p>
          <p className="text-lg font-black text-white">#{tourId}</p>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-1 relative z-10">
        {!currentLoc && !gpsError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
              <p className="font-black text-lg">Acquiring Satellites...</p>
              <p className="text-slate-500 text-sm mt-1">Initializing secure route tracking</p>
            </div>
          </div>
        )}

        <MapContainer center={pickupLocation} zoom={15} zoomControl={false} className="h-full w-full">
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
          />
          
          {/* Approach Route (Driver -> Pickup) */}
          {approachRoute.length > 0 && (
            <Polyline positions={approachRoute} color="#f97316" weight={6} opacity={0.8} />
          )}

          {/* Tour Route */}
          {tourRoute.length > 0 && (
            <Polyline positions={tourRoute} color="#0d9488" weight={4} opacity={0.6} dashArray="10, 10" />
          )}

          {/* User Marker (Pickup) */}
          <Marker position={pickupLocation} icon={userIcon}>
            <Popup>
              <div className="p-2">
                <p className="font-black text-slate-800">Pickup: {tour?.user_name || 'Passenger'}</p>
                <p className="text-xs text-slate-500">{locations[0]?.place_name}</p>
              </div>
            </Popup>
          </Marker>

          {/* Other Stop Markers */}
          {locations.slice(1).map((loc, idx) => (
            <Marker key={loc.id || idx} position={[loc.latitude, loc.longitude]} 
              icon={new L.divIcon({
                className: 'custom-stop-icon',
                html: `<div style="background-color: #1a2e6f; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: 900;">${idx + 1}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            />
          ))}

          {/* Driver Marker */}
          {currentLoc && (
            <>
              <Marker position={currentLoc} icon={carIcon} />
              <DriverTracker currentLoc={currentLoc} />
            </>
          )}
        </MapContainer>

        {/* Floating Info Card (Heads-up Display) */}
        {distanceToPickup && rideStatus === 'Heading to Pickup' && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md text-slate-900 px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[1000] flex items-center gap-5 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="h-14 w-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <i className="bi bi-geo-fill text-2xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Arriving In</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tabular-nums">{distanceToPickup}</span>
                <span className="text-sm font-bold text-slate-500">km</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Panel (Uber-style Bottom Sheet) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[94%] max-w-lg rounded-[3rem] bg-slate-900/95 backdrop-blur-2xl p-2 shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-slate-800 z-[1000] animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="p-6">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 opacity-50" />
            
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Current Phase</p>
                <p className="text-2xl font-black text-white tracking-tight">{rideStatus}</p>
              </div>
              <div className="h-14 w-14 rounded-3xl bg-slate-800 flex items-center justify-center text-orange-500 shadow-inner">
                <i className="bi bi-compass-fill text-2xl"></i>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button 
                onClick={() => setRideStatus('Arrived at Pickup')}
                className="group relative overflow-hidden py-5 bg-emerald-600 rounded-3xl text-sm font-black transition-all hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-900/20 text-white"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <i className="bi bi-check2-circle text-lg"></i>
                  <span>I've Arrived</span>
                </div>
              </button>
              <button 
                onClick={() => setRideStatus('Tour in Progress')}
                className="group relative overflow-hidden py-5 bg-orange-600 rounded-3xl text-sm font-black transition-all hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-900/20 text-white"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <i className="bi bi-play-fill text-xl"></i>
                  <span>Start Tour</span>
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => {
                alert("Tour successfully completed!");
                onBack();
              }}
              className="w-full py-5 bg-slate-800/50 rounded-3xl text-sm font-bold hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50 text-slate-400 flex items-center justify-center gap-2"
            >
              <i className="bi bi-flag-fill"></i>
              <span>Finish & Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}