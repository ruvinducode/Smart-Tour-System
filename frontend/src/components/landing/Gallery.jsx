export default function Gallery() {
  return (
    <section id="sl-gallery" className="mx-auto max-w-7xl py-16">
      <div className="mb-12 text-center">
        <h3 className="font-['Space_Grotesk'] text-4xl font-bold text-white md:text-5xl">Sri Lanka Location Gallery</h3>
        <p className="mt-4 text-lg text-slate-200">
          Browse signature locations across the island through curated visual highlights.
        </p>
      </div>

      <div className="mb-16">
        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6 scrollbar-hide scroll-smooth">
          {[
            {
              title: 'Sigiriya Rock Fortress',
              subtitle: 'Ancient Wonder of the World',
              image: 'https://images.unsplash.com/photo-1587467512961-120760940315?q=80&w=1920&auto=format&fit=crop',
            },
            {
              title: 'Tea Plantations',
              subtitle: 'Emerald Hills of Nuwara Eliya',
              image: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=1920&auto=format&fit=crop',
            },
            {
              title: 'Galle Fort Sunset',
              subtitle: 'Colonial Heritage by the Sea',
              image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop',
            },
            {
              title: 'Nine Arches Bridge',
              subtitle: 'Engineering Marvel in Ella',
              image: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1920&auto=format&fit=crop',
            },
            {
              title: 'Mirissa Beach',
              subtitle: 'Tropical Paradise Coastline',
              image: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?q=80&w=1920&auto=format&fit=crop',
            },
            {
              title: 'Yala National Park',
              subtitle: 'Wildlife Safari Adventure',
              image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1920&auto=format&fit=crop',
            },
          ].map((location) => (
            <div key={location.title} className="group w-80 flex-none snap-start">
              <div className="relative h-64 overflow-hidden rounded-2xl">
                <img
                  src={location.image}
                  alt={location.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="mb-2 text-xl font-bold text-white">{location.title}</h4>
                  <p className="text-sm text-slate-200">{location.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Kandy Temple of the Tooth',
            subtitle: 'Sacred Buddhist Relic Site',
            image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?q=80&w=1920&auto=format&fit=crop',
            featured: true,
          },
          {
            title: 'Dambulla Cave Temple',
            subtitle: 'Ancient Rock Cave Monastery',
            image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=1920&auto=format&fit=crop',
          },
          {
            title: "Adam's Peak",
            subtitle: 'Sacred Mountain Pilgrimage',
            image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop',
          },
          {
            title: 'Polonnaruwa Ruins',
            subtitle: 'Medieval Ancient City',
            image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1920&auto=format&fit=crop',
          },
          {
            title: 'Trincomalee Beach',
            subtitle: 'Pristine Eastern Coast',
            image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop',
          },
          {
            title: 'Horton Plains',
            subtitle: 'Cloud Forest National Park',
            image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1920&auto=format&fit=crop',
          },
        ].map((location, index) => (
          <article
            key={location.title}
            className={`group relative overflow-hidden rounded-3xl border border-white/20 bg-slate-900/45 backdrop-blur-xl transition-all duration-700 hover:scale-105 ${
              location.featured ? 'md:col-span-2 lg:col-span-2' : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`relative overflow-hidden ${location.featured ? 'h-80' : 'h-64'}`}>
              <img
                src={location.image}
                alt={location.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute right-4 top-4">
                <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200 backdrop-blur-sm">
                  {location.featured ? 'Featured' : 'Popular'}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h4 className={`mb-2 font-['Space_Grotesk'] font-bold text-white ${location.featured ? 'text-2xl' : 'text-xl'}`}>
                  {location.title}
                </h4>
                <p className="text-sm text-slate-200">{location.subtitle}</p>
                <button className="mt-4 flex items-center gap-2 text-sm font-semibold text-sky-300 transition-colors hover:text-sky-200">
                  View destination details
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
