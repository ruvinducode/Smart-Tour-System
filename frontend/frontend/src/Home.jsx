import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
  useMap,
} from 'react-leaflet'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import appLogo from '../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

// Custom CSS animations
const customStyles = `
  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 700ms ease-out forwards;
    opacity: 0;
  }

  /* Route dash marching from start -> end */
  @keyframes dashFlow {
    from { stroke-dashoffset: 0; }
    to   { stroke-dashoffset: -20; }
  }
  .route-dash-animate {
    animation: dashFlow 0.6s linear infinite;
  }

  /* Marker pulse ring */
  @keyframes markerPulse {
    0%   { transform: scale(1);   opacity: 0.8; }
    50%  { transform: scale(1.5); opacity: 0.3; }
    100% { transform: scale(2);   opacity: 0; }
  }
  .marker-pulse-ring {
    position: absolute;
    top: 50%; left: 50%;
    width: 28px; height: 28px;
    margin-top: -14px; margin-left: -14px;
    border-radius: 50%;
    background: rgba(225, 29, 72, 0.6);
    animation: markerPulse 1.4s ease-out infinite;
    pointer-events: none;
  }
  .marker-wrap {
    position: relative;
    width: 28px;
    height: 40px;
  }
`

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

// Green live-location marker
const GREEN_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
  <path d="M15 0C6.716 0 0 6.716 0 15c0 10 15 27 15 27S30 25 30 15C30 6.716 23.284 0 15 0z" fill="#16a34a"/>
  <circle cx="15" cy="15" r="7" fill="#fff"/>
  <circle cx="15" cy="15" r="3.5" fill="#16a34a"/>
</svg>`

const greenIcon = L.divIcon({
  html: `<div class="marker-wrap"><div class="marker-pulse-ring" style="background:rgba(22,163,74,0.55)"></div>${GREEN_PIN_SVG}</div>`,
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42],
})

// Red custom pin marker with blink pulse ring
const RED_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
  <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 26 14 26S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="#e11d48"/>
  <circle cx="14" cy="14" r="6" fill="#fff"/>
</svg>`

const redIcon = L.divIcon({
  html: `<div class="marker-wrap"><div class="marker-pulse-ring"></div>${RED_PIN_SVG}</div>`,
  className: '',
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
})

// Function to get location name from coordinates using OpenStreetMap Nominatim
async function getLocationName(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'SmartTour/1.0'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (!data || data.error) {
    throw new Error('Please select a valid land location within Sri Lanka.')
  }
  
  if (data && data.display_name) {
    if (data.address) {
      const addr = data.address
      if (addr.country_code !== 'lk') {
        throw new Error('Please select a location within Sri Lanka.')
      }
      if (addr.sea || addr.ocean) {
        throw new Error('Please select a valid land location, not the sea.')
      }
      
      const locationName = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state
      const country = addr.country || 'Sri Lanka'
      
      if (locationName) {
        return `${locationName}, ${country}`
      }
    }
    
    // Fallback: use the full display name but limit length
    const address = data.display_name
    if (address.length > 50) {
      const parts = address.split(',')
      if (parts.length >= 2) {
        return parts[parts.length - 2].trim() + ', ' + parts[parts.length - 1].trim()
      }
    }
    
    return address
  }
  
  throw new Error('Location not found')
}

import { VEHICLE_OPTIONS } from './vehicleOptions.js'

