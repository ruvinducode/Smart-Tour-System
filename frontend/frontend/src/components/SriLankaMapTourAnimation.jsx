import { useEffect, useMemo, useRef, useState } from 'react'
import sbMapFile from '../../images/ sb.png'

/** Uses existing project file at `frontend/images/ sb.png`. */
const MAP_PRIMARY = sbMapFile
const MAP_FALLBACK =
  'https://upload.wikimedia.org/wikipedia/commons/1/11/Sri_Lanka_location_map.svg'

/** Normalized positions (0–100) on the map — adjust if your sb.png framing differs. */
const POINTS = {
  start: { x: 36, y: 46 },
  kandy: { x: 52, y: 36 },
  hikkaduwa: { x: 33, y: 58 },
}

const DALADA_IMG =
  'https://bhlankatours.com/wp-content/uploads/2024/01/temple-tooth-of-relic-820x520-1.jpg'
const HIKKADUWA_IMG =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop'

function lerp(a, b, t) {
  return a + (b - a) * t
}

function MapMarker({ x, y, label, active }) {
  return (
    <div
      className="pointer-events-none absolute z-20 flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }}
    >
      <div
        className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 shadow-lg transition-all duration-300 ${
          active
            ? 'scale-110 border-white bg-red-600 text-white ring-4 ring-red-300/60'
            : 'border-red-500 bg-white text-red-600'
        }`}
      >
        <img src={sbMapFile} alt="" className="h-full w-full object-cover" draggable={false} />
        <span className="absolute inset-0 bg-red-900/10" />
        {active ? (
          <span className="absolute -bottom-1 h-3 w-3 animate-ping rounded-full bg-white opacity-80" />
        ) : null}
      </div>
      <span className="mt-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-800 shadow">
        {label}
      </span>
    </div>
  )
}

function TourCar({ driving }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* 3D Tour Van/Car */}
      <div className={`relative ${driving ? 'car-3d-bounce' : ''}`}>
        {/* Car Body - Main van shape */}
        <div className="relative w-16 h-10 sm:w-20 sm:h-12">
          {/* Main van body */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500 to-orange-600 rounded-t-2xl rounded-b-lg shadow-2xl border border-orange-700/50">
            {/* Roof details */}
            <div className="absolute top-1 left-2 right-2 h-3 bg-gradient-to-b from-orange-400 to-orange-500 rounded-t-xl border-t border-orange-300/30"></div>
            
            {/* Windows */}
            <div className="absolute top-2 left-2 w-3 h-2 sm:w-4 sm:h-3 bg-gradient-to-b from-sky-300 to-sky-400 rounded border border-sky-500/50"></div>
            <div className="absolute top-2 right-2 w-3 h-2 sm:w-4 sm:h-3 bg-gradient-to-b from-sky-300 to-sky-400 rounded border border-sky-500/50"></div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-b from-sky-300 to-sky-400 rounded border border-sky-500/50"></div>
            
            {/* Front windshield */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-3 sm:w-5 sm:h-4 bg-gradient-to-b from-sky-200 to-sky-300 rounded-t-lg border border-sky-400/50"></div>
            
            {/* Side stripe */}
            <div className="absolute bottom-2 left-1 right-1 h-1 bg-gradient-to-r from-white/40 via-white/60 to-white/40 rounded-full"></div>
            
            {/* Headlights */}
            <div className="absolute bottom-1 left-1 w-1.5 h-1 bg-yellow-200 rounded-full shadow-lg shadow-yellow-300/50"></div>
            <div className="absolute bottom-1 right-1 w-1.5 h-1 bg-yellow-200 rounded-full shadow-lg shadow-yellow-300/50"></div>
          </div>
          
          {/* Wheels */}
          <div className={`absolute -bottom-1 left-2 w-3 h-3 bg-gradient-to-b from-gray-800 to-gray-900 rounded-full border-2 border-gray-700 ${driving ? 'wheel-3d-spin' : ''} shadow-lg`}>
            <div className="absolute inset-0.5 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full">
              <div className="absolute inset-0.5 bg-gray-900 rounded-full"></div>
            </div>
          </div>
          <div className={`absolute -bottom-1 right-2 w-3 h-3 bg-gradient-to-b from-gray-800 to-gray-900 rounded-full border-2 border-gray-700 ${driving ? 'wheel-3d-spin' : ''} shadow-lg`}>
            <div className="absolute inset-0.5 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full">
              <div className="absolute inset-0.5 bg-gray-900 rounded-full"></div>
            </div>
          </div>
          
          {/* Shadow under car */}
          <div className="absolute -bottom-0.5 left-0 right-0 h-2 bg-black/20 rounded-full blur-md transform scale-110"></div>
        </div>
        
        {/* Location pin above car */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="h-6 w-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full shadow-lg animate-pulse">
              <div className="absolute inset-1 bg-gradient-to-b from-red-400 to-red-500 rounded-full"></div>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function computeCar(phase, progress) {
  const s = POINTS.start
  const k = POINTS.kandy
  const h = POINTS.hikkaduwa

  if (phase === 'travel1') {
    const t = progress
    const x = lerp(s.x, k.x, t)
    const y = lerp(s.y, k.y, t)
    const ang = (Math.atan2(k.y - s.y, k.x - s.x) * 180) / Math.PI + 90
    return { x, y, angle: ang }
  }
  if (phase === 'kandyCard') {
    return {
      x: k.x,
      y: k.y,
      angle: (Math.atan2(h.y - k.y, h.x - k.x) * 180) / Math.PI + 90,
    }
  }
  if (phase === 'travel2') {
    const t = progress
    const x = lerp(k.x, h.x, t)
    const y = lerp(k.y, h.y, t)
    const ang = (Math.atan2(h.y - k.y, h.x - k.x) * 180) / Math.PI + 90
    return { x, y, angle: ang }
  }
  return { x: h.x, y: h.y, angle: 90 }
}

export default function SriLankaMapTourAnimation() {
  const carRef = useRef(null)
  const phaseRef = useRef('travel1')
  const [phase, setPhase] = useState('travel1')
  const [mapSrc, setMapSrc] = useState(MAP_PRIMARY)

  const cycleMs = useMemo(
    () => ({
      travel1: 4500,
      kandyCard: 3200,
      travel2: 5000,
      hikkaduwaCard: 3200,
    }),
    [],
  )

  useEffect(() => {
    let raf
    const startedAt = performance.now()
    const t1 = cycleMs.travel1
    const t2 = cycleMs.kandyCard
    const t3 = cycleMs.travel2
    const t4 = cycleMs.hikkaduwaCard
    const total = t1 + t2 + t3 + t4

    const loop = (now) => {
      const elapsed = now - startedAt
      const e = elapsed % total

      let p = 0
      let ph = 'travel1'

      if (e < t1) {
        ph = 'travel1'
        p = e / t1
      } else if (e < t1 + t2) {
        ph = 'kandyCard'
        p = 1
      } else if (e < t1 + t2 + t3) {
        ph = 'travel2'
        p = (e - t1 - t2) / t3
      } else {
        ph = 'hikkaduwaCard'
        p = 1
      }

      if (ph !== phaseRef.current) {
        phaseRef.current = ph
        setPhase(ph)
      }

      const { x, y, angle } = computeCar(ph, p)
      const el = carRef.current
      if (el) {
        el.style.left = `${x}%`
        el.style.top = `${y}%`
        el.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [cycleMs])

  const showKandyCard = phase === 'kandyCard'
  const showHikkaduwaCard = phase === 'hikkaduwaCard'
  const isDriving = phase === 'travel1' || phase === 'travel2'

  return (
    <div className="relative flex h-full min-h-80 w-full flex-col overflow-hidden rounded-3xl border border-sky-200/90 bg-linear-to-br from-sky-100 via-sky-50 to-orange-100 shadow-inner">
      <div className="relative min-h-70 flex-1 lg:min-h-90">
        <img
          src={mapSrc}
          alt="Sri Lanka map"
          className="h-full w-full object-cover object-center"
          draggable={false}
          onError={() => setMapSrc(MAP_FALLBACK)}
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-sky-900/35 via-sky-300/10 to-orange-300/15" />

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path
            d={`M ${POINTS.start.x} ${POINTS.start.y} L ${POINTS.kandy.x} ${POINTS.kandy.y} L ${POINTS.hikkaduwa.x} ${POINTS.hikkaduwa.y}`}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="0.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2.2 1"
            className="route-path opacity-95"
          />
        </svg>

        <MapMarker x={POINTS.kandy.x} y={POINTS.kandy.y} label="Kandy" active={showKandyCard} />
        <MapMarker x={POINTS.hikkaduwa.x} y={POINTS.hikkaduwa.y} label="Hikkaduwa" active={showHikkaduwaCard} />

        <div
          ref={carRef}
          className="absolute z-30 will-change-transform"
          style={{
            left: `${POINTS.start.x}%`,
            top: `${POINTS.start.y}%`,
            transform: 'translate(-50%, -50%) rotate(0deg)',
          }}
        >
          <TourCar driving={isDriving} />
        </div>

        {showKandyCard ? (
          <div className="absolute left-1/2 top-[8%] z-40 w-[min(92%,280px)] -translate-x-1/2">
            <div className="animate-fade-in rounded-2xl border border-sky-200/80 bg-sky-50/95 p-3 shadow-2xl backdrop-blur-md">
              <div className="overflow-hidden rounded-xl">
                <img src={DALADA_IMG} alt="Sri Dalada Maligawa" className="h-28 w-full object-cover" />
              </div>
              <p className="mt-2 text-center font-['Space_Grotesk'] text-sm font-bold text-orange-700">Sri Dalada Maligawa</p>
              <p className="text-center text-[11px] text-sky-700">Temple of the Sacred Tooth · Kandy</p>
            </div>
          </div>
        ) : null}

        {showHikkaduwaCard ? (
          <div className="absolute bottom-[10%] left-1/2 z-40 w-[min(92%,280px)] -translate-x-1/2">
            <div className="animate-fade-in rounded-2xl border border-sky-200/80 bg-sky-50/95 p-3 shadow-2xl backdrop-blur-md">
              <div className="overflow-hidden rounded-xl">
                <img src={HIKKADUWA_IMG} alt="Hikkaduwa beach" className="h-28 w-full object-cover" />
              </div>
              <p className="mt-2 text-center font-['Space_Grotesk'] text-sm font-bold text-orange-700">Hikkaduwa Beach</p>
              <p className="text-center text-[11px] text-sky-700">Golden sand & coral reefs</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-sky-200/80 bg-linear-to-r from-sky-100/95 to-orange-100/95 px-4 py-3">
        <p className="text-center text-[11px] font-medium text-sky-800">
          {phase === 'travel1' && 'Tour van is heading to Kandy…'}
          {phase === 'kandyCard' && 'Welcome to Kandy — Sri Dalada Maligawa'}
          {phase === 'travel2' && 'Driving to the southwest coast…'}
          {phase === 'hikkaduwaCard' && 'Hikkaduwa — relax on the beach'}
        </p>
      </div>

      <style>{`
        @keyframes routeFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -16; }
        }
        @keyframes wheel3dSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes car3dBounce {
          0%, 100% { transform: translateY(0) rotateX(0deg); }
          50% { transform: translateY(-2px) rotateX(2deg); }
        }
        .route-path {
          animation: routeFlow 1.2s linear infinite;
        }
        .wheel-3d-spin {
          animation: wheel3dSpin 0.45s linear infinite;
        }
        .car-3d-bounce {
          animation: car3dBounce 0.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
