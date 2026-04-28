import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'

// ── inject styles ──────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@keyframes fd-ping {
  0%   { transform:scale(1);   opacity:.8; }
  70%  { transform:scale(2.2); opacity:.2; }
  100% { transform:scale(2.8); opacity:0;  }
}
@keyframes fd-car-float {
  0%,100% { transform:translateY(0px) rotate(var(--r,0deg)); }
  50%      { transform:translateY(-6px) rotate(var(--r,0deg)); }
}
@keyframes fd-bar {
  0%,100% { transform:scaleX(.25); }
  50%      { transform:scaleX(1);   }
}
@keyframes fd-dots {
  0%,20%  { opacity:0; }
  50%     { opacity:1; }
  80%,100%{ opacity:0; }
}
@keyframes fd-slide-up {
  from { transform:translateY(60px); opacity:0; }
  to   { transform:translateY(0);    opacity:1; }
}
@keyframes fd-ripple {
  0%   { box-shadow:0 0 0 0 rgba(20,184,166,.45); }
  70%  { box-shadow:0 0 0 20px rgba(20,184,166,0); }
  100% { box-shadow:0 0 0 0 rgba(20,184,166,0); }
}
@keyframes fd-spin {
  to { transform:rotate(360deg); }
}
.fd-ping  { animation:fd-ping 1.4s cubic-bezier(0,0,.2,1) infinite; }
.fd-float { animation:fd-car-float 2.4s ease-in-out infinite; }
.fd-bar-1 { animation:fd-bar 1.2s ease-in-out infinite; }
.fd-bar-2 { animation:fd-bar 1.2s ease-in-out .2s infinite; }
.fd-bar-3 { animation:fd-bar 1.2s ease-in-out .4s infinite; }
.fd-bar-4 { animation:fd-bar 1.2s ease-in-out .6s infinite; }
.fd-dot-1 { animation:fd-dots 1.4s ease-in-out 0s infinite; }
.fd-dot-2 { animation:fd-dots 1.4s ease-in-out .25s infinite; }
.fd-dot-3 { animation:fd-dots 1.4s ease-in-out .5s infinite; }
.fd-slide  { animation:fd-slide-up .5s ease-out both; }
.fd-ripple { animation:fd-ripple 1.6s ease-out infinite; }
.fd-spin   { animation:fd-spin .9s linear infinite; }
`
if (typeof document !== 'undefined' && !document.getElementById('fd-styles')) {
  const s = document.createElement('style')
  s.id = 'fd-styles'
  s.textContent = STYLES
  document.head.appendChild(s)
}

// ── SVG car icon factory ───────────────────────────────────────
function makeCarIcon(color = '#0f766e', rotation = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <g transform="rotate(${rotation},18,18)">
      <rect x="6" y="12" width="24" height="14" rx="4" fill="${color}"/>
      <rect x="9" y="8"  width="18" height="10" rx="3" fill="${color}" opacity=".85"/>
      <rect x="11" y="10" width="14" height="6" rx="2" fill="white" opacity=".5"/>
      <circle cx="10" cy="27" r="3.5" fill="#1e293b"/>
      <circle cx="26" cy="27" r="3.5" fill="#1e293b"/>
      <circle cx="10" cy="27" r="1.5" fill="#64748b"/>
      <circle cx="26" cy="27" r="1.5" fill="#64748b"/>
    </g>
  </svg>`
  return L.divIcon({
    html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))">${svg}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function makeUserIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
    <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32S40 34 40 20C40 9 31 0 20 0z" fill="#0f766e"/>
    <circle cx="20" cy="20" r="9" fill="white"/>
    <circle cx="20" cy="20" r="5" fill="#0f766e"/>
  </svg>`
  return L.divIcon({
    html: `<div class="fd-ripple" style="display:inline-block;border-radius:50%">${svg}</div>`,
    className: '',
    iconSize: [40, 52],
    iconAnchor: [20, 52],
  })
}

// ── Animated drivers on map ────────────────────────────────────
const CAR_COLORS = ['#0f766e','#0891b2','#7c3aed','#db2777','#ea580c','#16a34a']

function generateNearbyDrivers(center, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + Math.random() * 0.5
    const dist  = 0.012 + Math.random() * 0.025
    return {
      id: i,
      lat: center[0] + Math.sin(angle) * dist,
      lng: center[1] + Math.cos(angle) * dist,
      rotation: Math.floor(Math.random() * 360),
      color: CAR_COLORS[i % CAR_COLORS.length],
      speed: 0.00015 + Math.random() * 0.00025,
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
          const newAngle = d.angle + (Math.random() - 0.5) * 0.08
          const dist     = 0.012 + Math.random() * 0.025
          return {
            ...d,
            angle: newAngle,
            lat: center[0] + Math.sin(newAngle) * dist,
            lng: center[1] + Math.cos(newAngle) * dist,
            rotation: (d.rotation + (Math.random() > .5 ? 15 : -15)) % 360,
          }
        })
      )
    }, 1200)
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

// keeps map centred on user location
function MapCenterer({ center }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 15) }, [center, map])
  return null
}

// ── PHASE messages ─────────────────────────────────────────────
const PHASES = [
  { icon: <i className="bi bi-search"></i>,          label: 'Scanning nearby drivers…',   sub: 'Looking for drivers around your location' },
  { icon: <i className="bi bi-broadcast"></i>,       label: 'Connecting to drivers…',     sub: 'Sending your booking details' },
  { icon: <i className="bi bi-car-front-fill"></i>,  label: 'Drivers responding…',        sub: 'Waiting for driver confirmations' },
  { icon: <i className="bi bi-check-circle-fill"></i>, label: 'Driver found!',              sub: 'A driver is on their way to you' },
]

// ── Main component ─────────────────────────────────────────────
export default function FindingDriverPage({
  startLocation,   // { lat, lng, name }
  bookingDetails,  // { vehicle, days, usd, lkr }
  onCancel,
  onDriverFound,
}) {
  const center = startLocation
    ? [startLocation.lat, startLocation.lng]
    : [6.9271, 79.8612] // default Colombo

  const [phase,   setPhase]   = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    // advance through phases
    const phaseTimer = setInterval(() => {
      setPhase(p => {
        if (p >= PHASES.length - 1) {
          clearInterval(phaseTimer)
          return p
        }
        return p + 1
      })
    }, 4000)

    // elapsed counter
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)

    return () => {
      clearInterval(phaseTimer)
      clearInterval(timerRef.current)
    }
  }, [])

  // auto-call onDriverFound after last phase
  useEffect(() => {
    if (phase === PHASES.length - 1) {
      const t = setTimeout(() => onDriverFound && onDriverFound(), 3000)
      return () => clearTimeout(t)
    }
  }, [phase, onDriverFound])

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')
  const progress = ((phase + 1) / PHASES.length) * 100

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#0b3d3f 0%,#0f6460 50%,#134e4a 100%)',
        fontFamily: "'Inter',sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,.25)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,.1)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:'linear-gradient(135deg,#14b8a6,#0ea5e9)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18,
          }}>
            <i className="bi bi-compass-fill text-white"></i>
          </div>
          <div>
            <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, letterSpacing:2, textTransform:'uppercase' }}>Smart Tour</div>
            <div style={{ color:'white', fontWeight:700, fontSize:15 }}>Finding Your Driver</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            background:'rgba(255,255,255,.12)', borderRadius:8,
            padding:'4px 12px', color:'rgba(255,255,255,.8)', fontSize:13, fontWeight:600,
          }}>
            ⏱ {minutes}:{seconds}
          </div>
          <button
            onClick={onCancel}
            style={{
              background:'rgba(239,68,68,.2)', border:'1px solid rgba(239,68,68,.35)',
              borderRadius:8, color:'#fca5a5', padding:'6px 14px', fontSize:13,
              fontWeight:600, cursor:'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ flex:'1 1 0', minHeight:0, position:'relative' }}>
        <MapContainer
          center={center}
          zoom={15}
          zoomControl={false}
          style={{ height:'100%', width:'100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          <MapCenterer center={center} />

          {/* Pulse ring around user */}
          <Circle
            center={center}
            radius={600}
            pathOptions={{ color:'#14b8a6', fillColor:'#14b8a6', fillOpacity:.07, weight:1.5, opacity:.35 }}
          />
          <Circle
            center={center}
            radius={280}
            pathOptions={{ color:'#14b8a6', fillColor:'#14b8a6', fillOpacity:.12, weight:2, opacity:.5 }}
          />

          {/* User marker */}
          <Marker position={center} icon={makeUserIcon()} />

          {/* Animated drivers */}
          <AnimatedDriverMarkers center={center} />
        </MapContainer>

        {/* Map overlay — "scanning" radar ring */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:'radial-gradient(circle at 50% 50%, transparent 30%, rgba(11,61,63,.35) 100%)',
          zIndex:400,
        }} />
      </div>

      {/* ── Bottom panel ── */}
      <div
        className="fd-slide"
        style={{
          background:'linear-gradient(180deg,rgba(11,61,63,0) 0%,#0b2e30 8%)',
          backdropFilter:'blur(16px)',
          padding:'24px 20px 32px',
          borderTop:'1px solid rgba(255,255,255,.08)',
          zIndex:500,
        }}
      >
        {/* Phase indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
          <div style={{
            width:52, height:52, borderRadius:'50%',
            background:'linear-gradient(135deg,#14b8a6,#0ea5e9)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, flexShrink:0,
            boxShadow:'0 0 0 8px rgba(20,184,166,.18)',
          }}>
            {PHASES[phase].icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'white', fontWeight:700, fontSize:17, marginBottom:4 }}>
              {PHASES[phase].label}
              {phase < PHASES.length - 1 && (
                <span style={{ marginLeft:4 }}>
                  <span className="fd-dot-1" style={{ opacity:0 }}>.</span>
                  <span className="fd-dot-2" style={{ opacity:0 }}>.</span>
                  <span className="fd-dot-3" style={{ opacity:0 }}>.</span>
                </span>
              )}
            </div>
            <div style={{ color:'rgba(255,255,255,.55)', fontSize:13 }}>{PHASES[phase].sub}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>Progress</span>
            <span style={{ color:'#5eead4', fontSize:12, fontWeight:600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ background:'rgba(255,255,255,.1)', borderRadius:999, height:6, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:999,
              background:'linear-gradient(90deg,#14b8a6,#38bdf8)',
              width:`${progress}%`,
              transition:'width .8s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
        </div>

        {/* Soundwave / bar loader */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginBottom:20, height:28 }}>
          {['fd-bar-1','fd-bar-2','fd-bar-3','fd-bar-4','fd-bar-3','fd-bar-2','fd-bar-1'].map((cls, i) => (
            <div
              key={i}
              className={cls}
              style={{
                width:4, height:24, borderRadius:4,
                background:'linear-gradient(180deg,#14b8a6,#38bdf8)',
                transformOrigin:'center',
              }}
            />
          ))}
        </div>

        {/* Booking summary chips */}
        {bookingDetails && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
            {[
              { icon: <i className="bi bi-car-front-fill"></i>, text: bookingDetails.vehicle || 'Vehicle' },
              { icon: <i className="bi bi-calendar-event"></i>, text: `${bookingDetails.days || 1} day${bookingDetails.days !== 1 ? 's' : ''}` },
              { icon: <i className="bi bi-currency-dollar"></i>, text: `$${bookingDetails.usd || 0} USD` },
              { icon: <i className="bi bi-cash-stack"></i>, text: `රු.${(bookingDetails.lkr || 0).toLocaleString()}` },
            ].map((chip, i) => (
              <div key={i} style={{
                background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)',
                borderRadius:20, padding:'5px 12px', display:'flex', alignItems:'center', gap:5,
                color:'rgba(255,255,255,.85)', fontSize:12, fontWeight:500,
              }}>
                <span>{chip.icon}</span>
                <span>{chip.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Start location */}
        {startLocation && (
          <div style={{
            background:'rgba(255,255,255,.07)', borderRadius:12,
            padding:'10px 14px', display:'flex', alignItems:'center', gap:10,
            border:'1px solid rgba(255,255,255,.1)',
          }}>
            <span style={{ fontSize:18, color: '#14b8a6' }}>
              <i className="bi bi-geo-alt-fill"></i>
            </span>
            <div>
              <div style={{ color:'rgba(255,255,255,.45)', fontSize:11, marginBottom:2 }}>Pickup Location</div>
              <div style={{ color:'white', fontWeight:600, fontSize:13 }}>{startLocation.name || 'Your Location'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
