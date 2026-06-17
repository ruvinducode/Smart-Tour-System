import { useCallback, useEffect, useState } from 'react'
import { getCustomerPayments, updateCustomerPayment } from '../../services/api.js'
import { downloadCsv, formatFinanceCurrency } from '../../utils/financeUtils.js'
import {
  FinanceDataTable,
  FinancePagination,
  FinanceSectionHeader,
  FinanceStatusBadge,
  FinanceToast,
} from './FinanceShared.jsx'

export default function CustomerPayments({ token }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCustomerPayments(token, { page, per_page: 15, status, search })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, page, status, search])

  useEffect(() => { load() }, [load])

  const markPaid = async (id) => {
    try {
      await updateCustomerPayment(id, { status: 'paid', payment_date: new Date().toISOString() }, token)
      setToast({ message: 'Payment marked as paid', type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const handleExport = () => {
    downloadCsv('customer_payments.csv', items.map((r) => ({
      booking_id: r.booking_id,
      customer: r.customer_name,
      tour_id: r.tour_id,
      final_price: r.final_agreed_price,
      service_fee: r.customer_service_fee,
      total: r.total_customer_payment,
      status: r.status,
    })))
  }

  return (
    <div>
      <FinanceSectionHeader title="Customer Payments" subtitle="Track customer billing and payment status">
        <button type="button" onClick={handleExport} className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-black">
          <i className="bi bi-download" /> Export CSV
        </button>
      </FinanceSectionHeader>

      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search customer, booking…"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold min-w-[200px]" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <FinanceDataTable
        loading={loading}
        rows={items}
        columns={[
          { key: 'booking_id', label: 'Booking' },
          { key: 'customer_name', label: 'Customer' },
          { key: 'tour_id', label: 'Tour' },
          { key: 'final_agreed_price', label: 'Agreed Price', render: (r) => formatFinanceCurrency(r.final_agreed_price) },
          { key: 'customer_service_fee', label: 'Service Fee', render: (r) => formatFinanceCurrency(r.customer_service_fee) },
          { key: 'total_customer_payment', label: 'Total', render: (r) => formatFinanceCurrency(r.total_customer_payment) },
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
