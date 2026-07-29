import { useState } from 'react'
import { exportFinancialReport, getFinancialReport } from '../../services/api.js'
import { downloadReportCsv, formatFinanceCurrency, printReportHtml } from '../../utils/financeUtils.js'
import { FinanceDataTable, FinanceSectionHeader, FinanceToast } from './FinanceShared.jsx'

const REPORT_TYPES = [
  { id: 'revenue', label: 'Revenue Report' },
  { id: 'expense', label: 'Expense Report' },
  { id: 'profit_loss', label: 'Profit & Loss' },
  { id: 'platform_fees', label: 'Platform Fee Report' },
  { id: 'driver_payouts', label: 'Driver Payout Report' },
]

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly', 'custom']

export default function FinancialReports({ token }) {
  const [type, setType] = useState('revenue')
  const [period, setPeriod] = useState('monthly')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const params = { type, period, ...(period === 'custom' && dateFrom && dateTo ? { from: dateFrom, to: dateTo } : {}) }

  const generate = async () => {
    setLoading(true)
    try {
      const data = await getFinancialReport(token, params)
      setReport(data)
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = async () => {
    try {
      await downloadReportCsv(token, params, exportFinancialReport)
      setToast({ message: 'CSV exported', type: 'success' })
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const exportPdf = () => {
    if (!report?.rows?.length && type !== 'profit_loss' && type !== 'platform_fees') {
      setToast({ message: 'Generate a report first', type: 'error' })
      return
    }
    const rows = report.rows || [report]
    const cols = Object.keys(rows[0] || {}).map((k) => ({ key: k, label: k.replace(/_/g, ' ') }))
    printReportHtml(`${type} Report — ${period}`, rows, cols)
  }

  const columns = report?.rows?.length
    ? Object.keys(report.rows[0]).map((k) => ({
        key: k,
        label: k.replace(/_/g, ' '),
        render: (r) => (typeof r[k] === 'number' && k.includes('amount') || k.includes('revenue') || k.includes('fee') || k.includes('payout') || k.includes('profit') || k.includes('expenses'))
          ? formatFinanceCurrency(r[k])
          : r[k],
      }))
    : []

  return (
    <div>
      <FinanceSectionHeader title="Financial Reports" subtitle="Generate and export revenue, expense, and payout reports">
        <button type="button" onClick={exportCsv} className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-black">
          <i className="bi bi-filetype-csv" /> CSV
        </button>
        <button type="button" onClick={exportPdf} className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-black">
          <i className="bi bi-filetype-pdf" /> PDF
        </button>
      </FinanceSectionHeader>

      <div className="rounded-[1.75rem] bg-white border border-slate-100 p-6 shadow-sm mb-6 space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-sm">
            {REPORT_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-sm">
            {PERIODS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          {period === 'custom' && (
            <>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-sm" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-sm" />
            </>
          )}
        </div>
        <button type="button" onClick={generate} disabled={loading}
          className="rounded-xl bg-[#1a2e6f] text-white px-6 py-2.5 text-sm font-black disabled:opacity-50">
          {loading ? 'Generating…' : 'Generate Report'}
        </button>
      </div>

      {report && (
        <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
          <p className="text-sm font-black text-emerald-800">
            {type === 'profit_loss' && `Revenue: ${formatFinanceCurrency(report.revenue)} · Expenses: ${formatFinanceCurrency(report.expenses)} · Net: ${formatFinanceCurrency(report.net_profit)}`}
            {type === 'platform_fees' && `Total Platform Fees: ${formatFinanceCurrency(report.total_platform_fees)}`}
            {report.total != null && type !== 'profit_loss' && type !== 'platform_fees' && `Total: ${formatFinanceCurrency(report.total)}`}
          </p>
        </div>
      )}

      {report?.rows && (
        <FinanceDataTable columns={columns} rows={report.rows} loading={false} />
      )}

      <FinanceToast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
    </div>
  )
}
