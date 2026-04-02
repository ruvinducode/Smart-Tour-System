import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveDriverTourRequest,
  getDriverTourRequests,
  sendDriverNegotiatedPrice,
} from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'

export default function DriverDashboardPage({ token, userName, onLogout }) {
  const [tourRequests, setTourRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [priceInputs, setPriceInputs] = useState({})
  const [activeTab, setActiveTab] = useState('all')
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const loadTourRequests = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await getDriverTourRequests(token)
      setTourRequests(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Could not load tour requests')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadTourRequests()
  }, [loadTourRequests])

  const handleApprove = async (tourId) => {
    setError('')
    setInfo('')
    try {
      const data = await approveDriverTourRequest(tourId, token)
      setInfo(data.message || 'Tour approved')
      await loadTourRequests()
    } catch (err) {
      setError(err.message || 'Could not approve tour')
    }
  }

  const handleSendPrice = async (tourId) => {
    setError('')
    setInfo('')
    const price = priceInputs[tourId]

    if (!price) {
      setError('Please enter driver price first')
      return
    }

    try {
      const data = await sendDriverNegotiatedPrice(tourId, Number(price), token)
      setInfo(data.message || 'Driver price sent to user')
      await loadTourRequests()
    } catch (err) {
      setError(err.message || 'Could not send driver price')
    }
  }

  const filteredTours = useMemo(() => {
    if (activeTab === 'approved') {
      return tourRequests.filter((t) => t.status === 'driver_approved')
    }
    if (activeTab === 'price_sent') {
      return tourRequests.filter((t) => t.status === 'price_sent_by_driver')
    }
    return tourRequests
  }, [activeTab, tourRequests])

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-700 bg-slate-900/80 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.45)] sm:p-7">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Driver Portal</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Driver Dashboard</h1>
            <p className="mt-1 text-sm text-slate-300">Welcome {userName || 'Driver'}. Review user tour requests and negotiate price.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTourRequests}
              disabled={loading}
              className="rounded-xl border border-slate-500 bg-slate-700/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-60"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-rose-300 bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 p-2">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'approved', label: 'Driver Approved' },
            { id: 'price_sent', label: 'Price Sent' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-700/70 text-slate-200 hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-400 bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}
        {info ? (
          <div className="mb-4 rounded-xl border border-emerald-400 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">{info}</div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Tour</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Trip</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Current Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-300">Loading tour requests...</td>
                  </tr>
                ) : null}

                {!loading && filteredTours.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-300">No tour requests available.</td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredTours.map((tour) => (
                      <tr key={tour.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm text-slate-100">#{tour.id}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          <p>{tour.user_name || 'Unknown User'}</p>
                          <p className="text-xs text-slate-400">{tour.user_email || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          <p>{tour.total_distance_km || 0} km, {tour.total_days || 0} days</p>
                          <p className="text-xs text-slate-400">{tour.start_date || '-'} to {tour.end_date || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-100">Rs. {Number(tour.estimated_price || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="rounded-full bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-200">{tour.status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex min-w-64 flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTourId(tour.id)
                                setShowDetailsModal(true)
                              }}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(tour.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                            >
                              Approve Request
                            </button>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min={1}
                                value={priceInputs[tour.id] || ''}
                                onChange={(ev) =>
                                  setPriceInputs((prev) => ({
                                    ...prev,
                                    [tour.id]: ev.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                                placeholder="Driver price"
                              />
                              <button
                                type="button"
                                onClick={() => handleSendPrice(tour.id)}
                                className="whitespace-nowrap rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-400"
                              >
                                Send Price
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <TourDetailsModal
        tourId={selectedTourId}
        token={token}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        userRole="driver"
      />
    </div>
  )
}
