import { useEffect, useState } from 'react'
import { getTourDetails } from '../services/api.js'

export default function TourDetailsModal({ tourId, token, isOpen, onClose, userRole = 'user' }) {
  const [tour, setTour] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !tourId || !token) return

    const loadTourDetails = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getTourDetails(tourId, token)
        setTour(data || {})
        setLocations(Array.isArray(data?.locations) ? data.locations : [])
      } catch (err) {
        setError(err.message || 'Could not load tour details')
      } finally {
        setLoading(false)
      }
    }

    loadTourDetails()
  }, [isOpen, tourId, token])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-2xl transform rounded-2xl bg-slate-900 shadow-2xl transition-all">
          {/* Header */}
          <div className="border-b border-slate-700 bg-slate-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Tour Details</h2>
              <p className="mt-1 text-sm text-slate-400">Tour ID: {tourId}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
                <p className="mt-3 text-slate-300">Loading tour details...</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-400 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && tour && (
              <div className="space-y-6">
                {/* Tour Status & Dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
                    <p className="mt-2 text-lg font-bold text-white capitalize">
                      {(tour.status || 'N/A').replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Days</p>
                    <p className="mt-2 text-lg font-bold text-white">{tour.total_days || 0} days</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Start Date</p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {tour.start_date ? new Date(tour.start_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</p>
                    <p className="mt-2 text-lg font-bold text-white">
                      {tour.end_date ? new Date(tour.end_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Distance & Pricing */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Distance</p>
                    <p className="mt-2 text-lg font-bold text-white">{tour.total_distance_km || 0} km</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Est. Price</p>
                    <p className="mt-2 text-lg font-bold text-emerald-400">Rs. {(tour.estimated_price || 0).toFixed(2)}</p>
                  </div>
                  {tour.driver_price && (
                    <div className="rounded-lg bg-blue-900/30 p-4 border border-blue-700">
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">Driver Price</p>
                      <p className="mt-2 text-lg font-bold text-blue-300">Rs. {(tour.driver_price || 0).toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Vehicle Info */}
                {tour.vehicle && (
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Vehicle</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-400">Type</p>
                        <p className="text-sm font-semibold text-white capitalize">{tour.vehicle.type || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Capacity</p>
                        <p className="text-sm font-semibold text-white">{tour.vehicle.max_passengers || 'N/A'} passengers</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Locations */}
                {locations.length > 0 && (
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Destinations ({locations.length})
                    </p>
                    <div className="space-y-2">
                      {locations.map((loc, idx) => (
                        <div
                          key={loc.id || idx}
                          className="flex items-start gap-3 rounded-lg bg-slate-900/50 p-3 border border-slate-600 border-l-2 border-l-sky-500"
                        >
                          <div className="shrink-0 h-6 w-6 rounded-full bg-sky-500/30 border border-sky-500 flex items-center justify-center text-xs font-bold text-sky-300">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">{loc.place_name || 'Unknown Location'}</p>
                            {loc.latitude && loc.longitude && (
                              <p className="text-xs text-slate-400 mt-1">
                                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User/Guest Info */}
                {tour.user_name || tour.guest_name ? (
                  <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Traveler</p>
                    <p className="text-sm font-semibold text-white">
                      {tour.user_name || tour.guest_name || 'N/A'}
                    </p>
                    {tour.user_email || tour.guest_email ? (
                      <p className="text-xs text-slate-400 mt-1">{tour.user_email || tour.guest_email}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 text-sm font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
