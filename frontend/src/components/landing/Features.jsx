export default function Features() {
  return (
    <section id="sl-features" className="mx-auto max-w-7xl">
      <div className="mb-7 text-center">
        <h3 className="font-['Space_Grotesk'] text-3xl font-bold text-white md:text-4xl">
          Built to feel premium and professional
        </h3>
        <p className="mt-2 text-slate-200">
          A landing page that looks like a real product: trustworthy sections, clean cards, and strong CTAs.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Sri Lanka-first design',
            text: 'Focused on famous locations like Sigiriya, Ella, Galle, Kandy, Yala, and more.',
          },
          {
            title: 'Conversion-ready sections',
            text: 'Hero, portfolio, gallery, reviews, and CTA: all guiding users to sign in.',
          },
          {
            title: 'Fast, modern UI',
            text: 'Clean layout, smooth scrolling, and polished cards that feel enterprise-grade.',
          },
          {
            title: 'Ready for your system',
            text: 'Keeps your existing login/register + tour estimate flow exactly as-is.',
          },
        ].map((item) => (
          <article
            key={item.title}
            className="group rounded-3xl border border-white/20 bg-slate-900/45 p-6 backdrop-blur-xl transition-all hover:scale-105 hover:border-sky-400/40"
          >
            <h4 className="mb-3 font-['Space_Grotesk'] text-xl font-semibold text-white">{item.title}</h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
