import { useState, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import L from 'leaflet'

// Custom CSS animations
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
    animation: fade-in-up 1s ease-out forwards;
  }
`

// Inject custom styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

// Add Bootstrap Icons CSS
if (typeof document !== 'undefined') {
  const bootstrapIcons = document.createElement('link')
  bootstrapIcons.rel = 'stylesheet'
  bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css'
  document.head.appendChild(bootstrapIcons)
}

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Sri Lanka center coordinates
const SRI_LANKA_CENTER = [7.8731, 80.7718]
const DEFAULT_ZOOM = 7

// Popular tourist destinations in Sri Lanka
const TOURIST_DESTINATIONS = [
  {
    id: 1,
    name: "Colombo",
    lat: 6.9271,
    lng: 79.8612,
    description: "Commercial capital and gateway to Sri Lanka",
    tours: ["City Tour", "Shopping Experience", "Food Tour"]
  },
  {
    id: 2,
    name: "Kandy", 
    lat: 7.2906,
    lng: 80.6337,
    description: "Cultural capital with Temple of the Tooth",
    tours: ["Cultural Heritage Tour", "Tea Plantation Visit", "Kandy City Tour"]
  },
  {
    id: 3,
    name: "Galle",
    lat: 6.0535,
    lng: 80.2200,
    description: "Historic fort city and coastal paradise",
    tours: ["Galle Fort Tour", "Beach Experience", "Heritage Walk"]
  },
  {
    id: 4,
    name: "Sigiriya",
    lat: 7.9574,
    lng: 80.7570,
    description: "Ancient rock fortress and UNESCO site",
    tours: ["Sigiriya Climb", "Village Tour", "Sunset Experience"]
  },
  {
    id: 5,
    name: "Anuradhapura",
    lat: 8.3114,
    lng: 80.4037,
    description: "Ancient city with sacred Buddhist sites",
    tours: ["Ancient City Tour", "Sacred Sites Visit", "Cultural Experience"]
  },
  {
    id: 6,
    name: "Nuwara Eliya",
    lat: 6.9478,
    lng: 80.7957,
    description: "Little England with tea plantations",
    tours: ["Tea Factory Tour", "Hill Country Experience", "Train Journey"]
  },
  {
    id: 7,
    name: "Ella",
    lat: 6.8667,
    lng: 81.0472,
    description: "Mountain village with stunning views",
    tours: ["Hiking Tour", "Nine Arch Bridge", "Ella Rock Climb"]
  },
  {
    id: 8,
    name: "Mirissa",
    lat: 5.9445,
    lng: 80.5417,
    description: "Beach paradise for whale watching",
    tours: ["Whale Watching", "Beach Tour", "Snorkeling Experience"]
  }
]

// Custom marker icon for tourist destinations
const createCustomIcon = (color = '#3B82F6') => new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="20" cy="20" r="8" fill="white"/>
      <circle cx="20" cy="20" r="4" fill="${color}"/>
    </svg>
  `)}`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 20]
})

export default function HomePage({ onStartTour, userName, onLogout }) {
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [hoveredDestination, setHoveredDestination] = useState(null)
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)

  // Tourist-focused animations with Bootstrap icons
  const touristAnimations = [
    { icon: 'bi bi-umbrella-beach', text: 'Tropical Paradise', description: 'Pristine beaches and crystal waters' },
    { icon: 'bi bi-building', text: 'Ancient Heritage', description: '2000+ years of rich history' },
    { icon: 'bi bi-tree', text: 'Lush Tea Gardens', description: 'World-renowned Ceylon tea' },
    { icon: 'bi bi-emoji-smile', text: 'Wildlife Safari', description: 'Meet gentle giants in their natural habitat' },
    { icon: 'bi bi-mountain', text: 'Mountain Adventures', description: 'Breathtaking hill country landscapes' },
    { icon: 'bi bi-heart', text: 'Vibrant Culture', description: 'Warm smiles and timeless traditions' },
    { icon: 'bi bi-train-front', text: 'Scenic Train Rides', description: 'Journey through tea-covered mountains' },
    { icon: 'bi bi-water', text: 'Ocean Adventures', description: 'Whale watching and water sports' }
  ]

  // Auto-rotate animations
  useEffect(() => {
    if (!isAnimating) return

    const interval = setInterval(() => {
      setCurrentAnimationIndex((prev) => (prev + 1) % touristAnimations.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [isAnimating, touristAnimations.length])

  const handleDestinationClick = useCallback((destination) => {
    setSelectedDestination(destination)
  }, [])

  const handleStartTour = useCallback(() => {
    if (selectedDestination) {
      onStartTour(selectedDestination)
    }
  }, [selectedDestination, onStartTour])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center animate-pulse">
                  <span className="text-white font-bold text-sm">ST</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Smart Tour</h1>
              </div>
              {userName && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  Welcome, {userName}
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg bg-red-500 px-6 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ENHANCED HERO SECTION WITH ANIMATIONS */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-600 text-white">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Floating Particles */}
          <div className="absolute top-20 left-10 w-4 h-4 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-32 right-20 w-6 h-6 bg-yellow-300/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-3 h-3 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/3 right-1/3 w-5 h-5 bg-emerald-300/20 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          
          {/* Moving Waves */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg className="animate-pulse" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" 
                    fill="white" fillOpacity="0.1"/>
            </svg>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/30"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-24">
          <div className="text-center">
            {/* Animated Title */}
            <div className="mb-8">
              <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in-up">
                <span className="block animate-pulse">Discover the Magic of</span>
                <span className="block text-yellow-300 animate-bounce" style={{ animationDelay: '0.5s' }}>
                  <i className="bi bi-tree-fill me-2"></i>
                  Sri Lanka
                  <i className="bi bi-tree-fill ms-2"></i>
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '1s' }}>
                From ancient cities to pristine beaches, experience the ultimate island adventure 
                with our curated tours across Sri Lanka's most breathtaking destinations.
              </p>
            </div>

            {/* Animated Tourist Features */}
            <div className="mb-12">
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {touristAnimations.slice(0, 4).map((item, index) => (
                  <div
                    key={index}
                    className={`bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4 border border-white/30 transform transition-all duration-500 hover:scale-105 hover:bg-white/30 ${
                      currentAnimationIndex === index ? 'ring-4 ring-yellow-300 ring-opacity-50 scale-105' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="text-3xl mb-2 animate-pulse">
                      <i className={item.icon}></i>
                    </div>
                    <div className="text-sm font-semibold">{item.text}</div>
                    <div className="text-xs text-blue-100 mt-1">{item.description}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                {touristAnimations.slice(4, 8).map((item, index) => (
                  <div
                    key={index + 4}
                    className={`bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4 border border-white/30 transform transition-all duration-500 hover:scale-105 hover:bg-white/30 ${
                      currentAnimationIndex === index + 4 ? 'ring-4 ring-yellow-300 ring-opacity-50 scale-105' : ''
                    }`}
                    style={{ animationDelay: `${(index + 4) * 0.2}s` }}
                  >
                    <div className="text-3xl mb-2 animate-pulse">
                      <i className={item.icon}></i>
                    </div>
                    <div className="text-sm font-semibold">{item.text}</div>
                    <div className="text-xs text-blue-100 mt-1">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call-to-Action Stats */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/30 transform hover:scale-105 transition-transform">
                <span className="text-2xl font-bold">8+</span>
                <span className="text-sm font-medium ml-2">Amazing Destinations</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/30 transform hover:scale-105 transition-transform">
                <span className="text-2xl font-bold">25+</span>
                <span className="text-sm font-medium ml-2">Unique Tours</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/30 transform hover:scale-105 transition-transform">
                <span className="text-2xl font-bold">
                  <i className="bi bi-star-fill text-yellow-300"></i>
                </span>
                <span className="text-sm font-medium ml-2">Expert Local Guides</span>
              </div>
            </div>

            {/* Animated CTA Button */}
            <div className="animate-bounce" style={{ animationDelay: '2s' }}>
              <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-yellow-300 transition-all duration-300 transform hover:scale-110 shadow-xl">
                <i className="bi bi-geo-alt-fill animate-pulse"></i>
                <span>Start Your Dream Adventure</span>
                <i className="bi bi-geo-alt-fill animate-pulse"></i>
              </div>
              <p className="text-sm text-blue-100 mt-3 animate-pulse">
                Scroll down to explore destinations 
                <i className="bi bi-arrow-down ms-1"></i>
              </p>
            </div>
          </div>
        </div>
        
        {/* Enhanced Decorative waves */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" 
                  fill="white" fillOpacity="0.1"/>
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" 
                  fill="white" fillOpacity="0.2"/>
          </svg>
        </div>
      </section>

      {/* INTERACTIVE MAP SECTION */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Explore Sri Lanka's Best Destinations
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Click on any destination below to discover amazing tours and experiences waiting for you
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* MAP CONTAINER */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                <div className="h-96 lg:h-[500px]">
                  <MapContainer
                    center={SRI_LANKA_CENTER}
                    zoom={DEFAULT_ZOOM}
                    className="h-full w-full"
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {TOURIST_DESTINATIONS.map((destination) => (
                      <Marker
                        key={destination.id}
                        position={[destination.lat, destination.lng]}
                        icon={createCustomIcon(
                          selectedDestination?.id === destination.id ? '#10B981' : 
                          hoveredDestination?.id === destination.id ? '#F59E0B' : '#3B82F6'
                        )}
                        eventHandlers={{
                          click: () => handleDestinationClick(destination),
                          mouseover: () => setHoveredDestination(destination),
                          mouseout: () => setHoveredDestination(null)
                        }}
                      >
                        <Popup>
                          <div className="p-3 min-w-[200px]">
                            <h4 className="font-bold text-gray-900 mb-2">{destination.name}</h4>
                            <p className="text-sm text-gray-600 mb-3">{destination.description}</p>
                            <button
                              onClick={() => handleDestinationClick(destination)}
                              className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              View Tours
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>

            {/* DESTINATIONS LIST */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                <h4 className="text-xl font-bold text-gray-900 mb-4">Popular Destinations</h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {TOURIST_DESTINATIONS.map((destination) => (
                    <div
                      key={destination.id}
                      onClick={() => handleDestinationClick(destination)}
                      onMouseEnter={() => setHoveredDestination(destination)}
                      onMouseLeave={() => setHoveredDestination(null)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedDestination?.id === destination.id
                          ? 'bg-emerald-50 border-emerald-300 shadow-md'
                          : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-1">{destination.name}</h5>
                          <p className="text-sm text-gray-600 line-clamp-2">{destination.description}</p>
                          <div className="mt-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {destination.tours.length} tours available
                            </span>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full mt-1 ${
                          selectedDestination?.id === destination.id
                            ? 'bg-emerald-500'
                            : 'bg-blue-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SELECTED DESTINATION DETAILS */}
      {selectedDestination && (
        <section className="py-16 bg-gradient-to-r from-blue-50 to-emerald-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Tours in {selectedDestination.name}
                </h3>
                <p className="text-lg text-gray-600">
                  {selectedDestination.description}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {selectedDestination.tours.map((tour, index) => (
                  <div key={index} className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
                      <i className="bi bi-compass text-white text-xl"></i>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{tour}</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Experience the best of {selectedDestination.name} with our expert guides
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Full Day</span>
                      <span className="text-sm font-semibold text-blue-600">From $50</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleStartTour}
                  className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  Start Planning Your {selectedDestination.name} Tour →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FEATURES SECTION */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Smart Tour?</h3>
            <p className="text-xl text-gray-600">Experience Sri Lanka like never before</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-map text-white text-2xl"></i>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Expert Planning</h4>
              <p className="text-sm text-gray-600">Carefully crafted itineraries by local experts</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-people text-white text-2xl"></i>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Local Guides</h4>
              <p className="text-sm text-gray-600">Knowledgeable guides who bring stories to life</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-car-front text-white text-2xl"></i>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Comfortable Transport</h4>
              <p className="text-sm text-gray-600">Modern vehicles for comfortable journeys</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-star text-white text-2xl"></i>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">5-Star Service</h4>
              <p className="text-sm text-gray-600">Premium service from start to finish</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
