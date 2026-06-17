import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import Footer from './components/Footer.jsx'
import { calculateTourEstimate, createTour as createTourRequest } from './services/api.js'
import appLogo from '../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'
import sigiriyaImg from '../images/sigiriya.png'
import galleImg from '../images/galle.png'
import nineArchImg from '../images/nine_arch.png'
import nallurImg from '../images/nallur.png'
import arugamBayImg from '../images/arugam_bay.png'
import anuradhapuraImg from '../images/anuradhapura.png'
import kandyImg from '../images/kandy.png'
import mirissaImg from '../images/mirissa.png'
import trincomaleeImg from '../images/trincomalee.png'

const pad2 = (n) => String(n).padStart(2, '0')
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const todayDateString = () => formatLocalDate(new Date())

const VEHICLE_ALIASES = {
  'Mini Car': 'Mini car', 'mini car': 'Mini car',
  'Mini Van': 'Mini van', 'mini van': 'Mini van',
  'Mini Bus': 'Mini bus', 'mini bus': 'Mini bus',
}
const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  
  :root {
    --brand-orange: #f97316;
    --brand-green: #10b981;
    --brand-dark: #0f172a;
  }

  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }

  @keyframes pulse-soft {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  .animate-pulse-soft { animation: pulse-soft 3s infinite; }

  @keyframes mesh-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  .mesh-bg { animation: mesh-pulse 10s ease-in-out infinite; }

  /* Marker pulse ring */
  @keyframes markerPulse {
    0%   { transform: scale(1);   opacity: 0.8; }
    70%  { transform: scale(1.8); opacity: 0; }
    100% { transform: scale(1);   opacity: 0; }
  }
  .marker-pulse-ring {
    position: absolute;
    top: 50%; left: 50%;
    width: 32px; height: 32px;
    margin-top: -16px; margin-left: -16px;
    border-radius: 50%;
    animation: markerPulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    pointer-events: none;
  }
  .marker-wrap {
    position: relative;
    width: 30px;
    height: 42px;
  }

  /* Glassmorphism utility */
  .glass {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .location-search-dropdown {
    animation: fade-in-up 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .glass-dark {
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  .leaflet-container { font-family: 'Plus Jakarta Sans', sans-serif !important; border-radius: 0; }
  
  /* High-Definition Map Look */
  .leaflet-tile-pane {
    filter: saturate(1.3) contrast(1.1) brightness(0.95) sepia(0.05);
  }
  .map-vignette {
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 100px rgba(15, 23, 42, 0.1);
    pointer-events: none;
    z-index: 500;
    border-radius: 2.5rem;
  }
  .map-glass-border {
    position: absolute;
    inset: 0;
    border: 8px solid rgba(255, 255, 255, 0.4);
    pointer-events: none;
    z-index: 600;
    border-radius: 2.5rem;
    backdrop-filter: blur(2px);
    mask-image: linear-gradient(to bottom, black, transparent 15%, transparent 85%, black);
  }

  /* Suggestion Marker */
  .suggestion-marker-wrap {
    position: relative;
    width: 44px;
    height: 44px;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 8px 16px rgba(0,0,0,0.25);
    transition: all 0.3s ease;
    cursor: pointer;
    overflow: visible;
  }
  .suggestion-marker-wrap:hover {
    transform: scale(1.2);
    z-index: 1000 !important;
    border-color: var(--brand-orange);
  }
  .suggestion-marker-photo {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
  }
  .suggestion-marker-pulse {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid var(--brand-orange);
    opacity: 0;
    animation: markerPulse 2s infinite;
  }

  .custom-popup .leaflet-popup-content-wrapper {
    padding: 0 !important;
    overflow: hidden;
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  }
  .custom-popup .leaflet-popup-content {
    margin: 0 !important;
    width: 280px !important;
  }
  .custom-popup .leaflet-popup-tip {
    box-shadow: none;
  }
`

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

// Suggestion Marker Icons (Circular with images)
const createSuggestionIcon = (imageUrl) => L.divIcon({
  html: `<div class="suggestion-marker-wrap">
          <div class="suggestion-marker-photo" style="background-image: url('${imageUrl}')"></div>
          <div class="suggestion-marker-pulse"></div>
         </div>`,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
})

// Famous Places Data
const FAMOUS_PLACES = [
  {
    id: 'sigiriya',
    name: 'Sigiriya Rock Fortress',
    province: 'Central',
    description: 'Ancient rock fortress and palace ruin of historical and archaeological significance.',
    lat: 7.9570, lng: 80.7603,
    image: sigiriyaImg
  },
  {
    id: 'galle-fort',
    name: 'Galle Dutch Fort',
    province: 'Southern',
    description: 'A historic fortress city built by the Portuguese and later fortified by the Dutch.',
    lat: 6.0269, lng: 80.2151,
    image: galleImg
  },
  {
    id: 'nine-arch',
    name: 'Nine Arch Bridge',
    province: 'Uva',
    description: 'A stunning colonial-era railway bridge surrounded by lush tea plantations in Ella.',
    lat: 6.8768, lng: 81.0608,
    image: nineArchImg
  },
  {
    id: 'nallur',
    name: 'Nallur Kandaswamy Kovil',
    province: 'Northern',
    description: 'One of the most significant Hindu temples in Sri Lanka, located in Jaffna.',
    lat: 9.6747, lng: 80.0292,
    image: nallurImg
  },
  {
    id: 'arugam-bay',
    name: 'Arugam Bay',
    province: 'Eastern',
    description: 'A world-famous surf spot with beautiful beaches and a laid-back vibe.',
    lat: 6.8417, lng: 81.8333,
    image: arugamBayImg
  },
  {
    id: 'anuradhapura',
    name: 'Anuradhapura Sacred City',
    province: 'North Central',
    description: 'One of the ancient capitals of Sri Lanka, famous for its well-preserved ruins.',
    lat: 8.3114, lng: 80.4037,
    image: anuradhapuraImg
  },
  {
    id: 'kandy-temple',
    name: 'Temple of the Tooth',
    province: 'Central',
    description: 'The sacred Buddhist temple housing the relic of the tooth of Buddha, in Kandy.',
    lat: 7.2936, lng: 80.6413,
    image: kandyImg
  },
  {
    id: 'mirissa',
    name: 'Mirissa Beach',
    province: 'Southern',
    description: 'A stunning tropical beach famous for whale watching and golden sunsets.',
    lat: 5.9485, lng: 80.4528,
    image: mirissaImg
  },
  {
    id: 'trincomalee',
    name: 'Pigeon Island',
    province: 'Eastern',
    description: 'A pristine marine national park with crystal-clear water and coral reefs.',
    lat: 8.7106, lng: 81.1868,
    image: trincomaleeImg
  }
]

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

// Fallback distance calculation when OSRM is down
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

import { VEHICLE_OPTIONS } from './vehicleOptions.js'

const SRI_LANKA_CENTER = [7.85, 80.65]
const DEFAULT_ZOOM = 8

const SRI_LANKA_BOUNDS = [
  [5.7, 79.3],  // South-West
  [10.0, 82.1]  // North-East
]

// Custom Zoom Controls component with user-friendly labels
function ZoomControls({ mapRef, onUndo, canUndo, onClear, hasLocations }) {
  if (!mapRef) return null
  return (
    <div className="absolute bottom-28 md:bottom-auto md:top-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-auto">
      {/* Zoom In */}
      <button
        onClick={() => mapRef.zoomIn()}
        title="Zoom In"
        className="group relative w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-700 hover:bg-emerald-500 hover:text-white transition-all duration-200 shadow-lg active:scale-90"
      >
        <i className="bi bi-plus-lg text-xl font-bold"></i>
        <span className="absolute right-[120%] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Zoom In</span>
      </button>
      {/* Zoom Out */}
      <button
        onClick={() => mapRef.zoomOut()}
        title="Zoom Out"
        className="group relative w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-700 hover:bg-emerald-500 hover:text-white transition-all duration-200 shadow-lg active:scale-90"
      >
        <i className="bi bi-dash-lg text-xl font-bold"></i>
        <span className="absolute right-[120%] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Zoom Out</span>
      </button>
      {/* Divider */}
      <div className="h-px bg-slate-200 mx-2"></div>
      {/* Reset View */}
      <button
        onClick={() => mapRef.flyTo(SRI_LANKA_CENTER, DEFAULT_ZOOM, { duration: 1 })}
        title="Reset View"
        className="group relative w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-700 hover:bg-sky-500 hover:text-white transition-all duration-200 shadow-lg active:scale-90"
      >
        <i className="bi bi-map text-lg"></i>
        <span className="absolute right-[120%] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Reset View</span>
      </button>
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo Last"
        className="group relative w-12 h-12 glass rounded-2xl flex items-center justify-center text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-200 shadow-lg active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
      >
        <i className="bi bi-arrow-counterclockwise text-lg"></i>
        <span className="absolute right-[120%] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Undo Last</span>
      </button>
      {/* Clear All */}
      <button
        onClick={onClear}
        disabled={!hasLocations}
        title="Clear All"
        className="group relative w-12 h-12 glass rounded-2xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-200 shadow-lg active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
      >
        <i className="bi bi-trash3 text-lg"></i>
        <span className="absolute right-[120%] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">Clear All</span>
      </button>
    </div>
  )
}

// Helper to extract map ref from inside MapContainer
function MapRefSetter({ onMapRef }) {
  const map = useMap()
  useEffect(() => { 
    onMapRef(map) 
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    // Invalidate once on mount to handle initial render bugs
    setTimeout(() => map.invalidateSize(), 100)
    return () => window.removeEventListener('resize', handleResize)
  }, [map, onMapRef])
  return null
}

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

const SEARCH_ACCENT = {
  emerald: {
    ring: 'focus:ring-emerald-500/20 focus:border-emerald-500',
    hover: 'hover:bg-emerald-50',
    title: 'group-hover:text-emerald-700',
    spinner: 'border-emerald-200 border-t-emerald-500',
  },
  orange: {
    ring: 'focus:ring-orange-500/20 focus:border-orange-500',
    hover: 'hover:bg-orange-50',
    title: 'group-hover:text-orange-700',
    spinner: 'border-orange-200 border-t-orange-500',
  },
}

function LocationSearchInput({
  value,
  onChange,
  onSubmit,
  results,
  onSelect,
  isSearching,
  placeholder,
  accent = 'emerald',
}) {
  const inputRef = useRef(null)
  const listId = useId()
  const [dropdownPos, setDropdownPos] = useState(null)
  const styles = SEARCH_ACCENT[accent] || SEARCH_ACCENT.emerald

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  useEffect(() => {
    if (!results.length) {
      setDropdownPos(null)
      return undefined
    }

    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)

    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [results, updateDropdownPosition])

  const dropdown = results.length > 0 && dropdownPos && typeof document !== 'undefined'
    ? createPortal(
        <div
          role="listbox"
          id={listId}
          className="location-search-dropdown fixed z-[9999] bg-white rounded-2xl border border-slate-200 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] overflow-hidden max-h-56 overflow-y-auto"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
        >
          {results.map((result, index) => (
            <button
              key={result.place_id || result.osm_id || `${result.lat}-${result.lon}-${index}`}
              type="button"
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(result)}
              className={`w-full text-left px-4 py-3.5 transition-colors border-b border-slate-100 last:border-0 group ${styles.hover}`}
            >
              <p className={`text-xs font-bold text-slate-900 ${styles.title}`}>
                {result.display_name.split(',')[0]}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{result.display_name}</p>
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div className="relative">
      <form onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          onFocus={updateDropdownPosition}
          placeholder={placeholder}
          aria-expanded={results.length > 0}
          aria-controls={results.length > 0 ? listId : undefined}
          autoComplete="off"
          className={`w-full pl-6 pr-10 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 ${styles.ring} transition-all shadow-sm`}
        />
      </form>
      {isSearching && (
        <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 ${styles.spinner} rounded-full animate-spin pointer-events-none`} />
      )}
      {dropdown}
    </div>
  )
}

