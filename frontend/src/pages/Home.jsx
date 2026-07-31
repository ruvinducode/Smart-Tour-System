import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import Footer from '../components/Footer.jsx'
import { calculateTourEstimate, createTour as createTourRequest, getRoute } from '../services/api.js'
import SEO from '../components/SEO.jsx'
import appLogo from '../../images/logo.jpeg'
// .webp thumbnails: these render at 44px on the map, so a compressed 176px
// square crop (~8KB each) replaces the original ~1MB full-resolution photos
// used here previously — same look at map-marker size, ~99% less data.
import sigiriyaImg from '../../images/sigiriya.webp'
import galleImg from '../../images/galle.webp'
import nineArchImg from '../../images/nine_arch.webp'
import nallurImg from '../../images/nallur.webp'
import arugamBayImg from '../../images/arugam_bay.webp'
import anuradhapuraImg from '../../images/anuradhapura.webp'
import kandyImg from '../../images/kandy.webp'
import mirissaImg from '../../images/mirissa.webp'
import trincomaleeImg from '../../images/trincomalee.webp'

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

// Built once at module load — FAMOUS_PLACES never changes, so there's no need
// to rebuild these divIcons on every map re-render (e.g. each time a stop is
// added and the memoized map block recomputes).
const FAMOUS_PLACE_ICONS = Object.fromEntries(
  FAMOUS_PLACES.map((place) => [place.id, createSuggestionIcon(place.image)])
)

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

import { VEHICLE_OPTIONS } from '../utils/vehicleOptions.js'
import VehicleCarousel from '../components/VehicleCarousel.jsx'

const SRI_LANKA_CENTER = [7.85, 80.65]
const DEFAULT_ZOOM = 8

const SRI_LANKA_BOUNDS = [
  [5.7, 79.3],  // South-West
  [10.0, 82.1]  // North-East
]

/** Quick client-side check so we don't need a network call just to reject an obviously out-of-country GPS fix. */
function isWithinSriLanka(lat, lng) {
  const [[minLat, minLng], [maxLat, maxLng]] = SRI_LANKA_BOUNDS
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
}

// Photon (komoot's open geocoder) indexes OSM place names more granularly than
// Nominatim, so small towns/villages that Nominatim misses are found here —
// biased and bounded to Sri Lanka so results stay relevant.
async function searchSriLankaPlaces(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '8',
    lang: 'en',
    lat: String(SRI_LANKA_CENTER[0]),
    lon: String(SRI_LANKA_CENTER[1]),
    bbox: '79.3,5.7,82.1,10.0',
  })

  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  const features = Array.isArray(data.features) ? data.features : []

  // Broad administrative areas (whole provinces/districts/countries) geocode to a
  // centroid that can sit in the middle of a forest with no nearby road — ORS then
  // can't snap a route to it. Only offer results specific enough to sit on a real road.
  const NON_ROUTABLE_TYPES = new Set(['state', 'county', 'country', 'region'])

  return features
    .filter((f) => (f.properties?.countrycode || '').toUpperCase() === 'LK')
    .filter((f) => !NON_ROUTABLE_TYPES.has(f.properties?.type))
    .map((f) => {
      const p = f.properties || {}
      const [lon, lat] = f.geometry?.coordinates || []
      const nameParts = [p.name, p.street, p.district, p.city || p.county, p.state].filter(Boolean)
      const display = [...new Set(nameParts)].join(', ') || p.name || 'Unnamed location'
      return {
        place_id: p.osm_id ? `${p.osm_type || 'osm'}-${p.osm_id}` : `${lat}-${lon}`,
        display_name: display,
        lat: String(lat),
        lon: String(lon),
      }
    })
    .filter((r) => Number.isFinite(parseFloat(r.lat)) && Number.isFinite(parseFloat(r.lon)))
}

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

