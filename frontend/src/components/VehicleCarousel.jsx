import { useCallback, useEffect, useRef, useState } from 'react'

// Mobile-first horizontal swipe carousel for choosing a vehicle. Built on
// native CSS scroll-snap rather than a JS carousel library — it's the
// lightest-weight way to get smooth, momentum-based touch scrolling (the
// browser's own compositor handles it, no per-frame JS), and it works with
// zero extra dependencies.
//
// Browsing (swipe, arrow keys, prev/next buttons) is a separate action from
// selecting (tap/click/Enter a card) — arrow keys move focus along the strip
// without changing the selection, matching how someone would actually shop
// through options before committing to one.
export default function VehicleCarousel({ options, selected, onSelect, className = '' }) {
  const trackRef = useRef(null)
  const cardRefs = useRef([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const { scrollLeft, scrollWidth, clientWidth } = track
    setCanScrollLeft(scrollLeft > 8)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8)

    // Nearest-to-center card becomes the "active" one for the dot indicator.
    const center = scrollLeft + clientWidth / 2
    let closestIdx = 0
    let closestDist = Infinity
    cardRefs.current.forEach((el, idx) => {
      if (!el) return
      const cardCenter = el.offsetLeft + el.offsetWidth / 2
      const dist = Math.abs(cardCenter - center)
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = idx
      }
    })
    setActiveIndex(closestIdx)
  }, [])

  useEffect(() => {
    updateScrollState()
    const track = trackRef.current
    if (!track) return undefined
    track.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      track.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState, options.length])

  const scrollToIndex = (idx) => {
    const card = cardRefs.current[idx]
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  const scrollByStep = (direction) => {
    const track = trackRef.current
    if (!track) return
    const step = Math.max(240, Math.floor(track.clientWidth * 0.7))
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  const handleCardKeyDown = (e, idx) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = Math.min(idx + 1, options.length - 1)
      cardRefs.current[next]?.focus()
      scrollToIndex(next)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = Math.max(idx - 1, 0)
      cardRefs.current[prev]?.focus()
      scrollToIndex(prev)
    }
  }

  return (
    <div className={className}>
      <div className="relative">
        {/* Prev/next — desktop & tablet only; mobile is swipe-first */}
        <button
          type="button"
          onClick={() => scrollByStep(-1)}
          disabled={!canScrollLeft}
          aria-label="Show previous vehicles"
          className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white shadow-xl shadow-slate-900/10 border border-slate-100 items-center justify-center text-slate-600 hover:text-orange-600 hover:border-orange-200 transition-all disabled:opacity-0 disabled:pointer-events-none"
        >
          <i className="bi bi-chevron-left text-lg" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollByStep(1)}
          disabled={!canScrollRight}
          aria-label="Show more vehicles"
          className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white shadow-xl shadow-slate-900/10 border border-slate-100 items-center justify-center text-slate-600 hover:text-orange-600 hover:border-orange-200 transition-all disabled:opacity-0 disabled:pointer-events-none"
        >
          <i className="bi bi-chevron-right text-lg" aria-hidden="true" />
        </button>

        {/* Edge fades hint that more cards are off-screen */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-[#fffbeb] sm:from-white to-transparent z-[1]" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-[#fffbeb] sm:from-white to-transparent z-[1]" aria-hidden="true" />

        <div
          ref={trackRef}
          role="group"
          aria-label="Choose your vehicle"
          className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-1 py-2 -mx-1"
          style={{ scrollPaddingLeft: '4px', scrollPaddingRight: '4px' }}
        >
          {options.map((v, idx) => {
            const isSelected = selected === v.id
            return (
              <button
                key={v.id}
                ref={(el) => { cardRefs.current[idx] = el }}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${v.title} — ${v.description}${isSelected ? ' (selected)' : ''}`}
                onClick={() => { onSelect(v.id); scrollToIndex(idx) }}
                onKeyDown={(e) => handleCardKeyDown(e, idx)}
                className={`group relative flex flex-col bg-white rounded-[2rem] overflow-hidden text-left shrink-0 snap-center w-[76vw] max-w-[300px] sm:w-72 transition-all duration-300 border-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                  isSelected
                    ? 'border-orange-500 shadow-[0_20px_50px_-15px_rgba(249,115,22,0.35)] scale-[1.02]'
                    : 'border-transparent hover:border-slate-200 shadow-xl shadow-slate-900/5'
                }`}
              >
                <div className="h-40 sm:h-44 overflow-hidden bg-slate-50 flex items-center justify-center p-6">
                  <img src={v.image} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" loading="lazy" decoding="async" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{v.title}</h3>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs shrink-0">
                        <i className="bi bi-check-lg" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">{v.description}</p>
                </div>
                {isSelected && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                    Selected
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dot indicator — orientation among the full set, and a tap target */}
      <div className="flex items-center justify-center gap-1.5 mt-4" role="group" aria-label="Jump to vehicle">
        {options.map((v, idx) => (
          <button
            key={v.id}
            type="button"
            aria-current={idx === activeIndex ? 'true' : undefined}
            aria-label={`Scroll to ${v.title}`}
            onClick={() => scrollToIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === activeIndex ? 'w-6 bg-orange-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