// Image Carousel Component with Auto Animation
function ImageCarousel() {
  const [currentImage, setCurrentImage] = useState(0)

  const images = [
    { src: sigiriyaImg, title: 'Sigiriya Rock Fortress', description: 'Ancient wonder of Sri Lanka' },
    { src: kandyImg, title: 'Kandy Temple', description: 'Cultural heart of the island' },
    { src: galleImg, title: 'Galle Fort', description: 'Historic coastal fortress' },
    { src: mirissaImg, title: 'Mirissa Beach', description: 'Paradise on the south coast' },
    { src: nineArchImg, title: 'Nine Arch Bridge', description: 'Engineering marvel' },
    { src: anuradhapuraImg, title: 'Anuradhapura', description: 'Ancient sacred city' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [images.length])

  return (
    <div className="relative w-full h-80 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-900/20 border border-white">
      <div className="relative w-full h-full">
        {/* Images Container */}
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentImage ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image.src}
              alt={image.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
        ))}

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-2xl">
            <h3 className="text-3xl font-black mb-2 transition-all duration-500">
              {images[currentImage].title}
            </h3>
            <p className="text-sm font-semibold text-white/80 transition-all duration-500">
              {images[currentImage].description}
            </p>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentImage
                  ? 'bg-white w-8'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
          className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-md"
        >
          <i className="bi bi-chevron-left text-xl"></i>
        </button>
        <button
          onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
          className="absolute right-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-md"
        >
          <i className="bi bi-chevron-right text-xl"></i>
        </button>
      </div>
    </div>
  )
}

