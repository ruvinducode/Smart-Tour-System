export function formatFinanceCurrency(amount) {
  const n = Number(amount) || 0
  return `Rs. ${n.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function downloadCsv(filename, rows) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadReportCsv(token, params, exportFn) {
  const res = await exportFn(token, { ...params, format: 'csv' })
  const text = await res.text()
  const blob = new Blob([text], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${params.type || 'report'}_${params.period || 'monthly'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function printReportHtml(title, rows, columns) {
  const win = window.open('', '_blank')
  if (!win) return
  const head = columns.map((c) => `<th>${c.label}</th>`).join('')
  const body = rows.map((row) => `<tr>${columns.map((c) => `<td>${row[c.key] ?? '—'}</td>`).join('')}</tr>`).join('')
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1a2e6f;color:#fff}</style></head>
    <body><h1>${title}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <script>window.print()</script></body></html>`)
  win.document.close()
}

export const STATUS_PILL = {
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
