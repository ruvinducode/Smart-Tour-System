import { useEffect, useRef, useState } from 'react'
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

const SRI_LANKA_VIDEO = '/hh.mp4'
const SRI_LANKA_POSTER = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1920&auto=format&fit=crop'

const TOUR_DESTINATIONS = [
  {
    name: 'Kandy Heritage',
    detail: 'Temple visits, cultural dance, and hill-country viewpoints.',
    image:
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'South Coast Escape',
    detail: 'Golden beaches, snorkeling, and sunset seafood dinners.',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    name: 'Sigiriya Adventure',
    detail: 'Lion Rock sunrise hike with village-style local experiences.',
    image:
      'https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=1200&auto=format&fit=crop',
  },
]

const TOUR_PACKAGES = [
  { title: '2 Day Explorer', price: '$120', perks: 'Private vehicle, guide, and city highlights.' },
  { title: '5 Day Island Tour', price: '$320', perks: 'Heritage + beach mix with flexible stops.' },
  { title: 'Custom Smart Tour', price: 'On Request', perks: 'Route optimization based on your interests.' },
]

export default function LandingPage({
  onOpenLogin,
  onOpenAbout,
  onOpenUserLogin,
  onOpenUserRegister,
  onOpenDriverLogin,
  onOpenDriverRegister,
}) {
  const videoRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  const scrollToSection = (id) => {
    if (typeof window === 'undefined') return
    const section = document.getElementById(id)
    if (!section) return
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    setMounted(true)
    const el = videoRef.current
    if (!el) return

    const tryPlay = async () => {
      try {
        await el.play()
      } catch {
        // Autoplay may be blocked by browser policy.
      }
    }

    tryPlay()
  }, [])

  return (
    <div className="relative min-h-screen bg-linear-to-b from-sky-50 to-orange-50 text-slate-900">
      <section id="hero" className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ 
            filter: 'brightness(0.78) contrast(1.08) saturate(1.08)',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={SRI_LANKA_POSTER}
        >
          <source src={SRI_LANKA_VIDEO} type="video/mp4" />
          Your browser does not support video tag.
        </video>

        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/28 to-black/38" />
      </div>

      <nav className="sticky top-0 left-0 right-0 z-50 border-b border-white/20 bg-slate-900/55 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={appLogo}
                alt="Smart Tour logo"
                className="h-10 w-10 rounded-lg border border-white/40 object-cover shadow-lg"
              />
              <span className="text-white font-xl font-bold">Smart Tour</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <button type="button" onClick={() => scrollToSection('hero')} className="text-white/90 hover:text-white transition-colors font-medium">Home</button>
              <button type="button" onClick={() => scrollToSection('destinations')} className="text-white/90 hover:text-white transition-colors font-medium">Destinations</button>
              <button type="button" onClick={() => scrollToSection('tours')} className="text-white/90 hover:text-white transition-colors font-medium">Tours</button>
              <button type="button" onClick={onOpenAbout} className="text-white/90 hover:text-white transition-colors font-medium">About</button>
              <button type="button" onClick={() => scrollToSection('contact')} className="text-white/90 hover:text-white transition-colors font-medium">Contact</button>
            </div>

            <button
              type="button"
              onClick={onOpenLogin}
              className="px-6 py-2 bg-linear-to-r from-orange-500 to-red-600 text-white font-semibold rounded-full transition-all hover:from-orange-400 hover:to-red-500 shadow-lg"
            >
              Book Now
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="space-y-6 text-center">
            <h1
              className={`whitespace-nowrap text-4xl font-bold leading-none text-white transition-all duration-700 sm:text-6xl lg:text-7xl ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            >
              <span className="bg-linear-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Discover Sri Lanka</span>
            </h1>

            <p
              className={`text-lg leading-relaxed text-white/90 transition-all duration-700 lg:text-xl ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
              style={{ transitionDelay: '140ms' }}
            >
              Experience breathtaking landscapes, pristine beaches, ancient temples, and unforgettable adventures across Sri Lanka.
            </p>

            <div
              className={`mt-12 flex flex-col items-center justify-center gap-4 transition-all duration-700 sm:flex-row ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
              style={{ transitionDelay: '260ms' }}
            >
              <button
                onClick={onOpenLogin}
                className="px-10 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl transition-all hover:from-blue-500 hover:to-blue-600 shadow-2xl hover:shadow-3xl transform hover:scale-105"
              >
                Explore Tours
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('destinations')}
                className="px-10 py-3 bg-transparent border-2 border-white/30 text-white font-semibold rounded-xl transition-all hover:bg-white/10 hover:border-white/50 transform hover:scale-105"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-sm text-white/80">
        Scroll to explore tours
      </div>
      </section>

      <section id="destinations" className="relative border-t border-sky-200 bg-linear-to-b from-sky-100 via-sky-50 to-orange-100 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-sky-800 sm:text-4xl">Top Destinations</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sky-900/75">
            Choose from curated routes that blend culture, nature, and beach relaxation.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TOUR_DESTINATIONS.map((place) => (
              <article key={place.name} className="overflow-hidden rounded-2xl border border-sky-200 bg-white/90 shadow-xl">
                <img src={place.image} alt={place.name} className="h-44 w-full object-cover" loading="lazy" />
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-orange-600">{place.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{place.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="tours" className="border-t border-orange-200 bg-linear-to-b from-orange-100 via-orange-50 to-sky-100 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-sky-800 sm:text-4xl">Tour Packages</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TOUR_PACKAGES.map((pack) => (
              <article key={pack.title} className="rounded-2xl border border-sky-200 bg-white/90 p-6 shadow-lg shadow-orange-200/40">
                <p className="text-sm font-semibold text-sky-700">{pack.title}</p>
                <p className="mt-3 text-3xl font-bold text-orange-600">{pack.price}</p>
                <p className="mt-3 text-sm text-slate-600">{pack.perks}</p>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-orange-400"
                >
                  Select Package
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-sky-200 bg-linear-to-b from-sky-50 via-white to-orange-50 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold text-sky-800 sm:text-4xl">Why Travel With Smart Tour</h2>
            <p className="mt-4 text-slate-600">
              We combine local knowledge with smart route planning so you spend less time on roads and more time enjoying Sri Lanka.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li>Local drivers and verified travel partners</li>
              <li>Flexible day plans based on your interests</li>
              <li>Safe, comfortable vehicles for all group sizes</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-orange-200 bg-orange-50/90 p-6 shadow-2xl shadow-orange-200/50">
            <p className="text-sm text-sky-700">Smart Planning Promise</p>
            <p className="mt-3 text-2xl font-bold text-orange-600">Best route, best time, best memories.</p>
            <p className="mt-4 text-slate-600">
              Start with your preferred destinations and we generate a practical, enjoyable itinerary.
            </p>
            <button
              type="button"
              onClick={onOpenAbout}
              className="mt-5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              More About Us
            </button>
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-orange-200 bg-linear-to-b from-orange-100 to-sky-100 px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-sky-200 bg-white/90 p-8 text-center shadow-2xl shadow-sky-200/50">
          <h2 className="text-3xl font-bold text-sky-800 sm:text-4xl">Plan Your Sri Lanka Tour Today</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Sign in to build your route, calculate costs, and book your preferred vehicle.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="mt-8 rounded-xl bg-linear-to-r from-blue-600 to-orange-500 px-10 py-3 font-semibold text-white transition-transform hover:scale-105"
          >
            Start Planning
          </button>
        </div>
      </section>

      <section id="access-portals" className="border-t border-sky-200 bg-linear-to-b from-sky-100 via-white to-orange-100 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-sky-800 sm:text-4xl">Access Portals</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Choose your portal below and go directly to the right login or registration form.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-sky-200 bg-white/90 p-6 text-left shadow-xl shadow-sky-100/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Traveler Portal</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">User Account</h3>
              <p className="mt-2 text-sm text-slate-600">For guests and users to plan routes, estimate tours, and manage bookings.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onOpenUserLogin || onOpenLogin}
                  className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  User Login
                </button>
                <button
                  type="button"
                  onClick={onOpenUserRegister || onOpenLogin}
                  className="rounded-xl border border-sky-300 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                >
                  User Register
                </button>
              </div>
            </article>

            <article className="rounded-3xl border border-orange-200 bg-white/90 p-6 text-left shadow-xl shadow-orange-100/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Partner Portal</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">Driver Account</h3>
              <p className="mt-2 text-sm text-slate-600">For drivers to register vehicles, log in, and manage assignments after approval.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onOpenDriverLogin || onOpenLogin}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
                >
                  Driver Login
                </button>
                <button
                  type="button"
                  onClick={onOpenDriverRegister || onOpenLogin}
                  className="rounded-xl border border-orange-300 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-800 transition hover:bg-orange-100"
                >
                  Driver Register
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  )
}