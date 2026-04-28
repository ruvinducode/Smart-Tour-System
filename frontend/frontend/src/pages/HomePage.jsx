import { useState, useCallback, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import L from 'leaflet'
import { getUserNotifications, acceptDriverPrice, rejectDriverPrice, replyToDriver } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'

const customStyles = `
  @keyframes drift {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(20px, -12px, 0) scale(1.05); }
    100% { transform: translate3d(0, 0, 0) scale(1); }
  }

  @keyframes riseIn {
    0% { opacity: 0; transform: translateY(18px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes glowPulse {
    0% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.35); }
    70% { box-shadow: 0 0 0 14px rgba(20, 184, 166, 0); }
    100% { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0); }
  }

  .animate-drift {
    animation: drift 9s ease-in-out infinite;
  }

  .animate-rise-in {
    animation: riseIn 650ms ease-out both;
  }

  .animate-glow-pulse {
    animation: glowPulse 2.4s infinite;
  }
`

if (typeof document !== 'undefined' && !document.getElementById('smart-tour-home-animations')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'smart-tour-home-animations'
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

if (typeof document !== 'undefined' && !document.getElementById('smart-tour-bootstrap-icons')) {
  const bootstrapIcons = document.createElement('link')
  bootstrapIcons.id = 'smart-tour-bootstrap-icons'
  bootstrapIcons.rel = 'stylesheet'
  bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css'
  document.head.appendChild(bootstrapIcons)
}

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SRI_LANKA_CENTER = [7.8731, 80.7718]
const DEFAULT_ZOOM = 7

const TOURIST_DESTINATIONS = [
  { id: 1, name: 'Colombo', lat: 6.9271, lng: 79.8612, description: 'Contemporary city life, colonial streets.', region: 'West Coast', tours: ['City Pulse Tour'] },
  { id: 2, name: 'Kandy', lat: 7.2906, lng: 80.6337, description: 'Sacred temples, highland culture.', region: 'Central Hills', tours: ['Temple & Culture Day'] },
  { id: 3, name: 'Galle', lat: 6.0535, lng: 80.22, description: 'Fort walls, boutique coastal charm.', region: 'South Coast', tours: ['Fort Stories Walk'] },
  { id: 4, name: 'Sigiriya', lat: 7.9574, lng: 80.757, description: 'Legendary rock citadel.', region: 'Cultural Triangle', tours: ['Sunrise Climb'] },
  { id: 5, name: 'Anuradhapura', lat: 8.3114, lng: 80.4037, description: 'Grand stupas, sacred ruins.', region: 'North Central', tours: ['Sacred City Circuit'] },
  { id: 6, name: 'Nuwara Eliya', lat: 6.9478, lng: 80.7957, description: 'Cool-climate valleys.', region: 'Hill Country', tours: ['Tea Estate Morning'] },
  { id: 7, name: 'Ella', lat: 6.8667, lng: 81.0472, description: 'Mountain hikes.', region: 'Uva Highlands', tours: ['Nine Arch Explorer'] },
  { id: 8, name: 'Mirissa', lat: 5.9445, lng: 80.5417, description: 'Golden beaches.', region: 'Southern Shore', tours: ['Whale Quest Cruise'] },
]

const createCustomIcon = (color = '#0f766e') =>
  new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="22" r="18" fill="${color}" stroke="white" stroke-width="3"/>
        <circle cx="22" cy="22" r="9" fill="white"/>
        <circle cx="22" cy="22" r="4" fill="${color}"/>
      </svg>
    `)}`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  })

