import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { 
  Compass, 
  MapPin, 
  Users, 
  ShieldCheck, 
  ChevronRight, 
  Star, 
  ArrowRight,
  Play,
  CheckCircle2,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  Youtube,
  Volume2,
  VolumeX,
  Menu,
  X
} from 'lucide-react'
import appLogo from '../../images/logo.jpeg'
import Footer from '../components/Footer.jsx'
import SEO from '../components/SEO.jsx'
import RouteDetailsModal from '../components/RouteDetailsModal.jsx'
import { ImageReveal, ParallaxLayer, Reveal } from '../components/motion/Reveal.jsx'
import { staggerDelay } from '../utils/animation.js'

// Assets
import heroImg from '../assets/sri-lanka-hero.png'
import galleImg from '../assets/galle.png'
import kandyImg from '../assets/kandy.png'
import colomboImg from '../assets/colombo.png'
import cultureImg from '../assets/culture.png'
import teaImg from '../assets/tea-plantations.png'
import kandyImg2 from '../../images/kandy.png'
import galleImg2 from '../../images/galle.png'
import mirissaImg from '../../images/mirissa.png'
import sigiriyaImg2 from '../../images/sigiriya.png'

const SRI_LANKA_VIDEO = '/hh.mp4'
const SRI_LANKA_POSTER = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1920&auto=format&fit=crop'

const TOUR_DESTINATIONS = [
  {
    name: 'Kandy Heritage',
    region: 'Hill Country',
    detail: 'Temple visits, cultural dance, and misty mountain viewpoints.',
    tagline: 'Best as a 2–3 day hill-country add-on',
    image: kandyImg,
    gallery: [kandyImg, kandyImg2, cultureImg, teaImg],
    description: [
      'Kandy is Sri Lanka\'s cultural heart — home to the Sri Dalada Maligawa (Temple of the Sacred Tooth Relic), a UNESCO World Heritage site, and a launchpad into the misty tea country beyond it.',
      'Your route pairs the temple and the lakeside old town with an evening cultural dance performance, then climbs into the surrounding hills toward Nuwara Eliya\'s tea estates — cooler air, greener views, and a completely different pace than the coast.',
    ],
    highlights: [
      'Sri Dalada Maligawa (Temple of the Sacred Tooth Relic)',
      'Traditional Kandyan dance performance',
      'Kandy Lake walk at golden hour',
      'Hill-country tea estate visit en route to Nuwara Eliya',
    ],
    video: { id: '6mQL8KGexe4', title: 'Sri Dalada Maligawa — The Sacred Temple of the Tooth Relic, Kandy' },
  },
  {
    name: 'Galle Coastal',
    region: 'South Coast',
    detail: 'Historic fort walls, golden beaches, and boutique charm.',
    tagline: 'Best as a relaxed 1–2 day coastal stop',
    image: galleImg,
    gallery: [galleImg, galleImg2, mirissaImg],
    description: [
      'Galle Fort is a UNESCO World Heritage site — a 16th-century Dutch-colonial fortress town of ramparts, a working lighthouse, and narrow streets lined with boutique cafes and galleries, all wrapped by the Indian Ocean.',
      'The route continues along Sri Lanka\'s south coast to Mirissa\'s palm-lined beaches, a favourite for sunset swims and, in season, whale watching — an easy, laid-back complement to the fort\'s history.',
    ],
    highlights: [
      'Galle Fort ramparts walk & lighthouse',
      'Dutch-colonial old town streets and boutique shops',
      'Sunset at Mirissa Beach',
      'Seasonal whale watching nearby (Nov–Apr)',
    ],
    video: { id: '6p65SRDrWZw', title: 'Galle Fort, Sri Lanka — Essential Travel Guide' },
  },
  {
    name: 'Sigiriya Rock',
    region: 'Cultural Triangle',
    detail: 'Ancient citadel hike with village-style authentic experiences.',
    tagline: 'Best as an early-morning half-day climb',
    image: heroImg,
    gallery: [heroImg, sigiriyaImg2],
    description: [
      'Sigiriya — the "Lion Rock" — is a 5th-century rock fortress rising nearly 200 metres above the jungle, with frescoes, mirror-wall inscriptions, and royal water gardens still intact at its base.',
      'The climb is best started early to beat both the heat and the crowds; the route pairs it with a nearby village-style experience — bullock cart rides, a traditional lunch, and a slower look at rural Cultural Triangle life.',
    ],
    highlights: [
      'Sigiriya rock fortress climb & summit views',
      'Ancient frescoes and the mirror wall',
      'Royal water gardens at the base',
      'Nearby village experience: bullock cart & traditional lunch',
    ],
    video: { id: 'hX5mgHnRtFc', title: 'Sigiriya Rock, Sri Lanka — Ultimate Guide to the Lion Rock Fortress' },
  },
]

