import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

const VALUES = [
  {
    title: 'Local Experts',
    text: 'Our team knows Sri Lanka routes, seasons, and hidden spots to build better trips.',
  },
  {
    title: 'Smart Planning',
    text: 'We combine travel preferences with practical timing and transport planning.',
  },
  {
    title: 'Safe Experience',
    text: 'Reliable drivers, verified partners, and clear tour plans for peace of mind.',
  },
]

export default function AboutPage({ onBackHome, onOpenLogin }) {
  return (
    <div className="min-h-screen bg-linear-to-b from-sky-100 via-orange-50 to-sky-50 px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-6xl rounded-4xl border border-sky-200 bg-white/85 p-4 shadow-[0_30px_70px_rgba(2,132,199,0.2)] backdrop-blur-sm sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-sky-200 bg-linear-to-r from-sky-100 to-orange-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="Smart Tour logo" className="h-11 w-11 rounded-xl border border-white/80 object-cover shadow-md" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">About Smart Tour</p>
              <h1 className="text-2xl font-bold text-slate-800">Your Sri Lanka Travel Partner</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onBackHome}
            className="rounded-xl border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            Back to Home
          </button>
        </header>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-orange-200 bg-orange-50/90 p-6">
            <h2 className="text-3xl font-bold text-orange-600">Who We Are</h2>
            <p className="mt-3 text-slate-700">
              Smart Tour helps travelers discover Sri Lanka with less stress and better routes. From city highlights
              to beach escapes, we design clear itineraries that balance time, budget, and comfort.
            </p>
            <p className="mt-3 text-slate-700">
              Our platform is built for fast planning: choose destinations, estimate costs, and move forward with
              confidence.
            </p>
          </article>

          <article className="rounded-3xl border border-sky-200 bg-sky-50/90 p-6">
            <h3 className="text-xl font-bold text-sky-800">Our Mission</h3>
            <p className="mt-3 text-slate-700">
              Make Sri Lanka travel simple, beautiful, and personalized for every visitor.
            </p>
            <button
              type="button"
              onClick={onOpenLogin}
              className="mt-6 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              Start Your Tour Plan
            </button>
          </article>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          {VALUES.map((item) => (
            <article key={item.title} className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
              <h4 className="text-lg font-bold text-sky-800">{item.title}</h4>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
