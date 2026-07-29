import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getFinanceDashboard } from '../../services/api.js'
import { formatFinanceCurrency } from '../../utils/financeUtils.js'
import { FinanceDataTable, FinanceKpiCard, FinanceSectionHeader } from './FinanceShared.jsx'

export default function FinanceDashboard({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    getFinanceDashboard(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (error) return <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 font-semibold">{error}</div>
  if (loading || !data) {
    return <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" /></div>
  }

  const { kpis, charts, recent_transactions } = data

  return (
    <div>
      <FinanceSectionHeader title="Finance Dashboard" subtitle="Revenue, expenses, and platform performance at a glance" />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <FinanceKpiCard label="Total Revenue" value={formatFinanceCurrency(kpis.total_revenue)} icon="bi-cash-stack" />
        <FinanceKpiCard label="Total Expenses" value={formatFinanceCurrency(kpis.total_expenses)} icon="bi-receipt" accent="text-rose-600" />
        <FinanceKpiCard label="Net Profit" value={formatFinanceCurrency(kpis.net_profit)} icon="bi-graph-up-arrow" accent="text-indigo-600" />
        <FinanceKpiCard label="Pending Customer" value={formatFinanceCurrency(kpis.pending_customer_payments)} icon="bi-hourglass-split" accent="text-amber-600" />
        <FinanceKpiCard label="Pending Driver" value={formatFinanceCurrency(kpis.pending_driver_payouts)} icon="bi-wallet2" accent="text-orange-600" />
        <FinanceKpiCard label="Bookings Revenue" value={formatFinanceCurrency(kpis.total_bookings_revenue)} icon="bi-calendar-check" />
        <FinanceKpiCard label="Platform Revenue" value={formatFinanceCurrency(kpis.platform_revenue)} icon="bi-building" accent="text-violet-600" />
        <FinanceKpiCard label="Monthly Revenue" value={formatFinanceCurrency(kpis.monthly_revenue)} icon="bi-bar-chart-line" />
        <FinanceKpiCard label="Monthly Profit" value={formatFinanceCurrency(kpis.monthly_profit)} icon="bi-piggy-bank" accent="text-teal-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="rounded-[1.75rem] bg-white border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Monthly Revenue & Expenses</h3>
          <div className="h-64 chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={charts.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatFinanceCurrency(v)} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-white border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Revenue by Vehicle Type</h3>
          <div className="h-64 chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenue_by_vehicle_type} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="vehicle_type" type="category" width={80} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatFinanceCurrency(v)} />
                <Bar dataKey="revenue" fill="#1a2e6f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">Recent Transactions</h3>
        <FinanceDataTable
          columns={[
            { key: 'transaction_date', label: 'Date', render: (r) => r.transaction_date?.slice(0, 10) },
            { key: 'transaction_type', label: 'Type' },
            { key: 'category', label: 'Category', render: (r) => String(r.category).replace(/_/g, ' ') },
            { key: 'amount', label: 'Amount', render: (r) => formatFinanceCurrency(r.amount) },
            { key: 'description', label: 'Description' },
          ]}
          rows={recent_transactions}
        />
      </div>
    </div>
  )
}