const TOUR_PACKAGES = [
  { 
    title: 'Explorer Plus', 
    price: '$120', 
    duration: '2 Days',
    perks: ['Private vehicle', 'Local guide', 'City highlights', 'Hotel transfers'],
    popular: false
  },
  { 
    title: 'Island Classic', 
    price: '$320', 
    duration: '5 Days',
    perks: ['Heritage & Beach mix', 'Flexible stops', 'Premium vehicle', '24/7 Support'],
    popular: true
  },
  { 
    title: 'Smart Custom', 
    price: 'Custom', 
    duration: 'Flexible',
    perks: ['Route optimization', 'Interest based stops', 'Choice of vehicle', 'Local host'],
    popular: false
  },
]

const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap');

  :root {
    --sri-green: #064e3b;
    --sri-gold: #d97706;
    --sri-sand: #fffbeb;
  }

  .font-serif {
    font-family: 'Playfair Display', serif;
  }

  .glass-nav {
    background: rgba(6, 78, 59, 0.7);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  .dark-glass {
    background: rgba(6, 78, 59, 0.4);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`

if (typeof document !== 'undefined' && !document.getElementById('landing-premium-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'landing-premium-styles'
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

export default function LandingPage({
  onOpenAbout,
  onOpenUserLogin,
  onOpenUserRegister,
  onOpenDriverLogin,
  onOpenDriverRegister,
}) {
  const videoRef = useRef(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9])
  // Cinematic "camera pulls back" — the video very slightly zooms out over
  // the first quarter of the scroll, independent of the content fade above.
  const videoScale = useTransform(scrollYProgress, [0, 0.3], [1.08, 1])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const section = document.getElementById(id)
    if (section) section.scrollIntoView({ behavior: 'smooth' })
  }

  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio('/gajaga-wannama-edm-remix_dv9oPeCI.mp3')
    audio.loop = false
    audioRef.current = audio

    const playAudio = () => {
      audio.play().catch(err => console.log("Autoplay blocked, waiting for interaction", err))
    }

    // Try to play on mount
    playAudio()

    // Also play on first user interaction if blocked
    const handleFirstInteraction = () => {
      playAudio()
      window.removeEventListener('click', handleFirstInteraction)
    }
    window.addEventListener('click', handleFirstInteraction)

    return () => {
      audio.pause()
      window.removeEventListener('click', handleFirstInteraction)
    }
  }, [])

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#fffbeb] text-slate-900 overflow-x-hidden">
      <SEO
        title="Welcome to Air B & C Tours"
        canonicalUrl="/"
        description="Discover Sri Lanka with Air B & C Tours. Plan personalized trips, book trusted local drivers, explore destinations, and enjoy unforgettable travel experiences."
      />
      {/* Scroll progress — thin cinematic indicator of how far into the story you are */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 left-0 right-0 h-[3px] origin-left bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 z-[3001]"
      />
      {/* Audio Toggle */}
      <div className="fixed bottom-8 left-8 z-[3000]">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          className="w-12 h-12 bg-emerald-900/10 backdrop-blur-xl border border-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-900 shadow-2xl group hover:bg-emerald-900/20 transition-all"
        >
          {isMuted ? <VolumeX size={20} className="text-rose-600" /> : <Volume2 size={20} className="text-emerald-600 animate-pulse" />}
        </motion.button>
      </div>
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'glass-nav py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 overflow-hidden rounded-xl shadow-lg border border-white/20">
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold text-white">Air B&C <span className="font-light text-white/60 text-sm">| LK</span></span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {['destinations', 'tours', 'about'].map((item) => (
              <button 
                key={item}
                onClick={() => item === 'about' ? onOpenAbout() : scrollToSection(item)}
                className="text-white/80 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
              >
                {item}
              </button>
            ))}
            <button 
              onClick={onOpenUserLogin}
              className="bg-amber-500 text-emerald-950 px-6 py-2.5 rounded-full font-bold shadow-xl hover:bg-amber-400 transition-all hover:scale-105"
            >
              Start Planning
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 rounded-xl text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-emerald-950/95 backdrop-blur-xl border-t border-white/10 shadow-2xl"
            >
              <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
                {['destinations', 'tours', 'about'].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      if (item === 'about') onOpenAbout()
                      else scrollToSection(item)
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white/80 font-semibold hover:bg-white/10 hover:text-white transition-colors text-left capitalize"
                  >
                    {item}
                  </button>
                ))}
                <button 
                  onClick={() => { onOpenUserLogin(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500 text-emerald-950 font-bold hover:bg-amber-400 transition-colors mt-1"
                >
                  Start Planning
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.video
            ref={videoRef}
            style={{ filter: 'brightness(0.6)', scale: prefersReducedMotion ? 1 : videoScale }}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={SRI_LANKA_POSTER}
          >
            <source src={SRI_LANKA_VIDEO} type="video/mp4" />
          </motion.video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-emerald-950/90"></div>
        </div>

        <motion.div
          style={{ opacity, scale }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <motion.span
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block bg-amber-500/20 backdrop-blur-md text-amber-200 px-6 py-2 rounded-full text-xs font-bold tracking-[0.3em] mb-8 border border-amber-500/30"
          >
            DISCOVER THE WONDER OF ASIA
          </motion.span>
          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-6xl md:text-8xl font-serif text-white leading-[1.1] mb-8"
          >
            Your Journey, <br />
            <span className="text-amber-400">Our Expertise.</span>
          </motion.h1>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg sm:text-xl text-emerald-50/70 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Experience Sri Lanka like never before with smart route planning, verified local drivers, and authentic island stories.
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenUserLogin}
              className="bg-amber-500 text-emerald-950 px-10 py-4 sm:py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 hover:bg-amber-400 transition-colors group w-full sm:w-auto"
            >
              Start Exploring
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => scrollToSection('about')}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-10 py-4 sm:py-5 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors w-full sm:w-auto"
            >
              How it Works
            </motion.button>
          </motion.div>
        </motion.div>

        <motion.div
          animate={prefersReducedMotion ? undefined : { y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
             <div className="w-1 h-2 bg-amber-400 rounded-full"></div>
          </div>
        </motion.div>
      </section>

      {/* Destinations Section */}
      <section id="destinations" className="py-16 sm:py-32 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 sm:mb-20 gap-6 sm:gap-8">
          <Reveal direction="left" className="max-w-2xl text-left">
            <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Handpicked for You</span>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif text-emerald-950 leading-tight">
              Iconic Destinations <br /> to Ignite Your Soul
            </h2>
          </Reveal>
          <Reveal direction="right" delay={0.15} className="text-slate-500 max-w-md text-left md:text-right mb-2 text-sm sm:text-base">
            <p>From misty mountain peaks to golden coastal shores, discover the diverse beauty of the Pearl of the Indian Ocean.</p>
          </Reveal>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {TOUR_DESTINATIONS.map((dest, idx) => (
            <Reveal
              key={dest.name}
              direction="up"
              delay={staggerDelay(idx, { step: 0.15 })}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedRoute(dest)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRoute(dest) } }}
              aria-label={`View route details for ${dest.name}`}
              className="group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 focus-visible:outline-offset-4 rounded-[40px]"
            >
              <div className="relative h-[320px] sm:h-[420px] md:h-[500px] rounded-[40px] overflow-hidden shadow-2xl mb-8">
                <ImageReveal
                  fill
                  src={dest.image}
                  alt={`Tour destination: ${dest.name}`}
                  hoverZoom
                  delay={staggerDelay(idx, { step: 0.15 }) + 0.1}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent pointer-events-none"></div>

                <div className="absolute top-8 left-8">
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/30 uppercase tracking-widest">
                    {dest.region}
                  </span>
                </div>

                <div className="absolute bottom-10 left-10 right-10">
                  <h3 className="text-3xl font-serif text-white mb-3">{dest.name}</h3>
                  <p className="text-emerald-50/70 text-sm mb-6 leading-relaxed">
                    {dest.detail}
                  </p>
                  <span className="flex items-center gap-2 text-amber-400 font-bold group/btn">
                    Explore Routes
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <RouteDetailsModal
        key={selectedRoute?.name}
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        onPlanTrip={onOpenUserLogin}
      />

      {/* Why Air B&C Section */}
      <section id="about" className="bg-emerald-950 py-32 relative overflow-hidden">
        <ParallaxLayer speed={70} className="absolute top-0 right-0 pointer-events-none">
          <div className="w-[500px] h-[500px] bg-emerald-800 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        </ParallaxLayer>
        <ParallaxLayer speed={-50} className="absolute bottom-0 left-0 pointer-events-none">
          <div className="w-[500px] h-[500px] bg-amber-600 rounded-full blur-[150px] opacity-10 translate-y-1/2 -translate-x-1/2"></div>
        </ParallaxLayer>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
             <Reveal direction="left">
                <span className="text-amber-400 font-bold uppercase tracking-widest text-sm mb-6 block">The Smart Way to Travel</span>
                <h2 className="text-4xl md:text-6xl font-serif text-white mb-8 leading-tight">
                  Less Time Planning, <br /> More Time Dreaming.
                </h2>
                <p className="text-lg text-emerald-100/70 mb-12 leading-relaxed">
                  Air B&C LK is not just a booking platform. It’s your intelligent travel companion designed specifically for the unique landscapes of Sri Lanka.
                </p>

                <div className="space-y-8">
                  {[
                    { icon: Compass, title: "Intelligent Route Optimization", text: "Spend less time on the road with our smart engine that picks the most efficient paths." },
                    { icon: ShieldCheck, title: "Verified Local Partners", text: "Every driver is vetted for safety, knowledge, and hospitality." },
                    { icon: Users, title: "Customizable Experiences", text: "Build your trip stop-by-stop based on your unique interests." }
                  ].map((feature, idx) => (
                    <Reveal key={idx} direction="up" delay={staggerDelay(idx, { step: 0.12, base: 0.15 })} className="flex gap-6">
                       <motion.div
                         whileHover={{ scale: 1.08, rotate: -4 }}
                         className="bg-white/10 p-4 rounded-2xl text-amber-400 shrink-0 self-start"
                       >
                          <feature.icon size={28} />
                       </motion.div>
                       <div>
                          <h4 className="text-xl font-bold text-white mb-2">{feature.title}</h4>
                          <p className="text-emerald-100/50 text-sm leading-relaxed">{feature.text}</p>
                       </div>
                    </Reveal>
                  ))}
                </div>
             </Reveal>

             <Reveal direction="scale" duration={0.85} className="relative">
                <div className="relative rounded-[40px] overflow-hidden border border-white/10 shadow-3xl h-[400px] lg:h-[600px]">
                   <ImageReveal
                     fill
                     src={colomboImg}
                     alt="Travelers enjoying a Sri Lanka Experience"
                     curtainColor="#022c22"
                   />
                </div>
                <Reveal direction="up" delay={0.5} className="absolute -bottom-6 sm:-bottom-10 left-4 sm:-left-10 bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[32px] shadow-2xl max-w-[280px] sm:max-w-xs z-10">
                   <div className="flex gap-1 text-amber-500 mb-4">
                      {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                   </div>
                   <p className="text-slate-800 font-bold mb-2 text-sm sm:text-base">"The best way to see the island. Seamless and authentic!"</p>
                   <p className="text-slate-500 text-xs sm:text-sm">— Sarah J., Traveler</p>
                </Reveal>
             </Reveal>
          </div>
        </div>
      </section>

      {/* Tour Packages Section */}
      <section id="tours" className="py-16 sm:py-32 max-w-7xl mx-auto px-4 sm:px-6">
        <Reveal direction="up" className="text-center mb-12 sm:mb-20">
          <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Curated Packages</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 mb-4 sm:mb-6">Choose Your Island Story</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">Flexible options for every type of explorer. Whether you want a quick city dash or a full island immersion.</p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {TOUR_PACKAGES.map((pack, idx) => (
            // The "popular" card's static scale-105 lives on this outer, non-motion
            // wrapper — Reveal's own motion.div manages `y`/opacity/whileHover on
            // the inner element, and Framer Motion fully owns `transform` on
            // whatever element it's applied to, so a CSS `scale-105` class on that
            // same element would get silently clobbered the moment motion touches it.
            <div key={pack.title} className={pack.popular ? 'sm:scale-105 z-10' : ''}>
              <Reveal
                direction="up"
                delay={staggerDelay(idx, { step: 0.12 })}
                whileHover={{ y: -10 }}
                className={`p-6 sm:p-10 rounded-3xl sm:rounded-[40px] border transition-shadow duration-500 flex flex-col h-full ${pack.popular ? 'bg-emerald-950 text-white border-emerald-900 shadow-2xl' : 'bg-white border-amber-100 hover:shadow-xl'}`}
              >
              {pack.popular && (
                <span className="bg-amber-500 text-emerald-950 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest self-start mb-6">Most Popular</span>
              )}
              <h3 className={`text-2xl font-serif mb-2 ${pack.popular ? 'text-white' : 'text-emerald-950'}`}>{pack.title}</h3>
              <div className="flex items-end gap-2 mb-8">
                 <span className={`text-4xl font-black ${pack.popular ? 'text-amber-400' : 'text-emerald-900'}`}>{pack.price}</span>
                 <span className="text-sm opacity-50 mb-1">/ {pack.duration}</span>
              </div>

              <div className="space-y-4 mb-10 flex-grow">
                 {pack.perks.map((perk, i) => (
                   <div key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 size={18} className={pack.popular ? 'text-amber-400' : 'text-emerald-600'} />
                      <span className={pack.popular ? 'text-emerald-100/80' : 'text-slate-600'}>{perk}</span>
                   </div>
                 ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onOpenUserLogin}
                className={`w-full py-4 rounded-2xl font-bold transition-colors ${pack.popular ? 'bg-amber-500 text-emerald-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20' : 'bg-emerald-900 text-white hover:bg-emerald-800'}`}
              >
                Select {pack.title}
              </motion.button>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* Access Portals Section */}
      <section className="py-16 sm:py-32 bg-[#fffbeb] border-t border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <Reveal
              direction="left"
              whileHover={{ y: -10 }}
              className="bg-white p-8 sm:p-12 rounded-3xl sm:rounded-[40px] shadow-xl border border-emerald-100 flex flex-col h-full"
            >
              <span className="text-emerald-700 font-bold uppercase tracking-widest text-xs mb-4 sm:mb-6 block">Traveler Portal</span>
              <h3 className="text-3xl sm:text-4xl font-serif text-emerald-950 mb-4">Start Your Trip</h3>
              <p className="text-slate-500 mb-8 sm:mb-10 leading-relaxed flex-grow">Join thousands of travelers who planned their perfect Sri Lankan getaway with us.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenUserLogin} className="w-full sm:w-auto bg-emerald-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-emerald-800 transition-colors shadow-lg text-center">Login</motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenUserRegister} className="w-full sm:w-auto bg-emerald-50 text-emerald-900 border border-emerald-200 px-8 py-3.5 rounded-2xl font-bold hover:bg-emerald-100 transition-colors text-center">Sign Up</motion.button>
              </div>
            </Reveal>

            <Reveal
              direction="right"
              whileHover={{ y: -10 }}
              className="bg-emerald-950 p-8 sm:p-12 rounded-3xl sm:rounded-[40px] shadow-xl border border-white/5 flex flex-col h-full"
            >
              <span className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-4 sm:mb-6 block">Partner Portal</span>
              <h3 className="text-3xl sm:text-4xl font-serif text-white mb-4">Drive with Us</h3>
              <p className="text-emerald-100/50 mb-8 sm:mb-10 leading-relaxed flex-grow">Become a verified partner and grow your business by hosting travelers from around the world.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenDriverLogin} className="w-full sm:w-auto bg-amber-500 text-emerald-950 px-8 py-3.5 rounded-2xl font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 text-center">Driver Login</motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenDriverRegister} className="w-full sm:w-auto bg-white/10 text-white border border-white/10 px-8 py-3.5 rounded-2xl font-bold hover:bg-white/20 transition-colors text-center">Register</motion.button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}