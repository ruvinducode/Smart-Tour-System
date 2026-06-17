import { useEffect, useState } from 'react'
import { getIncomeSummary } from '../../services/api.js'
import { formatFinanceCurrency } from '../../utils/financeUtils.js'
import { FinanceKpiCard, FinanceSectionHeader } from './FinanceShared.jsx'

const PERIODS = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

const CATEGORY_LABELS = {
  booking_revenue: 'Booking Revenue',
  customer_service_fees: 'Customer Service Fees',
  driver_service_fees: 'Driver Service Fees',
  other_income: 'Other Income',
}

export default function IncomeManagement({ token }) {
  const [period, setPeriod] = useState('monthly')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getIncomeSummary(token, period)
      .then(setData)
      .finally(() => setLoading(false))
  }, [token, period])

  return (
    <div>
      <FinanceSectionHeader title="Income Management" subtitle="Platform income by category and period" accent="violet" />

      <div className="flex flex-wrap gap-2 mb-6">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${period === p.id ? 'bg-[#1a2e6f] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-500" /></div>
      ) : (
        <>
          <FinanceKpiCard label={`Total Income (${period})`} value={formatFinanceCurrency(data?.total)} icon="bi-cash-coin" accent="text-violet-600" />
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {Object.entries(data?.breakdown || {}).map(([key, amount]) => (
              <div key={key} className="rounded-[1.5rem] bg-white border border-slate-100 p-5 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{CATEGORY_LABELS[key] || key}</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{formatFinanceCurrency(amount)}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                  <i className="bi bi-graph-up" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
