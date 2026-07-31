import { useState } from 'react'
import { isTourScheduleLocked, formatTourSchedule } from '../../utils/tourSchedule.js'
import { markTourEnRoute } from '../../services/api.js'
import { useDriverLang } from '../../i18n/DriverLanguageContext.jsx'

const STATUS_STYLES = {
  planned: { labelKey: 'status.planned', bg: 'bg-amber-50 text-amber-700 ring-amber-100', bar: 'from-amber-400 to-orange-500' },
  driver_approved: { labelKey: 'status.driver_approved', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-100', bar: 'from-emerald-400 to-teal-500' },
  price_sent_by_driver: { labelKey: 'status.price_sent_by_driver', bg: 'bg-blue-50 text-blue-700 ring-blue-100', bar: 'from-blue-400 to-indigo-500' },
  confirmed: { labelKey: 'status.confirmed', bg: 'bg-indigo-50 text-indigo-700 ring-indigo-100', bar: 'from-indigo-400 to-violet-500' },
  en_route: { labelKey: 'status.en_route', bg: 'bg-orange-50 text-orange-700 ring-orange-100', bar: 'from-orange-400 to-amber-500' },
  arrived: { labelKey: 'status.arrived', bg: 'bg-teal-50 text-teal-700 ring-teal-100', bar: 'from-teal-400 to-emerald-500' },
  ongoing: { labelKey: 'status.ongoing', bg: 'bg-violet-50 text-violet-700 ring-violet-100', bar: 'from-violet-400 to-purple-500' },
  completed: { labelKey: 'status.completed', bg: 'bg-slate-100 text-slate-600 ring-slate-200', bar: 'from-slate-400 to-slate-500' },
  rejected: { labelKey: 'status.rejected', bg: 'bg-rose-50 text-rose-700 ring-rose-100', bar: 'from-rose-400 to-red-500' },
}

const VARIANT_BARS = {
  upcoming: 'from-indigo-500 via-violet-500 to-purple-600',
  approved: 'from-emerald-500 via-teal-500 to-green-600',
  negotiating: 'from-blue-500 via-indigo-500 to-violet-600',
  recent: 'from-orange-500 via-amber-500 to-orange-600',
}

function StatusBadge({ status }) {
  const { t } = useDriverLang()
  const s = STATUS_STYLES[status]
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${s ? s.bg : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {s ? t(s.labelKey) : status}
    </span>
  )
}

export default function DriverTourCard({
  tour,
  variant = 'recent',
  priceInput = '',
  onPriceChange,
  onViewDetails,
  onApprove,
  onSendPrice,
  onStartDriving,
  token,
}) {
  const { t } = useDriverLang()
  const statusStyle = STATUS_STYLES[tour.status] || STATUS_STYLES.planned
  const topBar = VARIANT_BARS[variant] || statusStyle.bar
  const fare = tour.my_offer?.price ?? tour.driver_price ?? tour.estimated_price ?? 0
  const isActive = ['driver_approved', 'confirmed', 'en_route', 'arrived', 'ongoing'].includes(tour.status)
  const isPending = tour.status === 'planned' || tour.status === 'price_sent_by_driver' || tour.status === 'rejected'
  const scheduleLocked = isTourScheduleLocked(tour)
  const isStartAction = tour.status === 'confirmed' || tour.status === 'driver_approved'
  const [startError, setStartError] = useState('')
  const [starting, setStarting] = useState(false)

  const handleStart = async () => {
    setStartError('')
    setStarting(true)
    try {
      if (isStartAction) await markTourEnRoute(tour.id, token)
      onStartDriving(tour.id)
    } catch (err) {
      // A native alert() can be silently blocked by some mobile browsers/
      // in-app webviews, which made this failure look like tapping the
      // button did nothing at all. An inline message is always visible.
      const isAuthError = /HTTP (401|422)/.test(err.message || '')
      setStartError(
        isAuthError
          ? t('card.sessionExpired')
          : t('card.couldNotStart', { error: err.message })
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${topBar}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('card.tourNumber', { id: tour.id })}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center text-orange-600 font-black text-lg shrink-0 border border-orange-100">
                {(tour.user_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 truncate">{tour.user_name || t('card.anonymous')}</h3>
                <p className="text-[11px] font-semibold text-slate-400 truncate">{tour.user_email || t('card.noEmail')}</p>
              </div>
            </div>
          </div>
          <StatusBadge status={tour.status} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('card.distance')}</p>
            <p className="text-sm font-black text-slate-800 mt-1">{tour.total_distance_km ?? 0}<span className="text-[10px] text-slate-400 ml-0.5">km</span></p>
          </div>
          <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2.5 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">{t('card.duration')}</p>
            <p className="text-sm font-black text-slate-800 mt-1">{tour.total_days ?? 0}<span className="text-[10px] text-slate-400 ml-0.5">d</span></p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">{t('card.fare')}</p>
            <p className="text-sm font-black text-slate-800 mt-1">Rs.{Number(fare).toLocaleString()}</p>
          </div>
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 mb-5">
          <i className="bi bi-calendar3 text-orange-500" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('card.schedule')}</p>
            <p className="text-xs font-bold text-slate-700 truncate">
              {tour.start_date || t('card.tbd')}
              {tour.start_time ? ` @ ${tour.start_time}` : ''}
              {tour.end_date && tour.end_date !== tour.start_date ? ` → ${tour.end_date}` : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onViewDetails(tour.id)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-all"
          >
            <i className="bi bi-map" /> {t('card.viewTripDetails')}
          </button>

          {isActive && (
            isStartAction && scheduleLocked ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{t('card.scheduled')}</p>
                <p className="text-xs font-bold text-amber-900 mt-0.5">{t('card.startsOn', { date: formatTourSchedule(tour) })}</p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={starting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-xs font-black text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <i className={starting ? 'bi bi-arrow-repeat animate-spin' : 'bi bi-cursor-fill'} />
                  {starting ? t('card.starting') : (isStartAction ? t('card.startDriving') : t('card.continueDriving'))}
                </button>
                {startError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center">
                    <p className="text-xs font-bold text-rose-700">{startError}</p>
                  </div>
                )}
              </>
            )
          )}

          {isPending && (() => {
            // A driver's own offer can be declined by the traveler while the
            // tour as a whole is still open to other drivers — so "was I
            // declined" is checked on my_offer, not just the tour-wide
            // status (which only falls back to 'rejected' once nobody has a
            // pending offer left at all).
            const myOfferDeclined = tour.my_offer?.status === 'declined' || tour.status === 'rejected'
            const myOfferPending = tour.my_offer?.status === 'pending'
            const othersAlsoResponding = myOfferPending && (tour.offer_count ?? 0) > 1

            return (
              <div className="space-y-2.5 pt-1">
                {myOfferDeclined && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
                    <p className="text-[10px] font-bold text-amber-700">
                      {t('card.declinedOffer')}
                    </p>
                  </div>
                )}
                {othersAlsoResponding && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-center">
                    <p className="text-[10px] font-bold text-blue-700">
                      Your offer of Rs. {Number(tour.my_offer.price).toLocaleString()} is pending — other drivers may also be responding.
                    </p>
                  </div>
                )}
                {(tour.status === 'planned' || myOfferDeclined) && (
                  <button
                    type="button"
                    onClick={() => onApprove(tour.id, myOfferDeclined)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-xs font-black text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <i className="bi bi-check-lg" />
                    {myOfferDeclined
                      ? t('card.acceptAtOriginalPrice', { price: Number(tour.estimated_price ?? 0).toLocaleString() })
                      : t('card.acceptTour')}
                  </button>
                )}
                {myOfferDeclined && (
                  <div className="relative flex items-center gap-2 py-1">
                    <span className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{t('card.or')}</span>
                    <span className="h-px flex-1 bg-slate-100" />
                  </div>
                )}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                  <input
                    type="number"
                    placeholder={t('card.yourCounterOffer')}
                    value={priceInput}
                    onChange={(e) => onPriceChange(tour.id, e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-bold focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onSendPrice(tour.id)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-xs font-black text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <i className="bi bi-send-fill" />
                  {myOfferPending ? t('card.updateOffer') : (myOfferDeclined ? t('card.sendNewOffer') : t('card.sendCounterOffer'))}
                </button>
              </div>
            )
          })()}
        </div>
      </div>
    </article>
  )
}
