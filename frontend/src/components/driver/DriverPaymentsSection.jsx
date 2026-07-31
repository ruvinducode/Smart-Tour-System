import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMyDriverPayments } from '../../services/api.js'
import { formatCurrency, getTourEarnings } from '../../utils/dashboardAnalytics.js'
import DriverSectionHeader from './DriverSectionHeader.jsx'
import { useDriverLang } from '../../i18n/DriverLanguageContext.jsx'

const STATUS_STYLES = {
  pending: { labelKey: 'payments.pending', cls: 'bg-amber-50 text-amber-700 ring-amber-100' },
  processing: { labelKey: 'payments.processing', cls: 'bg-blue-50 text-blue-700 ring-blue-100' },
  paid: { labelKey: 'payments.paid', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  cancelled: { labelKey: 'payments.cancelled', cls: 'bg-rose-50 text-rose-600 ring-rose-100' },
}

function PaymentStatusBadge({ status }) {
  const { t } = useDriverLang()
  const s = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${s ? s.cls : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {s ? t(s.labelKey) : status}
    </span>
  )
}

function tourToPaymentRow(tour) {
  const amount = getTourEarnings(tour)
  const isPaid = tour.status === 'completed'
  return {
    id: `tour-${tour.id}`,
    tour_id: tour.id,
    final_agreed_price: amount,
    driver_service_fee: Math.round(amount * 0.05),
    driver_payout: Math.round(amount * 0.95),
    status: isPaid ? 'paid' : tour.status === 'confirmed' ? 'processing' : 'pending',
    payment_date: tour.end_date || tour.start_date,
    created_at: tour.created_at,
    _fromTour: true,
  }
}

export default function DriverPaymentsSection({ token, tourRequests, analytics }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyDriverPayments(token)
      setPayments(Array.isArray(data) ? data : [])
    } catch {
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    if (payments.length > 0) return payments
    return tourRequests
      .filter((t) => ['confirmed', 'completed', 'driver_approved', 'en_route', 'ongoing'].includes(t.status))
      .map(tourToPaymentRow)
  }, [payments, tourRequests])

  const filtered = useMemo(() => {
    if (!filter) return rows
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  const summary = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'paid')
    const pending = rows.filter((r) => ['pending', 'processing'].includes(r.status))
    return {
      totalEarned: paid.reduce((s, r) => s + (r.driver_payout || 0), 0),
      pendingPayout: pending.reduce((s, r) => s + (r.driver_payout || 0), 0),
      paidCount: paid.length,
      pendingCount: pending.length,
    }
  }, [rows])

  const { t } = useDriverLang()

  return (
    <div className="space-y-8">
      <DriverSectionHeader
        title={t('payments.title')}
        subtitle={t('payments.subtitle')}
        icon="bi-wallet2"
        accent="slate"
        count={rows.length}
        countLabel={t('payments.records')}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: t('payments.totalEarned'), value: formatCurrency(summary.totalEarned || analytics.totalEarnings), icon: 'bi-cash-stack', color: 'emerald' },
          { label: t('payments.pendingPayout'), value: formatCurrency(summary.pendingPayout || analytics.pendingEarnings), icon: 'bi-hourglass-split', color: 'amber' },
          { label: t('payments.paidTrips'), value: summary.paidCount, icon: 'bi-check-circle-fill', color: 'blue' },
          { label: t('payments.awaitingPayment'), value: summary.pendingCount, icon: 'bi-clock-history', color: 'orange' },
        ].map((item) => (
          <div key={item.label} className="rounded-[1.5rem] bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${
              item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              item.color === 'amber' ? 'bg-amber-50 text-amber-600' :
              item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              'bg-orange-50 text-orange-600'
            }`}>
              <i className={`bi ${item.icon} text-lg`} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Wallet card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.3),transparent_50%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300/80">{t('payments.driverWallet')}</p>
            <p className="text-4xl font-black mt-2 tracking-tight">{formatCurrency(summary.totalEarned || analytics.totalEarnings)}</p>
            <p className="text-sm text-slate-300 mt-2 font-medium">{t('payments.lifetimePayouts')}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-5 py-4 text-center">
              <p className="text-xl font-black">{analytics.completedCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mt-1">{t('payments.completed')}</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-5 py-4 text-center">
              <p className="text-xl font-black">{formatCurrency(analytics.avgPerTrip)}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mt-1">{t('payments.avgPerTrip')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter + table */}
      <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-black text-slate-900">{t('payments.history')}</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-orange-400"
          >
            <option value="">{t('payments.allStatuses')}</option>
            <option value="pending">{t('payments.pending')}</option>
            <option value="processing">{t('payments.processing')}</option>
            <option value="paid">{t('payments.paid')}</option>
            <option value="cancelled">{t('payments.cancelled')}</option>
          </select>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 font-bold text-sm">{t('payments.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center px-8">
            <i className="bi bi-wallet2 text-4xl text-slate-200 mb-3 block" />
            <p className="font-black text-slate-600">{t('payments.noneYet')}</p>
            <p className="text-sm text-slate-400 mt-1">{t('payments.noneYetHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {[t('payments.col.tour'), t('payments.col.agreedPrice'), t('payments.col.serviceFee'), t('payments.col.yourPayout'), t('payments.col.status'), t('payments.col.date')].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-900">#{row.tour_id}</p>
                      {row.booking_id && <p className="text-[10px] text-slate-400 font-semibold">{t('payments.booking', { id: row.booking_id })}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatCurrency(row.final_agreed_price)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-rose-500">−{formatCurrency(row.driver_service_fee)}</td>
                    <td className="px-6 py-4 text-sm font-black text-emerald-600">{formatCurrency(row.driver_payout)}</td>
                    <td className="px-6 py-4"><PaymentStatusBadge status={row.status} /></td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                      {row.payment_date
                        ? new Date(row.payment_date).toLocaleDateString()
                        : row.created_at
                          ? new Date(row.created_at).toLocaleDateString()
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
