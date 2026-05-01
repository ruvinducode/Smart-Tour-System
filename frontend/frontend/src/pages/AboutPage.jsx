import { motion } from 'framer-motion'
import { 
  Compass, 
  MapPin, 
  Users, 
  ShieldCheck, 
  Heart, 
  Target, 
  Award,
  ArrowLeft,
  ChevronRight
} from 'lucide-react'
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

// Assets
import cultureImg from '../assets/culture.png'
import heroImg from '../assets/sri-lanka-hero.png'

const VALUES = [
  {
    title: 'Local Experts',
    icon: Users,
    text: 'Our team knows every hidden corner of the island, from misty mountain peaks to secluded golden shores.',
  },
  {
    title: 'Smart Planning',
    icon: Compass,
    text: 'We blend high-tech route optimization with real-world travel insights for a seamless experience.',
  },
  {
    title: 'Safe Experience',
    icon: ShieldCheck,
    text: 'Every partner and driver is hand-picked and verified to ensure your peace of mind throughout the journey.',
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

  .glass-card {
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  .emerald-gradient {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
  }
`

if (typeof document !== 'undefined' && !document.getElementById('about-premium-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'about-premium-styles'
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

export default function AboutPage({ onBackHome, onOpenLogin }) {
  return (
    <div className="min-h-screen bg-[#fffbeb] text-slate-900 overflow-x-hidden selection:bg-emerald-200">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 py-6 px-6 bg-[#fffbeb]/80 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="bg-emerald-900 text-white p-2 rounded-xl">
              <Compass size={24} />
            </div>
            <span className="text-xl font-extrabold text-emerald-900 uppercase tracking-tighter">Smart Tour <span className="font-light text-slate-400">| About</span></span>
          </motion.div>
          <button
            onClick={onBackHome}
            className="flex items-center gap-2 text-emerald-900 font-bold hover:text-amber-600 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-amber-600 font-bold uppercase tracking-[0.3em] text-sm mb-6 block"
          >
            Our Mission & Story
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-serif text-emerald-950 mb-8 leading-tight"
          >
            Crafting Unforgettable <br /> Island Stories
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            We are dedicated to revolutionizing the way you experience Sri Lanka by blending local wisdom with intelligent technology.
          </motion.p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="rounded-[40px] overflow-hidden shadow-2xl border-4 border-white">
            <img src={cultureImg} className="w-full h-[600px] object-cover" alt="Sri Lankan Culture" />
          </div>
          <div className="absolute -bottom-8 -right-8 bg-amber-500 text-emerald-950 p-8 rounded-[32px] shadow-xl max-w-xs">
            <h4 className="text-2xl font-serif mb-2">Since 2024</h4>
            <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Born in the heart of the Indian Ocean.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-serif text-emerald-950 mb-8">Who We Are</h2>
          <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
            <p>
              Smart Tour LK emerged from a simple realization: Sri Lanka’s beauty is vast, but navigating it can be complex. We wanted to build a bridge between the island’s rich traditions and the needs of the modern explorer.
            </p>
            <p>
              What started as a small group of travel enthusiasts has grown into a tech-forward platform that empowers both travelers and local drivers. We don't just provide transport; we provide the keys to the island's soul.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <span className="text-4xl font-black text-emerald-900">10k+</span>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tours Completed</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-4xl font-black text-emerald-900">1.2k</span>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verified Drivers</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Values Section */}
      <section className="py-32 bg-emerald-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-800 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="max-w-7xl mx-auto px-6 text-center mb-20 relative z-10">
          <span className="text-amber-400 font-bold uppercase tracking-widest text-sm mb-4 block">Our Values</span>
          <h2 className="text-4xl font-serif text-white mb-6">What We Stand For</h2>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 relative z-10">
          {VALUES.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-[40px] group hover:bg-white/10 transition-all duration-500"
            >
              <div className="w-16 h-16 bg-amber-500 text-emerald-950 rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                <item.icon size={32} />
              </div>
              <h4 className="text-2xl font-serif text-white mb-4">{item.title}</h4>
              <p className="text-emerald-100/50 leading-relaxed text-sm">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <div className="bg-white rounded-[60px] p-12 md:p-24 shadow-2xl flex flex-col items-center text-center border border-amber-100">
           <div className="bg-emerald-100 text-emerald-900 p-6 rounded-[32px] mb-12">
              <Target size={48} />
           </div>
           <h2 className="text-4xl md:text-6xl font-serif text-emerald-950 mb-8">Our Simple Mission</h2>
           <p className="text-2xl text-slate-500 max-w-3xl leading-relaxed mb-12">
             "To make Sri Lankan travel **simple**, **beautiful**, and **deeply personalized** for every visitor who sets foot on our paradise island."
           </p>
           <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenLogin}
            className="bg-emerald-900 text-white px-12 py-5 rounded-2xl font-bold text-lg shadow-xl hover:bg-emerald-800 transition-all flex items-center gap-3"
           >
             Start Your Journey with Us
             <ChevronRight size={20} />
           </motion.button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-16 bg-[#fffbeb] border-t border-amber-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="bg-emerald-900 text-white p-2 rounded-xl">
                <Compass size={20} />
              </div>
              <span className="text-xl font-extrabold text-emerald-900 uppercase">Smart Tour <span className="font-light text-slate-400">| Sri Lanka</span></span>
           </div>
           <p className="text-slate-400 text-sm">© 2026 Smart Tour LK. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  )
}
