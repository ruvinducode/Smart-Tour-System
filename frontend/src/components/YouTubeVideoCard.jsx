import { useState } from 'react'

// Facade pattern: render only a static thumbnail + play button until the
// user actually wants the video. YouTube's real embed pulls in a heavy
// iframe (its own JS, cookies, network requests) on every page load if
// mounted eagerly — for a landing page with 3 of these, that's real
// bytes and requests nobody asked for yet. youtube-nocookie.com also
// avoids setting tracking cookies until that explicit interaction.
export default function YouTubeVideoCard({ videoId, title, className = '' }) {
  const [playing, setPlaying] = useState(false)

  if (!videoId) return null

  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

  return (
    <div className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-slate-900 shadow-xl ${className}`}>
      {playing ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 w-full h-full"
        >
          <img
            src={thumbnail}
            loading="lazy"
            decoding="async"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 shadow-2xl transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110">
              <i className="bi bi-play-fill text-emerald-950 text-3xl sm:text-4xl translate-x-0.5" aria-hidden="true" />
            </span>
          </span>
          <span className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-left">
            <span className="block text-white text-sm sm:text-base font-bold leading-snug drop-shadow">{title}</span>
          </span>
        </button>
      )}
    </div>
  )
}