const DATE_FIELD_ACCENTS = {
  orange: { ring: 'focus:border-orange-500', bg: 'bg-orange-500', text: 'text-orange-600' },
  emerald: { ring: 'focus:border-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-600' },
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function parseDateOnly(value) {
  return value ? new Date(`${value}T00:00:00`) : null
}

function formatDateOnly(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isSameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Elegant popover calendar replacing the plain native date input. */
function DateField({ label, value, onChange, minDate, maxDate, accent = 'orange' }) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => parseDateOnly(value), [value])
  const min = useMemo(() => parseDateOnly(minDate), [minDate])
  const max = useMemo(() => parseDateOnly(maxDate), [maxDate])
  const [viewDate, setViewDate] = useState(() => selected || min || new Date())
  const containerRef = useRef(null)
  const c = DATE_FIELD_ACCENTS[accent] || DATE_FIELD_ACCENTS.orange

  useEffect(() => {
    if (open) setViewDate(selected || min || new Date())
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const minAtMidnight = min ? new Date(min.getFullYear(), min.getMonth(), min.getDate()) : null
  const maxAtMidnight = max ? new Date(max.getFullYear(), max.getMonth(), max.getDate()) : null

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border-2 border-slate-100 bg-white px-3 py-2.5 font-bold text-sm text-slate-800 ${c.ring} outline-none transition`}
      >
        <span>{selected ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}</span>
        <i className="bi bi-calendar3 text-slate-400 text-xs"></i>
      </button>

      {open && (
        <div className="absolute z-[2000] mt-2 w-72 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-900/20 border border-slate-100 p-4 left-0 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <i className="bi bi-chevron-left text-xs"></i>
            </button>
            <p className="text-sm font-black text-slate-900">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
            >
              <i className="bi bi-chevron-right text-xs"></i>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i} className="text-[9px] font-black text-slate-300 text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`blank-${i}`} />
              const cellDate = new Date(year, month, day)
              const disabled = (minAtMidnight && cellDate < minAtMidnight) || (maxAtMidnight && cellDate > maxAtMidnight)
              const active = isSameDay(cellDate, selected)
              return (
                <button
                  type="button"
                  key={day}
                  disabled={disabled}
                  onClick={() => {
                    onChange(formatDateOnly(cellDate))
                    setOpen(false)
                  }}
                  className={`h-8 rounded-lg text-xs font-bold transition-colors ${
                    disabled
                      ? 'text-slate-200 cursor-not-allowed'
                      : active
                        ? `${c.bg} text-white shadow-md`
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const TIME_PRESETS = [
  { label: 'Early Morning', value: '06:00', icon: 'bi-sunrise' },
  { label: 'Morning', value: '08:00', icon: 'bi-brightness-high' },
  { label: 'Midday', value: '12:00', icon: 'bi-sun' },
  { label: 'Afternoon', value: '14:00', icon: 'bi-cloud-sun' },
  { label: 'Evening', value: '17:00', icon: 'bi-sunset' },
]

function formatTimeLabel(value) {
  if (!value) return 'Select time'
  const [h, m] = value.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/** Elegant pickup-time popover: quick presets plus a scrollable full-day list. */
function TimeField({ label, value, onChange, accent = 'orange' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const c = DATE_FIELD_ACCENTS[accent] || DATE_FIELD_ACCENTS.orange

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border-2 border-slate-100 bg-white px-3 py-2.5 font-bold text-sm text-slate-800 ${c.ring} outline-none transition`}
      >
        <span>{formatTimeLabel(value)}</span>
        <i className="bi bi-clock-history text-slate-400 text-xs"></i>
      </button>

      {open && (
        <div className="absolute z-[2000] mt-2 w-72 bg-white rounded-[1.5rem] shadow-2xl shadow-slate-900/20 border border-slate-100 p-4 right-0 animate-fade-in">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick Pick</p>
          <div className="grid grid-cols-1 gap-1.5 mb-3">
            {TIME_PRESETS.map((preset) => {
              const active = value === preset.value
              return (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => { onChange(preset.value); setOpen(false) }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    active ? `${c.bg} text-white shadow-md` : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <i className={`bi ${preset.icon}`}></i>
                  <span className="flex-1 text-left">{preset.label}</span>
                  <span className="opacity-70">{formatTimeLabel(preset.value)}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Or Enter Any Time</p>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={value || ''}
              onChange={(e) => e.target.value && onChange(e.target.value)}
              className={`w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2.5 font-bold text-sm text-slate-800 ${c.ring} outline-none transition`}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black text-white ${c.bg} flex-shrink-0`}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
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

// Scrolls a step section to the top of the viewport (just below the sticky
// header) whenever `step` changes. Skips the very first render so the hero
// isn't yanked away on initial page load, and skips entirely for users who
// prefer reduced motion (falls back to an instant jump instead of smooth).
function useScrollStepIntoView(step, sectionRef, headerRef) {
  const hasMounted = useRef(false)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return undefined
    }
    const node = sectionRef.current
    if (!node) return undefined

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Double rAF: the new step's content (map, vehicle cards, review summary)
    // needs a layout pass before we measure its position, otherwise the
    // scroll target is computed against the outgoing step's height.
    let innerRaf
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0
        const targetTop = node.getBoundingClientRect().top + window.scrollY - headerHeight - 24
        window.scrollTo({ top: Math.max(targetTop, 0), behavior: prefersReducedMotion ? 'auto' : 'smooth' })
      })
    })
    return () => {
      cancelAnimationFrame(outerRaf)
      if (innerRaf) cancelAnimationFrame(innerRaf)
    }
  }, [step, sectionRef, headerRef])
}

