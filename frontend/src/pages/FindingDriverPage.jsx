import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import appLogo from '../../images/logo.jpeg'

// ── inject styles ──────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

:root {
  --primary-orange: #f97316;
  --primary-green: #10b981;
  --bg-white: #ffffff;
  --text-dark: #1e293b;
  --text-muted: #64748b;
}

@keyframes fd-ping {
  0%   { transform:scale(1);   opacity:.8; }
  70%  { transform:scale(2.2); opacity:.2; }
  100% { transform:scale(2.8); opacity:0;  }
}
@keyframes fd-float {
  0%,100% { transform:translateY(0px); }
  50%      { transform:translateY(-8px); }
}
@keyframes fd-bar {
  0%,100% { transform:scaleY(.3); opacity: 0.4; }
  50%      { transform:scaleY(1);   opacity: 1;   }
}
@keyframes fd-dots {
  0%,20%  { opacity:0; transform: translateY(2px); }
  50%     { opacity:1; transform: translateY(0); }
  80%,100%{ opacity:0; transform: translateY(-2px); }
}
@keyframes fd-slide-up {
  from { transform:translateY(100%); opacity:0; }
  to   { transform:translateY(0);    opacity:1; }
}
@keyframes fd-ripple {
  0%   { box-shadow:0 0 0 0 rgba(249, 115, 22, 0.4); }
  70%  { box-shadow:0 0 0 25px rgba(249, 115, 22, 0); }
  100% { box-shadow:0 0 0 0 rgba(249, 115, 22, 0); }
}
@keyframes fd-spin {
  to { transform:rotate(360deg); }
}
@keyframes mesh-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.fd-ping  { animation:fd-ping 1.4s cubic-bezier(0,0,.2,1) infinite; }
.fd-float { animation:fd-float 2.4s ease-in-out infinite; }
.fd-bar { animation:fd-bar 1s ease-in-out infinite; }
.fd-dot { animation:fd-dots 1.4s ease-in-out infinite; }
.fd-slide { animation:fd-slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.fd-ripple { animation:fd-ripple 1.8s ease-out infinite; }
.fd-spin   { animation:fd-spin .9s linear infinite; }
.mesh-bg   { animation: mesh-pulse 8s ease-in-out infinite; }

.leaflet-container { font-family: 'Plus Jakarta Sans', sans-serif; }
`
if (typeof document !== 'undefined' && !document.getElementById('fd-styles')) {
  const s = document.createElement('style')
  s.id = 'fd-styles'
  s.textContent = STYLES
  document.head.appendChild(s)
}

// ── SVG car icon factory ───────────────────────────────────────
function makeCarIcon(color = '#f97316', rotation = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <g transform="rotate(${rotation},18,18)">
      <rect x="6" y="12" width="24" height="14" rx="5" fill="${color}"/>
      <rect x="9" y="8"  width="18" height="10" rx="4" fill="${color}" opacity=".9"/>
      <rect x="11" y="10" width="14" height="6" rx="2" fill="white" opacity=".6"/>
      <circle cx="10" cy="27" r="3.5" fill="#1e293b"/>
      <circle cx="26" cy="27" r="3.5" fill="#1e293b"/>
    </g>
  </svg>`
  return L.divIcon({
    html: `<div style="filter:drop-shadow(0 4px 8px rgba(0,0,0,.2))">${svg}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function makeUserIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
    <defs>
      <linearGradient id="pin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316" />
        <stop offset="100%" stop-color="#ea580c" />
      </linearGradient>
    </defs>
    <path d="M22 0C10 0 0 10 0 22c0 16 22 34 22 34S44 38 44 22C44 10 34 0 22 0z" fill="url(#pin-grad)"/>
    <circle cx="22" cy="22" r="10" fill="white"/>
    <path d="M22 15a7 7 0 0 1 7 7 7 7 0 0 1-7 7 7 7 0 0 1-7-7 7 7 0 0 1 7-7z" fill="#f97316"/>
  </svg>`
  return L.divIcon({
    html: `<div class="fd-ripple" style="display:flex; align-items:center; justify-content:center; border-radius:50%">${svg}</div>`,
    className: '',
    iconSize: [44, 56],
    iconAnchor: [22, 56],
  })
}

// ── Animated drivers on map ────────────────────────────────────
const CAR_COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b']

function generateNearbyDrivers(center, count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + Math.random() * 0.5
    const dist  = 0.01 + Math.random() * 0.02
    return {
      id: i,
      lat: center[0] + Math.sin(angle) * dist,
      lng: center[1] + Math.cos(angle) * dist,
      rotation: Math.floor(Math.random() * 360),
      color: CAR_COLORS[i % CAR_COLORS.length],
      angle,
    }
  })
}

function AnimatedDriverMarkers({ center }) {
  const [drivers, setDrivers] = useState(() => generateNearbyDrivers(center))
  useEffect(() => {
    const id = setInterval(() => {
      setDrivers(prev =>
        prev.map(d => {
          const newAngle = d.angle + (Math.random() - 0.5) * 0.1
          const dist     = 0.01 + Math.random() * 0.02
          return {
            ...d,
            angle: newAngle,
            lat: center[0] + Math.sin(newAngle) * dist,
            lng: center[1] + Math.cos(newAngle) * dist,
            rotation: (d.rotation + (Math.random() > .5 ? 10 : -10)) % 360,
          }
        })
      )
    }, 1500)
    return () => clearInterval(id)
  }, [center])

  return drivers.map(d => (
    <Marker
      key={d.id}
      position={[d.lat, d.lng]}
      icon={makeCarIcon(d.color, d.rotation)}
    />
  ))
}

function MapCenterer({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 15) }, [center, map])
  return null
}