export default function HomePage({ onStartTour, onGoToPlanTrip, onViewDashboard, userName, onLogout, token }) {
  const [selectedDestination, setSelectedDestination] = useState(TOURIST_DESTINATIONS[3])
  const [hoveredDestination, setHoveredDestination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeHighlight, setActiveHighlight] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [notifActions, setNotifActions] = useState({})

  const highlights = [
    { icon: 'bi-stars', title: 'Curated Itineraries', text: 'Routes made for comfort and views.' },
    { icon: 'bi-geo-alt', title: 'Live Destination Map', text: 'Interactive Sri Lanka map.' },
    { icon: 'bi-people', title: 'Trusted Local Hosts', text: 'Travel with guides who know gems.' },
    { icon: 'bi-shield-check', title: 'Safe & Reliable', text: 'Clear plans and verified partners.' },
  ]

  const getTourIdFromNote = (note) => {
    if (note.tour_id) return note.tour_id
    const match = (note.subject + ' ' + note.message).match(/#(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHighlight((prev) => (prev + 1) % highlights.length)
    }, 2600)
    return () => clearInterval(interval)
  }, [highlights.length])

  useEffect(() => {
    let ignore = false
    const loadNotifications = async () => {
      if (!token) return
      try {
        const data = await getUserNotifications(token)
        if (!ignore) setNotifications(Array.isArray(data) ? data : [])
      } catch {
        if (!ignore) setNotifications([])
      }
    }
    loadNotifications()
    return () => { ignore = true }
  }, [token])

  const filteredDestinations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return TOURIST_DESTINATIONS
    return TOURIST_DESTINATIONS.filter((d) => d.name.toLowerCase().includes(query))
  }, [searchTerm])

  const planRouteAction = onGoToPlanTrip || onStartTour

  return (
    <div className="min-h-screen bg-[#fff8ee] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-amber-200/60 bg-[#fff8ee]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg">
              <i className="bi bi-compass-fill"></i>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Smart Tour</p>
              <p className="text-lg font-extrabold leading-none">Plan Your Island Story</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* NEW DASHBOARD BUTTON */}
            <button
              type="button"
              onClick={onViewDashboard}
              className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <i className="bi bi-list-task mr-2"></i>
              My Bookings
            </button>
            <button
              type="button"
              onClick={planRouteAction}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Start Planning
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-amber-200/60 bg-teal-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="animate-rise-in">
            <h1 className="text-4xl font-black sm:text-6xl">Build a premium trip plan in minutes.</h1>
            <p className="mt-5 text-lg text-teal-50">Pick a destination and travel like a pro.</p>
          </div>
          <div className="animate-rise-in rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-lg">
            <h2 className="text-2xl font-black">Welcome {userName || 'Traveler'}</h2>
            <p className="mt-2 text-sm text-teal-100">Your next journey starts here.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 pb-20">
        <div className="grid gap-7 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-xl min-h-[400px]">
            <h3 className="text-2xl font-extrabold mb-4">Choose Your Route</h3>
            <div className="h-96 rounded-2xl overflow-hidden border">
              <MapContainer center={SRI_LANKA_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {filteredDestinations.map((d) => (
                  <Marker 
                    key={d.id} 
                    position={[d.lat, d.lng]} 
                    icon={createCustomIcon(selectedDestination?.id === d.id ? '#0ea5a4' : '#0f766e')}
                    eventHandlers={{ click: () => setSelectedDestination(d) }}
                  >
                    <Popup><b>{d.name}</b><br/>{d.description}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <aside className="rounded-3xl border border-amber-200 bg-white p-5 shadow-xl">
             <p className="text-xs font-semibold uppercase text-teal-700">Trip Builder</p>
             {selectedDestination && (
               <>
                 <h4 className="text-2xl font-black mt-2">{selectedDestination.name}</h4>
                 <p className="mt-2 text-sm text-slate-600">{selectedDestination.description}</p>
                 <button onClick={onStartTour} className="mt-5 w-full rounded-xl bg-teal-600 py-3 text-white font-bold">
                    Continue with {selectedDestination.name}
                 </button>
               </>
             )}
          </aside>
        </div>
      </section>

      <TourDetailsModal
        tourId={selectedTourId}
        token={token}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        userRole="user"
      />
    </div>
  )
}