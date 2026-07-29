const TRACKABLE_STATUSES = new Set(['en_route', 'arrived', 'ongoing'])

const statusStyles = {
  planned: { label: 'Planned', bg: 'bg-blue-50 text-blue-700 ring-blue-100' },
  confirmed: { label: 'Confirmed', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  driver_approved: { label: 'Approved', bg: 'bg-teal-50 text-teal-700 ring-teal-100' },
  price_sent_by_driver: { label: 'Negotiating', bg: 'bg-amber-50 text-amber-700 ring-amber-100' },
  en_route: { label: 'En Route', bg: 'bg-orange-50 text-orange-700 ring-orange-100' },
  arrived: { label: 'Arrived', bg: 'bg-violet-50 text-violet-700 ring-violet-100' },
  ongoing: { label: 'Ongoing', bg: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
  completed: { label: 'Completed', bg: 'bg-slate-100 text-slate-600 ring-slate-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-50 text-rose-600 ring-rose-100' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 ring-rose-100' },
}

export function isTourLiveTrackable(tour) {
  if (!tour) return false
  return !!(tour.driver_name || tour.driver_id)
}

export function isTourGpsActive(tour) {
  if (!tour) return false
  const hasGps = tour.driver_lat != null && tour.driver_lng != null
  const active = TRACKABLE_STATUSES.has(tour.status)
  return hasGps || active
}

export function isTourDeletableByAdmin(tour) {
  return tour?.status === 'cancelled' || tour?.status === 'rejected' || tour?.status === 'completed'
}

function TourStatusBadge({ status }) {
  const s = statusStyles[status] || { label: status, bg: 'bg-slate-100 text-slate-600 ring-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${s.bg}`}>
      {s.label}
    </span>
  )
}

export function AdminTourCard({ tour, onViewDetails, onTrack, onDelete, busy }) {
  const canTrack = isTourLiveTrackable(tour)
  const gpsLive = isTourGpsActive(tour)
  const canDelete = isTourDeletableByAdmin(tour)
  const price = tour.total_price ?? tour.estimated_price

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
        gpsLive ? 'from-orange-400 to-amber-500' : 'from-[#1a2e6f] to-indigo-600'
      }`} />
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tour #{tour.id}</p>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {tour.pickup_name || 'Custom Route'}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {tour.start_date}{tour.end_date && tour.end_date !== tour.start_date ? ` → ${tour.end_date}` : ''}
              {tour.total_days ? ` · ${tour.total_days} day${tour.total_days !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <TourStatusBadge status={tour.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl bg-sky-50 border border-sky-100 p-3.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-sky-500 mb-1.5 flex items-center gap-1">
              <i className="bi bi-person-fill" /> Traveler
            </p>
            <p className="text-sm font-black text-slate-900 truncate">{tour.user_name || 'Guest'}</p>
            <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">{tour.user_email || '—'}</p>
          </div>
          <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1.5 flex items-center gap-1">
              <i className="bi bi-steering-wheel" /> Driver
            </p>
            <p className="text-sm font-black text-slate-900 truncate">{tour.driver_name || 'Unassigned'}</p>
            <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
              {tour.vehicle_type || '—'}{tour.vehicle_number ? ` · ${tour.vehicle_number}` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Distance</p>
            <p className="text-sm font-black text-slate-800 mt-1">{tour.total_distance_km ?? '—'}<span className="text-[10px] text-slate-400 ml-0.5">km</span></p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fare</p>
            <p className="text-sm font-black text-slate-800 mt-1">Rs. {Number(price || 0).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">GPS</p>
            <p className={`text-sm font-black mt-1 ${gpsLive ? 'text-emerald-600' : 'text-slate-400'}`}>
              {gpsLive ? 'Live' : canTrack ? 'Ready' : '—'}
            </p>
          </div>
        </div>

        {gpsLive && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <p className="text-[11px] font-bold text-emerald-700">Driver location available — live tracking ready</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewDetails(tour)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-black text-white hover:bg-[#1a2e6f] transition disabled:opacity-50"
          >
            <i className="bi bi-eye" /> Details
          </button>
          {canTrack && (
            <button
              type="button"
              onClick={() => onTrack(tour)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-[11px] font-black text-white hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              <i className="bi bi-broadcast-pin" /> Track Live
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(tour)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2.5 text-[11px] font-black hover:bg-rose-500 hover:text-white transition disabled:opacity-50"
            >
              <i className="bi bi-trash3" /> Delete
            </button>
          )}
        </div>

        <p className="text-[10px] font-semibold text-slate-400 mt-4">
          Created {tour.created_at ? new Date(tour.created_at).toLocaleString() : '—'}
        </p>
      </div>
    </article>
  )
}

export function filterToursBySearch(tours, search) {
  const q = search.trim().toLowerCase()
  if (!q) return tours
  return tours.filter((t) => [
    t.id,
    t.user_name,
    t.user_email,
    t.driver_name,
    t.vehicle_type,
    t.vehicle_number,
    t.status,
    t.pickup_name,
  ].some((v) => String(v ?? '').toLowerCase().includes(q)))
}
