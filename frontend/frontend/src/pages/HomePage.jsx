import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import L from 'leaflet'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { getUserNotifications } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'
import Footer from '../components/Footer.jsx'
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

// Assets
import heroImg from '../assets/sri-lanka-hero.png'
import colomboImg from '../assets/colombo.png'
import teaImg from '../assets/tea-plantations.png'
import kandyImg from '../assets/kandy.png'
import galleImg from '../assets/galle.png'
import anuradhapuraImg from '../assets/anuradhapura-ruwanwelisaya.png'

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

  .home-glass-nav {
    background: rgba(6, 78, 59, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .hero-gradient {
    background: linear-gradient(to bottom, rgba(6, 78, 59, 0.3), rgba(6, 78, 59, 0.85));
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

  .map-experience-section {
    background: linear-gradient(160deg, #012319 0%, #064e3b 45%, #022c22 100%);
  }

  .map-experience-grid {
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 100%);
  }

  .map-frame-glow {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 0 60px rgba(16, 185, 129, 0.15),
      0 25px 80px rgba(0, 0, 0, 0.45);
  }

  .map-frame-inner {
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 50%, rgba(217,119,6,0.08) 100%);
  }

  @keyframes map-marker-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55), 0 8px 24px rgba(0,0,0,0.4); }
    50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0), 0 8px 24px rgba(0,0,0,0.4); }
  }

  .map-marker-selected-ring {
    animation: map-marker-pulse 2.4s ease-in-out infinite;
  }

  .map-destination-card {
    background: linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.12);
  }

  .map-heading-accent {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fcd34d 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .map-dest-dock {
    background: rgba(1, 35, 25, 0.82);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .map-dest-track {
    scrollbar-width: none;
    -ms-overflow-style: none;
    overflow-x: hidden;
    scroll-behavior: smooth;
  }
  .map-dest-track::-webkit-scrollbar {
    display: none;
  }

  .map-dest-pill {
    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .map-dest-pill.is-active {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(251, 191, 36, 0.4);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .map-dest-nav-btn {
    transition: background 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
  }

  .map-dest-nav-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
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
const SRI_LANKA_BOUNDS = [[5.7, 79.3], [10.0, 82.1]] // South-West and North-East bounds of Sri Lanka

const TOURIST_DESTINATIONS = [
  { id: 1, name: 'Colombo', lat: 6.9271, lng: 79.8612, description: 'Contemporary city life, colonial streets.', region: 'West Coast', image: colomboImg },
  { id: 2, name: 'Kandy', lat: 7.2906, lng: 80.6337, description: 'Sacred temples, highland culture.', region: 'Central Hills', image: kandyImg },
  { id: 3, name: 'Galle', lat: 6.0535, lng: 80.22, description: 'Fort walls, boutique coastal charm.', region: 'South Coast', image: galleImg },
  { id: 4, name: 'Sigiriya', lat: 7.9574, lng: 80.757, description: 'Legendary rock citadel.', region: 'Cultural Triangle', image: heroImg },
  { id: 5, name: 'Anuradhapura', lat: 8.3114, lng: 80.4037, description: 'Grand stupas, sacred ruins.', region: 'North Central', image: anuradhapuraImg },
  { id: 6, name: 'Nuwara Eliya', lat: 6.9478, lng: 80.7957, description: 'Cool-climate tea valleys.', region: 'Hill Country', image: teaImg },
]

const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    location: 'London, UK',
    rating: 5,
    text: 'Absolutely magical experience! The driver was incredibly knowledgeable about every temple and hidden gem. Best trip of my life!',
    avatar: 'SM',
  },
  {
    name: 'James Tanaka',
    location: 'Tokyo, Japan',
    rating: 5,
    text: 'The seamless booking and real-time tracking made us feel so safe. Sri Lanka is breathtaking and Air B&C made it even better.',
    avatar: 'JT',
  },
  {
    name: 'Emma Rodriguez',
    location: 'Barcelona, Spain',
    rating: 5,
    text: 'From the tea plantations to the beaches, every moment was perfectly planned. Highly recommend to anyone visiting Sri Lanka!',
    avatar: 'ER',
  },
  {
    name: 'David Chen',
    location: 'Sydney, Australia',
    rating: 5,
    text: 'We explored places we never would have found on our own. The local insights from our driver were priceless. 10/10!',
    avatar: 'DC',
  },
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

const createImageIcon = (imageUrl, isSelected = false) => {
  const size = isSelected ? 56 : 48
  const anchor = size / 2

  if (isSelected) {
    return L.divIcon({
      html: `
        <div style="position:relative;width:${size}px;height:${size}px;">
          <div class="map-marker-selected-ring" style="
            position:absolute;inset:-4px;border-radius:50%;
            background:linear-gradient(135deg,#f59e0b,#fbbf24,#d97706);
          "></div>
          <div style="
            position:absolute;inset:3px;border-radius:50%;overflow:hidden;
            border:2px solid rgba(255,255,255,0.9);
            background:url('${imageUrl}') center/cover no-repeat;
          "></div>
          <div style="
            position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);
            width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid #f59e0b;
          "></div>
        </div>`,
      className: '',
      iconSize: [size, size + 10],
      iconAnchor: [anchor, size + 10],
      popupAnchor: [0, -(size + 14)],
    })
  }

  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
      border:3px solid white;
      box-shadow:0 4px 14px rgba(0,0,0,0.35);
      transition:transform 0.2s ease;
      background:url('${imageUrl}') center/cover no-repeat;
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [anchor, size],
    popupAnchor: [0, -size - 4],
  })
}

// ── Animation Variants ──
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.8, 0.25, 1] } },
}

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.8, 0.25, 1] } },
}

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.25, 0.8, 0.25, 1] } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.8, 0.25, 1] } },
}

