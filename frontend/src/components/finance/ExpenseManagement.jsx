import { useCallback, useEffect, useState } from 'react'
import { createExpense, deleteExpense, getExpenses } from '../../services/api.js'
import { formatFinanceCurrency } from '../../utils/financeUtils.js'
import ConfirmationModal from '../ConfirmationModal.jsx'
import {
  FinanceDataTable,
  FinancePagination,
  FinanceSectionHeader,
  FinanceToast,
} from './FinanceShared.jsx'

const CATEGORIES = [
  'fuel', 'maintenance', 'vehicle_repairs', 'marketing',
  'salaries', 'office_expenses', 'software_subscriptions', 'other',
]

const EMPTY_FORM = { name: '', category: 'other', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10) }

export default function ExpenseManagement({ token }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [receipt, setReceipt] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getExpenses(token, { page, per_page: 15 })
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token, page])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (receipt) fd.append('receipt', receipt)
    try {
      await createExpense(fd, token)
      setToast({ message: 'Expense added', type: 'success' })
      setForm(EMPTY_FORM)
      setReceipt(null)
      setShowForm(false)
      load()
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteExpense(deleteId, token)
      setToast({ message: 'Expense deleted', type: 'success' })
      setDeleteId(null)
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  return (
    <div>
      <FinanceSectionHeader title="Expense Management" subtitle="Track operational and business expenses" accent="orange">
        <button type="button" onClick={() => setShowForm(true)} className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-black">
          <i className="bi bi-plus-lg" /> Add Expense
        </button>
      </FinanceSectionHeader>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-[1.75rem] bg-white border border-slate-100 p-6 shadow-sm mb-6 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">New Expense</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <input required placeholder="Expense name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold" />
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <input required type="number" min="0.01" step="0.01" placeholder="Amount (LKR)" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold" />
            <input required type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-semibold min-h-[80px]" />
          <input type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] || null)} className="text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-orange-500 text-white px-5 py-2.5 text-sm font-black">Save Expense</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold">Cancel</button>
          </div>
        </form>
      )}

      <FinanceDataTable
        loading={loading}
        rows={items}
        columns={[
          { key: 'expense_date', label: 'Date' },
          { key: 'name', label: 'Name' },
          { key: 'category', label: 'Category', render: (r) => String(r.category).replace(/_/g, ' ') },
          { key: 'amount', label: 'Amount', render: (r) => formatFinanceCurrency(r.amount) },
          { key: 'description', label: 'Description' },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <button type="button" onClick={() => setDeleteId(r.id)} className="text-rose-600 text-xs font-black">Delete</button>
            ),
          },
        ]}
      />
      <FinancePagination page={page} total={total} perPage={15} onPageChange={setPage} />

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Expense?"
        message="This expense record will be permanently removed."
        type="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
      <FinanceToast message={toast.message} type={toast.type} onClose={() => setToast({ message: '' })} />
    </div>
  )
}
