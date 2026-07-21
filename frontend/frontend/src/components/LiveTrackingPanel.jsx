import { useState, useEffect, useRef } from 'react'
import { getLiveDriverLocation, getTourDetails, getRoute } from '../services/api.js'

// Haversine distance formula to calculate km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function LiveTrackingPanel({ tourId, token, userLat, userLng, driverName, driverImg, vehicleImg, vehicleNumber, onExpandToFull, onCancel }) {
  const [minimized, setMinimized] = useState(false)
  const [driverLoc, setDriverLoc] = useState(null)
  const [eta, setEta] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)
  const [status, setStatus] = useState('Locating driver...')
  const intervalRef = useRef(null)

  // ── Dragging State ──
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  // ── Resizing State ──
  const [size, setSize] = useState({ width: 420, height: 'auto' }) // Increased default width to 420px
  const [isResizing, setIsResizing] = useState(false)
  const resizeStart = useRef({ w: size.width, x: 0 })

  const imgUrl = (path) => path ? `/api/uploads/drivers/${path}` : null

  // Tracks the driver's actual recent pace (km/h) from consecutive GPS fixes,
  // so ETA reflects how fast they're really moving instead of a flat guess.
  const prevLocRef = useRef(null) // { lat, lng, time }
  const speedKmhRef = useRef(30)
  const speedSamplesRef = useRef(0)

  useEffect(() => {
    prevLocRef.current = null
    speedKmhRef.current = 30
    speedSamplesRef.current = 0
  }, [tourId])

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const [locData, tourData] = await Promise.all([
          getLiveDriverLocation(tourId, token),
          getTourDetails(tourId, token)
        ])

        if (locData.latitude && locData.longitude) {
          setDriverLoc({ lat: locData.latitude, lng: locData.longitude })

          if (tourData.status === 'arrived') {
            setStatus('Driver has arrived')
          } else if (tourData.status === 'ongoing') {
            setStatus('Tour in progress')
          } else if (tourData.status === 'en_route') {
            setStatus('Driver is on the way')
          } else {
            setStatus(tourData.status.replace(/_/g, ' '))
          }

          const now = Date.now()
          const prev = prevLocRef.current
          if (prev) {
            const elapsedHours = (now - prev.time) / 3_600_000
            if (elapsedHours > 0) {
              const movedKm = haversineKm(prev.lat, prev.lng, locData.latitude, locData.longitude)
              const rawSpeedKmh = movedKm / elapsedHours
              if (rawSpeedKmh >= 1 && rawSpeedKmh <= 120) {
                speedKmhRef.current = speedSamplesRef.current === 0
                  ? rawSpeedKmh
                  : speedKmhRef.current * 0.6 + rawSpeedKmh * 0.4
                speedSamplesRef.current += 1
              }
            }
          }
          prevLocRef.current = { lat: locData.latitude, lng: locData.longitude, time: now }

          if (userLat && userLng) {
            if (tourData.status === 'arrived') setEta('At Pickup')
            else if (tourData.status === 'ongoing') setEta('On Trip')

            if (tourData.status !== 'ongoing') {
              // Real road-routed distance via our backend (OpenRouteService),
              // not a straight-line estimate.
              getRoute([[locData.longitude, locData.latitude], [userLng, userLat]])
                .then((route) => {
                  const routeKm = route.distance_km
                  setDistanceKm(routeKm.toFixed(1))
                  if (tourData.status !== 'arrived') {
                    // ETA from the driver's actual current pace, not OSRM's generic
                    // road-speed assumption.
                    const mins = Math.round((routeKm / speedKmhRef.current) * 60)
                    setEta(mins < 1 ? 'Arriving' : `${mins} min`)
                  }
                })
                .catch(() => {
                  const km = haversineKm(locData.latitude, locData.longitude, userLat, userLng) * 1.25
                  setDistanceKm(km.toFixed(1))
                  if (tourData.status !== 'arrived') {
                    const mins = Math.round((km / speedKmhRef.current) * 60)
                    setEta(mins < 1 ? 'Arriving' : `${mins} min`)
                  }
                })
            }
          }
        }
      } catch {
        setStatus('Waiting for GPS...')
      }
    }

    fetchLocation()
    intervalRef.current = setInterval(fetchLocation, 5000)
    return () => clearInterval(intervalRef.current)
  }, [tourId, token, userLat, userLng])

  // ── Drag Handlers ──
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.resize-handle')) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  // ── Resize Handlers ──
  const handleResizeDown = (e) => {
    e.stopPropagation()
    setIsResizing(true)
    resizeStart.current = { w: size.width, x: e.clientX }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        })
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x
        setSize(prev => ({ ...prev, width: Math.max(300, Math.min(600, resizeStart.current.w + deltaX)) }))
      }
    }
    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing])

  const containerStyles = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    width: minimized ? 'auto' : `${size.width}px`,
    transition: (isDragging || isResizing) ? 'none' : 'transform 0.1s ease-out, width 0.3s ease',
    cursor: isDragging ? 'grabbing' : 'auto'
  }

  if (minimized) {
    return (
      <div 
        style={containerStyles}
        onMouseDown={handleMouseDown}
        className="fixed bottom-6 right-6 z-[1100] animate-in fade-in slide-in-from-bottom-4 duration-300 font-['Inter',sans-serif]"
      >
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-4 bg-slate-900 text-white p-2 pr-6 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:bg-slate-800 transition-all border border-slate-700 active:scale-95 group cursor-move"
        >
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center text-xl shadow-lg shadow-orange-500/20 group-hover:rotate-12 transition-transform">
              <i className="bi bi-car-front-fill"></i>
            </div>
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-[3px] border-slate-900 animate-pulse"></span>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Live Tracking</p>
            <p className="text-sm font-bold text-white tracking-tight">{eta || 'Locating...'}</p>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div 
      style={containerStyles}
      onMouseDown={handleMouseDown}
      className="fixed bottom-6 right-6 z-[1100] animate-in fade-in slide-in-from-bottom-6 duration-500 font-['Inter',sans-serif]"
    >
      <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden relative">
        
        {/* Resize Handle (Bottom-right) */}
        <div 
          onMouseDown={handleResizeDown}
          className="resize-handle absolute bottom-3 right-3 w-6 h-6 flex items-end justify-end cursor-nwse-resize z-50 text-slate-300 hover:text-orange-500 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="22" y1="6" x2="6" y2="22"></line><line x1="22" y1="14" x2="14" y2="22"></line></svg>
        </div>

        {/* Header */}
        <div className="bg-slate-900 px-7 py-5 flex items-center justify-between cursor-move">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <i className="bi bi-car-front-fill text-lg"></i>
              </div>
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-[3px] border-slate-900 animate-pulse"></span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm tracking-tight leading-none mb-0.5 truncate">Live Journey</p>
              <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest leading-none">Tour #{tourId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onExpandToFull}
              className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center active:scale-90"
            >
              <i className="bi bi-fullscreen text-[10px]"></i>
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center active:scale-90"
            >
              <i className="bi bi-chevron-down text-xs"></i>
            </button>
          </div>
        </div>

        {/* Status Line */}
        <div className={`px-7 py-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] ${driverLoc ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
          <i className={`bi ${driverLoc ? 'bi-broadcast' : 'bi-hourglass-split'} ${driverLoc ? 'animate-pulse' : ''}`}></i>
          {status}
        </div>

        {/* Content Area */}
        <div className="px-8 py-8 space-y-7">
          
          {/* Driver & Vehicle Circles Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-14 w-14 rounded-full bg-slate-50 border-2 border-white shadow-md overflow-hidden">
                  {driverImg ? (
                    <img src={imgUrl(driverImg)} alt="Driver" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl font-bold text-slate-300">
                      {(driverName || 'D').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[8px]">
                  <i className="bi bi-check-lg"></i>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none mb-1.5">Your Driver</p>
                <p className="font-bold text-slate-900 text-base leading-none truncate">{driverName || 'Verified Pro'}</p>
              </div>
            </div>

            {/* Vehicle Circle */}
            <div className="relative flex-shrink-0">
              <div className="h-14 w-14 rounded-full bg-slate-50 border-2 border-white shadow-md overflow-hidden">
                {vehicleImg ? (
                  <img 
                    src={imgUrl(vehicleImg)} 
                    alt="Vehicle" 
                    className="h-full w-full object-cover" 
                    style={{ mixBlendMode: 'multiply' }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xl text-slate-200">
                    <i className="bi bi-car-front-fill"></i>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -left-0.5 bg-orange-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full shadow-sm uppercase tracking-widest">
                Ride
              </div>
            </div>
          </div>

          {/* Vehicle Plate Badge (Single Row Force) */}
          <div className="bg-slate-900 rounded-2xl py-4 px-6 flex items-center justify-between border border-slate-800 shadow-inner overflow-hidden">
             <div className="flex items-center gap-3 flex-shrink-0">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-orange-400">
                  <i className="bi bi-card-text"></i>
                </div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">License Plate</p>
             </div>
             <p className="text-xl font-black text-white tracking-widest font-mono whitespace-nowrap ml-4">
               {vehicleNumber || 'WP XXX-XXXX'}
             </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/50 text-center">
              <p className="text-[9px] font-semibold text-orange-400 uppercase tracking-widest mb-1">Time Away</p>
              <p className="text-lg font-bold text-orange-700 leading-none">{eta || '--'}</p>
            </div>
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 text-center">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Distance</p>
              <p className="text-lg font-bold text-slate-800 leading-none">{distanceKm ? `${distanceKm}km` : '--'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={onExpandToFull}
                className="flex-1 py-4 rounded-2xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2 min-w-0"
              >
                <i className="bi bi-map-fill"></i>
                <span className="truncate">Full Map</span>
              </button>
              <a
                href={`tel:000`}
                className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
              >
                <i className="bi bi-telephone-fill"></i>
              </a>
            </div>
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-100"
            >
              Cancel Journey
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
