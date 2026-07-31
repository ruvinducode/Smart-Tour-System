import { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Sparkles, Clock, Compass, ExternalLink } from 'lucide-react'
import YouTubeVideoCard from './YouTubeVideoCard.jsx'

// Full-detail view for a single route, opened from the "Explore Routes"
// destination cards. Pure presentation — the caller owns which route (if
// any) is selected via the `route` prop, so closing/switching routes is
// just a parent state change.
export default function RouteDetailsModal({ route, onClose, onPlanTrip }) {
  const [activeImage, setActiveImage] = useState(0)
  const titleId = useId()
  const closeBtnRef = useRef(null)

  const isOpen = !!route

  // Lock background scroll and let Escape close, same as any modal — this
  // one can get tall (gallery + description + video), so without the lock
  // the page behind it scrolls along with it on touch devices.
  useEffect(() => {
    if (!isOpen) return undefined
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-emerald-950/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.25, 0.8, 0.25, 1] }}
            className="relative w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto overscroll-contain"
          >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close route details"
              className="sticky top-4 float-right mr-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 backdrop-blur text-emerald-950 shadow-lg hover:bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {/* Gallery */}
            <div className="relative h-56 sm:h-80 w-full overflow-hidden">
              <img
                key={route?.gallery?.[activeImage] || route?.image}
                src={route?.gallery?.[activeImage] || route?.image}
                alt={`${route?.name || 'Route'} — view ${activeImage + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-6 right-6">
                <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full border border-white/30 uppercase tracking-widest mb-2">
                  {route?.region}
                </span>
                <h2 id={titleId} className="text-2xl sm:text-4xl font-serif text-white leading-tight">
                  {route?.name}
                </h2>
              </div>
            </div>

            {route?.gallery && route.gallery.length > 1 && (
              <div className="flex gap-2 px-6 pt-4" role="group" aria-label={`${route.name} photos`}>
                {route.gallery.map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    aria-pressed={activeImage === idx}
                    aria-label={`Show photo ${idx + 1} of ${route.gallery.length}`}
                    onClick={() => setActiveImage(idx)}
                    className={`h-14 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === idx ? 'border-amber-500 ring-2 ring-amber-200' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="px-6 sm:px-10 py-8 space-y-8">
              {route?.tagline && (
                <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                  <Clock size={16} aria-hidden="true" />
                  {route.tagline}
                </div>
              )}

              <div className="space-y-4 text-slate-600 leading-relaxed">
                {(route?.description || []).map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {route?.highlights?.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-emerald-950 font-serif text-xl mb-4">
                    <Sparkles size={18} className="text-amber-500" aria-hidden="true" />
                    Popular Attractions
                  </h3>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {route.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5 text-sm text-slate-700 bg-emerald-50/60 rounded-2xl px-4 py-3">
                        <MapPin size={16} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {route?.itineraries?.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-emerald-950 font-serif text-xl mb-4">
                    <Compass size={18} className="text-amber-500" aria-hidden="true" />
                    Suggested Routes &amp; Itineraries
                  </h3>
                  <div className="space-y-3">
                    {route.itineraries.map((it) => (
                      <div key={it.title} className="rounded-2xl border border-slate-100 px-5 py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1.5">
                          <span className="font-bold text-emerald-950">{it.title}</span>
                          <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">{it.duration}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{it.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {route?.lat != null && route?.lng != null && (
                <div>
                  <h3 className="flex items-center gap-2 text-emerald-950 font-serif text-xl mb-4">
                    <MapPin size={18} className="text-amber-500" aria-hidden="true" />
                    Location
                  </h3>
                  <div className="rounded-2xl overflow-hidden border border-slate-100">
                    <iframe
                      title={`Map showing ${route.name}`}
                      src={`https://www.google.com/maps?q=${route.lat},${route.lng}&z=11&output=embed`}
                      className="w-full h-56 sm:h-64 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${route.lat},${route.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-emerald-800 hover:text-emerald-950 transition-colors"
                  >
                    Open in Google Maps
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              )}

              {route?.video && (
                <div>
                  <h3 className="text-emerald-950 font-serif text-xl mb-4">Watch &amp; Explore</h3>
                  <YouTubeVideoCard videoId={route.video.id} title={route.video.title} />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { onPlanTrip?.(); onClose() }}
                  className="flex-1 bg-emerald-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all shadow-lg text-center"
                >
                  Plan This Trip
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
