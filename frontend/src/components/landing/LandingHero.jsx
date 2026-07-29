export default function LandingHero({ onOpenLogin, onExploreDestinations }) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-12 lg:items-end">
      <article className="rounded-3xl border border-white/20 bg-slate-900/45 p-8 backdrop-blur-xl lg:col-span-7">
        <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-400/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-sky-100">
          Sri Lanka Edition · Premium tours & vehicle operations
        </p>
        <h2 className="mt-5 font-['Space_Grotesk'] text-4xl font-black leading-[0.98] tracking-[-0.03em] text-white [text-shadow:0_10px_28px_rgba(15,23,42,0.55)] md:text-6xl">
          Discover
          <span className="block bg-linear-to-r from-sky-200 via-cyan-200 to-white bg-clip-text text-shadow-none text-transparent">
            Sri Lanka
          </span>
          <span className="block bg-linear-to-r from-orange-200 via-amber-200 to-sky-200 bg-clip-text text-shadow-none text-transparent">
            Paradise
          </span>
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed tracking-wide text-slate-100/95 md:text-lg">
          Experience cinematic destinations, trusted tour planning, and seamless bookings in one premium platform
          crafted for Sri Lanka travel operations.
        </p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {['Sigiriya', 'Kandy', 'Ella', 'Galle', 'Mirissa', 'Yala'].map((place) => (
            <span
              key={place}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100"
            >
              {place}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenLogin}
            className="rounded-xl bg-cyan-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:bg-cyan-500"
          >
            Get started (Login / Register)
          </button>
          <button
            type="button"
            onClick={onExploreDestinations}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/60 bg-cyan-500/20 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35"
          >
            Explore destinations
            <span aria-hidden="true" className="inline-block">→</span>
          </button>
          <div className="flex flex-wrap gap-2">
            {['Fast UX', 'Secure access', 'Sri Lanka gallery', 'Tour estimates'].map((badge) => (
              <span
                key={badge}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-semibold text-slate-100"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </article>

      <aside className="grid gap-3 lg:col-span-5">
        {[
          { value: '9', label: 'Provinces covered' },
          { value: '200+', label: 'Destinations supported' },
          { value: '24/7', label: 'Support & operations' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-xl">
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-200">{stat.label}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-white/20 bg-slate-900/45 p-5 backdrop-blur-xl">
          <p className="text-sm font-semibold text-white">Signature routes</p>
          <p className="mt-1 text-xs text-slate-200">Build itineraries that look premium from the first click.</p>
          <div className="mt-4 grid gap-2">
            {[
              { a: 'Colombo', b: 'Kandy', c: 'Ella' },
              { a: 'Sigiriya', b: 'Dambulla', c: 'Anuradhapura' },
              { a: 'Galle', b: 'Mirissa', c: 'Yala' },
            ].map((r) => (
              <div key={r.a} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100">
                {r.a} <span className="text-slate-300">→</span> {r.b} <span className="text-slate-300">→</span> {r.c}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  )
}
