import { useCallback, useEffect, useState } from 'react'
import { getDriverPayments, updateDriverPayment } from '../../services/api.js'
import { downloadCsv, formatFinanceCurrency } from '../../utils/financeUtils.js'
import {
  FinanceDataTable,
  FinancePagination,
  FinanceSectionHeader,
  FinanceStatusBadge,
  FinanceToast,
} from './FinanceShared.jsx'

export default function DriverPayments({ token }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDriverPayments(token, { page, per_page: 15, status })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, page, status])

  useEffect(() => { load() }, [load])

  const markPaid = async (id) => {
    try {
      await updateDriverPayment(id, { status: 'paid', payment_date: new Date().toISOString() }, token)
      setToast({ message: 'Driver payout marked as paid', type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const handleExport = () => {
    downloadCsv('driver_payments.csv', items.map((r) => ({
      booking_id: r.booking_id,
      driver: r.driver_name,
      tour_id: r.tour_id,
      agreed_price: r.final_agreed_price,
      service_fee: r.driver_service_fee,
      payout: r.driver_payout,
      status: r.status,
    })))
  }

  return (
    <div>
      <FinanceSectionHeader title="Driver Payments" subtitle="Driver payouts and service fee deductions">
        <button type="button" onClick={handleExport} className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-black">
          <i className="bi bi-download" /> Export CSV
        </button>
      </FinanceSectionHeader>

      <div className="mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <FinanceDataTable
        loading={loading}
        rows={items}
        columns={[
          { key: 'booking_id', label: 'Booking' },
          { key: 'driver_name', label: 'Driver' },
          { key: 'tour_id', label: 'Tour' },
          { key: 'final_agreed_price', label: 'Agreed Price', render: (r) => formatFinanceCurrency(r.final_agreed_price) },
          { key: 'driver_service_fee', label: 'Service Fee', render: (r) => formatFinanceCurrency(r.driver_service_fee) },
          { key: 'driver_payout', label: 'Payout', render: (r) => formatFinanceCurrency(r.driver_payout) },
          { key: 'status', label: 'Status', render: (r) => <FinanceStatusBadge status={r.status} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => r.status !== 'paid' && (
              <button type="button" onClick={() => markPaid(r.id)} className="text-xs font-black text-emerald-600 hover:underline">
                Mark Paid
              </button>
            ),
          },
        ]}
      />
      <FinancePagination page={page} total={total} perPage={15} onPageChange={setPage} />
      <FinanceToast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
    </div>
  )
}
