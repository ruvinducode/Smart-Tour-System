export function FinanceSectionHeader({ title, subtitle, children, accent = 'emerald' }) {
  const gradients = {
    emerald: 'from-emerald-600 via-teal-700 to-[#1a2e6f]',
    orange: 'from-orange-500 via-amber-600 to-[#1a2e6f]',
    violet: 'from-violet-600 via-indigo-700 to-[#1a2e6f]',
  }
  return (
    <div className={`rounded-[2rem] bg-gradient-to-r ${gradients[accent] || gradients.emerald} p-6 sm:p-8 text-white shadow-xl mb-6`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Finance Management</p>
          <h2 className="text-2xl sm:text-3xl font-black mt-1">{title}</h2>
          {subtitle && <p className="text-sm text-white/80 mt-1">{subtitle}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  )
}

export function FinanceKpiCard({ label, value, icon, accent = 'text-emerald-600' }) {
  return (
    <div className="rounded-[1.5rem] bg-white border border-slate-100 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <i className={`bi ${icon}`} /> {label}
      </p>
      <p className={`text-xl sm:text-2xl font-black mt-2 ${accent}`}>{value}</p>
    </div>
  )
}

export function FinanceStatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    partially_paid: 'bg-blue-50 text-blue-700 ring-blue-100',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    failed: 'bg-rose-50 text-rose-700 ring-rose-100',
    refunded: 'bg-violet-50 text-violet-700 ring-violet-100',
    processing: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
    approved: 'bg-teal-50 text-teal-700 ring-teal-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }
  const cls = styles[status] || 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${cls}`}>
      {String(status || '—').replace(/_/g, ' ')}
    </span>
  )
}

export function FinanceDataTable({ columns, rows, loading, emptyMessage = 'No records found' }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
      </div>
    )
  }
  if (!rows?.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500 font-semibold">
        {emptyMessage}
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 font-semibold text-slate-800">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FinancePagination({ page, total, perPage, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <p className="text-slate-500 font-semibold">Page {page} of {pages} · {total} records</p>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Prev</button>
        <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Next</button>
      </div>
    </div>
  )
}

export function FinanceToast({ message, type = 'success', onClose }) {
  if (!message) return null
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-[100] rounded-2xl border px-5 py-3 shadow-xl font-bold text-sm flex items-center gap-3 ${styles[type]}`}>
      <span>{message}</span>
      <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100"><i className="bi bi-x-lg" /></button>
    </div>
  )
}