export default function Home({ onLogout, userName, onBackToHome, onGoToPlanTrip, onBookingConfirmed, initialDestination }) {
  useLeafletDefaultIcon()

  const listId = useId()
  const vehicleGroupId = useId()
  const [locations, setLocations] = useState(() => {
    // Pre-fill with initial destination if provided
    if (initialDestination) {
      return [{
        id: `preset-${initialDestination.name}`,
        lat: initialDestination.lat,
        lng: initialDestination.lng,
        name: `${initialDestination.name}, Sri Lanka`,
      }]
    }
    return []
  });
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [currentStep, setCurrentStep] = useState(1) // 1: Locations, 2: Vehicle, 3: Review
  const [estimatedPrice, setEstimatedPrice] = useState(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [estimateError, setEstimateError] = useState('')
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  const [startDate, setStartDate] = useState(todayDateString)
  const [endDate, setEndDate] = useState(todayDateString)
  const [startTime, setStartTime] = useState("10:00")
  const [bookingType, setBookingType] = useState('now')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [liveLocation, setLiveLocation] = useState(null)   // { lat, lng, name }
  const [gpsLoading, setGpsLoading] = useState(false)
  const [startSearchQuery, setStartSearchQuery] = useState('')
  const [startSearchResults, setStartSearchResults] = useState([])
  const [isStartSearching, setIsStartSearching] = useState(false)
  const [mapRef, setMapRef] = useState(null)
  const [isStartCollapsed, setIsStartCollapsed] = useState(false)
  const [isStopsCollapsed, setIsStopsCollapsed] = useState(false)

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

  const submitTourBooking = useCallback(async (bookingOverride = {}) => {
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

      const resolvedVehicleType = VEHICLE_ALIASES[selectedVehicle] ?? selectedVehicle
      const vehicleId = estimatedPrice?.vehicle?.id

      // Compute dates based on booking type (pass overrides — state updates are async)
      const type = bookingOverride.bookingType ?? bookingType
      const scheduledDate = bookingOverride.startDate ?? startDate
      const scheduledEndDate = bookingOverride.endDate ?? endDate
      const scheduledTime = bookingOverride.startTime ?? startTime

      let startDateStr
      let timeStr
      let endDateStr

      if (type === 'now') {
        const now = new Date()
        startDateStr = formatLocalDate(now)
        timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
        endDateStr = endDate
      } else {
        startDateStr = scheduledDate
        timeStr = scheduledTime
        endDateStr = scheduledEndDate
      }

      if (endDateStr < startDateStr) {
        setMessage('End date cannot be earlier than start date.')
        return
      }

      // 6. Build locations payload
      const locationsPayload = locations.map((loc, i) => ({
        place_name: loc.name || `Stop ${i + 1}`,
        latitude: loc.lat,
        longitude: loc.lng,
      }))

      const totalKm = legDistances.length > 0
        ? legDistances.reduce((s, k) => +(s + k).toFixed(1), 0)
        : undefined

      // Create the tour — pricing and duration are computed on the backend
      const data = await createTourRequest({
        ...(vehicleId ? { vehicle_id: vehicleId } : {}),
        vehicle_type: resolvedVehicleType,
        total_distance_km: totalKm,
        start_date: startDateStr,
        start_time: timeStr,
        end_date: endDateStr,
        locations: locationsPayload,
      }, token)

      const tour = data.tour || {}
      const days = tour.total_days || 1
      const distance = tour.total_distance_km || 0
      const priceLkr = tour.estimated_price || 0

      // Navigate to finding-driver screen immediately on success
      if (onBookingConfirmed) {
        const startLoc = locations.find(l => l.isStart) || locations[0]
        onBookingConfirmed({
          startLocation: startLoc
            ? { lat: startLoc.lat, lng: startLoc.lng, name: startLoc.name }
            : null,
          bookingDetails: {
            vehicle: selectedVehicle,
            days,
            distance,
            lkr: priceLkr,
          },
        })
      }

      setMessage(`Tour booked! ${distance} km • ${days} day${days !== 1 ? 's' : ''} • Rs. ${Number(priceLkr).toLocaleString()}`)
      setBookingConfirmed(true)

    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [locations, selectedVehicle, estimatedPrice, bookingType, startDate, endDate, startTime, legDistances, onBookingConfirmed])

  // Debounced OSRM routing fetch
  const fetchRoute = useCallback(() => {
    const validLocs = locations.filter(l => !l.name.startsWith('Loading'));
    if (validLocs.length < 2) {
      setRouteCoords([]);
      setLegDistances([]);
      return;
    }
    const coords = validLocs.map(l => `${l.lng},${l.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    let cancelled = false;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`OSRM error: ${res.status}`); return res.json(); })
      .then(data => {
        if (cancelled) return;
        const route = data?.routes?.[0];
        if (route && route.geometry?.coordinates) {
          setRouteCoords(route.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
          const totalDistanceKm = route.distance / 1000;
          const legs = route.legs || [];
          if (legs.length > 0) {
            setLegDistances(legs.map(leg => +(leg.distance / 1000).toFixed(1)));
          } else {
            setLegDistances([+(totalDistanceKm).toFixed(1)]);
          }
        } else {
          console.warn('No route found in OSRM response', data);
          throw new Error('No route found');
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Routing failed:', err, '- falling back to straight lines');
          setRouteCoords(validLocs.map(l => [l.lat, l.lng]));
          const fallbackLegs = [];
          for (let i = 0; i < validLocs.length - 1; i++) {
            const dist = getHaversineDistance(validLocs[i].lat, validLocs[i].lng, validLocs[i+1].lat, validLocs[i+1].lng);
            fallbackLegs.push(+(dist * 1.2).toFixed(1));
          }
          setLegDistances(fallbackLegs);
        }
      });
    return () => { cancelled = true; };
  }, [locations]);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRoute();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchRoute]);

  const totalRouteKm = useMemo(
    () => legDistances.reduce((s, k) => +(s + k).toFixed(1), 0),
    [legDistances],
  )

  const locationsPayload = useMemo(
    () => locations.map((loc, i) => ({
      place_name: loc.name || `Stop ${i + 1}`,
      latitude: loc.lat,
      longitude: loc.lng,
    })),
    [locations],
  )

  const handleStartDateChange = useCallback((value) => {
    setStartDate(value)
    if (endDate < value) setEndDate(value)
  }, [endDate])

  const handleEndDateChange = useCallback((value) => {
    setEndDate(value < startDate ? startDate : value)
  }, [startDate])

  // Fetch pricing estimate from backend whenever route, vehicle, or travel dates change
  useEffect(() => {
    if (!selectedVehicle || locations.length < 2 || endDate < startDate) {
      setEstimatedPrice(null)
      setEstimateError('')
      return undefined
    }

    let cancelled = false
    const handler = setTimeout(async () => {
      setEstimateLoading(true)
      setEstimateError('')
      try {
        const resolvedVehicle = VEHICLE_ALIASES[selectedVehicle] ?? selectedVehicle
        const data = await calculateTourEstimate({
          locations: locationsPayload,
          vehicle_type: resolvedVehicle,
          start_date: startDate,
          end_date: endDate,
          total_distance_km: totalRouteKm > 0 ? totalRouteKm : undefined,
        })
        if (!cancelled) setEstimatedPrice(data)
      } catch (err) {
        if (!cancelled) {
          setEstimatedPrice(null)
          setEstimateError(err.message || 'Could not calculate estimate')
        }
      } finally {
        if (!cancelled) setEstimateLoading(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(handler)
    }
  }, [selectedVehicle, locationsPayload, startDate, endDate, totalRouteKm, locations.length])

  const canUndo = locations.length > 0

  const handleBookTour = async (bookingOverride) => {
    await submitTourBooking(bookingOverride)
  }

  const mapContentMemo = useMemo(() => (
    <div className="absolute inset-0 z-0">
      <div className="map-vignette"></div>
      <div className="map-glass-border"></div>
      <MapContainer
        center={SRI_LANKA_CENTER} zoom={DEFAULT_ZOOM} minZoom={7} maxZoom={18} maxBounds={SRI_LANKA_BOUNDS}
        maxBoundsViscosity={1.0} scrollWheelZoom={true} zoomControl={false} className="h-full w-full"
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
        />
        <MapClickHandler onLocationAdd={addLocation} />
        <MapEffect locations={locations} />
        <MapRefSetter onMapRef={setMapRef} />
        
        {routeCoords.length >= 2 && (
          <Polyline positions={routeCoords} pathOptions={{ color: '#f97316', weight: 6, opacity: 0.9, lineJoin: 'round', lineCap: 'round', dashArray: '1', shadowColor: '#f97316', shadowBlur: 10 }} />
        )}

        {FAMOUS_PLACES.map((place) => (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={createSuggestionIcon(place.image)}>
            <Popup className="custom-popup">
              <div className="flex flex-col">
                <div className="h-32 w-full overflow-hidden bg-slate-100">
                  <img src={place.image} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">{place.province} Province</span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm mb-2">{place.name}</h4>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed mb-4">{place.description}</p>
                  <button onClick={() => addLocation(place.lat, place.lng)} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-orange-600 transition-all shadow-lg flex items-center justify-center gap-2">
                    <i className="bi bi-plus-circle"></i> ADD TO TOUR
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {locations.map((loc, index) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={loc.isStart ? greenIcon : redIcon}>
            <Popup className="custom-popup">
              <div className="p-2 min-w-[180px] font-['Plus_Jakarta_Sans']">
                <h4 className="font-black text-slate-900 text-sm mb-1">{loc.isStart ? 'Starting Point' : `Stop #${index}`}</h4>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed mb-3">{loc.name}</p>
                <button onClick={() => removeLocation(loc.id)} className="w-full py-2 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all">
                  REMOVE STOP
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  ), [locations, routeCoords, legDistances, addLocation, removeLocation, setMapRef]);

  const vehicleOptionsMemo = useMemo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {VEHICLE_OPTIONS.map((v) => {
        const selected = selectedVehicle === v.id
        return (
          <button
            key={v.id} onClick={() => setSelectedVehicle(v.id)}
            className={`group relative flex flex-col bg-white rounded-[2.5rem] overflow-hidden text-left transition-all duration-500 border-4 ${
              selected ? 'border-orange-500 shadow-[0_20px_50px_-15px_rgba(249,115,22,0.3)]' : 'border-transparent hover:border-slate-200 shadow-xl shadow-slate-900/5'
            }`}
          >
            <div className="h-48 overflow-hidden bg-slate-50 flex items-center justify-center p-6">
               <img src={v.image} alt={v.title} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" loading="lazy" />
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-extrabold text-slate-900">{v.title}</h3>
                {selected && <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs">✓</div>}
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">{v.description}</p>
            </div>
            {selected && <div className="absolute top-4 left-4 px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Active Selection</div>}
          </button>
        )
      })}
    </div>
  ), [selectedVehicle]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      
      {/* ── Dynamic Mesh Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="mesh-bg absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-100 blur-[120px]"></div>
        <div className="mesh-bg absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-100 blur-[100px]" style={{ animationDelay: '-2s' }}></div>
      </div>

      {/* ── MODERN HERO SECTION ── */}
      <section className="relative h-[45vh] min-h-[350px] overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay loop muted playsInline
        >
          <source src="/Lighthouse_video_cinematic_drone_202606011337.mp4" type="video/mp4" />
        </video>
        
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight drop-shadow-2xl animate-fade-in-up">
            Explore <span className="text-orange-400">Sri Lanka</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl font-medium animate-fade-in-up [animation-delay:200ms]">
            Craft your perfect itinerary with real-time road path routing and transparent pricing.
          </p>
          
          <button
            onClick={() => window.scrollTo({ top: 500, behavior: 'smooth' })}
            className="mt-10 px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-2xl hover:bg-orange-500 hover:text-white transition-all active:scale-95 animate-fade-in-up [animation-delay:400ms]"
          >
            Start Planning Now
          </button>
        </div>
      </section>

      {/* ── FLOATING NAVBAR ── */}
      <header className="sticky top-4 z-[2000] mx-auto max-w-5xl px-4">
        <div className="glass rounded-3xl p-3 flex items-center justify-between shadow-2xl shadow-slate-900/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <h2 className="text-lg font-black text-slate-900 leading-none">Air B&C</h2>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">Premium Routing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
             {onBackToHome && (
              <button onClick={onBackToHome} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                Home
              </button>
            )}
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            {userName && (
              <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-xl text-xs font-bold text-sky-700">
                <i className="bi bi-person-circle"></i> {userName}
              </span>
            )}
            <button
              onClick={onLogout}
              className="px-5 py-2.5 bg-rose-500 text-white text-xs font-black rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── STEPS PROGRESS ── */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="relative flex justify-between items-center">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-200 -translate-y-1/2 z-0"></div>
          <div 
            className="absolute top-1/2 left-0 h-[2.5px] bg-orange-500 -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
          ></div>

          {[
            { id: 1, label: 'Plan Route', sub: 'Map your stops' },
            { id: 2, label: 'Select Fleet', sub: 'Choose vehicle' },
            { id: 3, label: 'Confirm', sub: 'Ready to go' }
          ].map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                currentStep >= s.id 
                  ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' 
                  : 'bg-white text-slate-300 border-2 border-slate-100 shadow-sm'
              }`}>
                {currentStep > s.id ? <i className="bi bi-check-lg text-xl"></i> : <span className="text-sm font-black">{s.id}</span>}
              </div>
              <div className="mt-3 text-center">
                <p className={`text-xs font-black uppercase tracking-widest ${currentStep >= s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.label}
                </p>
                <p className="text-[10px] text-slate-400 font-bold hidden sm:block">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="relative z-10 pb-24">
        
        {/* ──────────── STEP 1: ROUTE PLANNING ──────────── */}
        {currentStep === 1 && (
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
              
              {/* ── CONTROLS STACK (Below map on mobile, left-side on desktop) ── */}
              <div className="order-2 lg:order-1 w-full lg:col-span-4 space-y-4 relative z-20 overflow-visible">
                
                {/* Search Start */}
                <div className="glass rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10 pointer-events-auto border-emerald-500/20">
                  <div className={`flex items-center justify-between cursor-pointer select-none ${isStartCollapsed ? '' : 'mb-5'}`} onClick={() => setIsStartCollapsed(!isStartCollapsed)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 text-xl font-black">
                        <i className="bi bi-geo-alt"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">Starting Point</h3>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">WHERE YOU BEGIN</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
                      <i className={`bi bi-chevron-${isStartCollapsed ? 'down' : 'up'} text-xs font-black`}></i>
                    </div>
                  </div>

                  {!isStartCollapsed && (
                    <div>
                      <button
                        onClick={handleGetLiveLocation}
                        disabled={gpsLoading}
                        className="w-full mb-4 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                      >
                        {gpsLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-crosshair"></i>}
                        {gpsLoading ? 'Detecting...' : 'Detect My Location'}
                      </button>

                      <LocationSearchInput
                        value={startSearchQuery}
                        onChange={(e) => setStartSearchQuery(e.target.value)}
                        onSubmit={handleStartSearch}
                        results={startSearchResults}
                        onSelect={addStartLocation}
                        isSearching={isStartSearching}
                        placeholder="Search city..."
                        accent="emerald"
                      />
                    </div>
                  )}
                </div>

                {/* Add Stops */}
                <div className="glass rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10 pointer-events-auto border-orange-500/20">
                  <div className={`flex items-center justify-between cursor-pointer select-none ${isStopsCollapsed ? '' : 'mb-5'}`} onClick={() => setIsStopsCollapsed(!isStopsCollapsed)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 text-xl font-black">
                        <i className="bi bi-plus-lg"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">Add Stops</h3>
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">
                          {locations.filter(l=>!l.isStart).length} DESTINATIONS
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
                      <i className={`bi bi-chevron-${isStopsCollapsed ? 'down' : 'up'} text-xs font-black`}></i>
                    </div>
                  </div>

                  {!isStopsCollapsed && (
                    <LocationSearchInput
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onSubmit={handleSearch}
                      results={searchResults}
                      onSelect={addSearchedLocation}
                      isSearching={isSearching}
                      placeholder="Add another stop..."
                      accent="orange"
                    />
                  )}
                </div>

                {/* Journey Timeline */}
                {locations.length > 0 && (
                  <div className="glass rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10 pointer-events-auto border-slate-200/50">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Journey Timeline</h3>
                    <div className="space-y-4">
                      {locations.map((loc, i) => {
                        const nextLoc = locations[i + 1];
                        const distance = legDistances[i];
                        return (
                          <div key={loc.id} className="relative">
                            {/* Location row */}
                            <div className="flex items-start gap-4 relative">
                              <div className={`mt-1.5 h-3.5 w-3.5 rounded-full border-4 border-white shadow-md z-10 flex-shrink-0 ${loc.isStart ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-slate-900 leading-tight truncate">{loc.name.split(',')[0]}</p>
                                <p className="text-[9px] text-slate-400 truncate mt-0.5">{loc.name}</p>
                              </div>
                              {/* Remove button */}
                              <button
                                onClick={() => removeLocation(loc.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0"
                                title="Remove stop"
                              >
                                <i className="bi bi-x-lg text-[10px] font-black"></i>
                              </button>
                            </div>

                            {/* Connecting vertical line & distance segment */}
                            {nextLoc && distance !== undefined && (
                              <div className="flex items-center gap-3 pl-1.5 relative h-10">
                                {/* Timeline vertical line */}
                                <div className="absolute left-[6px] top-0 bottom-0 w-0.5 bg-slate-200" />
                                {/* Distance indicator pill */}
                                <div className="ml-6 bg-slate-50 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full border border-slate-100 shadow-sm flex items-center gap-1.5 z-20">
                                  <i className="bi bi-arrow-down text-[9px] text-orange-500"></i>
                                  <span>{distance} km</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Summary & Action */}
                {locations.length >= 2 && (
                  <div className="glass rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10 pointer-events-auto border-slate-900/10">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          min={todayDateString()}
                          onChange={(e) => handleStartDateChange(e.target.value)}
                          className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-2 font-bold text-sm text-slate-800 focus:border-orange-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          min={startDate}
                          onChange={(e) => handleEndDateChange(e.target.value)}
                          className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-2 font-bold text-sm text-slate-800 focus:border-orange-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-center flex-1 border-r border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-2xl font-black text-slate-900">{estimatedPrice?.total_days ?? '—'}</span>
                          <span className="text-[10px] font-bold text-slate-400">DAYS</span>
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Distance</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-2xl font-black text-slate-900">{totalRouteKm}</span>
                          <span className="text-[10px] font-bold text-orange-400">KM</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-500/30 active:scale-95"
                    >
                      Plan Vehicles <i className="bi bi-arrow-right-short text-lg"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* ── MAP CONTAINER (First on mobile, right-side on desktop) ── */}
              <div className="order-1 lg:order-2 w-full lg:col-span-8 relative rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white h-[65vh] lg:h-[88vh] bg-slate-100 group z-0">
                {/* Immersive Map */}
                {mapContentMemo}

                {/* Custom Zoom & Map Controls (Right Side) */}
                <ZoomControls mapRef={mapRef} onUndo={undoLast} canUndo={canUndo} onClear={clearAll} hasLocations={locations.length > 0} />

                {/* Hint Overlay */}
                {locations.length === 0 && (
                  <div className="absolute bottom-4 md:bottom-12 left-1/2 -translate-x-1/2 z-[1000] glass-dark text-white px-6 md:px-10 py-3 md:py-5 rounded-full animate-pulse-soft border-none whitespace-nowrap pointer-events-none">
                    <p className="text-sm font-black tracking-tight flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
                      Tap anywhere on Sri Lanka to start your tour
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ──────────── STEP 2: VEHICLE SELECTION ──────────── */}
        {currentStep === 2 && (
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Vehicle List */}
              <div className="lg:col-span-8">
                <div className="mb-10">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Select Your Fleet</h2>
                  <p className="text-slate-500 font-medium">Pick a vehicle that fits your group size and comfort preferences.</p>
                </div>

                {vehicleOptionsMemo}
              </div>

              {/* Summary Side Card */}
              <div className="lg:col-span-4 sticky top-28">
                <div className="glass rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Price Breakdown</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        min={todayDateString()}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2.5 font-bold text-sm text-slate-800 focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2.5 font-bold text-sm text-slate-800 focus:border-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-6 mb-10">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Estimated Price</span>
                      <span className="text-4xl font-black text-orange-600">
                        {estimateLoading ? '…' : `Rs. ${Number(estimatedPrice?.estimated_price || 0).toLocaleString()}`}
                      </span>
                    </div>
                    {estimateError && (
                      <p className="text-xs font-bold text-rose-500">{estimateError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Stops</p>
                      <p className="text-sm font-black text-slate-900">{locations.length} Locations</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Duration</p>
                      <p className="text-sm font-black text-slate-900">{estimatedPrice?.total_days ?? '—'} Days</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-10">
                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                       <i className="bi bi-geo-alt text-orange-500"></i>
                       <span>{estimatedPrice?.total_distance_km ?? totalRouteKm} km estimated distance</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setCurrentStep(3)}
                      disabled={!selectedVehicle}
                      className="w-full py-5 bg-slate-900 hover:bg-orange-600 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
                    >
                      Review & Confirm <i className="bi bi-arrow-right"></i>
                    </button>
                    <button onClick={() => setCurrentStep(1)} className="w-full py-4 text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all">
                      ← Back to Map
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ──────────── STEP 3: FINAL REVIEW ──────────── */}
        {currentStep === 3 && (
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Final Confirmation</h2>
              <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">Review your tour carefully. Once confirmed, we'll start searching for the best driver for your route.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              
              {/* Card: Tour Route - Expanded */}
              <div className="lg:col-span-2">
                <div className="glass rounded-[3rem] p-10 shadow-2xl shadow-slate-900/10 h-full">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <i className="bi bi-geo-alt-fill text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900">Tour Route</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">{locations.length} stops • {estimatedPrice?.total_distance_km ?? totalRouteKm} km</p>
                    </div>
                  </div>
                  <div className="space-y-3 relative">
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 to-slate-200"></div>
                    {locations.map((loc, i) => (
                      <div key={loc.id} className="relative pl-20">
                        <div className="absolute left-0 top-1.5 w-14 h-14 rounded-full flex items-center justify-center text-lg font-black shadow-lg border-4 border-white" style={{background: loc.isStart ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white'}}>
                          {i+1}
                        </div>
                        <div className="bg-gradient-to-r from-slate-50 to-white rounded-2xl p-5 border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all">
                          <p className="font-bold text-slate-900 text-base">{loc.name}</p>
                          {i < locations.length - 1 && legDistances[i] !== undefined && (
                            <p className="text-xs text-slate-500 mt-2 font-semibold">
                              <i className="bi bi-arrow-down text-orange-500 mr-1"></i>
                              <span className="text-orange-600 font-black">{legDistances[i]} km</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Estimate & Details */}
              <div className="space-y-6">
                {/* Card: Final Estimate */}
                <div className="glass-dark rounded-[3rem] p-8 shadow-2xl shadow-slate-900/30 text-white h-fit">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <i className="bi bi-wallet2 text-xl"></i>
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight">Total Price</h3>
                  </div>
                  
                  <div className="bg-white/5 rounded-2xl p-6 mb-6 backdrop-blur-sm border border-white/10">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-orange-300 mb-2">Estimated Price (LKR)</p>
                      <p className="text-5xl font-black text-orange-400">
                        {estimateLoading ? '…' : `Rs. ${Number(estimatedPrice?.estimated_price || 0).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-center hover:bg-white/15 transition-all">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2">Distance</p>
                      <p className="text-2xl font-black">{estimatedPrice?.total_distance_km ?? totalRouteKm}<span className="text-sm text-white/60 ml-1">km</span></p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-center hover:bg-white/15 transition-all">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2">Duration</p>
                      <p className="text-2xl font-black">{estimatedPrice?.total_days ?? '—'}<span className="text-sm text-white/60 ml-1">days</span></p>
                    </div>
                  </div>

                  {/* Vehicle Info Elegant */}
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl p-5 border border-orange-400/30 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
                          <i className="bi bi-car-front-fill text-white text-lg"></i>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-orange-300/70 mb-0.5">Selected Vehicle</p>
                          <p className="text-base font-extrabold text-white">{selectedVehicle}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Travel dates */}
                <div className="glass rounded-[2rem] p-6 shadow-xl shadow-slate-900/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center">
                      <i className="bi bi-calendar-range-fill"></i>
                    </div>
                    <h4 className="font-extrabold text-slate-900">Travel Dates</h4>
                  </div>
                  <p className="text-sm text-slate-700 font-semibold">{startDate} → {endDate}</p>
                  {bookingType === 'schedule' && (
                    <p className="text-sm text-slate-700 font-semibold mt-1">Start time: {startTime}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Feedback */}
            {message && !bookingConfirmed && (
               <div className="mb-8 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-600 flex items-center gap-4 animate-fade-in-up">
                 <i className="bi bi-exclamation-triangle-fill text-2xl"></i>
                 <p className="text-sm font-black">{message}</p>
               </div>
            )}

            {/* Final Action */}
            <div className="flex flex-col items-center gap-6 w-full max-w-xl mx-auto">
              {!bookingConfirmed ? (
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => handleBookTour({ bookingType: 'now' })}
                    disabled={loading}
                    className="flex-1 px-8 py-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-2"
                  >
                    <i className="bi bi-lightning-charge-fill text-2xl"></i>
                    <span>Book Now</span>
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex-1 px-8 py-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-slate-900/30 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-2"
                  >
                    <i className="bi bi-calendar-plus-fill text-2xl"></i>
                    <span>Schedule Tour</span>
                  </button>
                </div>
              ) : (
                <div className="text-center animate-fade-in-up">
                  <div className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center text-5xl mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-8">Tour Created Successfully!</h3>
                  <div className="flex gap-4">
                     <button onClick={() => { setLocations([]); setSelectedVehicle(''); setCurrentStep(1); setBookingConfirmed(false); setMessage(''); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-900/20">Plan Another</button>
                     <button onClick={onBackToHome} className="px-8 py-4 bg-white text-slate-900 border border-slate-100 rounded-2xl font-black text-sm transition-all shadow-lg hover:bg-slate-50">Back to Home</button>
                  </div>
                </div>
              )}
              {!bookingConfirmed && (
                <button onClick={() => setCurrentStep(2)} className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-all">
                  ← Back to Fleet Selection
                </button>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowScheduleModal(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <i className="bi bi-calendar-event-fill text-xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Schedule Tour</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Select a future date and time for your journey.</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={todayDateString()}
                  max={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-sm text-slate-800"
                />
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowScheduleModal(false)
                setBookingType('schedule')
                handleBookTour({ bookingType: 'schedule', startDate, endDate, startTime })
              }}
              disabled={loading}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              Confirm Schedule
            </button>
          </div>
        </div>
      )}

      <Footer variant="dashboard" portal="booking" />

    </div>
  )
}