const mobileMenuVariants = {
  hidden: { opacity: 0, y: -20, height: 0 },
  visible: {
    opacity: 1, y: 0, height: 'auto',
    transition: { duration: 0.35, ease: [0.25, 0.8, 0.25, 1], staggerChildren: 0.08, delayChildren: 0.1 }
  },
  exit: { opacity: 0, y: -20, height: 0, transition: { duration: 0.25 } },
}

const mobileMenuItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20 },
}

function MapDestinationNavigator({ destinations, selectedDestination, onSelect }) {
  const trackRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const { scrollLeft, scrollWidth, clientWidth } = track
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4)
  }, [])

  const scrollTrack = useCallback((direction) => {
    const track = trackRef.current
    if (!track) return
    const step = Math.max(140, Math.floor(track.clientWidth * 0.65))
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    updateScrollState()
    const track = trackRef.current
    if (!track) return undefined

    const handleScroll = () => updateScrollState()
    track.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      track.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [destinations, updateScrollState])

  useEffect(() => {
    if (!selectedDestination || !trackRef.current) return
    const activePill = trackRef.current.querySelector(`[data-dest-id="${selectedDestination.id}"]`)
    activePill?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    const timer = setTimeout(updateScrollState, 350)
    return () => clearTimeout(timer)
  }, [selectedDestination?.id, destinations, updateScrollState])

  const activeIndex = Math.max(
    0,
    destinations.findIndex((d) => d.id === selectedDestination?.id)
  )

  return (
    <div className="map-dest-dock rounded-xl border border-white/10 pointer-events-auto">
      <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2">
        <button
          type="button"
          aria-label="Scroll destinations left"
          disabled={!canScrollLeft}
          onClick={() => scrollTrack(-1)}
          className="map-dest-nav-btn shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10 bg-white/[0.05] text-white/75 hover:bg-white/10 flex items-center justify-center"
        >
          <i className="bi bi-chevron-left text-xs" />
        </button>

        <div
          ref={trackRef}
          className="map-dest-track flex-1 flex items-center gap-1.5 min-w-0"
        >
          {destinations.map((d) => {
            const isActive = selectedDestination?.id === d.id
            return (
              <button
                key={d.id}
                type="button"
                data-dest-id={d.id}
                onClick={() => onSelect(d)}
                className={`map-dest-pill shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border ${
                  isActive
                    ? 'is-active'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
                }`}
              >
                <img
                  src={d.image}
                  alt={d.name}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shrink-0 ${
                    isActive ? 'ring-1 ring-amber-400/60' : 'opacity-80'
                  }`}
                />
                <span className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-emerald-50/65'
                }`}>
                  {d.name}
                </span>
              </button>
            )
          })}
        </div>

        <span className="shrink-0 text-[9px] sm:text-[10px] text-emerald-100/35 font-medium tabular-nums px-1">
          {activeIndex + 1}/{destinations.length}
        </span>

        <button
          type="button"
          aria-label="Scroll destinations right"
          disabled={!canScrollRight}
          onClick={() => scrollTrack(1)}
          className="map-dest-nav-btn shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10 bg-white/[0.05] text-white/75 hover:bg-white/10 flex items-center justify-center"
        >
          <i className="bi bi-chevron-right text-xs" />
        </button>
      </div>
    </div>
  )
}

