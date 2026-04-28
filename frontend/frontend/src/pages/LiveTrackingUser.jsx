import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import { getLiveDriverLocation } from '../services/api.js'

// Custom User Pin (Teal)
const userIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="#0d9488" stroke="white" stroke-width="3"/>
      <circle cx="20" cy="20" r="6" fill="white"/>
    </svg>
  `)}`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

// Custom Driver Car Icon (Orange)
const carIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="20" fill="#f97316" stroke="white" stroke-width="3"/>
      <path d="M14 24h16v-4l-4-4h-8l-4 4v4z" fill="white"/>
      <circle cx="17" cy="26" r="3" fill="#1e293b"/>
      <circle cx="27" cy="26" r="3" fill="#1e293b"/>
    </svg>
  `)}`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

// Helper component to smoothly pan the map to the driver
function MapUpdater({ driverLoc }) {
  const map = useMap();
  useEffect(() => {
    if (driverLoc) {
      map.setView(driverLoc, map.getZoom(), { animate: true, duration: 1.5 });
    }
  }, [driverLoc, map]);
  return null;
}

export default function LiveTrackingUser({ tourId, token, userLat, userLng, onBack }) {
  const [driverLoc, setDriverLoc] = useState(null)
  const [status, setStatus] = useState('Connecting to driver GPS...')
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    let intervalId;

    const fetchLocation = async () => {
      try {
        const data = await getLiveDriverLocation(tourId, token)
        if (data.latitude && data.longitude) {
          setDriverLoc([data.latitude, data.longitude])
          setStatus('Driver is on the way!')
          
          // Format the time the driver last updated their location
          const date = new Date(data.last_update)
          setLastUpdated(date.toLocaleTimeString())
        }
      } catch (err) {
        // If 404, it just means the driver hasn't turned on their app yet
        setStatus('Waiting for driver to share location...')
      }
    }

    // Call it immediately once
    fetchLocation()

    // Then poll the backend every 4 seconds
    intervalId = setInterval(fetchLocation, 4000)

    // Cleanup the interval when the user leaves the page
    return () => clearInterval(intervalId)
  }, [tourId, token])

  const defaultCenter = [userLat || 6.9271, userLng || 79.8612] // Fallback to Colombo

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-md z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900">Live Ride Tracking</h1>
            <p className="text-sm font-semibold text-orange-600 animate-pulse">
              <i className="bi bi-broadcast mr-1"></i> {status}
            </p>
          </div>
        </div>
        {lastUpdated && (
          <div className="text-right">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Last GPS Ping</p>
            <p className="text-sm font-mono text-slate-800">{lastUpdated}</p>
          </div>
        )}
      </header>

      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <MapContainer center={defaultCenter} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* User's Pickup Location */}
          <Marker position={defaultCenter} icon={userIcon}>
            <Popup><b>Your Location</b><br/>Waiting for pickup here.</Popup>
          </Marker>

          {/* Driver's Live Location */}
          {driverLoc && (
            <>
              <Marker position={driverLoc} icon={carIcon}>
                <Popup><b>Your Driver</b><br/>Currently on the move!</Popup>
              </Marker>
              <MapUpdater driverLoc={driverLoc} />
            </>
          )}
        </MapContainer>

        {/* Floating Info Card */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-md rounded-3xl bg-white/90 p-5 shadow-2xl backdrop-blur-md border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 text-2xl">
              <i className="bi bi-car-front-fill"></i>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tour #{tourId}</p>
              <h3 className="text-lg font-black text-slate-900">Driver En Route</h3>
              <p className="text-sm text-slate-600 mt-1">Make sure you are at the pickup point.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}