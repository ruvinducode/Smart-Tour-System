export default function Testimonials() {
  return (
    <section id="sl-testimonials" className="mx-auto max-w-7xl">
      <div className="mb-10 text-center">
        <h3 className="font-['Space_Grotesk'] text-3xl font-bold text-white md:text-4xl">Trusted by Sri Lanka tour teams</h3>
        <p className="mt-2 text-slate-200">
          Premium look, clear content, and a smooth path to login and tour planning.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {[
          {
            quote:
              'The landing page looks professional and modern. The destinations section instantly sells the Sri Lanka edition.',
            name: 'Tour Operations',
            meta: 'Colombo',
          },
          {
            quote: 'Clean structure and superb visuals. It feels like a real product, not a student template.',
            name: 'Travel Coordinator',
            meta: 'Kandy',
          },
          {
            quote: 'The gallery and CTAs are perfect. Visitors understand the value and move into sign-in smoothly.',
            name: 'Agency Owner',
            meta: 'Galle',
          },
        ].map((t) => (
          <figure key={t.name} className="rounded-3xl border border-white/20 bg-slate-900/45 p-7 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100">
                Verified feedback
              </div>
              <div className="text-xs font-semibold text-sky-200">Sri Lanka</div>
            </div>
            <blockquote className="mt-4 text-sm leading-relaxed text-slate-100">"{t.quote}"</blockquote>
            <figcaption className="mt-5">
              <div className="text-sm font-semibold text-white">{t.name}</div>
              <div className="text-xs text-slate-300">{t.meta}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
