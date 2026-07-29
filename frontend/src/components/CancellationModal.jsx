import { useState } from 'react'

export default function CancellationModal({ isOpen, onClose, onConfirm, loading, userRole = 'user' }) {
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [error, setError] = useState('')

  const travelerReasons = [
    "Changed my mind",
    "Driver is taking too long",
    "Found another ride",
    "Incorrect pickup location",
    "Driver asked to cancel",
    "Other"
  ]

  const driverReasons = [
    "Vehicle breakdown / Technical issue",
    "Road blockage / Unreachable location",
    "Emergency / Personal issue",
    "Passenger requested to end trip early",
    "Safety concern / Dangerous situation",
    "Other"
  ]

  const reasons = userRole === 'driver' ? driverReasons : travelerReasons

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!reason) {
      setError('Please select a reason')
      return
    }
    const finalReason = reason === 'Other' ? otherReason : reason
    if (reason === 'Other' && !otherReason.trim()) {
      setError('Please specify your reason')
      return
    }
    onConfirm(finalReason)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-4">
            <i className="bi bi-x-circle-fill text-3xl"></i>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Cancel Journey?</h3>
          <p className="text-slate-500 text-sm mt-2">Please tell us why you want to cancel. This helps us improve our service.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
          <div className="space-y-3">
            {reasons.map((r) => (
              <label 
                key={r} 
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  reason === r ? 'border-orange-500 bg-orange-50' : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <input 
                  type="radio" 
                  name="reason" 
                  value={r} 
                  checked={reason === r}
                  onChange={(e) => { setReason(e.target.value); setError('') }}
                  className="hidden"
                />
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  reason === r ? 'border-orange-500 bg-orange-500' : 'border-slate-200'
                }`}>
                  {reason === r && <div className="h-2 w-2 rounded-full bg-white"></div>}
                </div>
                <span className={`text-sm font-bold ${reason === r ? 'text-orange-900' : 'text-slate-600'}`}>{r}</span>
              </label>
            ))}
          </div>

          {reason === 'Other' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <textarea
                placeholder="Please specify your reason..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:border-orange-500 focus:ring-0 transition-all outline-none min-h-[100px]"
                value={otherReason}
                onChange={(e) => { setOtherReason(e.target.value); setError('') }}
              ></textarea>
            </div>
          )}

          {error && (
            <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition"
            >
              Go Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 rounded-2xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Confirm Cancel</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
