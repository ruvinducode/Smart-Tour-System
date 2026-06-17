import { getApiBaseUrl } from '../../services/api.js'

function Avatar({ name, accent = 'sky', imageUrl }) {
  const accents = {
    sky: 'from-sky-400 to-blue-600',
    orange: 'from-orange-400 to-amber-600',
    emerald: 'from-emerald-400 to-teal-600',
    rose: 'from-rose-400 to-pink-600',
  }
  if (imageUrl) {
    return (
      <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0">
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${accents[accent]} text-white flex items-center justify-center text-lg font-black shadow-lg shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

function StatusPill({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
      active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

export function AdminSectionHeader({ title, subtitle, count, countLabel, accent = 'blue', search, onSearchChange, placeholder }) {
  const accents = {
    blue: 'from-[#1a2e6f] to-indigo-800',
    orange: 'from-orange-500 to-amber-600',
    rose: 'from-rose-500 to-pink-600',
    violet: 'from-violet-600 to-purple-800',
  }
  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${accents[accent]} p-6 sm:p-8 text-white shadow-xl mb-6`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-2">Administration</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-white/70 mt-2 max-w-xl">{subtitle}</p>}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder || 'Search…'}
              className="w-full sm:w-72 rounded-2xl bg-white/10 border border-white/20 pl-11 pr-4 py-3 text-sm font-semibold text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-white/40"
            />
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/20 px-5 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black">{count}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{countLabel}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminEmptyState({ icon, title, message }) {
  return (
    <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/80 py-20 px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-4">
        <i className={`bi ${icon}`} />
      </div>
      <h3 className="text-lg font-black text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-2">{message}</p>
    </div>
  )
}

export function AdminUserCard({ user, onEdit, onDelete, busy }) {
  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 to-blue-600" />
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} accent="sky" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 truncate">{user.name}</h3>
                <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
              <StatusPill active={user.is_active} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</p>
            <p className="text-xs font-bold text-slate-700 mt-1 truncate">{user.phone || '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Country</p>
            <p className="text-xs font-bold text-slate-700 mt-1 truncate">{user.country || '—'}</p>
          </div>
        </div>

        <p className="text-[10px] font-semibold text-slate-400 mt-4">
          Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(user)}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-orange-600 transition disabled:opacity-50"
          >
            <i className="bi bi-pencil-square" /> Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(user)}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 px-4 py-2.5 text-xs font-black hover:bg-rose-500 hover:text-white transition disabled:opacity-50"
          >
            <i className="bi bi-trash3" />
          </button>
        </div>
      </div>
    </article>
  )
}

export function AdminDriverCard({ driver, onEdit, onView, onApprove, onDeactivate, onReject, busy, variant = 'all' }) {
  const base = getApiBaseUrl()
  const photoUrl = driver.profile_photo ? `${base}/uploads/drivers/${driver.profile_photo}` : null

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
        variant === 'pending' ? 'from-amber-400 to-orange-500' : driver.is_approved ? 'from-emerald-400 to-teal-600' : 'from-slate-400 to-slate-600'
      }`} />
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar name={driver.name} accent={variant === 'pending' ? 'orange' : 'emerald'} imageUrl={photoUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 truncate">{driver.name}</h3>
                <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{driver.email}</p>
              </div>
              {variant === 'pending' ? (
                <span className="shrink-0 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider">Pending</span>
              ) : (
                <StatusPill active={driver.is_approved} activeLabel="Approved" inactiveLabel="Pending" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <i className="bi bi-telephone text-orange-500" />
            <span>{driver.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <i className="bi bi-car-front text-sky-500" />
            <span>{driver.vehicle || '—'}{driver.vehicle_number ? ` · ${driver.vehicle_number}` : ''}</span>
          </div>
          {driver.nic_number && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <i className="bi bi-person-vcard text-violet-500" />
              <span>{driver.nic_number}</span>
            </div>
          )}
          {driver.home_district && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <i className="bi bi-geo-alt text-emerald-500" />
              <span>{driver.home_district}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => onView(driver)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-200 transition">
            <i className="bi bi-eye" /> View
          </button>
          <button type="button" onClick={() => onEdit(driver)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white hover:bg-orange-600 transition disabled:opacity-50">
            <i className="bi bi-pencil-square" /> Edit
          </button>
          {variant === 'pending' ? (
            <>
              <button type="button" onClick={() => onApprove(driver.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-600 transition disabled:opacity-50">
                <i className="bi bi-check-lg" /> Approve
              </button>
              <button type="button" onClick={() => onReject(driver.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-[11px] font-black text-white hover:bg-rose-600 transition disabled:opacity-50">
                <i className="bi bi-x-lg" /> Reject
              </button>
            </>
          ) : driver.is_approved ? (
            <button type="button" onClick={() => onDeactivate(driver.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 px-3 py-2 text-[11px] font-black hover:bg-rose-500 hover:text-white transition disabled:opacity-50">
              <i className="bi bi-slash-circle" /> Deactivate
            </button>
          ) : (
            <button type="button" onClick={() => onApprove(driver.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-600 transition disabled:opacity-50">
              <i className="bi bi-check-lg" /> Approve
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export function filterBySearch(items, search, fields) {
  const q = search.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => fields.some((f) => String(item[f] || '').toLowerCase().includes(q)))
}