const DEFAULT_API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:5001'

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DEFAULT_API}${p}`
}

const SRI_LANKA_CENTER = [7.8731, 80.7718]
const DEFAULT_ZOOM = 7

const SRI_LANKA_BOUNDS = [
  [5.9, 79.5], // South-West
  [9.9, 81.9]  // North-East
]

const POLYLINE_STYLE = {
  color: '#38bdf8',
  weight: 3,
  opacity: 0.85,
  lineJoin: 'round',
  lineCap: 'round',
}

/** Use red pin marker on the map. */
function useLeafletDefaultIcon() {
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    })
  }, [])
}

function MapClickHandler({ onLocationAdd }) {
  useMapEvents({
    click(e) {
      onLocationAdd(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapEffect({ locations }) {
  const map = useMap()
  useEffect(() => {
    if (locations.length > 0) {
      const lastLoc = locations[locations.length - 1]
      // Fly in close to show the pinned location clearly
      map.flyTo([lastLoc.lat, lastLoc.lng], 13, { duration: 0.8 })
      // After 2.5 seconds, fly back out to the full Sri Lanka overview
      const timer = setTimeout(() => {
        map.flyTo(SRI_LANKA_CENTER, DEFAULT_ZOOM, { duration: 1.5 })
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [locations, map])
  return null
}

export default function Home({ onLogout, userName, onBackToHome, onGoToPlanTrip, onBookingConfirmed }) {
  useLeafletDefaultIcon()

  const listId = useId()
  const vehicleGroupId = useId()
  const [locations, setLocations] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentStep, setCurrentStep] = useState(1) // 1: Locations, 2: Vehicle, 3: Review
  const [estimatedPrice, setEstimatedPrice] = useState(null)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [liveLocation, setLiveLocation] = useState(null)   // { lat, lng, name }
  const [gpsLoading, setGpsLoading] = useState(false)
  const [startSearchQuery, setStartSearchQuery] = useState('')
  const [startSearchResults, setStartSearchResults] = useState([])
  const [isStartSearching, setIsStartSearching] = useState(false)

  // Live GPS detection
  const handleGetLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const name = await getLocationName(lat, lng)
          const loc = { id: 'live-start', lat, lng, name, isStart: true }
          setLiveLocation(loc)
          // Insert as first location (start point)
          setLocations((prev) => {
            const rest = prev.filter((l) => l.id !== 'live-start')
            return [loc, ...rest]
          })
          setMessage('')
        } catch (err) {
          setMessage(err.message || 'Could not resolve live location.')
        } finally {
          setGpsLoading(false)
        }
      },
      (err) => {
        setGpsLoading(false)
        setMessage('Location access denied. Please allow location access and try again.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Start-point search logic
  const performStartSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setStartSearchResults([])
      return
    }
    setIsStartSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=lk`,
        { headers: { 'User-Agent': 'SmartTour/1.0' } }
      )
      setStartSearchResults(await res.json())
    } catch {
      // ignore
    } finally {
      setIsStartSearching(false)
    }
  }, [])

  // Debounced effect for start search
  useEffect(() => {
    const timer = setTimeout(() => {
      performStartSearch(startSearchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [startSearchQuery, performStartSearch])

  const handleStartSearch = (e) => {
    e.preventDefault()
    performStartSearch(startSearchQuery)
  }

  const addStartLocation = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const name = result.display_name.split(',').slice(0, 2).join(', ')
    const loc = { id: 'live-start', lat, lng, name, isStart: true }
    setLiveLocation(loc)
    setLocations((prev) => {
      const rest = prev.filter((l) => l.id !== 'live-start')
      return [loc, ...rest]
    })
    setStartSearchQuery('')
    setStartSearchResults([])
  }

  // Destination search logic
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=lk`, {
        headers: { 'User-Agent': 'SmartTour/1.0' }
      })
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced effect for destination search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleSearch = (e) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  const addSearchedLocation = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const name = result.display_name.split(',').slice(0, 2).join(', ')
    
    setLocations((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        lat,
        lng,
        name
      }
    ])
    setSearchQuery('')
    setSearchResults([])
  }

  const addLocation = useCallback(async (lat, lng) => {
    setMessage('')
    const tempId = Date.now() + Math.random()
    setLocations((prev) => [
      ...prev,
      {
        id: tempId,
        lat,
        lng,
        name: 'Loading location...',
      },
    ])
    
    try {
      const locationName = await getLocationName(lat, lng)
      setLocations((prev) => 
        prev.map((loc) => 
          loc.id === tempId 
            ? { ...loc, name: locationName }
            : loc
        )
      )
    } catch (error) {
      console.error('Failed to get location name:', error)
      setMessage(error.message || 'Invalid location selected.')
      // Remove the temporary location
      setLocations((prev) => prev.filter((loc) => loc.id !== tempId))
    }
  }, [])

  const removeLocation = useCallback((id) => {
    setLocations((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const undoLast = useCallback(() => {
    setLocations((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev))
  }, [])

  const clearAll = useCallback(() => {
    setLocations([])
  }, [])

  const [routeCoords, setRouteCoords] = useState([])
  const [legDistances, setLegDistances] = useState([]) // km per segment

  const createTour = useCallback(async () => {
    if (locations.length === 0) {
      setMessage('Please select at least 1 location')
      return
    }
    if (!selectedVehicle) {
      setMessage('Please select a vehicle')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const token = localStorage.getItem('smart_tour_token')
      if (!token) {
        setMessage('Session expired. Please log out and log in again.')
        return
      }

      // 1. Fetch vehicles list
      const vehicleResponse = await fetch('http://127.0.0.1:5001/vehicles-test')
      if (!vehicleResponse.ok) throw new Error('Could not load vehicle list')
      const vehicles = await vehicleResponse.json()

      // 2. Normalise vehicle name casing to match DB exactly
      const VEHICLE_ALIASES = {
        'Mini Car': 'Mini car', 'mini car': 'Mini car',
        'Mini Van': 'Mini van', 'mini van': 'Mini van',
        'Mini Bus': 'Mini bus', 'mini bus': 'Mini bus',
      }
      const resolvedVehicle = VEHICLE_ALIASES[selectedVehicle] ?? selectedVehicle

      // 3. Find matching vehicle (exact → case-insensitive fallback)
      let selectedVehicleObj = vehicles.find((v) => v.type === resolvedVehicle)
        || vehicles.find((v) => v.type.toLowerCase() === resolvedVehicle.toLowerCase())

      // 4. If still not found, seed then retry once
      if (!selectedVehicleObj) {
        await fetch('http://127.0.0.1:5001/seed-all-vehicles', { method: 'POST' })
        const retryVehicles = await (await fetch('http://127.0.0.1:5001/vehicles-test')).json()
        selectedVehicleObj = retryVehicles.find(
          (v) => v.type.toLowerCase() === resolvedVehicle.toLowerCase()
        )
      }

      if (!selectedVehicleObj) {
        setMessage(`Vehicle "${resolvedVehicle}" not found. Please go back and re-select a vehicle.`)
        return
      }

      // 4. Compute real total km from OSRM leg distances
      const totalKm = legDistances.length > 0
        ? legDistances.reduce((s, k) => +(s + k).toFixed(1), 0)
        : 100 // fallback

      // 5. Compute dates
      const today = new Date()
      const days = estimatedPrice?.days || 1
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + days)
      const fmt = (d) => d.toISOString().split('T')[0]

      // 6. Build locations payload
      const locationsPayload = locations.map((loc, i) => ({
        place_name: loc.name || `Stop ${i + 1}`,
        latitude: loc.lat,
        longitude: loc.lng,
      }))

      // 7. Create the tour
      const response = await fetch('http://127.0.0.1:5001/tour/create-tour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicle_id: selectedVehicleObj.id,
          total_distance_km: totalKm,
          total_days: days,
          start_date: fmt(today),
          end_date: fmt(endDate),
          locations: locationsPayload,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log out and log in again.')
        }
        throw new Error(data.message || 'Failed to create tour')
      }

      setMessage(`Tour booked! ${totalKm} km • ${days} day${days !== 1 ? 's' : ''} • $${estimatedPrice?.usd || 0} USD`)
      setBookingConfirmed(true)

      // Navigate to Uber-style finding-driver screen
      if (onBookingConfirmed) {
        const startLoc = locations.find(l => l.isStart) || locations[0]
        onBookingConfirmed({
          startLocation: startLoc
            ? { lat: startLoc.lat, lng: startLoc.lng, name: startLoc.name }
            : null,
          bookingDetails: {
            vehicle: selectedVehicle,
            days: estimatedPrice?.days || days,
            usd: estimatedPrice?.usd || 0,
            lkr: estimatedPrice?.lkr || 0,
          },
        })
      }

    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [locations, selectedVehicle, estimatedPrice])


  // Fetch real road route from OSRM whenever locations change
  useEffect(() => {
    const validLocs = locations.filter((l) => !l.name.startsWith('Loading'))
    if (validLocs.length < 2) {
      setRouteCoords([])
      setLegDistances([])
      return
    }
    const coords = validLocs.map((l) => `${l.lng},${l.lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    let cancelled = false
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const route = data?.routes?.[0]
        if (route) {
          setRouteCoords(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]))
          // Each leg = distance between consecutive stops
          const legs = route.legs || []
          setLegDistances(legs.map((leg) => +(leg.distance / 1000).toFixed(1)))
        }
      })
      .catch(() => {
        if (!cancelled) { setRouteCoords([]); setLegDistances([]) }
      })
    return () => { cancelled = true }
  }, [locations])

  const canUndo = locations.length > 0

  // Calculate estimated price based on locations and vehicle
  const calculateEstimatedPrice = useCallback(() => {
    if (!selectedVehicle || locations.length === 0) return { usd: 0, lkr: 0, days: 0, hours: 0 }
    
    // Get total distance from legDistances (computed via OSRM)
    const totalKm = legDistances.reduce((s, k) => +(s + k).toFixed(1), 0) || (locations.length * 50)
    
    // Estimate trip duration based on distance and locations
    const hoursPerLocation = 2.5
    const travelSpeed = 40 // Average km/h in Sri Lanka
    const travelHours = totalKm / travelSpeed
    const totalHours = (locations.length * hoursPerLocation) + travelHours
    const totalDays = Math.ceil(totalHours / 8) // 8 hours = 1 day

    // Rates in USD (roughly matching backend LKR rates)
    const rates = {
      'Mini car': { km: 0.14, day: 14 },
      'Car': { km: 0.16, day: 16 },
      'Mini van': { km: 0.19, day: 20 },
      'Van': { km: 0.22, day: 25 },
      'SUV': { km: 0.20, day: 22 },
      'Mini bus': { km: 0.26, day: 35 },
      'Bus': { km: 0.28, day: 38 },
    }
    
    const vehicleRate = rates[selectedVehicle] || rates['Car']
    
    // FINAL CALCULATION: (km * rate_km) + (days * rate_day) - NO BASE PRICE
    const totalUSD = (totalKm * vehicleRate.km) + (totalDays * vehicleRate.day)
    
    // Convert USD to LKR (approximate rate: 1 USD = 320 LKR)
    const totalLKR = Math.round(totalUSD * 320)
    
    return {
      usd: Math.round(totalUSD),
      lkr: totalLKR,
      days: totalDays,
      hours: Math.round(totalHours * 10) / 10
    }
  }, [selectedVehicle, locations.length, legDistances])

  // Calculate price when locations or vehicle changes
  useEffect(() => {
    const price = calculateEstimatedPrice()
    setEstimatedPrice(price)
  }, [calculateEstimatedPrice])

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-100 via-orange-50 to-sky-50">
      {/* MODERN VIDEO HERO SECTION */}
      <section className="relative h-104 overflow-hidden border-b border-white/30">
        {/* Background Video */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" type="video/mp4" />
          {/* Fallback for browsers that don't support video */}
          <div className="absolute inset-0 bg-linear-to-r from-sky-500 to-orange-500"></div>
        </video>
        
        {/* Dark Overlay for Readability */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-900/50 via-slate-900/35 to-slate-900/55"></div>
        
        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center text-white px-4 sm:px-6 max-w-4xl">
            {/* Animated Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up">
              Explore Sri Lanka Like Never Before
            </h1>
            
            {/* Animated Subtitle */}
            <p className="text-lg md:text-xl lg:text-2xl text-gray-200 mb-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              Plan your journey, select destinations, and travel smart
            </p>
            
            {/* Animated CTA Button */}
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <button
                onClick={() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' })}
                className="group relative px-8 py-4 bg-linear-to-r from-orange-500 to-sky-600 text-white font-semibold rounded-full 
                         transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30
                         focus:outline-none focus:ring-4 focus:ring-orange-400/50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <i className="bi bi-compass"></i>
                  Start Planning
                  <i className="bi bi-arrow-right"></i>
                </span>
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent 
                        transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-gray-300">Scroll to explore</span>
            <i className="bi bi-chevron-down text-xl"></i>
          </div>
        </div>
      </section>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/85 shadow-md backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={appLogo} alt="Smart Tour logo" className="h-10 w-10 rounded-xl border border-sky-200 object-cover shadow-sm" />
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-800 transition-all duration-200 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md"
                >
                  ← Back to Home
                </button>
              )}
              {onGoToPlanTrip && (
                <button
                  type="button"
                  onClick={onGoToPlanTrip}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-600 hover:shadow-md"
                >
                  Plan Trip
                </button>
              )}
              <h1 className="text-2xl font-bold text-slate-900">Smart Tour</h1>
              {userName && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
                  {userName}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg bg-red-500 px-6 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* PROGRESS STEPS */}
      <div className="border-b border-sky-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                currentStep >= 1 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-slate-300 text-slate-600'
              }`}>
                1
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= 1 ? 'text-orange-600' : 'text-slate-500'
                }`}>
                  Select Locations
                </p>
                <p className="text-xs text-gray-500">Choose your tour stops</p>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-4 ${
              currentStep >= 2 ? 'bg-orange-500' : 'bg-slate-300'
            }`} />

            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                currentStep >= 2 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-slate-300 text-slate-600'
              }`}>
                2
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= 2 ? 'text-orange-600' : 'text-slate-500'
                }`}>
                  Choose Vehicle
                </p>
                <p className="text-xs text-gray-500">Select your transport</p>
              </div>
            </div>

            {/* Connector */}
            <div className={`flex-1 h-1 mx-4 ${
              currentStep >= 3 ? 'bg-orange-500' : 'bg-slate-300'
            }`} />

            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                currentStep >= 3 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-slate-300 text-slate-600'
              }`}>
                3
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= 3 ? 'text-orange-600' : 'text-slate-500'
                }`}>
                  Create Tour
                </p>
                <p className="text-xs text-gray-500">Review & confirm</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* ──────────── STEP 1 ──────────── */}
        {currentStep === 1 && (
          <div>
            {/* HEADER */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">Plan Your Tour Route</h2>
              <p className="text-gray-500 text-sm">Set your start point, add stops, and watch the real road route build live on the map.</p>
            </div>

            {/* TOP ROW: two search panels side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* ── LEFT: START LOCATION ── */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-5 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold shrink-0">S</span>
                  <div>
                    <h3 className="font-bold text-green-900 leading-none">Start Location</h3>
                    {liveLocation && <p className="text-xs text-green-700 mt-0.5 truncate"><i className="bi bi-geo-alt-fill"></i> {liveLocation.name}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGetLiveLocation}
                  disabled={gpsLoading}
                  className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  {gpsLoading
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Detecting...</>
                    : <><i className="bi bi-crosshair2" />Use My Live Location</>}
                </button>

                <p className="text-center text-xs text-green-600 mb-2">— or search —</p>

                <form onSubmit={handleStartSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={startSearchQuery}
                    onChange={(e) => setStartSearchQuery(e.target.value)}
                    placeholder="Search starting city..."
                    className="flex-1 px-3 py-2 text-sm text-gray-700 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                  <button type="submit" disabled={isStartSearching || !startSearchQuery.trim()}
                    className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors">
                    {isStartSearching ? '…' : 'Find'}
                  </button>
                </form>

                {startSearchResults.length > 0 && (
                  <div className="mt-2 border border-green-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto bg-white">
                    <ul className="divide-y divide-gray-100">
                      {startSearchResults.map((r, i) => (
                        <li key={i}>
                          <button type="button" onClick={() => addStartLocation(r)}
                            className="w-full text-left px-3 py-2 hover:bg-green-50 flex items-start gap-2 transition-colors">
                            <i className="bi bi-geo-alt-fill text-green-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-xs">{r.display_name.split(',')[0]}</p>
                              <p className="text-xs text-gray-400 truncate">{r.display_name}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── RIGHT: ADD TOUR STOPS ── */}
              <div className="bg-white rounded-2xl border border-orange-200 p-5 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold shrink-0">+</span>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-none">Add Tour Stops</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{locations.filter(l=>!l.isStart).length} stop{locations.filter(l=>!l.isStart).length !== 1 ? 's' : ''} added</p>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search destination or landmark..."
                    className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button type="submit" disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors">
                    {isSearching ? '…' : 'Search'}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                      {searchResults.map((r, i) => (
                        <li key={i}>
                          <button type="button" onClick={() => addSearchedLocation(r)}
                            className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-start gap-2 transition-colors">
                            <i className="bi bi-geo-alt-fill text-orange-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-xs">{r.display_name.split(',')[0]}</p>
                              <p className="text-xs text-gray-400 truncate">{r.display_name}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {locations.length === 0 && searchResults.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2 text-center">Or click directly on the map to drop a pin</p>
                )}
              </div>
            </div>

            {/* MAP + FLOATING IN-MAP CONTROLS */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 mb-4" style={{ height: '65vh', minHeight: '480px' }}>
              <MapContainer
                center={SRI_LANKA_CENTER}
                zoom={DEFAULT_ZOOM}
                minZoom={7}
                maxBounds={SRI_LANKA_BOUNDS}
                maxBoundsViscosity={1.0}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
                style={{ height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onLocationAdd={addLocation} />
                <MapEffect locations={locations} />
                {routeCoords.length >= 2 && (
                  <Polyline
                    positions={routeCoords}
                    pathOptions={{ ...POLYLINE_STYLE, color: '#f97316', weight: 5, dashArray: '12 8' }}
                    className="route-dash-animate"
                  />
                )}
                {locations.map((loc, index) => (
                  <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={loc.isStart ? greenIcon : redIcon}>
                    <Popup>
                      <div className="min-w-44 text-gray-800 text-sm">
                        <p className="font-bold text-base mb-1">
                          {loc.isStart ? <><i className="bi bi-geo-alt-fill text-emerald-500 mr-2"></i>Start</> : <><i className="bi bi-geo-alt-fill text-rose-500 mr-2"></i>Stop {index}</>}
                        </p>
                        <p className="font-medium text-gray-700">{loc.name || 'Unknown Location'}</p>
                        <p className="text-xs text-gray-400 mt-1">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
                        <button
                          type="button"
                          onClick={() => removeLocation(loc.id)}
                          className="mt-2 w-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg py-1.5 px-3 transition-colors"
                        >
                          <i className="bi bi-trash3-fill mr-1"></i> Remove This Stop
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* FLOATING IN-MAP CONTROL BAR */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-2 border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 mr-1">Map Controls</span>
                <button
                  type="button"
                  onClick={undoLast}
                  disabled={!canUndo}
                  title="Undo last stop"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl border border-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="bi bi-arrow-counterclockwise" /> Undo
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={locations.length === 0}
                  title="Remove all stops"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 rounded-xl border border-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="bi bi-trash" /> Clear All
                </button>
                <span className="text-xs text-gray-400 border-l border-gray-300 pl-2 ml-1">{locations.length} stop{locations.length !== 1 ? 's' : ''}</span>
              </div>

              {/* HINT */}
              {locations.length === 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-800/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
                  <i className="bi bi-cursor-fill mr-1"></i> Click anywhere on the map to drop a pin
                </div>
              )}
            </div>

            {/* ROUTE KM BREAKDOWN */}
            {locations.length >= 2 && (
              <div className="flex gap-4 mb-6">
                {/* Left: per-leg distances */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-md p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="bi bi-sign-turn-right-fill text-orange-500" /> Route Legs
                  </h4>
                  {legDistances.length === 0 && (
                    <p className="text-xs text-gray-400">Calculating route distances...</p>
                  )}
                  <ul className="space-y-2">
                    {legDistances.map((km, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold text-xs shrink-0">{i + 1}</span>
                        <span className="text-gray-500 text-xs truncate flex-1">
                          {locations[i]?.name?.split(',')[0] ?? `Stop ${i+1}`}
                          <span className="mx-1 text-gray-300">→</span>
                          {locations[i + 1]?.name?.split(',')[0] ?? `Stop ${i+2}`}
                        </span>
                        <span className="font-semibold text-orange-600 text-xs whitespace-nowrap">{km} km</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: total km summary */}
                <div className="w-44 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-md p-4 flex flex-col items-center justify-center text-white shrink-0">
                  <i className="bi bi-map-fill text-2xl mb-1" />
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">Total Distance</p>
                  <p className="text-3xl font-black">
                    {legDistances.reduce((s, k) => +(s + k).toFixed(1), 0)}
                  </p>
                  <p className="text-sm font-semibold opacity-90">km</p>
                  <p className="text-xs opacity-70 mt-1">{locations.length} stops</p>
                </div>
              </div>
            )}

            {/* NEXT STEP BUTTON */}
            {locations.length > 0 && (
              <div className="flex justify-end mb-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 px-8 py-3 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-orange-200"
                >
                  Next: Choose Vehicle →
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Step 2: Choose Your Vehicle
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                Select the perfect vehicle for your Sri Lanka tour
              </p>
              
              {/* REAL-TIME PRICE DISPLAY */}
              {selectedVehicle && (
                <div className="bg-linear-to-r from-sky-50 to-orange-50 rounded-2xl p-6 mb-6 border border-sky-200 max-w-md mx-auto">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">
                      <i className="bi bi-currency-dollar me-1"></i>
                      Estimated Price
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      ${estimatedPrice?.usd || 0} USD
                    </div>
                    <div className="text-xl font-semibold text-green-600 mb-2">
                      රු. {estimatedPrice?.lkr?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      For {locations.length} location{locations.length !== 1 ? 's' : ''} • {selectedVehicle}
                    </div>
                    <div className="text-xs text-purple-600">
                      <i className="bi bi-clock me-1"></i>
                      Duration: {estimatedPrice?.days || 0} day{estimatedPrice?.days !== 1 ? 's' : ''} ({estimatedPrice?.hours || 0} hours)
                    </div>
                    {locations.length > 1 && (
                      <div className="text-xs text-green-600 mt-2">
                        <i className="bi bi-check-circle me-1"></i>
                        20% multi-location discount applied!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* VEHICLE SELECTION */}
            <section className="bg-white rounded-2xl shadow-lg p-6 mb-8" aria-labelledby={vehicleGroupId}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
                <div>
                  <h2
                    id={vehicleGroupId}
                    className="text-2xl font-bold text-gray-900 mb-2"
                  >
                    Choose your vehicle
                  </h2>
                  <p className="text-gray-600 max-w-xl">
                    Premium fleet visuals — tap a card to set pricing and driver matching for your route.
                  </p>
                </div>
                <div className="bg-sky-100 rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-sky-800">
                    Active: <span className="font-bold">{selectedVehicle || 'None selected'}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                {VEHICLE_OPTIONS.map((v) => {
                  const selected = selectedVehicle === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehicle(v.id)}
                      aria-pressed={selected}
                      aria-label={`${v.title}: ${v.description}`}
                      className={[
                        'group relative flex flex-col overflow-hidden rounded-xl text-left transition-all duration-300 p-4 border-2',
                        'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
                        selected
                          ? 'border-orange-400 bg-orange-50 shadow-xl'
                          : 'border-gray-200 bg-white hover:border-sky-300 hover:shadow-lg',
                      ].join(' ')}
                    >
                      {selected && (
                        <span className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                          ✓
                        </span>
                      )}

                      <div 
                        className="relative mb-0 overflow-hidden aspect-5/3 w-full bg-gray-100 flex items-center justify-center"
                      >
                        {/* Use actual vehicle images with fallback */}
                        <img
                          src={v.image}
                          alt={v.title}
                          className="w-full h-full object-contain"
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                          onError={(e) => {
                            console.log('Vehicle image failed to load, using fallback icon');
                            // Create simple colored vehicle icon as fallback
                            const svgContent = `
                              <svg width="100" height="70" viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg">
                                ${v.id.includes('car') || v.id.includes('Mini car') ? `
                                  <rect x="10" y="30" width="80" height="25" rx="4" fill="#3B82F6"/>
                                  <rect x="20" y="18" width="60" height="18" rx="3" fill="#60A5FA"/>
                                  <rect x="25" y="22" width="50" height="10" rx="2" fill="#DBEAFE"/>
                                  <circle cx="25" cy="58" r="7" fill="#1F2937"/>
                                  <circle cx="75" cy="58" r="7" fill="#1F2937"/>
                                  <circle cx="25" cy="58" r="3" fill="#6B7280"/>
                                  <circle cx="75" cy="58" r="3" fill="#6B7280"/>
                                ` : v.id.includes('van') || v.id.includes('Mini van') ? `
                                  <rect x="5" y="25" width="90" height="30" rx="4" fill="#10B981"/>
                                  <rect x="10" y="15" width="80" height="20" rx="3" fill="#34D399"/>
                                  <rect x="15" y="19" width="70" height="12" rx="2" fill="#D1FAE5"/>
                                  <circle cx="20" cy="58" r="7" fill="#1F2937"/>
                                  <circle cx="80" cy="58" r="7" fill="#1F2937"/>
                                  <circle cx="20" cy="58" r="3" fill="#6B7280"/>
                                  <circle cx="80" cy="58" r="3" fill="#6B7280"/>
                                ` : v.id.includes('bus') || v.id.includes('Mini bus') ? `
                                  <rect x="5" y="20" width="90" height="35" rx="4" fill="#F59E0B"/>
                                  <rect x="8" y="10" width="84" height="18" rx="3" fill="#FBBf24"/>
                                  <rect x="12" y="14" width="76" height="10" rx="2" fill="#FEF3C7"/>
                                  <circle cx="20" cy="58" r="6" fill="#1F2937"/>
                                  <circle cx="35" cy="58" r="6" fill="#1F2937"/>
                                  <circle cx="65" cy="58" r="6" fill="#1F2937"/>
                                  <circle cx="80" cy="58" r="6" fill="#1F2937"/>
                                  <circle cx="20" cy="58" r="2.5" fill="#6B7280"/>
                                  <circle cx="35" cy="58" r="2.5" fill="#6B7280"/>
                                  <circle cx="65" cy="58" r="2.5" fill="#6B7280"/>
                                  <circle cx="80" cy="58" r="2.5" fill="#6B7280"/>
                                ` : v.id.toLowerCase().includes('suv') ? `
                                  <rect x="10" y="32" width="80" height="25" rx="4" fill="#EF4444"/>
                                  <rect x="15" y="18" width="70" height="20" rx="3" fill="#F87171"/>
                                  <rect x="20" y="22" width="60" height="12" rx="2" fill="#FEE2E2"/>
                                  <circle cx="25" cy="60" r="8" fill="#1F2937"/>
                                  <circle cx="75" cy="60" r="8" fill="#1F2937"/>
                                  <circle cx="25" cy="60" r="3.5" fill="#6B7280"/>
                                  <circle cx="75" cy="60" r="3.5" fill="#6B7280"/>
                                ` : `
                                  <rect x="10" y="30" width="80" height="25" rx="4" fill="#6B7280"/>
                                  <rect x="20" y="18" width="60" height="18" rx="3" fill="#9CA3AF"/>
                                  <rect x="25" y="22" width="50" height="10" rx="2" fill="#E5E7EB"/>
                                  <circle cx="25" cy="58" r="7" fill="#1F2937"/>
                                  <circle cx="75" cy="58" r="7" fill="#1F2937"/>
                                  <circle cx="25" cy="58" r="3" fill="#6B7280"/>
                                  <circle cx="75" cy="58" r="3" fill="#6B7280"}
                                `}
                              </svg>
                            `;
                            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                            const url = URL.createObjectURL(blob);
                            e.target.src = url;
                          }}
                        />
                      </div>

                      <div className="relative z-1 space-y-1.5 border-t border-gray-200 bg-white p-3.5 sm:p-4">
                        <h3
                          className={[
                            'text-lg font-semibold tracking-tight text-gray-900',
                          ].join(' ')}
                        >
                          {v.title}
                        </h3>
                        <p className="line-clamp-3 text-xs leading-relaxed text-gray-600 group-hover:text-gray-700 sm:text-sm">
                          {v.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* STEP 2 ACTIONS */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
              >
                ← Back to Locations
              </button>

              {selectedVehicle && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="rounded-lg bg-orange-500 px-8 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-600 hover:shadow-lg"
                >
                  Next: Review Tour →
                </button>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Step 3: Review & Create Your Tour
              </h2>
              <p className="text-lg text-gray-600">
                Review your tour details and create your Sri Lanka adventure
              </p>
            </div>

            {/* TOUR SUMMARY */}
            <div className="grid gap-6 lg:grid-cols-3 mb-8">
              {/* LOCATIONS SUMMARY */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  <i className="bi bi-geo-alt me-2"></i>
                  Tour Locations ({locations.length})
                </h3>
                <div className="space-y-3">
                  {locations.map((loc, index) => (
                    <div key={loc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full mr-2">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">{loc.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VEHICLE SUMMARY */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  <i className="bi bi-car-front me-2"></i>
                  Selected Vehicle
                </h3>
                {selectedVehicle && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={VEHICLE_OPTIONS.find(v => v.id === selectedVehicle)?.image}
                        alt={selectedVehicle}
                        className="w-20 h-16 object-contain"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">{selectedVehicle}</h4>
                        <p className="text-sm text-gray-600">
                          {VEHICLE_OPTIONS.find(v => v.id === selectedVehicle)?.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PRICE ESTIMATE */}
              <div className="bg-linear-to-br from-sky-50 to-orange-50 rounded-2xl shadow-lg p-6 border border-sky-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  <i className="bi bi-currency-dollar me-2"></i>
                  Price & Duration Estimate
                </h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      ${estimatedPrice?.usd || 0} USD
                    </div>
                    <div className="text-xl font-semibold text-green-600 mb-2">
                      රු. {estimatedPrice?.lkr?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-600">USD</div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Distance:</span>
                      <span>{legDistances.reduce((s, k) => +(s + k).toFixed(1), 0)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Locations:</span>
                      <span>{locations.length} × {locations.length > 1 ? '0.8x' : '1x'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span><i className="bi bi-clock me-1"></i>Duration:</span>
                      <span>{estimatedPrice?.days || 0} day{estimatedPrice?.days !== 1 ? 's' : ''} ({estimatedPrice?.hours || 0} hours)</span>
                    </div>
                    {locations.length > 1 && (
                      <div className="flex justify-between text-green-600">
                        <span>Multi-location discount:</span>
                        <span>-20%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BOOKING STATUS */}
            {message && (
              <div className={`p-4 rounded-lg mb-6 ${
                bookingConfirmed 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  <i className={`bi ${bookingConfirmed ? 'bi-check-circle' : 'bi-exclamation-circle'}`}></i>
                  <span>{message}</span>
                </div>
              </div>
            )}

            {/* BOOKING CONFIRMATION */}
            {bookingConfirmed && (
              <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-6 border border-green-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-800 mb-2">
                    <i className="bi bi-check-circle me-2"></i>
                    Booking Confirmed!
                  </div>
                  <p className="text-green-700 mb-4">
                    Your Sri Lanka tour has been successfully booked. You will receive a confirmation email shortly.
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setLocations([])
                        setSelectedVehicle('')
                        setCurrentStep(1)
                        setBookingConfirmed(false)
                        setMessage('')
                      }}
                      className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700"
                    >
                      Create New Tour
                    </button>
                    <button
                      type="button"
                      onClick={onBackToHome}
                      className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 ACTIONS */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
              >
                ← Back to Vehicle
              </button>

              {!bookingConfirmed && (
                <button
                  type="button"
                  onClick={createTour}
                  disabled={loading || locations.length === 0 || !selectedVehicle}
                  className="rounded-lg bg-linear-to-r from-green-600 to-emerald-600 px-8 py-4 text-sm font-medium text-white transition-all duration-200 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle"></i>
                      Book {estimatedPrice?.days || 0} Day Tour - ${estimatedPrice?.usd || 0} USD / රු. {estimatedPrice?.lkr?.toLocaleString() || 0}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {message && (
          <div className={`rounded-lg border px-4 py-3 text-sm mb-6 ${
            message.includes('success') 
              ? 'border-green-500/40 bg-green-50 text-green-700'
              : 'border-red-500/40 bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </main>
    </div>
  )
}