// ── Scroll Section Wrapper ──
function RevealSection({ children, className = '', variant = fadeUp, ...rest }) {
  const [ref, inView] = useInView({ threshold: 0.15, triggerOnce: true })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variant}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// ── Typewriter Effect ──
function TypewriterText({ text, className = '', delay = 0.8 }) {
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    let idx = 0
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (idx < text.length) {
          setDisplayText(text.slice(0, idx + 1))
          idx++
        } else {
          clearInterval(interval)
          setTimeout(() => setShowCursor(false), 2000)
        }
      }, 60)
      return () => clearInterval(interval)
    }, delay * 1000)
    return () => clearTimeout(timeout)
  }, [text, delay])

  return (
    <span className={className}>
      {displayText}
      {showCursor && <span className="typewriter-cursor" />}
    </span>
  )
}

// ── Floating Particles ──
function HeroParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 4,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 5,
      opacity: 0.2 + Math.random() * 0.4,
    })), []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[5]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  )
}

export default function HomePage({ onStartTour, onGoToPlanTrip, onViewDashboard, userName, onLogout, token, onOpenAbout, onPlanTripWithDest }) {
  const [selectedDestination, setSelectedDestination] = useState(TOURIST_DESTINATIONS[3])
  const [searchTerm, setSearchTerm] = useState('')
  const [notifications, setNotifications] = useState([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNavLink, setActiveNavLink] = useState(null)

  const mapRef = useRef(null)
  const heroRef = useRef(null)

  // Parallax scroll
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroImgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const heroContentY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

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
    <div className="relative min-h-screen bg-[#fffbeb] text-slate-900 selection:bg-emerald-200 overflow-x-hidden">
      {/* ════════════════════════════════
          NAVIGATION BAR — Elegant Redesign
          ════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-out ${isScrolled ? 'home-glass-nav py-2.5' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="relative">
              <div className={`w-11 h-11 sm:w-14 sm:h-14 overflow-hidden rounded-xl shadow-lg border-2 transition-all duration-300 logo-glow ${isScrolled ? 'border-emerald-200' : 'border-white/30'}`}>
                <img src={appLogo} alt="Logo" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              {/* Active indicator dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
            </div>
            <div>
              <span className={`block text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${isScrolled ? 'text-amber-400' : 'text-amber-300/90'}`}>
                <i className="bi bi-airplane-fill mr-1" />Air B&C
              </span>
              <span className={`block text-lg sm:text-xl font-extrabold transition-colors duration-300 text-white`}>
                Sri Lanka
              </span>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:flex items-center gap-2 lg:gap-5"
          >
            <button
              onClick={() => { onOpenAbout(); setActiveNavLink('about'); }}
              onMouseEnter={() => setActiveNavLink('about')}
              onMouseLeave={() => setActiveNavLink(null)}
              className={`nav-link-animated px-3 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${isScrolled
                ? 'text-white hover:text-white hover:bg-white/10'
                : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <i className="bi bi-info-circle text-base" />
              About
            </button>

            <button
              onClick={() => { onViewDashboard(); setActiveNavLink('bookings'); }}
              onMouseEnter={() => setActiveNavLink('bookings')}
              onMouseLeave={() => setActiveNavLink(null)}
              className={`nav-link-animated px-3 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${isScrolled
                ? 'text-white hover:text-white hover:bg-white/10'
                : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}
            >
              <i className="bi bi-briefcase-fill text-base" />
              My Bookings
            </button>

            {/* Notification badge */}
            {notifications.length > 0 && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={onViewDashboard}
                className={`relative p-2.5 rounded-xl transition-all duration-300 ${isScrolled
                  ? 'text-white/90 hover:text-amber-400 hover:bg-white/10'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <i className="bi bi-bell-fill text-lg" />
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg"
                >
                  {notifications.length}
                </motion.span>
              </motion.button>
            )}

            <div className={`h-7 w-[1px] mx-1 transition-colors duration-300 ${isScrolled ? 'bg-white/20' : 'bg-white/15'}`} />

            {/* User greeting */}
            {userName && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${isScrolled ? 'bg-white/10' : 'bg-white/10'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isScrolled ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                  <i className="bi bi-person-fill" />
                </div>
                <span className={`text-sm font-semibold hidden lg:block ${isScrolled ? 'text-white' : 'text-white/90'}`}>
                  {userName.split(' ')[0]}
                </span>
              </div>
            )}

            {/* Plan a Trip CTA */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={planRouteAction}
              className="btn-shimmer ripple-effect text-emerald-950 px-5 lg:px-7 py-2.5 rounded-full font-bold shadow-xl text-sm flex items-center gap-2"
            >
              <i className="bi bi-compass text-base" />
              Plan a Trip
            </motion.button>

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className={`p-2.5 rounded-xl transition-all duration-300 ${isScrolled
                ? 'text-white/70 hover:text-rose-400 hover:bg-white/10'
                : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
              title="Sign Out"
            >
              <i className="bi bi-box-arrow-right text-lg" />
            </motion.button>
          </motion.div>

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            className={`md:hidden p-2.5 rounded-xl transition-all duration-300 ${isScrolled ? 'text-white hover:bg-white/10' : 'text-white hover:bg-white/10'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <AnimatePresence mode="wait">
              <motion.i
                key={mobileMenuOpen ? 'close' : 'menu'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'} text-2xl`}
              />
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile Dropdown Menu — Staggered Animations */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="md:hidden bg-white/95 backdrop-blur-2xl border-t border-emerald-100 shadow-2xl overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1.5">
                {[
                  { label: 'About', icon: 'bi-info-circle', action: () => { onOpenAbout(); setMobileMenuOpen(false); } },
                  { label: 'My Bookings', icon: 'bi-briefcase-fill', action: () => { onViewDashboard(); setMobileMenuOpen(false); } },
                ].map((item) => (
                  <motion.button
                    key={item.label}
                    variants={mobileMenuItemVariants}
                    onClick={item.action}
                    className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-slate-700 font-semibold hover:bg-emerald-50 hover:text-emerald-800 transition-all duration-300 text-left"
                  >
                    <i className={`bi ${item.icon} text-lg text-emerald-600`} />
                    {item.label}
                  </motion.button>
                ))}

                <motion.button
                  variants={mobileMenuItemVariants}
                  onClick={() => { planRouteAction(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-5 py-3.5 rounded-2xl btn-shimmer text-emerald-950 font-bold transition-all duration-300 mt-1"
                >
                  <i className="bi bi-compass text-lg" />
                  Plan a Trip
                </motion.button>

                <motion.div variants={mobileMenuItemVariants} className="h-[1px] bg-slate-100 my-1" />

                <motion.button
                  variants={mobileMenuItemVariants}
                  onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-rose-500 font-semibold hover:bg-rose-50 transition-all duration-300"
                >
                  <i className="bi bi-box-arrow-right text-lg" />
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ════════════════════════════════
          HERO SECTION — Enhanced with Parallax + Particles + Typewriter
          ════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col justify-between overflow-hidden">
        {/* Parallax background */}
        <motion.div
          style={{ y: heroImgY }}
          className="absolute inset-0 z-0"
        >
          <motion.div
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 12, ease: 'easeOut' }}
          >
            <img
              src={heroImg}
              className="w-full h-[120%] object-cover"
              alt="Sigiriya Fortress Sri Lanka"
            />
          </motion.div>
          <div className="absolute inset-0 hero-gradient" />
        </motion.div>

        {/* Floating Particles */}
        <HeroParticles />

        {/* Hero Content — Parallax + Fade */}
        <motion.div
          style={{ y: heroContentY, opacity: heroOpacity }}
          className="relative z-10 max-w-7xl mx-auto px-6 w-full flex-1 flex items-center pt-28 pb-20 lg:pt-20 lg:pb-12"
        >
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.9, ease: [0.25, 0.8, 0.25, 1] }}
            >
              <span className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md text-amber-200 px-5 py-2 rounded-full text-sm font-bold tracking-wider mb-8 border border-amber-500/30 relative z-30">
                <i className="bi bi-globe-asia-australia" />
                DISCOVER THE WONDER OF ASIA
              </span>

              <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif text-white leading-tight mb-8">
                Your Authentic <br />
                <TypewriterText
                  text="Island Story"
                  className="text-amber-400"
                  delay={1.2}
                />{' '}
                <br />
                Starts Here
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 0.8 }}
                className="text-xl text-emerald-50/80 mb-10 max-w-xl leading-relaxed"
              >
                Experience the magic of Sri Lanka with curated journeys, local experts, and seamless planning for the modern traveler.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3, duration: 0.6 }}
                className="flex flex-wrap gap-4 items-center"
              >
                {/* CTA with Pulse Ring */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={planRouteAction}
                    className="relative btn-shimmer ripple-effect text-emerald-950 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl flex items-center gap-2 group z-10 pulse-ring"
                  >
                    <i className="bi bi-rocket-takeoff text-xl" />
                    Start Your Journey
                    <i className="bi bi-chevron-right group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>

                <div className="flex items-center gap-3 px-4">
                  <div className="flex -space-x-3">
                    {['person', 'person-fill', 'person', 'person-fill'].map((icon, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 3.2 + i * 0.1, type: 'spring', stiffness: 300 }}
                        className="w-10 h-10 rounded-full border-2 border-emerald-900 bg-emerald-800 flex items-center justify-center text-white"
                      >
                        <i className={`bi bi-${icon}`} />
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-white/80 text-sm">
                    <span className="block font-bold">10k+ Travelers</span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <i className="bi bi-star-fill text-xs" /> 4.9/5 Rating
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Floating Stats — with float animation */}
        <div className="relative mt-6 sm:mt-10 pb-8 sm:pb-12 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { icon: 'bi-geo-alt-fill', label: 'Destinations', value: '250+' },
              { icon: 'bi-people-fill', label: 'Local Hosts', value: '1.2k+' },
              { icon: 'bi-shield-check', label: 'Verified Trips', value: '5.5k+' },
              { icon: 'bi-star-fill', label: 'Experiences', value: '15k+' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + idx * 0.15, duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
                className={`glass-card p-3 sm:p-6 rounded-2xl sm:rounded-3xl flex items-center gap-2 sm:gap-4 ${
                  idx % 2 === 0 ? 'animate-float' : `animate-float-delay-${idx}`
                }`}
              >
                <div className="bg-emerald-900/10 text-emerald-900 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0">
                  <i className={`bi ${stat.icon} text-lg sm:text-2xl`} />
                </div>
                <div>
                  <span className="block text-lg sm:text-2xl font-extrabold text-emerald-900 leading-none">{stat.value}</span>
                  <span className="text-slate-500 text-xs sm:text-sm font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          HANDPICKED DESTINATIONS — Scroll Reveal
          ════════════════════════════════ */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <RevealSection>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 gap-6">
            <div className="max-w-2xl">
              <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                <i className="bi bi-globe2" />
                Explore Sri Lanka
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 mb-4 sm:mb-6 leading-tight">
                Handpicked Destinations <br />For Your Bucket List
              </h2>
            </div>
            <div className="relative group w-full md:w-auto">
              <input
                type="text"
                placeholder="Search destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-emerald-100 px-6 py-4 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 outline-none transition-all pl-12"
              />
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            </div>
          </div>
        </RevealSection>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          <AnimatePresence>
            {filteredDestinations.map((dest) => (
              <motion.div
                key={dest.id}
                layout
                variants={scaleIn}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -10 }}
                className="group cursor-pointer"
                onClick={() => handleDestinationClick(dest)}
              >
                <div className="relative h-[300px] sm:h-[380px] md:h-[450px] rounded-[32px] overflow-hidden shadow-xl mb-6">
                  <img src={dest.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={dest.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent" />

                  <div className="absolute top-6 left-6">
                    <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 uppercase tracking-widest inline-flex items-center gap-1.5">
                      <i className="bi bi-pin-map-fill" />
                      {dest.region}
                    </span>
                  </div>

                  {/* Hover overlay with icon */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-emerald-900/30 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0.5 }}
                      whileHover={{ scale: 1 }}
                      className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center"
                    >
                      <i className="bi bi-arrow-right text-white text-2xl" />
                    </motion.div>
                  </motion.div>

                  <div className="absolute bottom-8 left-8 right-8">
                    <h3 className="text-3xl font-serif text-white mb-2">{dest.name}</h3>
                    <p className="text-emerald-50/70 text-sm line-clamp-2 mb-6 leading-relaxed">
                      {dest.description}
                    </p>
                    <button className="flex items-center gap-2 text-amber-400 font-bold group/btn">
                      <i className="bi bi-signpost-2-fill" />
                      Explore Routes
                      <i className="bi bi-chevron-right group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ════════════════════════════════
          MAP & EXPERIENCE SECTION — Slide-In Animations
          ════════════════════════════════ */}
      <section className="map-experience-section py-20 sm:py-28 relative overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0 map-experience-grid pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[180px] opacity-15 -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-amber-500 rounded-full blur-[160px] opacity-12 translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-teal-600 rounded-full blur-[200px] opacity-8 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-3 gap-10 sm:gap-16 items-center">
            {/* Map — Slide in from Left */}
            <RevealSection variant={fadeInLeft} className="order-1 lg:order-1 lg:col-span-2">
              <div className="relative group">
                {/* Ambient glow behind map */}
                <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 via-transparent to-amber-500/15 rounded-[48px] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

                <div className="map-frame-glow relative bg-emerald-900/40 p-2 sm:p-3 rounded-[28px] sm:rounded-[44px] border border-white/10 backdrop-blur-sm">
                  <div className="map-frame-inner absolute inset-0 rounded-[28px] sm:rounded-[44px] pointer-events-none" />

                  {/* Live badge */}
                  <div className="absolute top-5 left-5 sm:top-7 sm:left-7 z-[500] flex items-center gap-2 bg-emerald-950/80 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full border border-white/15 uppercase tracking-widest shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    Live Map
                  </div>

                  {/* Destination count */}
                  <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-[500] bg-white/10 backdrop-blur-md text-emerald-50 text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10">
                    {filteredDestinations.length} destinations
                  </div>

                  <div className="h-[340px] sm:h-[480px] lg:h-[620px] w-full rounded-[20px] sm:rounded-[36px] overflow-hidden border border-white/10 shadow-inner relative">
                    <MapContainer
                      center={SRI_LANKA_CENTER}
                      zoom={DEFAULT_ZOOM}
                      maxBounds={SRI_LANKA_BOUNDS}
                      className="h-full w-full"
                      ref={mapRef}
                      zoomControl={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      {filteredDestinations.map((d) => (
                        <Marker
                          key={d.id}
                          position={[d.lat, d.lng]}
                          icon={createImageIcon(d.image, selectedDestination?.id === d.id)}
                          eventHandlers={{ click: () => setSelectedDestination(d) }}
                        >
                          <Popup className="premium-popup">
                            <div style={{ padding: 0, borderRadius: '12px', overflow: 'hidden', minWidth: '200px' }}>
                              <img src={d.image} alt={d.name} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />
                              <div style={{ padding: '10px 12px 12px' }}>
                                <h4 style={{ fontWeight: 700, fontSize: '14px', color: '#064e3b', margin: '0 0 2px 0' }}>{d.name}</h4>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{d.description}</p>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>

                    {/* Bottom gradient fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-emerald-950/50 to-transparent pointer-events-none z-[400]" />

                    {/* Floating destination navigator */}
                    <div className="absolute bottom-0 left-0 right-0 z-[450] px-2 pb-2 sm:px-3 sm:pb-3 pointer-events-none">
                      <MapDestinationNavigator
                        destinations={filteredDestinations}
                        selectedDestination={selectedDestination}
                        onSelect={handleDestinationClick}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Info Panel — Slide in from Right */}
            <RevealSection variant={fadeInRight} className="order-2 lg:order-2 lg:col-span-1">
              <span className="inline-flex items-center gap-2 text-amber-400 font-bold uppercase tracking-[0.2em] text-[11px] sm:text-xs mb-5 sm:mb-7 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                <i className="bi bi-compass-fill" />
                Interactive Experience
              </span>

              <h2 className="text-3xl sm:text-4xl md:text-[3.25rem] font-serif text-white mb-5 sm:mb-7 leading-[1.1] tracking-tight">
                Plan Your Path <br />
                <span className="map-heading-accent">In Real-Time</span>
              </h2>

              <p className="text-base sm:text-lg text-emerald-100/65 mb-8 sm:mb-10 leading-relaxed max-w-md">
                Our smart engine helps you visualize your entire Sri Lankan journey. Pick destinations, see live routes, and connect with drivers instantly.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-8 sm:mb-10">
                {[
                  { icon: 'bi-lightning-charge-fill', label: 'Instant Routes', color: 'amber' },
                  { icon: 'bi-geo-alt-fill', label: 'Live Tracking', color: 'emerald' },
                  { icon: 'bi-car-front-fill', label: 'Driver Match', color: 'teal' },
                ].map((feat) => (
                  <span
                    key={feat.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/8 text-emerald-100/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider"
                  >
                    <i className={`bi ${feat.icon} text-amber-400/90`} />
                    {feat.label}
                  </span>
                ))}
              </div>

              <div className="mb-8 sm:mb-10">
                <AnimatePresence mode="wait">
                  {selectedDestination ? (
                    <motion.div
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
                      key={selectedDestination.id}
                      className="map-destination-card backdrop-blur-xl border border-white/12 rounded-[28px] overflow-hidden"
                    >
                      {/* Card image header */}
                      <div className="relative h-32 sm:h-36 overflow-hidden">
                        <img
                          src={selectedDestination.image}
                          alt={selectedDestination.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
                        <div className="absolute top-3 right-3 bg-emerald-900/90 backdrop-blur-sm text-white p-2 rounded-xl border border-white/10 shadow-lg">
                          <i className="bi bi-geo-alt-fill text-lg" />
                        </div>
                      </div>

                      <div className="p-5 sm:p-7 -mt-6 relative">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-xl sm:text-2xl font-serif text-white mb-1.5">{selectedDestination.name}</h4>
                            <span className="text-amber-400 text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] flex items-center gap-1.5">
                              <i className="bi bi-star-fill text-[10px]" />
                              {selectedDestination.region}
                            </span>
                          </div>
                        </div>
                        <p className="text-emerald-50/65 mb-6 text-sm sm:text-base leading-relaxed">{selectedDestination.description}</p>
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 12px 32px rgba(251, 191, 36, 0.25)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (onPlanTripWithDest) {
                              onPlanTripWithDest(selectedDestination)
                            } else if (onGoToPlanTrip) {
                              onGoToPlanTrip()
                            } else if (onStartTour) {
                              onStartTour()
                            }
                          }}
                          className="w-full bg-white text-emerald-950 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-amber-400 hover:text-emerald-950 transition-all duration-300 shadow-lg flex items-center justify-center gap-2.5 group/btn"
                        >
                          <span className="w-8 h-8 rounded-full bg-emerald-950 text-white flex items-center justify-center group-hover/btn:bg-emerald-900 transition-colors">
                            <i className="bi bi-sign-turn-right-fill text-sm" />
                          </span>
                          Plan Trip to {selectedDestination.name}
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="map-destination-card border border-dashed border-white/15 p-8 sm:p-10 rounded-[28px] text-center"
                    >
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
                        <i className="bi bi-hand-index-thumb text-2xl text-amber-400/70" />
                      </div>
                      <p className="text-emerald-50/55 text-sm sm:text-base leading-relaxed">
                        Select a destination on the map to start planning
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                {[
                  { label: 'Live Updates', dot: 'bg-amber-500', ping: 'bg-amber-400' },
                  { label: 'Verified Drivers', dot: 'bg-emerald-500', ping: 'bg-emerald-400' },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="flex items-center gap-2.5 text-emerald-100/50 font-bold text-[10px] sm:text-xs tracking-[0.15em] uppercase px-3 py-2 rounded-full bg-white/4 border border-white/6"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${item.ping} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${item.dot}`} />
                    </span>
                    {item.label}
                  </span>
                ))}
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          WHY TRAVEL WITH US — Staggered Reveal
          ════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-white">
        <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 text-center mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 mb-4">Why Travel With Air B&C?</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">We combine technology with local heart to give you the most authentic Sri Lankan experience possible.</p>
        </RevealSection>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-12"
        >
          {[
            { icon: 'bi-compass', title: 'Expertly Curated', text: 'Every route is tested for comfort, scenery, and authenticity by local travel experts.' },
            { icon: 'bi-people-fill', title: 'Verified Partners', text: 'We work only with the most reliable and friendly drivers across the island.' },
            { icon: 'bi-shield-check', title: 'Seamless Booking', text: 'No hidden costs. Instant confirmations. 24/7 support throughout your journey.' },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              variants={scaleIn}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="p-10 rounded-[40px] bg-[#fffbeb] border border-amber-100 hover:shadow-2xl transition-all duration-500 group cursor-pointer"
            >
              <div className="w-16 h-16 bg-emerald-900 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-400">
                <i className={`bi ${feature.icon} text-3xl`} />
              </div>
              <h3 className="text-2xl font-serif text-emerald-950 mb-4">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ════════════════════════════════
          TESTIMONIALS — Social Proof Carousel
          ════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-[#fffbeb] overflow-hidden">
        <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 sm:mb-16">
          <div className="text-center">
            <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 flex items-center justify-center gap-2">
              <i className="bi bi-chat-heart-fill" />
              Traveler Stories
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 mb-4">
              What Our Travelers Say
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
              Real experiences from real adventurers who explored Sri Lanka with us.
            </p>
          </div>
        </RevealSection>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="max-w-7xl mx-auto px-4 sm:px-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((testimonial, idx) => (
              <motion.div
                key={idx}
                variants={scaleIn}
                className="testimonial-card bg-white p-8 rounded-[32px] border border-emerald-50 shadow-sm relative"
              >
                {/* Quote icon */}
                <div className="absolute top-6 right-6 text-emerald-100">
                  <i className="bi bi-quote text-4xl" />
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: testimonial.rating }, (_, i) => (
                    <i key={i} className="bi bi-star-fill text-amber-400 text-sm" />
                  ))}
                </div>

                {/* Quote text */}
                <p className="text-slate-600 text-sm leading-relaxed mb-8 italic">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-emerald-950">{testimonial.name}</span>
                    <span className="block text-xs text-slate-400 flex items-center gap-1">
                      <i className="bi bi-geo-alt" />
                      {testimonial.location}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════
          CTA BANNER — Gradient Animated
          ════════════════════════════════ */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-amber-700 gradient-animate" />

        {/* Decorative floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 border border-white/10 rounded-full animate-float" />
          <div className="absolute bottom-10 right-20 w-48 h-48 border border-white/5 rounded-full animate-float-delay-1" />
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-2xl rotate-45 animate-float-delay-2" />
          <div className="absolute top-20 right-1/3 w-16 h-16 bg-amber-400/10 rounded-full animate-float-delay-3" />
        </div>

        <RevealSection className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white/90 px-5 py-2 rounded-full text-sm font-bold tracking-wider mb-8 border border-white/20">
              <i className="bi bi-lightning-charge-fill text-amber-400" />
              LIMITED TIME OFFER
            </span>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-serif text-white mb-6 leading-tight">
              Ready to Write Your <br />
              <span className="text-amber-400">Sri Lankan Story?</span>
            </h2>

            <p className="text-emerald-100/70 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Book your personalized tour today and get 15% off on multi-destination packages. 
              Your adventure awaits.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={planRouteAction}
                className="btn-shimmer ripple-effect text-emerald-950 px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center gap-3"
              >
                <i className="bi bi-compass text-xl" />
                Start Planning Now
                <i className="bi bi-arrow-right" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenAbout}
                className="ripple-effect bg-white/10 backdrop-blur-md text-white px-8 py-5 rounded-2xl font-bold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
              >
                <i className="bi bi-play-circle" />
                Learn More
              </motion.button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-white/50 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <i className="bi bi-shield-lock-fill text-base text-emerald-300/60" />
                Secure Payments
              </span>
              <span className="flex items-center gap-2">
                <i className="bi bi-arrow-counterclockwise text-base text-emerald-300/60" />
                Free Cancellation
              </span>
              <span className="flex items-center gap-2">
                <i className="bi bi-headset text-base text-emerald-300/60" />
                24/7 Support
              </span>
            </div>
          </motion.div>
        </RevealSection>
      </section>

      <Footer />

      {/* Notifications Drawer */}
      <AnimatePresence>
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-10 right-10 z-[1000]"
          >
            <div className="bg-white rounded-3xl shadow-3xl border border-emerald-100 p-6 flex items-center gap-4 max-w-sm">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center"
              >
                <i className="bi bi-bell-fill text-xl" />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-emerald-900">New Notification</p>
                <p className="text-xs text-slate-500">You have {notifications.length} unread updates.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onViewDashboard}
                className="bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <i className="bi bi-eye" />
                View
              </motion.button>
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