export default function Home({ onLogout, userName, onBackToHome, onGoToPlanTrip, onBookingConfirmed, initialDestination }) {
  useLeafletDefaultIcon()

  const headerRef = useRef(null)
  const stepSectionRef = useRef(null)

  // Take manual control of scroll position while this flow is mounted, so a
  // browser back/forward navigation can't silently restore the scroll offset
  // from whatever page/step the user was previously looking at.
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])

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
  useScrollStepIntoView(currentStep, stepSectionRef, headerRef)

  // Connector line under the step badges is measured from the real rendered
  // DOM, not computed from percentages — the badge spacing is easy to tweak
  // (gap, padding) and hand-maintained percentage math silently drifts out
  // of alignment with the actual badge centers whenever that spacing changes.
  const stepRowRef = useRef(null)
  const stepBadgeRefs = useRef([])
  const [stepLine, setStepLine] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      const row = stepRowRef.current
      const first = stepBadgeRefs.current[0]
      const last = stepBadgeRefs.current[2]
      if (!row || !first || !last) return
      const rowBox = row.getBoundingClientRect()
      const firstBox = first.getBoundingClientRect()
      const lastBox = last.getBoundingClientRect()
      const firstCenter = firstBox.left + firstBox.width / 2 - rowBox.left
      const lastCenter = lastBox.left + lastBox.width / 2 - rowBox.left
      setStepLine({ left: firstCenter, width: lastCenter - firstCenter })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (stepRowRef.current) observer.observe(stepRowRef.current)
    window.addEventListener('resize', measure)
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
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
  const [showOutsideSriLankaModal, setShowOutsideSriLankaModal] = useState(false)

  // Live GPS detection
  const handleGetLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.')
      return
    }
    // Some mobile browser contexts (e.g. an installed home-screen app, or a
    // permissions policy quirk) can throw synchronously instead of calling
    // the error callback — without this, that would silently abort with no
    // visible feedback at all, which is exactly what "button reacts, then
    // nothing happens" looks like.
    try {
      setGpsLoading(true)

    const onFix = async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords

      // Reject obviously out-of-country fixes before spending a network call.
      if (!isWithinSriLanka(lat, lng)) {
        setGpsLoading(false)
        setShowOutsideSriLankaModal(true)
        return
      }

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
        if (/sri lanka/i.test(err.message || '')) {
          setShowOutsideSriLankaModal(true)
        } else {
          setMessage(err.message || 'Could not resolve live location.')
        }
      } finally {
        setGpsLoading(false)
      }
    }

    const onFinalError = (err) => {
      setGpsLoading(false)
      // GPS chips (especially on mobile) often can't get a high-accuracy fix
      // within a few seconds, particularly indoors — that's a timeout, not a
      // denied permission, and telling the user to "allow location access"
      // when they already did is exactly why this looked broken on phones.
      if (err.code === err.PERMISSION_DENIED) {
        setMessage('Location access denied. Please allow location access and try again.')
      } else if (err.code === err.TIMEOUT) {
        setMessage('Could not get a GPS fix in time. Try again outdoors or with a clearer sky view.')
      } else {
        setMessage('Could not detect your location. Please check your device\'s location settings and try again.')
      }
    }

    // First attempt: high-accuracy GPS fix. Mobile GPS chips can take well
    // over 10s for a cold fix, so this gets a real chance to succeed before
    // falling back — but we don't wait forever, since a fallback exists.
    navigator.geolocation.getCurrentPosition(
      onFix,
      (err) => {
        if (err.code !== err.TIMEOUT) {
          onFinalError(err)
          return
        }
        // Fallback: network/cell-tower based location — resolves almost
        // instantly on mobile even when a precise GPS fix is slow, and a
        // recently cached fix (maximumAge) is good enough for trip planning.
        navigator.geolocation.getCurrentPosition(onFix, onFinalError, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
    } catch (err) {
      setGpsLoading(false)
      setMessage(`Location detection failed to start: ${err?.message || 'unknown error'}`)
    }
  }, [])

  // Start-point search logic
  const performStartSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setStartSearchResults([])
      return
    }
    setIsStartSearching(true)
    try {
      setStartSearchResults(await searchSriLankaPlaces(query))
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
      setSearchResults(await searchSriLankaPlaces(query))
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
  const [totalRouteKm, setTotalRouteKm] = useState(0) // authoritative total (not a sum of rounded legs)
  const [isRoutingLive, setIsRoutingLive] = useState(false) // true = real road distance (OSRM), false = straight-line estimate

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

      // Start Date, End Date, and Pickup Time are chosen up front in step 1's
      // Trip Summary — use them as-is instead of overwriting with "now", so a
      // future date the user picked (e.g. for a scheduled tour) actually
      // reaches the backend and shows correctly in the driver's tour details.
      const startDateStr = bookingOverride.startDate ?? startDate
      const timeStr = bookingOverride.startTime ?? startTime
      const endDateStr = bookingOverride.endDate ?? endDate

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

  // Debounced routing fetch (via our backend, which proxies OpenRouteService)
  const fetchRoute = useCallback(() => {
    const validLocs = locations.filter(l => !l.name.startsWith('Loading'));
    if (validLocs.length < 2) {
      setRouteCoords([]);
      setLegDistances([]);
      setTotalRouteKm(0);
      setIsRoutingLive(false);
      return;
    }
    let cancelled = false;
    getRoute(validLocs.map(l => [l.lng, l.lat]))
      .then(data => {
        if (cancelled) return;
        if (!data.geometry?.length) throw new Error('No route found');
        setRouteCoords(data.geometry);
        const legs = data.leg_distances_km || [];
        setLegDistances(legs.length > 0 ? legs : [data.distance_km]);
        setTotalRouteKm(data.distance_km);
        setIsRoutingLive(true);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Routing failed:', err, '- falling back to straight lines');
          setRouteCoords(validLocs.map(l => [l.lat, l.lng]));
          let rawTotalKm = 0;
          const fallbackLegs = [];
          for (let i = 0; i < validLocs.length - 1; i++) {
            const dist = getHaversineDistance(validLocs[i].lat, validLocs[i].lng, validLocs[i+1].lat, validLocs[i+1].lng) * 1.2;
            rawTotalKm += dist;
            fallbackLegs.push(+dist.toFixed(1));
          }
          setLegDistances(fallbackLegs);
          setTotalRouteKm(+rawTotalKm.toFixed(1));
          setIsRoutingLive(false);
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

  // Computed straight from the picked dates so Duration updates the instant a
  // date changes, rather than waiting on the backend estimate (which only
  // runs once a vehicle is selected in step 2).
  const tripDurationDays = useMemo(() => {
    const start = parseDateOnly(startDate)
    const end = parseDateOnly(endDate)
    if (!start || !end || end < start) return null
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  }, [startDate, endDate])

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
          // CartoDB's CDN-backed tiles — every other map in this app already
          // uses this provider. The previous tile.openstreetmap.fr server is a
          // free community mirror with no CDN backing it, which is what was
          // causing the visible gray-tile flash before tiles arrived.
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapClickHandler onLocationAdd={addLocation} />
        <MapEffect locations={locations} />
        <MapRefSetter onMapRef={setMapRef} />
        
        {routeCoords.length >= 2 && (
          <Polyline positions={routeCoords} pathOptions={{ color: '#f97316', weight: 6, opacity: 0.9, lineJoin: 'round', lineCap: 'round', dashArray: '1', shadowColor: '#f97316', shadowBlur: 10 }} />
        )}

        {FAMOUS_PLACES.map((place) => (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={FAMOUS_PLACE_ICONS[place.id]}>
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


  return (
    <div className="min-h-screen bg-[#fffbeb] text-slate-800 flex flex-col font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <SEO 
        title="Plan Your Tour" 
        canonicalUrl="/tours" 
        description="Plan your custom tour across Sri Lanka. Choose destinations, select vehicles, and book your trusted local driver with Air B & C Tours." 
      />
      
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
      <header ref={headerRef} className="sticky top-4 z-[2000] mx-auto max-w-5xl px-4">
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
      <div ref={stepSectionRef} className="max-w-3xl mx-auto px-6 py-10 sm:py-12">
        <div className="relative rounded-[2rem] bg-white/70 backdrop-blur-sm border border-slate-100 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] px-4 sm:px-10 py-7">
          <div ref={stepRowRef} className="relative flex justify-center items-start gap-10 sm:gap-20">
            {/* Connector line's position/width is measured from the actual
                badge DOM elements (see useLayoutEffect above) rather than
                assumed from a fixed layout, so it always lands exactly under
                the first/last badge centers regardless of the gap between them. */}
            <div className="absolute top-6 h-[3px] rounded-full bg-slate-100 z-0" style={{ left: stepLine.left, width: stepLine.width }}></div>
            <div
              className="absolute top-6 h-[3px] rounded-full bg-gradient-to-r from-orange-400 to-amber-500 z-0 transition-all duration-700 ease-in-out"
              style={{
                left: stepLine.left,
                width: currentStep === 1 ? 0 : stepLine.width * (currentStep === 2 ? 0.5 : 1),
              }}
            ></div>

            {[
              { id: 1, label: 'Plan route', sub: 'Map your stops', icon: 'bi-signpost-2-fill' },
              { id: 2, label: 'Select fleet', sub: 'Choose vehicle', icon: 'bi-truck-front-fill' },
              { id: 3, label: 'Confirm', sub: 'Ready to go', icon: 'bi-flag-fill' }
            ].map((s, idx) => {
              const isDone = currentStep > s.id
              const isActive = currentStep === s.id
              return (
                <div key={s.id} className="relative z-10 flex flex-col items-center">
                  <div
                    ref={(el) => { stepBadgeRefs.current[idx] = el }}
                    className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isDone
                      ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                      : isActive
                        ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-xl shadow-orange-500/35 scale-110'
                        : 'bg-white text-slate-300 border-2 border-slate-100'
                  }`}>
                    {isActive && (
                      <span className="absolute inset-0 rounded-2xl bg-orange-400 opacity-40 animate-ping"></span>
                    )}
                    <i className={`bi ${isDone ? 'bi-check-lg' : s.icon} relative text-lg`}></i>
                  </div>
                  <div className="mt-3 text-center max-w-[110px] sm:max-w-none">
                    <p className={`text-[13px] sm:text-sm font-semibold leading-tight whitespace-nowrap ${currentStep >= s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                      {s.label}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 hidden sm:block whitespace-nowrap">{s.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="relative z-10 pb-24">

        {/* Status Feedback — shared across every step. `message` is set by
            handlers on all three steps (GPS detection, search errors,
            booking validation, etc.), so this can't live inside just one
            step's conditional block or it silently fails to display
            whenever that handler runs on a different step (e.g. GPS errors
            from the Step 1 "Detect My Location" button used to be invisible,
            since this box previously only rendered inside Step 3). */}
        {message && !bookingConfirmed && (
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-4 sm:pt-6">
            <div className="mb-6 sm:mb-8 p-5 sm:p-6 bg-rose-50 border border-rose-100 rounded-[1.5rem] sm:rounded-[2rem] text-rose-600 flex items-start sm:items-center gap-3 sm:gap-4 animate-fade-in-up">
              <i className="bi bi-exclamation-triangle-fill text-xl sm:text-2xl shrink-0 mt-0.5 sm:mt-0"></i>
              <p className="text-sm font-black">{message}</p>
            </div>
          </div>
        )}

        {/* ──────────── STEP 1: ROUTE PLANNING ──────────── */}
        {currentStep === 1 && (
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
              
              {/* ── CONTROLS STACK (Below map on mobile, left-side on desktop) ── */}
              <div className="order-2 lg:order-1 w-full lg:col-span-4 space-y-3 sm:space-y-4 relative z-20 overflow-visible">

                {/* Connecting "journey rail" — desktop-only decorative touch */}
                <div className="hidden lg:block absolute left-[2.85rem] top-8 bottom-8 w-px bg-gradient-to-b from-emerald-300 via-orange-300 to-slate-200 opacity-60 pointer-events-none z-0" />

                {/* Starting Point */}
                <div className="glass rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-slate-900/10 pointer-events-auto border-emerald-500/20 relative z-10">
                  <div className={`flex items-center justify-between cursor-pointer select-none ${isStartCollapsed ? '' : 'mb-5'}`} onClick={() => setIsStartCollapsed(!isStartCollapsed)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 text-xl font-black">
                        <i className="bi bi-geo-alt"></i>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">Starting Point</h3>
                        <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Where You Begin</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0">
                      <i className={`bi bi-chevron-${isStartCollapsed ? 'down' : 'up'} text-xs font-black`}></i>
                    </div>
                  </div>

                  {!isStartCollapsed && (
                    <div>
                      <button
                        onClick={handleGetLiveLocation}
                        disabled={gpsLoading}
                        className="w-full mb-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:from-slate-800 hover:to-slate-700 transition-all shadow-xl active:scale-95"
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
                <div className="glass rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-slate-900/10 pointer-events-auto border-orange-500/20 relative z-10">
                  <div className={`flex items-center justify-between cursor-pointer select-none ${isStopsCollapsed ? '' : 'mb-5'}`} onClick={() => setIsStopsCollapsed(!isStopsCollapsed)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 text-xl font-black">
                        <i className="bi bi-plus-lg"></i>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">Add Stops</h3>
                        <p className="text-[9px] sm:text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">
                          {locations.filter(l=>!l.isStart).length} Destinations
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0">
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
                  <div className="glass rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-slate-900/10 pointer-events-auto border-slate-200/50 relative z-10">
                    <div className="flex items-center gap-2 mb-5 sm:mb-6">
                      <i className="bi bi-signpost-split text-slate-300"></i>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Journey Timeline</h3>
                    </div>
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

                {/* Trip Summary & Action */}
                {locations.length >= 2 && (
                  <div className="glass rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-slate-900/10 pointer-events-auto border-slate-900/10 relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-900/30 text-lg font-black">
                        <i className="bi bi-calendar-check"></i>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">Trip Summary</h3>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dates & Pickup</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <DateField
                        label="Start Date"
                        value={startDate}
                        minDate={todayDateString()}
                        onChange={handleStartDateChange}
                        accent="orange"
                      />
                      <DateField
                        label="End Date"
                        value={endDate}
                        minDate={startDate}
                        onChange={handleEndDateChange}
                        accent="orange"
                      />
                    </div>

                    <div className="mb-6">
                      <TimeField
                        label="Pickup Time"
                        value={startTime}
                        onChange={setStartTime}
                        accent="orange"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-xl sm:text-2xl font-black text-slate-900">{estimatedPrice?.total_days ?? tripDurationDays ?? '—'}</span>
                          <span className="text-[10px] font-bold text-slate-400">DAYS</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Distance</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-xl sm:text-2xl font-black text-slate-900">{totalRouteKm}</span>
                          <span className="text-[10px] font-bold text-orange-400">KM</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentStep(2)}
                      className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-500/30 active:scale-95"
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

                {/* Total Distance Badge — visible as soon as a route exists, not buried in the summary card below */}
                {totalRouteKm > 0 && (
                  <div className="absolute top-6 left-6 z-[1000] glass rounded-2xl px-5 py-3 shadow-2xl shadow-slate-900/20 pointer-events-none">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Distance</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-slate-900">{totalRouteKm}</span>
                      <span className="text-[10px] font-bold text-orange-500">KM</span>
                    </div>
                    <p className={`text-[9px] font-bold mt-0.5 flex items-center gap-1 ${isRoutingLive ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <i className={`bi ${isRoutingLive ? 'bi-signpost-split-fill' : 'bi-rulers'}`}></i>
                      {isRoutingLive ? 'Real road route' : 'Estimated (straight-line)'}
                    </p>
                  </div>
                )}

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

                <VehicleCarousel
                  options={VEHICLE_OPTIONS}
                  selected={selectedVehicle}
                  onSelect={setSelectedVehicle}
                />
              </div>

              {/* Summary Side Card */}
              <div className="lg:col-span-4 sticky top-28">
                <div className="glass rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Price Breakdown</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <DateField
                      label="Start Date"
                      value={startDate}
                      minDate={todayDateString()}
                      onChange={handleStartDateChange}
                      accent="orange"
                    />
                    <DateField
                      label="End Date"
                      value={endDate}
                      minDate={startDate}
                      onChange={handleEndDateChange}
                      accent="orange"
                    />
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
                      <p className="text-sm font-black text-slate-900">{estimatedPrice?.total_days ?? tripDurationDays ?? '—'} Days</p>
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-10">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center shadow-xl shadow-orange-500/30 mx-auto mb-5">
                <i className="bi bi-clipboard2-check-fill text-2xl sm:text-3xl"></i>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 sm:mb-4">Final Confirmation</h2>
              <p className="text-sm sm:text-base text-slate-500 font-medium max-w-lg mx-auto leading-relaxed px-2">Review your tour carefully. Once confirmed, we'll start searching for the best driver for your route.</p>
            </div>

            {/* Unified Summary Card */}
            <div className="glass rounded-[1.75rem] sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl shadow-slate-900/10 overflow-hidden mb-6 sm:mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-5">

                {/* Left: Tour Route */}
                <div className="lg:col-span-3 p-6 sm:p-8 lg:p-10">
                  <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                        <i className="bi bi-signpost-split-fill text-base sm:text-xl"></i>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-xl font-extrabold text-slate-900">Your Route</h3>
                        <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5 truncate">{locations.length} stops • {estimatedPrice?.total_distance_km ?? totalRouteKm} km total</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="shrink-0 text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 transition-all flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-full"
                    >
                      <i className="bi bi-pencil-fill"></i>
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="space-y-0 relative max-h-[380px] sm:max-h-none overflow-y-auto sm:overflow-visible pr-1 -mr-1 sm:pr-0 sm:mr-0">
                    {locations.map((loc, i) => (
                      <div key={loc.id} className="relative pl-12 sm:pl-14 pb-5 last:pb-0">
                        {i < locations.length - 1 && (
                          <div className="absolute left-[15px] sm:left-[17px] top-9 bottom-0 w-0.5 border-l-2 border-dashed border-slate-200"></div>
                        )}
                        <div className="absolute left-0 top-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black shadow-md ring-4 ring-white" style={{background: loc.isStart ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : i === locations.length - 1 ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', color: 'white'}}>
                          {loc.isStart ? <i className="bi bi-geo-alt-fill text-xs"></i> : i === locations.length - 1 ? <i className="bi bi-flag-fill text-xs"></i> : i+1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm sm:text-base break-words leading-snug">{loc.name}</p>
                          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mt-0.5">
                            {loc.isStart ? 'Starting Point' : i === locations.length - 1 ? 'Final Destination' : `Stop ${i}`}
                          </p>
                          {i < locations.length - 1 && legDistances[i] !== undefined && (
                            <p className="text-xs text-orange-600 font-black mt-1.5 flex items-center gap-1">
                              <i className="bi bi-arrow-down-short"></i>{legDistances[i]} km to next stop
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Trip Summary */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 sm:p-8 lg:p-10 flex flex-col">
                  <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2">Estimated Total (LKR)</p>
                  <p className="text-3xl sm:text-4xl font-black mb-6 sm:mb-8 break-words">
                    {estimateLoading ? '…' : `Rs. ${Number(estimatedPrice?.estimated_price || 0).toLocaleString()}`}
                  </p>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-white/10">
                      <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white/60"><i className="bi bi-car-front-fill text-orange-400"></i>Vehicle</span>
                      <span className="text-xs sm:text-sm font-extrabold truncate ml-3">{selectedVehicle}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-white/10">
                      <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white/60"><i className="bi bi-signpost-2-fill text-orange-400"></i>Distance</span>
                      <span className="text-xs sm:text-sm font-extrabold">{estimatedPrice?.total_distance_km ?? totalRouteKm} km</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-white/10">
                      <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white/60"><i className="bi bi-hourglass-split text-orange-400"></i>Duration</span>
                      <span className="text-xs sm:text-sm font-extrabold">{estimatedPrice?.total_days ?? tripDurationDays ?? '—'} days</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white/60"><i className="bi bi-calendar-range-fill text-orange-400"></i>Dates</span>
                      <span className="text-xs sm:text-sm font-extrabold text-right">{startDate} → {endDate}</span>
                    </div>
                    {bookingType === 'schedule' && (
                      <div className="flex items-center justify-between py-3 border-t border-white/10">
                        <span className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white/60"><i className="bi bi-clock-fill text-orange-400"></i>Start Time</span>
                        <span className="text-xs sm:text-sm font-extrabold">{startTime}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 sm:pt-8 flex items-start gap-2.5 text-white/40 text-[11px] font-semibold leading-relaxed">
                    <i className="bi bi-shield-check mt-0.5"></i>
                    <span>Prices are estimates. A driver will be matched right after you confirm.</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Final Action */}
            <div className="w-full max-w-xl mx-auto pb-4">
              {!bookingConfirmed ? (
                <div className="flex flex-col items-center gap-5 sm:gap-6">
                  <button
                    onClick={() => handleBookTour({ bookingType: 'now' })}
                    disabled={loading}
                    className="w-full px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black text-base sm:text-lg shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-3"
                  >
                    <i className="bi bi-lightning-charge-fill text-xl sm:text-2xl"></i>
                    <span>{loading ? 'Booking…' : 'Confirm & Book Now'}</span>
                  </button>
                  <button onClick={() => setCurrentStep(2)} className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-all">
                    ← Back to Fleet Selection
                  </button>
                </div>
              ) : (
                <div className="text-center animate-fade-in-up w-full">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-5 sm:mb-6 shadow-2xl shadow-emerald-500/30">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 sm:mb-8">Tour Created Successfully!</h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                     <button onClick={() => { setLocations([]); setSelectedVehicle(''); setCurrentStep(1); setBookingConfirmed(false); setMessage(''); }} className="w-full sm:w-auto sm:flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95">Plan Another</button>
                     <button onClick={onBackToHome} className="w-full sm:w-auto sm:flex-1 px-8 py-4 bg-white text-slate-900 border border-slate-100 rounded-2xl font-black text-sm transition-all shadow-lg hover:bg-slate-50 active:scale-95">Back to Home</button>
                  </div>
                </div>
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
              <DateField
                label="Start Date"
                value={startDate}
                minDate={todayDateString()}
                maxDate={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                onChange={handleStartDateChange}
                accent="emerald"
              />
              <DateField
                label="End Date"
                value={endDate}
                minDate={startDate}
                onChange={handleEndDateChange}
                accent="emerald"
              />
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

      {showOutsideSriLankaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative text-center">
            <button
              onClick={() => setShowOutsideSriLankaModal(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
              <i className="bi bi-geo-alt-fill text-2xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">You're Outside Sri Lanka</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
              Live location detection only works within Sri Lanka, since that's where our tours operate.
              Please search for your starting point manually instead.
            </p>
            <button
              onClick={() => setShowOutsideSriLankaModal(false)}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black shadow-xl transition-all hover:scale-[1.02] active:scale-95"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      <Footer variant="dashboard" portal="booking" />

    </div>
  )
}
