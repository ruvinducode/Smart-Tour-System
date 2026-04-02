export default function CTA({ onOpenLogin, onViewDestinations }) {
  return (
    <section className="mx-auto max-w-7xl rounded-3xl border border-white/20 bg-gradient-to-r from-sky-500/30 via-orange-500/30 to-sky-500/30 p-12 text-center backdrop-blur-xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-sm font-semibold text-white">Professional Tour Platform</span>
        </div>
      </div>
      <h3 className="mb-6 font-['Space_Grotesk'] text-4xl font-bold text-white md:text-5xl">
        A Complete Platform for
        <span className="block bg-gradient-to-r from-sky-200 to-orange-200 bg-clip-text text-transparent">
          Sri Lanka Travel Operations
        </span>
      </h3>
      <p className="mx-auto mb-8 mt-4 max-w-3xl text-lg text-slate-100">
        From first engagement to booking fulfillment, manage tours with consistent quality, operational visibility,
        and destination-focused planning.
      </p>
      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={onOpenLogin}
          className="rounded-xl bg-cyan-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-cyan-700/20 transition-all hover:scale-105 hover:bg-cyan-500"
        >
          Start now (Login / Register)
        </button>
        <button
          type="button"
          onClick={onViewDestinations}
          className="rounded-xl border-2 border-cyan-300/70 bg-cyan-500/15 px-8 py-4 text-base font-semibold text-cyan-100 transition-all hover:scale-105 hover:bg-cyan-500/30"
        >
          View destinations
        </button>
      </div>
    </section>
  )
}
