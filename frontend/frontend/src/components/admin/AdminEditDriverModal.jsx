import { useEffect, useState } from 'react'
import { VEHICLE_OPTIONS } from '../../vehicleOptions.js'

const inputClass =
  'w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'

export default function AdminEditDriverModal({ driver, isOpen, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', vehicle: '', vehicle_number: '', capacity: '', is_approved: false, is_available: true,
  })

  useEffect(() => {
    if (driver) {
      setForm({
        name: driver.name || '',
        email: driver.email || '',
        phone: driver.phone || '',
        vehicle: driver.vehicle || '',
        vehicle_number: driver.vehicle_number || '',
        capacity: driver.capacity ?? '',
        is_approved: !!driver.is_approved,
        is_available: driver.is_available !== false,
      })
    }
  }, [driver])

  if (!isOpen || !driver) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(driver.id, {
      ...form,
      capacity: form.capacity === '' ? null : Number(form.capacity),
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-8 py-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100/90">Edit Driver</p>
              <h2 className="text-xl font-black mt-1">{driver.name}</h2>
            </div>
            <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
            <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phone</label>
            <input className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vehicle Type</label>
              <select className={inputClass} value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}>
                <option value="">Select vehicle</option>
                {VEHICLE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Capacity</label>
              <input type="number" min="1" className={inputClass} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vehicle Number</label>
            <input className={inputClass} value={form.vehicle_number} onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 cursor-pointer">
              <input type="checkbox" checked={form.is_approved} onChange={(e) => setForm((f) => ({ ...f, is_approved: e.target.checked }))} className="h-4 w-4 rounded text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">Approved</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 cursor-pointer">
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} className="h-4 w-4 rounded text-sky-500" />
              <span className="text-xs font-bold text-slate-700">Available</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-sm font-black text-slate-500 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3.5 rounded-2xl bg-orange-500 text-white text-sm font-black shadow-lg shadow-orange-500/30 hover:bg-orange-600 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
