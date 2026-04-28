import { useEffect, useState, useCallback } from 'react'
import { getUserNotifications, acceptDriverPrice, rejectDriverPrice, replyToDriver, getUserTours } from '../services/api.js'
import TourDetailsModal from '../components/TourDetailsModal.jsx'

export default function UserDashboardPage({ token, userName, onLogout, onGoToPlanner }) {
  const [tours, setTours] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      // In a real scenario, you might add a getUserTours endpoint to api.js
      // For now, we use getTourPlans filtered or the notification logic
      const [tourData, notifData] = await Promise.all([
        getUserTours(token), 
        getUserNotifications(token)
      ])
      setTours(Array.isArray(tourData) ? tourData : [])
      setNotifications(Array.isArray(notifData) ? notifData : [])
    } catch (err) {
      console.error("Dashboard load failed", err)
      if (err.message?.toLowerCase().includes('token has expired') || err.message?.includes('401')) {
        onLogout()
      }
    } finally {
      setLoading(false)
    }
  }, [token, onLogout])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white">
              <i className="bi bi-grid-1x2-fill"></i>
            </div>
            <h1 className="text-xl font-bold">Traveler Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onGoToPlanner}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition shadow-md shadow-orange-200"
            >
              + Plan New Tour
            </button>
            <button onClick={onLogout} className="text-rose-500 font-semibold text-sm">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid gap-8 lg:grid-cols-3">
        
        {/* Left Column: Active Bookings */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-black flex items-center gap-2">
            <i className="bi bi-geo-alt-fill text-teal-600"></i> My Active Tours
          </h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
            </div>
          ) : tours.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <p className="text-slate-400">No active tours yet. Ready for an adventure?</p>
            </div>
          ) : (
            tours.map(tour => (
              <div key={tour.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Tour #{tour.id}</p>
                    <h3 className="text-lg font-bold">{tour.total_distance_km} km Journey</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${tour.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {tour.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-slate-500 mb-4">
                  <span><i className="bi bi-calendar3 mr-1"></i> {tour.start_date}</span>
                  <span><i className="bi bi-clock mr-1"></i> {tour.total_days} Days</span>
                </div>
                <button 
                  onClick={() => { setSelectedTourId(tour.id); setShowDetailsModal(true); }}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition"
                >
                  View Details & Map
                </button>
                {tour.status === 'confirmed' && (
                <button 
                  onClick={() => {
                    // You can set a state in App.jsx to switch to the LiveTracking page!
                  }}
                  className="w-full mt-2 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition"
                >
                  <i className="bi bi-geo-alt-fill mr-2"></i> Open Live Tracker
                </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Column: Negotiation & Notifications */}
        <div className="space-y-6">
          <h2 className="text-lg font-black flex items-center gap-2">
            <i className="bi bi-chat-dots-fill text-orange-500"></i> Negotiations
          </h2>
          <div className="space-y-4">
            {notifications.filter(n => n.subject.toLowerCase().includes('price') || n.subject.toLowerCase().includes('driver')).map(note => (
              <div key={note.id} className="bg-white rounded-2xl border-l-4 border-l-orange-500 border border-slate-200 p-4 shadow-sm animate-rise-in">
                <p className="text-sm font-bold text-slate-800">{note.subject}</p>
                <p className="text-xs text-slate-500 mt-1 mb-3">{note.message}</p>
                <button 
                  onClick={() => {
                    const match = note.message.match(/#(\d+)/);
                    if(match) { setSelectedTourId(match[1]); setShowDetailsModal(true); }
                  }}
                  className="text-xs font-bold text-orange-600 hover:underline"
                >
                  Respond to Driver →
                </button>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-sm text-slate-400 text-center py-10">No pending negotiations.</p>}
          </div>
        </div>
      </main>

      <TourDetailsModal 
        tourId={selectedTourId}
        token={token}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        userRole="user"
      />
    </div>
  )
}