import { useState, useCallback, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import L from 'leaflet'
import { getUserNotifications } from './services/api.js'
import TourDetailsModal from './components/TourDetailsModal.jsx'

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
  {
    id: 1,
    name: 'Colombo',
    lat: 6.9271,
    lng: 79.8612,
    description: 'Contemporary city life, colonial streets, and sunset ocean promenades.',
    region: 'West Coast',
    tours: ['City Pulse Tour', 'Street Food Night', 'Architectural Walk'],
  },
  {
    id: 2,
    name: 'Kandy',
    lat: 7.2906,
    lng: 80.6337,
    description: 'Sacred temples, lakeside evenings, and highland culture.',
    region: 'Central Hills',
    tours: ['Temple & Culture Day', 'Tea Craft Trail', 'Royal Lake Ride'],
  },
  {
    id: 3,
    name: 'Galle',
    lat: 6.0535,
    lng: 80.22,
    description: 'Fort walls, ocean breeze, and boutique coastal charm.',
    region: 'South Coast',
    tours: ['Fort Stories Walk', 'Lighthouse Evening Tour', 'Coastal Cafe Route'],
  },
  {
    id: 4,
    name: 'Sigiriya',
    lat: 7.9574,
    lng: 80.757,
    description: 'Legendary rock citadel with sweeping jungle panoramas.',
    region: 'Cultural Triangle',
    tours: ['Sunrise Climb', 'Village & Lagoon Ride', 'Ancient Kings Trail'],
  },
  {
    id: 5,
    name: 'Anuradhapura',
    lat: 8.3114,
    lng: 80.4037,
    description: 'Grand stupas, sacred ruins, and timeless spiritual heritage.',
    region: 'North Central',
    tours: ['Sacred City Circuit', 'Cycling Heritage Loop', 'Temple Pilgrimage'],
  },
  {
    id: 6,
    name: 'Nuwara Eliya',
    lat: 6.9478,
    lng: 80.7957,
    description: 'Cool-climate valleys with tea estates and colonial elegance.',
    region: 'Hill Country',
    tours: ['Tea Estate Morning', 'Waterfall Discovery', 'Highland Garden Trail'],
  },
  {
    id: 7,
    name: 'Ella',
    lat: 6.8667,
    lng: 81.0472,
    description: 'Cloud-kissed viewpoints, train bridges, and mountain hikes.',
    region: 'Uva Highlands',
    tours: ['Nine Arch Explorer', 'Mini Adams Peak Hike', 'Ella Scenic Journey'],
  },
  {
    id: 8,
    name: 'Mirissa',
    lat: 5.9445,
    lng: 80.5417,
    description: 'Golden beaches and unforgettable ocean wildlife moments.',
    region: 'Southern Shore',
    tours: ['Whale Quest Cruise', 'Coral Snorkel Trip', 'Sunset Beach Escape'],
  },
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
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 20],
  })

