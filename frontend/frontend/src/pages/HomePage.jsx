import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Compass, 
  MapPin, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Briefcase, 
  ChevronRight, 
  Star, 
  Search,
  Bell,
  Menu,
  X
} from 'lucide-react'
import { getUserNotifications } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'

// Assets
import heroImg from '../assets/sri-lanka-hero.png'
import colomboImg from '../assets/colombo.png'
import teaImg from '../assets/tea-plantations.png'
import kandyImg from '../assets/kandy.png'
import galleImg from '../assets/galle.png'

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

  .glass-nav {
    background: rgba(255, 251, 235, 0.7);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(217, 119, 6, 0.1);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .hero-gradient {
    background: linear-gradient(to bottom, rgba(6, 78, 59, 0.4), rgba(6, 78, 59, 0.8));
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #064e3b;
    border-radius: 10px;
  }

  .leaflet-container {
    border-radius: 24px;
    z-index: 1;
  }
`

if (typeof document !== 'undefined' && !document.getElementById('smart-tour-premium-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'smart-tour-premium-styles'
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
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
  { id: 1, name: 'Colombo', lat: 6.9271, lng: 79.8612, description: 'Contemporary city life, colonial streets.', region: 'West Coast', image: colomboImg },
  { id: 2, name: 'Kandy', lat: 7.2906, lng: 80.6337, description: 'Sacred temples, highland culture.', region: 'Central Hills', image: kandyImg },
  { id: 3, name: 'Galle', lat: 6.0535, lng: 80.22, description: 'Fort walls, boutique coastal charm.', region: 'South Coast', image: galleImg },
  { id: 4, name: 'Sigiriya', lat: 7.9574, lng: 80.757, description: 'Legendary rock citadel.', region: 'Cultural Triangle', image: heroImg },
  { id: 5, name: 'Anuradhapura', lat: 8.3114, lng: 80.4037, description: 'Grand stupas, sacred ruins.', region: 'North Central', image: 'https://images.unsplash.com/photo-1546271876-af6caec5fae5?q=80&w=800&auto=format&fit=crop' },
  { id: 6, name: 'Nuwara Eliya', lat: 6.9478, lng: 80.7957, description: 'Cool-climate tea valleys.', region: 'Hill Country', image: teaImg },
]

const createCustomIcon = (isSelected = false) =>
  new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="22" r="18" fill="${isSelected ? '#d97706' : '#064e3b'}" stroke="white" stroke-width="3"/>
        <circle cx="22" cy="22" r="6" fill="white"/>
      </svg>
    `)}`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  })

export default function HomePage({ onStartTour, onGoToPlanTrip, onViewDashboard, userName, onLogout, token, onOpenAbout }) {
  const [selectedDestination, setSelectedDestination] = useState(TOURIST_DESTINATIONS[3])
  const [searchTerm, setSearchTerm] = useState('')
  const [notifications, setNotifications] = useState([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const mapRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const loadNotifications = async () => {
      if (!token) return
      try {
        const data = await getUserNotifications(token)
        setNotifications(Array.isArray(data) ? data : [])
      } catch {
        setNotifications([])
      }
    }
    loadNotifications()
  }, [token])

  const filteredDestinations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return TOURIST_DESTINATIONS
    return TOURIST_DESTINATIONS.filter((d) => d.name.toLowerCase().includes(query))
  }, [searchTerm])

  const planRouteAction = onGoToPlanTrip || onStartTour

  const handleDestinationClick = (dest) => {
    setSelectedDestination(dest)
    if (mapRef.current) {
      mapRef.current.setView([dest.lat, dest.lng], 10)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbeb] text-slate-900 selection:bg-emerald-200">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'glass-nav py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="bg-emerald-900 text-white p-2 rounded-xl shadow-lg">
              <Compass size={24} />
            </div>
            <div>
              <span className={`block text-xs font-bold uppercase tracking-widest ${isScrolled ? 'text-emerald-900' : 'text-white/80'}`}>Smart Tour</span>
              <span className={`block text-xl font-extrabold ${isScrolled ? 'text-slate-900' : 'text-white'}`}>Sri Lanka</span>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={onOpenAbout}
              className={`flex items-center gap-2 font-semibold transition-colors ${isScrolled ? 'text-slate-600 hover:text-emerald-700' : 'text-white/90 hover:text-white'}`}
            >
              About
            </button>
            <button 
              onClick={onViewDashboard}
              className={`flex items-center gap-2 font-semibold transition-colors ${isScrolled ? 'text-slate-600 hover:text-emerald-700' : 'text-white/90 hover:text-white'}`}
            >
              <Briefcase size={18} />
              My Bookings
            </button>
            <div className="h-6 w-[1px] bg-white/20"></div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={planRouteAction}
              className="bg-emerald-900 text-white px-6 py-2.5 rounded-full font-bold shadow-xl hover:bg-emerald-800 transition-colors"
            >
              Plan a Trip
            </motion.button>
            <button
              onClick={onLogout}
              className={`p-2 rounded-full transition-colors ${isScrolled ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              <LogOut size={20} />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu className={isScrolled ? 'text-slate-900' : 'text-white'} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={heroImg} 
            className="w-full h-full object-cover" 
            alt="Sigiriya Fortress Sri Lanka"
          />
          <div className="absolute inset-0 hero-gradient"></div>
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <span className="inline-block bg-amber-500/20 backdrop-blur-md text-amber-200 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider mb-6 border border-amber-500/30">
                DISCOVER THE WONDER OF ASIA
              </span>
              <h1 className="text-6xl md:text-8xl font-serif text-white leading-tight mb-8">
                Your Authentic <br />
                <span className="text-amber-400">Island Story</span> <br />
                Starts Here
              </h1>
              <p className="text-xl text-emerald-50/80 mb-10 max-w-xl leading-relaxed">
                Experience the magic of Sri Lanka with curated journeys, local experts, and seamless planning for the modern traveler.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={planRouteAction}
                  className="bg-amber-500 text-emerald-950 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl flex items-center gap-2 group"
                >
                  Start Your Journey
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <div className="flex items-center gap-3 px-4">
                   <div className="flex -space-x-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-emerald-900 bg-emerald-800 flex items-center justify-center text-[10px] text-white">
                          <Users size={14} />
                        </div>
                      ))}
                   </div>
                   <div className="text-white/80 text-sm">
                      <span className="block font-bold">10k+ Travelers</span>
                      <span className="flex items-center gap-1 text-amber-400"><Star size={12} fill="currentColor" /> 4.9/5 Rating</span>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-10 left-0 right-0 z-10 hidden lg:block">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-4 gap-6">
            {[
              { icon: MapPin, label: "Destinations", value: "250+" },
              { icon: Users, label: "Local Hosts", value: "1.2k+" },
              { icon: ShieldCheck, label: "Verified Trips", value: "5.5k+" },
              { icon: Star, label: "Experiences", value: "15k+" }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + idx * 0.1 }}
                className="glass-card p-6 rounded-3xl flex items-center gap-4"
              >
                <div className="bg-emerald-900/10 text-emerald-900 p-3 rounded-2xl">
                  <stat.icon size={24} />
                </div>
                <div>
                  <span className="block text-2xl font-extrabold text-emerald-900 leading-none">{stat.value}</span>
                  <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Handpicked Destinations */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Explore Sri Lanka</span>
            <h2 className="text-4xl md:text-5xl font-serif text-emerald-950 mb-6 leading-tight">
              Handpicked Destinations <br /> For Your Bucket List
            </h2>
          </div>
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search destination..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-emerald-100 px-6 py-4 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 outline-none transition-all pl-12"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredDestinations.map((dest, idx) => (
              <motion.div
                key={dest.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -10 }}
                className="group cursor-pointer"
                onClick={() => handleDestinationClick(dest)}
              >
                <div className="relative h-[450px] rounded-[32px] overflow-hidden shadow-xl mb-6">
                  <img src={dest.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={dest.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent"></div>
                  
                  <div className="absolute top-6 left-6">
                    <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 uppercase tracking-widest">
                      {dest.region}
                    </span>
                  </div>

                  <div className="absolute bottom-8 left-8 right-8">
                    <h3 className="text-3xl font-serif text-white mb-2">{dest.name}</h3>
                    <p className="text-emerald-50/70 text-sm line-clamp-2 mb-6 leading-relaxed">
                      {dest.description}
                    </p>
                    <button className="flex items-center gap-2 text-amber-400 font-bold group/btn">
                      Explore Routes 
                      <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Map & Experience Section */}
      <section className="bg-emerald-950 py-24 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-800 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600 rounded-full blur-[150px] opacity-10 translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
               <div className="bg-emerald-900/50 p-4 rounded-[40px] border border-white/10 shadow-3xl">
                  <div className="h-[600px] w-full rounded-[32px] overflow-hidden border border-white/5 shadow-inner relative">
                    <MapContainer 
                      center={SRI_LANKA_CENTER} 
                      zoom={DEFAULT_ZOOM} 
                      className="h-full w-full"
                      ref={mapRef}
                    >
                      <TileLayer 
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      {filteredDestinations.map((d) => (
                        <Marker 
                          key={d.id} 
                          position={[d.lat, d.lng]} 
                          icon={createCustomIcon(selectedDestination?.id === d.id)}
                          eventHandlers={{ click: () => setSelectedDestination(d) }}
                        >
                          <Popup className="premium-popup">
                            <div className="p-2">
                              <h4 className="font-bold text-emerald-900">{d.name}</h4>
                              <p className="text-xs text-slate-600">{d.description}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
               </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="text-amber-400 font-bold uppercase tracking-widest text-sm mb-6 block">Interactive Experience</span>
              <h2 className="text-4xl md:text-6xl font-serif text-white mb-8 leading-tight">
                Plan Your Path <br /> In Real-Time
              </h2>
              <p className="text-lg text-emerald-100/70 mb-12 leading-relaxed">
                Our smart engine helps you visualize your entire Sri Lankan journey. Pick destinations, see live routes, and connect with drivers instantly.
              </p>

              <div className="space-y-8 mb-12">
                 {selectedDestination ? (
                   <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={selectedDestination.id}
                    className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl"
                   >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-2xl font-serif text-white mb-1">{selectedDestination.name}</h4>
                          <span className="text-amber-400 text-sm font-bold uppercase tracking-widest">{selectedDestination.region}</span>
                        </div>
                        <div className="bg-emerald-800 text-white p-3 rounded-2xl">
                          <MapPin size={24} />
                        </div>
                      </div>
                      <p className="text-emerald-50/70 mb-8">{selectedDestination.description}</p>
                      <button 
                        onClick={onStartTour}
                        className="w-full bg-white text-emerald-950 py-4 rounded-2xl font-bold text-lg hover:bg-amber-400 hover:text-emerald-950 transition-colors shadow-lg"
                      >
                        Plan Trip to {selectedDestination.name}
                      </button>
                   </motion.div>
                 ) : (
                   <div className="bg-white/5 border border-white/5 p-8 rounded-3xl text-center">
                      <p className="text-emerald-50/50">Select a destination on the map to start planning</p>
                   </div>
                 )}
              </div>

              <div className="flex items-center gap-6 text-emerald-100/40 font-bold text-sm tracking-widest uppercase">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Live Updates</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Verified Drivers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features/Why Us */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif text-emerald-950 mb-4">Why Travel With Smart Tour?</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">We combine technology with local heart to give you the most authentic Sri Lankan experience possible.</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          {[
            { icon: Compass, title: "Expertly Curated", text: "Every route is tested for comfort, scenery, and authenticity by local travel experts." },
            { icon: Users, title: "Verified Partners", text: "We work only with the most reliable and friendly drivers across the island." },
            { icon: ShieldCheck, title: "Seamless Booking", text: "No hidden costs. Instant confirmations. 24/7 support throughout your journey." }
          ].map((feature, idx) => (
            <div key={idx} className="p-10 rounded-[40px] bg-[#fffbeb] border border-amber-100 hover:shadow-2xl transition-all duration-500 group">
              <div className="w-16 h-16 bg-emerald-900 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                <feature.icon size={32} />
              </div>
              <h3 className="text-2xl font-serif text-emerald-950 mb-4">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Elegant Footer */}
      <footer className="bg-[#fffbeb] border-t border-amber-100 py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="bg-emerald-900 text-white p-2 rounded-xl">
                <Compass size={20} />
              </div>
              <span className="text-xl font-extrabold text-emerald-900">Smart Tour <span className="font-light text-slate-400">| Sri Lanka</span></span>
           </div>
           
           <div className="flex gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <button onClick={onOpenAbout} className="hover:text-emerald-900 transition-colors uppercase">About</button>
              <a href="#" className="hover:text-emerald-900 transition-colors uppercase">Destinations</a>
              <a href="#" className="hover:text-emerald-900 transition-colors uppercase">Experiences</a>
              <a href="#" className="hover:text-emerald-900 transition-colors uppercase">Privacy</a>
              <a href="#" className="hover:text-emerald-900 transition-colors uppercase">Support</a>
           </div>

           <div className="text-slate-400 text-sm">
             © 2026 Smart Tour Sri Lanka. All Rights Reserved.
           </div>
        </div>
      </footer>

      {/* Notifications Drawer (Simplified for UI) */}
      <AnimatePresence>
        {notifications.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-10 right-10 z-[1000]"
          >
            <div className="bg-white rounded-3xl shadow-3xl border border-emerald-100 p-6 flex items-center gap-4 max-w-sm">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center animate-bounce">
                <Bell size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">New Notification</p>
                <p className="text-xs text-slate-500">You have {notifications.length} unread updates.</p>
              </div>
              <button 
                onClick={onViewDashboard}
                className="bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                View
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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