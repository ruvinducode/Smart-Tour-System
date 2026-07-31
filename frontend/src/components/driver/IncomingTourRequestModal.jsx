import { useState } from 'react'
import { useDriverLang } from '../../i18n/DriverLanguageContext.jsx'

// Interrupts the driver with a single new, still-open tour request matching
// their vehicle type — Accept/Negotiate reuse the exact same handlers as the
// "Upcoming" tab so both surfaces stay in sync. "Dismiss" is client-side only
// (there's no "decline a request" concept on the backend — the request stays
// open for the driver to act on later from the Upcoming tab); it just stops
// this specific tour from re-interrupting again this session.
//
// After sending a price, this used to just vanish behind a generic toast —
// unlike the "Negotiating" tab's card, which shows the offer is pending and
// lets the driver update it. That mismatch is what "usual flow doesn't
// implement" meant: negotiating from here was a dead end instead of the same
// ongoing flow. Now it mirrors that card directly — after sending, the modal
// stays open showing the pending offer with the option to adjust it, exactly
// like DriverTourCard's pending/declined states, until the driver explicitly
// closes it.
export default function IncomingTourRequestModal({ tour, onAccept, onNegotiate, onDismiss, busy }) {
  const { t } = useDriverLang()
  const [showPriceInput, setShowPriceInput] = useState(false)
  const [price, setPrice] = useState('')
  const [sentOffer, setSentOffer] = useState(null) // { price } once an offer has been sent for this tour
  const [sendError, setSendError] = useState('')

  if (!tour) return null

  const handleSend = async () => {
    setSendError('')
    try {
      await onNegotiate(tour.id, price)
      setSentOffer({ price: Number(price) })
      setShowPriceInput(false)
    } catch (err) {
      setSendError(err.message || t('toast.couldNotSendPrice'))
    }
  }

  const handleUpdate = () => {
    setPrice(sentOffer ? String(sentOffer.price) : price)
    setSentOffer(null)
    setShowPriceInput(true)
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-300">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">{t('incoming.title')}</p>
          <h3 className="text-xl font-black mt-0.5">{tour.user_name}</h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <i className="bi bi-geo-alt-fill text-emerald-500 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('incoming.pickup')}</p>
              <p className="text-sm font-bold text-slate-800 truncate">{tour.pickup_name || '—'}</p>
            </div>
          </div>
          {tour.destination_name && (
            <div className="flex items-start gap-3">
              <i className="bi bi-flag-fill text-rose-500 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('incoming.destination')}</p>
                <p className="text-sm font-bold text-slate-800 truncate">{tour.destination_name}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[9px] font-bold uppercase text-slate-400">{t('incoming.distance')}</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">{tour.total_distance_km ? `${tour.total_distance_km} km` : '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[9px] font-bold uppercase text-slate-400">{t('incoming.stops')}</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">{tour.stops_count || '—'}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-[9px] font-bold uppercase text-amber-600">{t('incoming.price')}</p>
              <p className="text-sm font-black text-amber-700 mt-0.5">{tour.estimated_price ? `Rs.${Math.round(tour.estimated_price).toLocaleString()}` : '—'}</p>
            </div>
          </div>

          {sentOffer ? (
            <div className="space-y-2.5 pt-1">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Offer Pending</p>
                <p className="text-sm font-bold text-blue-800">
                  Rs. {sentOffer.price.toLocaleString()} sent — waiting for the traveler to respond.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleUpdate}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-black transition disabled:opacity-40"
                >
                  Update Offer
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDismiss(tour.id)}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 py-3 text-xs font-black transition disabled:opacity-40"
                >
                  Done
                </button>
              </div>
            </div>
          ) : showPriceInput ? (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  autoFocus
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t('incoming.yourPricePlaceholder')}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-orange-400"
                />
                <button
                  type="button"
                  disabled={!price || busy}
                  onClick={handleSend}
                  className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-black disabled:opacity-40"
                >
                  {t('incoming.send')}
                </button>
              </div>
              {sendError && (
                <p className="text-[11px] font-bold text-rose-600">{sendError}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => onAccept(tour.id)}
                className="col-span-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-xs font-black transition disabled:opacity-40"
              >
                {t('incoming.accept')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowPriceInput(true)}
                className="col-span-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-black transition disabled:opacity-40"
              >
                {t('incoming.negotiate')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDismiss(tour.id)}
                className="col-span-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 py-3 text-xs font-black transition disabled:opacity-40"
              >
                {t('incoming.notNow')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