export default function HomePage({ onStartTour, onGoToPlanTrip, userName, onLogout, token }) {
  const [selectedDestination, setSelectedDestination] = useState(TOURIST_DESTINATIONS[3])
  const [hoveredDestination, setHoveredDestination] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeHighlight, setActiveHighlight] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const highlights = [
    { icon: 'bi-stars', title: 'Curated Itineraries', text: 'Routes made for comfort, views, and authentic moments.' },
    { icon: 'bi-geo-alt', title: 'Live Destination Map', text: 'Choose where to go with an interactive Sri Lanka map.' },
    { icon: 'bi-people', title: 'Trusted Local Hosts', text: 'Travel with guides who know every hidden gem.' },
    { icon: 'bi-shield-check', title: 'Safe & Reliable', text: 'Clear plans, verified partners, and support throughout.' },
  ]

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
    return () => {
      ignore = true
    }
  }, [token])

  const filteredDestinations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return TOURIST_DESTINATIONS
    return TOURIST_DESTINATIONS.filter((destination) => {
      return (
        destination.name.toLowerCase().includes(query) ||
        destination.region.toLowerCase().includes(query) ||
        destination.description.toLowerCase().includes(query) ||
        destination.tours.some((tour) => tour.toLowerCase().includes(query))
      )
    })
  }, [searchTerm])

  const handleDestinationClick = useCallback((destination) => {
    setSelectedDestination(destination)
  }, [])

  const handleStartTour = useCallback(() => {
    if (selectedDestination) {
      onStartTour(selectedDestination)
    }
  }, [onStartTour, selectedDestination])

  const planRouteAction = onGoToPlanTrip || handleStartTour

  const stats = [
    { label: 'Destinations', value: `${TOURIST_DESTINATIONS.length}+` },
    { label: 'Handpicked Tours', value: '30+' },
    { label: 'Guest Satisfaction', value: '4.9/5' },
  ]

  return (
    <div className="min-h-screen bg-[#fff8ee] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-amber-200/60 bg-[#fff8ee]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-900/20">
              <i className="bi bi-compass-fill text-lg"></i>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Smart Tour</p>
              <p className="text-lg font-extrabold leading-none">Plan Your Island Story</p>
            </div>
          </div>

          <div className="hidden items-center gap-5 text-sm font-semibold text-slate-700 md:flex">
            <a href="#planner" className="transition-colors hover:text-teal-700">Planner</a>
            <a href="#destinations" className="transition-colors hover:text-teal-700">Destinations</a>
            <a href="#experience" className="transition-colors hover:text-teal-700">Experience</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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

      <section className="relative overflow-hidden border-b border-amber-200/60 bg-linear-to-br from-[#0b3d3f] via-[#0f6460] to-[#146a8a] text-white">
        <div className="pointer-events-none absolute -left-10 top-20 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl animate-drift"></div>
        <div className="pointer-events-none absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-2xl animate-drift" style={{ animationDelay: '1.4s' }}></div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:py-24">
          <div className="animate-rise-in">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              <i className="bi bi-map"></i>
              Sri Lanka Tour Design Hub
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Build a premium trip plan in minutes, then travel it like a pro.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-teal-50/90 sm:text-lg">
              Mix coast, culture, and mountains into one seamless route. Choose a destination, preview its best tours, and jump straight into your personalized travel plan.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-sm">
                  <p className="text-2xl font-extrabold text-amber-200">{stat.value}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-100/90">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-rise-in rounded-3xl border border-white/20 bg-white/12 p-5 backdrop-blur-lg" style={{ animationDelay: '120ms' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Welcome</p>
            <h2 className="mt-2 text-2xl font-black">{userName ? userName : 'Traveler'}</h2>
            <p className="mt-2 text-sm text-teal-100/90">
              Your next journey starts here. Pick a destination and we will shape your tour day by day.
            </p>

            <div className="mt-5 space-y-3">
              {highlights.map((item, index) => (
                <div
                  key={item.title}
                  className={`rounded-2xl border px-4 py-3 transition-all ${
                    activeHighlight === index
                      ? 'animate-glow-pulse border-amber-200/70 bg-amber-100/20'
                      : 'border-white/20 bg-white/10'
                  }`}
                >
                  <p className="text-sm font-bold">
                    <i className={`bi ${item.icon} mr-2`}></i>
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-teal-100/90">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="planner" className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        {notifications.length > 0 ? (
          <div className="mb-7 rounded-3xl border border-emerald-200 bg-white p-5 shadow-lg shadow-emerald-100/60 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <i className="bi bi-bell-fill text-emerald-600"></i>
              <h3 className="text-lg font-extrabold text-slate-900">Latest Driver Updates</h3>
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((note) => (
                <div key={note.id} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{note.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">{note.message}</p>
                    </div>
                    {note.tour_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTourId(note.tour_id)
                          setShowDetailsModal(true)
                        }}
                        className="whitespace-nowrap rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                      >
                        View Tour →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-7 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-xl shadow-amber-100/70 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Destination Map</p>
                <h3 className="text-2xl font-extrabold text-slate-900">Choose Your Route</h3>
              </div>

              <div className="flex w-full items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 sm:w-auto">
                <i className="bi bi-search text-slate-500"></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by place, region, or tour"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none sm:w-72"
                />
              </div>
            </div>

            <div className="h-110 overflow-hidden rounded-2xl border border-slate-200">
              <MapContainer center={SRI_LANKA_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {filteredDestinations.map((destination) => (
                  <Marker
                    key={destination.id}
                    position={[destination.lat, destination.lng]}
                    icon={createCustomIcon(
                      selectedDestination?.id === destination.id
                        ? '#0ea5a4'
                        : hoveredDestination?.id === destination.id
                          ? '#f97316'
                          : '#0f766e'
                    )}
                    eventHandlers={{
                      click: () => handleDestinationClick(destination),
                      mouseover: () => setHoveredDestination(destination),
                      mouseout: () => setHoveredDestination(null),
                    }}
                  >
                    <Popup>
                      <div className="min-w-52 p-2 text-slate-800">
                        <h4 className="text-base font-extrabold">{destination.name}</h4>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{destination.region}</p>
                        <p className="mt-2 text-sm text-slate-600">{destination.description}</p>
                        <button
                          type="button"
                          onClick={() => handleDestinationClick(destination)}
                          className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                        >
                          Use In My Plan
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <aside className="rounded-3xl border border-amber-200 bg-white p-5 shadow-xl shadow-amber-100/70 sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Trip Builder</p>
              <h3 className="text-2xl font-extrabold">Selected Destination</h3>
            </div>

            {selectedDestination ? (
              <>
                <div className="rounded-2xl border border-teal-200 bg-linear-to-br from-teal-50 to-amber-50 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{selectedDestination.region}</p>
                  <h4 className="mt-1 text-2xl font-black text-slate-900">{selectedDestination.name}</h4>
                  <p className="mt-2 text-sm text-slate-600">{selectedDestination.description}</p>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedDestination.tours.map((tour) => (
                    <div key={tour} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-800">{tour}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleStartTour}
                  className="mt-5 w-full rounded-xl bg-linear-to-r from-teal-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-cyan-200"
                >
                  Continue With {selectedDestination.name}
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Pick any marker on the map to start shaping your personalized tour.
              </div>
            )}
          </aside>
        </div>
      </section>

      <section id="destinations" className="mx-auto mt-10 max-w-7xl px-4 pb-8 sm:px-6">
        <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-xl shadow-amber-100/60 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Destination Catalog</p>
              <h3 className="text-2xl font-extrabold">Find Your Perfect Stop</h3>
            </div>
            <p className="text-sm font-medium text-slate-500">{filteredDestinations.length} match{filteredDestinations.length === 1 ? '' : 'es'} found</p>
          </div>

          {filteredDestinations.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              No destinations found for "{searchTerm}". Try a region like "Hill" or "South".
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDestinations.map((destination, index) => (
                <button
                  type="button"
                  key={destination.id}
                  onClick={() => handleDestinationClick(destination)}
                  onMouseEnter={() => setHoveredDestination(destination)}
                  onMouseLeave={() => setHoveredDestination(null)}
                  className={`group rounded-2xl border p-4 text-left transition-all animate-rise-in ${
                    selectedDestination?.id === destination.id
                      ? 'border-teal-400 bg-teal-50 shadow-lg shadow-teal-100'
                      : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-100/60'
                  }`}
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{destination.region}</p>
                    <i className="bi bi-arrow-up-right text-slate-400 transition group-hover:text-teal-700"></i>
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900">{destination.name}</h4>
                  <p className="mt-2 text-sm text-slate-600">{destination.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {destination.tours.length} tours ready
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedDestination && (
        <section id="experience" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="rounded-3xl border border-amber-200 bg-linear-to-br from-[#fdf7ed] via-[#eefcf8] to-[#ebf8ff] p-6 shadow-xl shadow-amber-100/60 sm:p-8">
            <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Experience Preview</p>
                <h3 className="mt-2 text-3xl font-black text-slate-900">Your {selectedDestination.name} Journey Blueprint</h3>
                <p className="mt-3 text-slate-700">
                  A balanced blend of iconic sights, local stories, and relaxed pacing to keep your trip exciting without feeling rushed.
                </p>

                <div className="mt-5 space-y-3">
                  {selectedDestination.tours.map((tour, idx) => (
                    <div key={tour} className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/80 px-4 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <p className="font-semibold text-slate-800">{tour}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/85 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Next Step</p>
                <h4 className="mt-2 text-xl font-black text-slate-900">Launch Trip Planning</h4>
                <p className="mt-2 text-sm text-slate-600">
                  Confirm this destination and continue to customize transport, duration, and preferred activities.
                </p>
                <button
                  type="button"
                  onClick={planRouteAction}
                  className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  Open Full Planner
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

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
