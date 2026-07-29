export default function DashboardStatCard({
  label,
  value,
  sub,
  icon,
  accent = 'orange',
  trend,
}) {
  const accents = {
    orange: 'from-orange-500 to-amber-500 shadow-orange-500/20',
    emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/20',
    blue: 'from-blue-600 to-indigo-600 shadow-blue-600/20',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/20',
    rose: 'from-rose-500 to-pink-500 shadow-rose-500/20',
    slate: 'from-slate-700 to-slate-900 shadow-slate-900/20',
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-0.5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-50 group-hover:scale-110 transition-transform duration-500" />
      <div className="relative flex items-start justify-between gap-4">
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${accents[accent] || accents.orange} text-white flex items-center justify-center text-xl shadow-lg shrink-0`}>
          {typeof icon === 'string' ? <i className={`bi ${icon}`} /> : icon}
        </div>
        {trend != null && (
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="relative mt-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-1.5">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs font-semibold text-slate-500 mt-2">{sub}</p>}
      </div>
    </div>
  )
}
