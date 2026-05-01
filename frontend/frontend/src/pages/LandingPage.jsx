import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
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
  Youtube
} from 'lucide-react'
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

// Assets
import heroImg from '../assets/sri-lanka-hero.png'
import galleImg from '../assets/galle.png'
import kandyImg from '../assets/kandy.png'
import colomboImg from '../assets/colombo.png'

const SRI_LANKA_VIDEO = '/hh.mp4'
const SRI_LANKA_POSTER = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1920&auto=format&fit=crop'

const TOUR_DESTINATIONS = [
  {
    name: 'Kandy Heritage',
    region: 'Hill Country',
    detail: 'Temple visits, cultural dance, and misty mountain viewpoints.',
    image: kandyImg,
  },
  {
    name: 'Galle Coastal',
    region: 'South Coast',
    detail: 'Historic fort walls, golden beaches, and boutique charm.',
    image: galleImg,
  },
  {
    name: 'Sigiriya Rock',
    region: 'Cultural Triangle',
    detail: 'Ancient citadel hike with village-style authentic experiences.',
    image: heroImg,
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
  onOpenLogin,
  onOpenAbout,
  onOpenUserLogin,
  onOpenUserRegister,
  onOpenDriverLogin,
  onOpenDriverRegister,
}) {
  const videoRef = useRef(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const section = document.getElementById(id)
    if (section) section.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen bg-[#fffbeb] text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'glass-nav py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="bg-white text-emerald-900 p-2 rounded-xl shadow-lg">
              <Compass size={24} />
            </div>
            <span className="text-xl font-extrabold text-white">Smart Tour <span className="font-light text-white/60 text-sm">| LK</span></span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {['hero', 'destinations', 'tours', 'about'].map((item) => (
              <button 
                key={item}
                onClick={() => item === 'about' ? onOpenAbout() : scrollToSection(item)}
                className="text-white/80 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
              >
                {item}
              </button>
            ))}
            <button 
              onClick={onOpenLogin}
              className="bg-amber-500 text-emerald-950 px-6 py-2.5 rounded-full font-bold shadow-xl hover:bg-amber-400 transition-all hover:scale-105"
            >
              Start Planning
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            style={{ filter: 'brightness(0.6)' }}
            autoPlay
            loop
            muted
            playsInline
            poster={SRI_LANKA_POSTER}
          >
            <source src={SRI_LANKA_VIDEO} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-emerald-950/90"></div>
        </div>

        <motion.div 
          style={{ opacity, scale }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block bg-amber-500/20 backdrop-blur-md text-amber-200 px-6 py-2 rounded-full text-xs font-bold tracking-[0.3em] mb-8 border border-amber-500/30"
          >
            DISCOVER THE WONDER OF ASIA
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-serif text-white leading-[1.1] mb-8"
          >
            Your Journey, <br />
            <span className="text-amber-400">Our Expertise.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-emerald-50/70 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Experience Sri Lanka like never before with smart route planning, verified local drivers, and authentic island stories.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button 
              onClick={onOpenLogin}
              className="bg-amber-500 text-emerald-950 px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center gap-3 hover:bg-amber-400 transition-all hover:scale-105 group"
            >
              Start Exploring
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all"
            >
              How it Works
            </button>
          </motion.div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
             <div className="w-1 h-2 bg-amber-400 rounded-full"></div>
          </div>
        </motion.div>
      </section>

      {/* Destinations Section */}
      <section id="destinations" className="py-32 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl text-left">
            <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Handpicked for You</span>
            <h2 className="text-4xl md:text-6xl font-serif text-emerald-950 leading-tight">
              Iconic Destinations <br /> to Ignite Your Soul
            </h2>
          </div>
          <p className="text-slate-500 max-w-md text-left md:text-right mb-2">
            From misty mountain peaks to golden coastal shores, discover the diverse beauty of the Pearl of the Indian Ocean.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TOUR_DESTINATIONS.map((dest, idx) => (
            <motion.div
              key={dest.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="group cursor-pointer"
            >
              <div className="relative h-[500px] rounded-[40px] overflow-hidden shadow-2xl mb-8">
                <img src={dest.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={dest.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent"></div>
                
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
                  <button onClick={onOpenLogin} className="flex items-center gap-2 text-amber-400 font-bold group/btn">
                    Explore Routes 
                    <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Smart Tour Section */}
      <section id="about" className="bg-emerald-950 py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-800 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-600 rounded-full blur-[150px] opacity-10 translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
             <motion.div
               initial={{ opacity: 0, x: -40 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
             >
                <span className="text-amber-400 font-bold uppercase tracking-widest text-sm mb-6 block">The Smart Way to Travel</span>
                <h2 className="text-4xl md:text-6xl font-serif text-white mb-8 leading-tight">
                  Less Time Planning, <br /> More Time Dreaming.
                </h2>
                <p className="text-lg text-emerald-100/70 mb-12 leading-relaxed">
                  Smart Tour LK is not just a booking platform. It’s your intelligent travel companion designed specifically for the unique landscapes of Sri Lanka.
                </p>

                <div className="space-y-8">
                  {[
                    { icon: Compass, title: "Intelligent Route Optimization", text: "Spend less time on the road with our smart engine that picks the most efficient paths." },
                    { icon: ShieldCheck, title: "Verified Local Partners", text: "Every driver is vetted for safety, knowledge, and hospitality." },
                    { icon: Users, title: "Customizable Experiences", text: "Build your trip stop-by-stop based on your unique interests." }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex gap-6">
                       <div className="bg-white/10 p-4 rounded-2xl text-amber-400 shrink-0 self-start">
                          <feature.icon size={28} />
                       </div>
                       <div>
                          <h4 className="text-xl font-bold text-white mb-2">{feature.title}</h4>
                          <p className="text-emerald-100/50 text-sm leading-relaxed">{feature.text}</p>
                       </div>
                    </div>
                  ))}
                </div>
             </motion.div>

             <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               className="relative"
             >
                <div className="rounded-[40px] overflow-hidden border border-white/10 shadow-3xl">
                   <img src={colomboImg} className="w-full h-[600px] object-cover" alt="Sri Lanka Experience" />
                </div>
                <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-[32px] shadow-2xl max-w-xs">
                   <div className="flex gap-1 text-amber-500 mb-4">
                      {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                   </div>
                   <p className="text-slate-800 font-bold mb-2">"The best way to see the island. Seamless and authentic!"</p>
                   <p className="text-slate-500 text-sm">— Sarah J., Traveler</p>
                </div>
             </motion.div>
          </div>
        </div>
      </section>

      {/* Tour Packages Section */}
      <section id="tours" className="py-32 max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-amber-600 font-bold uppercase tracking-widest text-sm mb-4 block">Curated Packages</span>
          <h2 className="text-4xl md:text-5xl font-serif text-emerald-950 mb-6">Choose Your Island Story</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">Flexible options for every type of explorer. Whether you want a quick city dash or a full island immersion.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {TOUR_PACKAGES.map((pack, idx) => (
            <motion.div
              key={pack.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`p-10 rounded-[40px] border transition-all duration-500 flex flex-col ${pack.popular ? 'bg-emerald-950 text-white border-emerald-900 shadow-2xl scale-105 z-10' : 'bg-white border-amber-100 hover:shadow-xl'}`}
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

              <button 
                onClick={onOpenLogin}
                className={`w-full py-4 rounded-2xl font-bold transition-all ${pack.popular ? 'bg-amber-500 text-emerald-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20' : 'bg-emerald-900 text-white hover:bg-emerald-800'}`}
              >
                Select {pack.title}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Access Portals Section */}
      <section className="py-32 bg-[#fffbeb] border-t border-amber-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              whileHover={{ y: -10 }}
              className="bg-white p-12 rounded-[40px] shadow-xl border border-emerald-100"
            >
              <span className="text-emerald-700 font-bold uppercase tracking-widest text-xs mb-6 block">Traveler Portal</span>
              <h3 className="text-4xl font-serif text-emerald-950 mb-4">Start Your Trip</h3>
              <p className="text-slate-500 mb-10 leading-relaxed">Join thousands of travelers who planned their perfect Sri Lankan getaway with us.</p>
              <div className="flex flex-wrap gap-4">
                <button onClick={onOpenUserLogin} className="bg-emerald-900 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-emerald-800 transition-all shadow-lg">Login</button>
                <button onClick={onOpenUserRegister} className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-8 py-3.5 rounded-2xl font-bold hover:bg-emerald-100 transition-all">Sign Up</button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className="bg-emerald-950 p-12 rounded-[40px] shadow-xl border border-white/5"
            >
              <span className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-6 block">Partner Portal</span>
              <h3 className="text-4xl font-serif text-white mb-4">Drive with Us</h3>
              <p className="text-emerald-100/50 mb-10 leading-relaxed">Become a verified partner and grow your business by hosting travelers from around the world.</p>
              <div className="flex flex-wrap gap-4">
                <button onClick={onOpenDriverLogin} className="bg-amber-500 text-emerald-950 px-8 py-3.5 rounded-2xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20">Driver Login</button>
                <button onClick={onOpenDriverRegister} className="bg-white/10 text-white border border-white/10 px-8 py-3.5 rounded-2xl font-bold hover:bg-white/20 transition-all">Register</button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Elegant Footer */}
      <footer className="bg-emerald-950 text-white pt-32 pb-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
           <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-white text-emerald-900 p-2 rounded-xl">
                  <Compass size={24} />
                </div>
                <span className="text-2xl font-extrabold text-white">Smart Tour <span className="font-light text-white/40">| LK</span></span>
              </div>
              <p className="text-emerald-100/50 max-w-sm mb-8 leading-relaxed">
                Empowering travelers to discover the hidden gems of Sri Lanka with intelligence, safety, and authentic local heart.
              </p>
              <div className="flex gap-6">
                <Instagram className="text-white/40 hover:text-amber-400 cursor-pointer transition-colors" />
                <Linkedin className="text-white/40 hover:text-amber-400 cursor-pointer transition-colors" />
                <Youtube className="text-white/40 hover:text-amber-400 cursor-pointer transition-colors" />
              </div>
           </div>
           
           <div>
              <h4 className="font-bold mb-8 uppercase tracking-widest text-sm text-amber-400">Quick Links</h4>
              <ul className="space-y-4 text-emerald-100/60 text-sm">
                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => scrollToSection('destinations')}>Destinations</li>
                <li className="hover:text-white cursor-pointer transition-colors" onClick={() => scrollToSection('tours')}>Tour Packages</li>
                <li className="hover:text-white cursor-pointer transition-colors" onClick={onOpenAbout}>About Us</li>
                <li className="hover:text-white cursor-pointer transition-colors">Safety Guidelines</li>
              </ul>
           </div>

           <div>
              <h4 className="font-bold mb-8 uppercase tracking-widest text-sm text-amber-400">Contact Us</h4>
              <ul className="space-y-4 text-emerald-100/60 text-sm">
                <li className="flex items-center gap-3"><Phone size={16} className="text-amber-400" /> +94 11 234 5678</li>
                <li className="flex items-center gap-3"><Mail size={16} className="text-amber-400" /> hello@smarttour.lk</li>
                <li className="flex items-center gap-3"><MapPin size={16} className="text-amber-400" /> Colombo, Sri Lanka</li>
              </ul>
           </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-emerald-100/30 text-xs font-bold uppercase tracking-[0.2em]">
           <span>© 2026 Smart Tour Sri Lanka</span>
           <div className="flex gap-12">
             <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
           </div>
        </div>
      </footer>
    </div>
  )
}