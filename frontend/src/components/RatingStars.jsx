// Shared star-rating display — used on the admin driver cards/details modal,
// the driver dashboard overview, and the user's live-tracking driver panel,
// so all three read the exact same driver.rating/total_ratings fields the
// same way instead of three separately hand-rolled star renderers.
export default function RatingStars({ rating, totalRatings, size = 'text-xs', showCount = true, className = '' }) {
  const hasRatings = Number(totalRatings) > 0
  const value = hasRatings ? Number(rating) || 0 : 0

  if (!hasRatings) {
    return (
      <span className={`text-[10px] font-bold uppercase tracking-widest text-slate-400 ${className}`}>
        New driver
      </span>
    )
  }

  const stars = [1, 2, 3, 4, 5].map((n) => {
    if (value >= n - 0.25) return 'bi-star-fill'
    if (value >= n - 0.75) return 'bi-star-half'
    return 'bi-star'
  })

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`text-amber-400 ${size} tracking-tight`}>
        {stars.map((icon, i) => <i key={i} className={`bi ${icon}`} />)}
      </span>
      <span className="text-[10px] font-bold text-slate-500">{value.toFixed(1)}</span>
      {showCount && (
        <span className="text-[10px] font-medium text-slate-400">
          ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </span>
  )
}
