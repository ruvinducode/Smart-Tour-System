import DriverSectionHeader from './DriverSectionHeader.jsx'
import DriverTourCard from './DriverTourCard.jsx'

const SECTION_META = {
  all: {
    title: 'Recent Tour Requests',
    subtitle: 'Latest assignments matching your vehicle — accept or negotiate in one tap.',
    icon: 'bi-clipboard-data',
    accent: 'orange',
    countLabel: 'requests',
  },
  upcoming: {
    title: 'Upcoming Tours',
    subtitle: 'New tour requests awaiting your action, plus confirmed trips ready to start.',
    icon: 'bi-calendar-event-fill',
    accent: 'violet',
    countLabel: 'upcoming',
  },
  approved: {
    title: 'Approved Requests',
    subtitle: 'Tours you accepted — confirmed, en route, or in progress.',
    icon: 'bi-check-circle-fill',
    accent: 'emerald',
    countLabel: 'approved',
  },
  price_sent: {
    title: 'Negotiating Requests',
    subtitle: 'Counter-offers awaiting passenger response. Update your price anytime.',
    icon: 'bi-arrow-left-right',
    accent: 'blue',
    countLabel: 'negotiating',
  },
}

const VARIANT_MAP = {
  all: 'recent',
  upcoming: 'upcoming',
  approved: 'approved',
  price_sent: 'negotiating',
}

export default function DriverTourListSection({
  tab,
  tours,
  loading,
  priceInputs,
  onPriceChange,
  onViewDetails,
  onApprove,
  onSendPrice,
  onStartDriving,
  token,
}) {
  const meta = SECTION_META[tab] || SECTION_META.all
  const variant = VARIANT_MAP[tab] || 'recent'

  return (
    <div className="space-y-6">
      {tab !== 'all' && (
        <DriverSectionHeader
          title={meta.title}
          subtitle={meta.subtitle}
          icon={meta.icon}
          accent={meta.accent}
          count={loading ? '—' : tours.length}
          countLabel={meta.countLabel}
        />
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500 mb-4" />
          <p className="text-slate-500 font-bold text-sm">Loading tour requests…</p>
        </div>
      ) : tours.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/60 py-20 text-center px-8">
          <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <i className={`bi ${meta.icon} text-3xl text-slate-300`} />
          </div>
          <p className="text-lg font-black text-slate-700">No {meta.countLabel} found</p>
          <p className="text-sm text-slate-400 font-medium mt-2 max-w-sm mx-auto">
            New tour requests matching your vehicle will appear here automatically.
          </p>
        </div>
      ) : (
        <div className={`grid gap-5 ${tab === 'all' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
          {tours.map((tour) => (
            <DriverTourCard
              key={tour.id}
              tour={tour}
              variant={variant}
              priceInput={priceInputs[tour.id] || ''}
              onPriceChange={onPriceChange}
              onViewDetails={onViewDetails}
              onApprove={onApprove}
              onSendPrice={onSendPrice}
              onStartDriving={onStartDriving}
              token={token}
            />
          ))}
        </div>
      )}
    </div>
  )
}
