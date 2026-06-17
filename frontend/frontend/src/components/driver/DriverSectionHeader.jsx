const ACCENTS = {
  orange: 'from-orange-500 via-amber-500 to-orange-600',
  emerald: 'from-emerald-500 via-teal-500 to-emerald-600',
  blue: 'from-blue-600 via-indigo-600 to-violet-600',
  violet: 'from-violet-600 via-purple-600 to-indigo-600',
  slate: 'from-slate-800 via-slate-700 to-slate-900',
}

export default function DriverSectionHeader({
  title,
  subtitle,
  icon = 'bi-compass',
  accent = 'orange',
  count,
  countLabel = 'items',
  children,
}) {
  const gradient = ACCENTS[accent] || ACCENTS.orange

  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${gradient} p-6 sm:p-8 text-white shadow-xl shadow-orange-500/10`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl shadow-lg">
            <i className={`bi ${icon}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-sm text-white/80 font-medium mt-1 max-w-xl">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {count != null && (
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 px-5 py-3 text-center">
              <p className="text-2xl font-black leading-none">{count}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mt-1">{countLabel}</p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
