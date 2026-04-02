import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import appLogo from '../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

// Custom CSS animations for video hero section
const customStyles = `
  @keyframes fade-in-up {
    0% {
      opacity: 0;
      transform: translateY(30px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in-up {
    animation: fade-in-up 700ms ease-out forwards;
    opacity: 0;
  }
`

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Function to get location name from coordinates using OpenStreetMap Nominatim
async function getLocationName(lat, lng) {
  try {
    console.log(`Getting location name for: ${lat}, ${lng}`)
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
    console.log('Geocoding response:', data)
    
    if (data && data.display_name) {
      // Extract meaningful parts of the address
      const address = data.display_name
      console.log('Full address:', address)
      
      // Try to get a more specific location name
      if (data.address) {
        const addr = data.address
        // Priority: city > town > village > suburb > county > state
        const locationName = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state
        const country = addr.country || 'Sri Lanka'
        
        if (locationName) {
          const result = `${locationName}, ${country}`
          console.log('Extracted location name:', result)
          return result
        }
      }
      
      // Fallback: use the full display name but limit length
      if (address.length > 50) {
        const parts = address.split(',')
        if (parts.length >= 2) {
          // Return the most relevant part (usually city/town)
          const result = parts[parts.length - 2].trim() + ', ' + parts[parts.length - 1].trim()
          console.log('Fallback location name:', result)
          return result
        }
      }
      
      console.log('Using full address:', address)
      return address
    }
    
    console.log('No location data found, using coordinates')
    return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch (error) {
    console.error('Error getting location name:', error)
    return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
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

const POLYLINE_STYLE = {
  color: '#38bdf8',
  weight: 3,
  opacity: 0.85,
  lineJoin: 'round',
  lineCap: 'round',
}

/** Fix default marker assets with Vite (bundler does not resolve Leaflet image URLs). */
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

export default function Home({ onLogout, userName, onBackToHome, onGoToPlanTrip }) {
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

  const addLocation = useCallback(async (lat, lng) => {
    console.log(`Adding location at: ${lat}, ${lng}`)
    
    // First add location with loading state
    const tempId = Date.now()
    setLocations((prev) => [
      ...prev,
      {
        id: tempId,
        lat,
        lng,
        name: 'Loading location name...',
      },
    ])
    
    // Then get the actual location name
    try {
      const locationName = await getLocationName(lat, lng)
      console.log(`Got location name: ${locationName}`)
      
      // Update the location with the real name
      setLocations((prev) => 
        prev.map((loc) => 
          loc.id === tempId 
            ? { ...loc, name: locationName }
            : loc
        )
      )
    } catch (error) {
      console.error('Failed to get location name:', error)
      
      // Update with fallback name
      setLocations((prev) => 
        prev.map((loc) => 
          loc.id === tempId 
            ? { ...loc, name: `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}` }
            : loc
        )
      )
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

  const createTour = useCallback(async () => {
    // Validation
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
        setMessage('Please login first')
        return
      }

      // Find vehicle by type to get vehicle_id
      const vehicleResponse = await fetch('http://127.0.0.1:5001/vehicles-test')
      const vehicles = await vehicleResponse.json()
      const selectedVehicleObj = vehicles.find(v => v.type === selectedVehicle)
      
      if (!selectedVehicleObj) {
        setMessage('Selected vehicle not found')
        return
      }

      const response = await fetch('http://127.0.0.1:5001/tour/create-tour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicle_id: selectedVehicleObj.id,
          latitude: locations[0].lat,
          longitude: locations[0].lng,
          total_distance_km: 100,
          total_days: 1,
          start_date: "2026-04-01",
          end_date: "2026-04-02"
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create tour')
      }
      
      setMessage(`✅ Tour created successfully! Price: $${estimatedPrice?.usd || 0} USD / රු. ${estimatedPrice?.lkr?.toLocaleString() || 0}`)
      setBookingConfirmed(true)
      
    } catch (error) {
      setMessage(`❌ ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [locations, selectedVehicle, estimatedPrice])

  const polylinePositions = useMemo(
    () => locations.map((loc) => [loc.lat, loc.lng]),
    [locations],
  )

  const canUndo = locations.length > 0

  // Calculate estimated price based on locations and vehicle
  const calculateEstimatedPrice = useCallback(() => {
    if (!selectedVehicle || locations.length === 0) return { usd: 0, lkr: 0, days: 0, hours: 0 }
    
    // Base prices per vehicle type
    const vehicleBasePrices = {
      'Car': 50,
      'Mini Car': 40,
      'Van': 80,
      'Mini Van': 70,
      'Bus': 120,
      'Mini Bus': 100,
      'Jeep': 90,
      'Mini Bus': 100
    }
    
    const basePrice = vehicleBasePrices[selectedVehicle] || 50
    const locationMultiplier = locations.length > 1 ? 0.8 : 1 // Discount for multiple locations
    const totalUSD = basePrice * locations.length * locationMultiplier
    
    // Convert USD to LKR (approximate rate: 1 USD = 320 LKR)
    const totalLKR = Math.round(totalUSD * 320)
    
    // Estimate trip duration based on locations
    // Assume average 2-3 hours per location + travel time
    const hoursPerLocation = 2.5
    const travelHours = locations.length > 1 ? (locations.length - 1) * 1.5 : 0
    const totalHours = (locations.length * hoursPerLocation) + travelHours
    const totalDays = Math.ceil(totalHours / 8) // 8 hours = 1 day
    
    return {
      usd: Math.round(totalUSD),
      lkr: totalLKR,
      days: totalDays,
      hours: Math.round(totalHours * 10) / 10 // Round to 1 decimal place
    }
  }, [selectedVehicle, locations.length])

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
        {currentStep === 1 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Step 1: Select Your Tour Locations
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                Click anywhere on the map to add stops for your Sri Lanka tour
              </p>
              
              {/* PRICE PREVIEW */}
              {locations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 max-w-md mx-auto border border-gray-200">
                  <div className="text-sm text-gray-600">
                    <i className="bi bi-info-circle me-1"></i>
                    Current tour: {locations.length} location{locations.length !== 1 ? 's' : ''}
                    {selectedVehicle && ` • ${selectedVehicle}`}
                  </div>
                  {selectedVehicle && (
                    <div className="text-lg font-semibold text-blue-600 mt-1">
                      Starting from ${estimatedPrice?.usd || 0} USD / රු. {estimatedPrice?.lkr?.toLocaleString() || 0}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    <i className="bi bi-clock me-1"></i>
                    Estimated duration: {estimatedPrice?.days || 0} day{estimatedPrice?.days !== 1 ? 's' : ''} ({estimatedPrice?.hours || 0} hours)
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200">
                  <i className="bi bi-mouse2 me-2"></i>
                  Click to add location
                </div>
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                  <i className="bi bi-plus-circle me-2"></i>
                  Scroll to zoom
                </div>
                <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg border border-purple-200">
                  <i className="bi bi-hand-index me-2"></i>
                  Drag to pan
                </div>
              </div>
            </div>

            {/* MAP CONTAINER */}
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-8">
              <div className="h-[60vh] min-h-125 max-w-7xl mx-auto overflow-hidden rounded-xl">
                <MapContainer
                  center={SRI_LANKA_CENTER}
                  zoom={DEFAULT_ZOOM}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                  style={{ minHeight: '500px', height: '60vh' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onLocationAdd={addLocation} />
                  {polylinePositions.length >= 2 ? (
                    <Polyline positions={polylinePositions} pathOptions={POLYLINE_STYLE} />
                  ) : null}
                  {locations.map((loc, index) => (
                    <Marker key={loc.id} position={[loc.lat, loc.lng]}>
                      <Popup>
                        <div className="min-w-48 text-gray-800">
                          <p className="font-medium">Stop {index + 1}</p>
                          <p className="text-sm text-gray-700 font-medium">
                            {loc.name || 'Unknown Location'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                          </p>
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-red-600 underline hover:text-red-700"
                            onClick={() => removeLocation(loc.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* SELECTED LOCATIONS */}
            {locations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    Selected Locations ({locations.length})
                  </h3>
                  <div className="text-sm text-gray-500">
                    <i className="bi bi-info-circle me-1"></i>
                    Click on markers to see details
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {locations.map((loc, index) => (
                    <div key={loc.id} className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {loc.name || `Location ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLocation(loc.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1 transition-colors"
                          title="Remove location"
                        >
                          <i className="bi bi-trash text-sm"></i>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <i className="bi bi-geo-alt"></i>
                        <span>Stop {index + 1} of {locations.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {locations.length > 1 && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 text-sm">
                      <i className="bi bi-check-circle"></i>
                      <span>Great! You have {locations.length} stops selected. Ready to choose your vehicle?</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1 ACTIONS */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                type="button"
                onClick={undoLast}
                disabled={!canUndo}
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                Undo last point
              </button>
              
              <button
                type="button"
                onClick={clearAll}
                disabled={locations.length === 0}
                className="rounded-lg border border-red-300 bg-red-50 px-6 py-3 text-sm font-medium text-red-700 transition-all duration-200 hover:border-red-400 hover:bg-red-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear all
              </button>

              {locations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-lg bg-orange-500 px-8 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-600 hover:shadow-lg"
                >
                  Next: Choose Vehicle →
                </button>
              )}
            </div>
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
                                ` : v.id.includes('jeep') ? `
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
                      <span>Base Price:</span>
                      <span>${VEHICLE_OPTIONS.find(v => v.id === selectedVehicle)?.id.includes('Car') ? '50' : 
                              VEHICLE_OPTIONS.find(v => v.id === selectedVehicle)?.id.includes('Van') ? '80' :
                              VEHICLE_OPTIONS.find(v => v.id === selectedVehicle)?.id.includes('Bus') ? '120' : '90'}</span>
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