// ── PHASE messages ─────────────────────────────────────────────
const PHASES = [
  { icon: 'bi-radar', label: 'Searching Nearby Drivers', sub: 'Locating top-rated drivers in your area...' },
  { icon: 'bi-broadcast-pin', label: 'Connecting to Fleet', sub: 'Dispatching your tour details to the network.' },
  { icon: 'bi-car-front-fill', label: 'Drivers Responding', sub: 'Accepting driver confirmations and profiles.' },
  { icon: 'bi-check2-circle', label: 'Perfect Match Found!', sub: 'Your driver has been secured and is ready.' },
]

export default function FindingDriverPage({
  startLocation,
  bookingDetails,
  onCancel,
  onDriverFound,
}) {
  const center = startLocation ? [startLocation.lat, startLocation.lng] : [6.9271, 79.8612]
  const [phase, setPhase] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  
  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhase(p => p >= PHASES.length - 1 ? p : p + 1)
    }, 4500)
    const clock = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearInterval(phaseTimer); clearInterval(clock); }
  }, [])

  useEffect(() => {
    if (phase === PHASES.length - 1) {
      const t = setTimeout(() => onDriverFound && onDriverFound(), 3500)
      return () => clearTimeout(t)
    }
  }, [phase, onDriverFound])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const progress = ((phase + 1) / PHASES.length) * 100

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-slate-800 font-['Plus_Jakarta_Sans']">
      
      {/* ── Dynamic Mesh Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="mesh-bg absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100 blur-[120px] opacity-40"></div>
        <div className="mesh-bg absolute bottom-[-5%] left-[-10%] w-[40%] h-[50%] rounded-full bg-emerald-100 blur-[100px] opacity-40" style={{ animationDelay: '-2s' }}></div>
      </div>

      {/* ── Modern Header ── */}
      <header className="relative z-50 px-6 py-5 flex items-center justify-between bg-white/70 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-orange-500/10 flex items-center justify-center border-2 border-white">
            <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">Air B&C</h1>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest uppercase">Live Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-sm font-bold tabular-nums text-slate-700">{formatTime(elapsed)}</span>
          </div>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-sm font-bold hover:bg-rose-500 hover:text-white transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </header>

      {/* ── Map Container ── */}
      <main className="flex-1 relative z-10 min-h-0">
        <MapContainer
          center={center}
          zoom={15}
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <MapCenterer center={center} />

          <Circle
            center={center}
            radius={500}
            pathOptions={{ color:'#f97316', fillColor:'#f97316', fillOpacity:.05, weight:1, opacity:.2 }}
          />
          <Circle
            center={center}
            radius={250}
            pathOptions={{ color:'#10b981', fillColor:'#10b981', fillOpacity:.08, weight:1.5, opacity:.3 }}
          />

          <Marker position={center} icon={makeUserIcon()} />
          <AnimatedDriverMarkers center={center} />
        </MapContainer>

        {/* Map Overlays */}
        <div className="absolute inset-0 pointer-events-none z-[400] shadow-[inset_0_0_150px_rgba(0,0,0,0.05)]"></div>
      </main>

      {/* ── Bottom Control Panel ── */}
      <footer className="relative z-[500] fd-slide">
        <div className="bg-white rounded-t-[3rem] shadow-[0_-25px_60px_-15px_rgba(0,0,0,0.1)] border-t border-slate-100 p-8 pb-10">
          
          {/* Status Row */}
          <div className="flex items-start gap-6 mb-8">
            <div className="w-20 h-20 rounded-3xl bg-orange-500 shadow-xl shadow-orange-500/20 flex items-center justify-center text-white text-4xl relative overflow-hidden">
               <div className="absolute inset-0 bg-white/20 fd-spin opacity-20"></div>
               <i className={`bi ${PHASES[phase].icon}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{PHASES[phase].label}</h3>
                {phase < PHASES.length - 1 && (
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500 fd-dot" style={{ animationDelay: `${i*0.2}s` }}></div>)}
                  </div>
                )}
              </div>
              <p className="text-slate-500 font-medium leading-relaxed">{PHASES[phase].sub}</p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">System Progress</span>
              <span className="text-sm font-black text-emerald-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></div>
              </div>
            </div>
          </div>

          {/* Visualization / Soundwave */}
          <div className="flex items-center justify-center gap-2 mb-10 h-12">
            {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((n, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-orange-400 rounded-full fd-bar"
                style={{ 
                  height: `${n * 15}%`, 
                  animationDelay: `${i * 0.1}s`,
                  backgroundColor: n > 4 ? '#10b981' : '#f97316'
                }}
              ></div>
            ))}
          </div>

          {/* Booking Summary */}
          {bookingDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { icon: 'bi-car-front-fill', label: 'Vehicle', val: bookingDetails.vehicle || 'Standard' },
                { icon: 'bi-calendar-date', label: 'Duration', val: `${bookingDetails.days || 1} Days` },
                { icon: 'bi-geo-alt', label: 'Distance', val: `${bookingDetails.distance || 0} km` },
                { icon: 'bi-cash-stack', label: 'Estimated', val: `Rs. ${Number(bookingDetails.lkr || 0).toLocaleString()}` },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <i className={`bi ${item.icon} text-xs`}></i>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                  </div>
                  <span className="text-sm font-extrabold text-slate-800">{item.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pickup Address */}
          {startLocation && (
            <div className="p-5 bg-orange-50/50 rounded-3xl border border-orange-100/50 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-orange-500 text-xl">
                <i className="bi bi-geo-alt-fill"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Pickup Address</p>
                <p className="text-sm font-bold text-slate-800 truncate">{startLocation.name || 'Current Location'}</p>
              </div>
            </div>
          )}

        </div>
      </footer>
    </div>
  )
}
