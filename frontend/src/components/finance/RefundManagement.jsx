import { useCallback, useEffect, useState } from 'react'
import { createRefund, getRefunds, updateRefund } from '../../services/api.js'
import { formatFinanceCurrency } from '../../utils/financeUtils.js'
import {
  FinanceDataTable,
  FinancePagination,
  FinanceSectionHeader,
  FinanceStatusBadge,
  FinanceToast,
} from './FinanceShared.jsx'

export default function RefundManagement({ token }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [form, setForm] = useState({ booking_id: '', refund_amount: '', reason: '' })
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRefunds(token, { page, per_page: 15, status })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, page, status])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createRefund({
        booking_id: Number(form.booking_id),
        refund_amount: Number(form.refund_amount),
        reason: form.reason,
      }, token)
      setToast({ message: 'Refund request created', type: 'success' })
      setForm({ booking_id: '', refund_amount: '', reason: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  const updateStatus = async (id, newStatus) => {
    try {
      await updateRefund(id, { status: newStatus }, token)
      setToast({ message: `Refund ${newStatus}`, type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  return (
    <div>
      <FinanceSectionHeader title="Refund Management" subtitle="Process and track customer refunds" accent="violet">
        <button type="button" onClick={() => setShowForm(true)} className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-black">
          <i className="bi bi-plus-lg" /> New Refund
        </button>
      </FinanceSectionHeader>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-[1.75rem] bg-white border border-slate-100 p-6 shadow-sm mb-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <input required type="number" placeholder="Booking ID" value={form.booking_id}
              onChange={(e) => setForm((f) => ({ ...f, booking_id: e.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold" />
            <input required type="number" min="0.01" placeholder="Refund amount (LKR)" value={form.refund_amount}
              onChange={(e) => setForm((f) => ({ ...f, refund_amount: e.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold" />
            <input required placeholder="Reason" value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-violet-600 text-white px-5 py-2.5 text-sm font-black">Submit</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold">Cancel</button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <FinanceDataTable
        loading={loading}
        rows={items}
        columns={[
          { key: 'booking_id', label: 'Booking' },
          { key: 'customer_name', label: 'Customer' },
          { key: 'refund_amount', label: 'Amount', render: (r) => formatFinanceCurrency(r.refund_amount) },
          { key: 'reason', label: 'Reason' },
          { key: 'status', label: 'Status', render: (r) => <FinanceStatusBadge status={r.status} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => r.status === 'pending' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => updateStatus(r.id, 'approved')} className="text-xs font-black text-teal-600">Approve</button>
                <button type="button" onClick={() => updateStatus(r.id, 'rejected')} className="text-xs font-black text-rose-600">Reject</button>
              </div>
            ),
          },
        ]}
      />
      <FinancePagination page={page} total={total} perPage={15} onPageChange={setPage} />
      <FinanceToast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
    </div>
  )
}
