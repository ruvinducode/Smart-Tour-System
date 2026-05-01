import { getApiBaseUrl } from '../services/api.js'

export default function DriverDetailsModal({ driver, isOpen, onClose, onApprove, approving }) {
  if (!isOpen || !driver) return null

  const baseUrl = getApiBaseUrl()
  const getImageUrl = (filename) => filename ? `${baseUrl}/uploads/drivers/${filename}` : null

  const DetailSection = ({ title, icon, children }) => (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )

  const DetailItem = ({ label, value }) => (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value || '—'}</p>
    </div>
  )

  const ImagePreview = ({ label, url }) => (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="relative aspect-video rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group">
        {url ? (
          <>
            <img src={url} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold backdrop-blur-[2px]"
            >
              View Full Size ↗
            </a>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <i className="bi bi-image text-2xl"></i>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <header className="px-8 py-6 bg-linear-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl border-2 border-white/20 overflow-hidden bg-slate-700 shadow-xl">
              {driver.profile_photo ? (
                <img src={getImageUrl(driver.profile_photo)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                  {driver.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{driver.name}</h2>
              <p className="text-sky-300 text-xs font-semibold">Driver Application Details</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full hover:bg-white/10 transition flex items-center justify-center">
            <i className="bi bi-x-lg"></i>
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <DetailSection title="Personal Information" icon="👤">
            <DetailItem label="Full Name" value={driver.name} />
            <DetailItem label="NIC Number" value={driver.nic_number} />
            <DetailItem label="Email" value={driver.email} />
            <DetailItem label="Phone" value={driver.phone} />
            <DetailItem label="Date of Birth" value={driver.date_of_birth} />
            <DetailItem label="Gender" value={driver.gender} />
            <DetailItem label="District" value={driver.home_district} />
            <DetailItem label="Address" value={driver.home_address} />
          </DetailSection>

          <DetailSection title="Driving License" icon="🪪">
            <DetailItem label="License Number" value={driver.license_number} />
            <DetailItem label="Expiry Date" value={driver.license_expiry_date} />
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <ImagePreview label="License Front" url={getImageUrl(driver.license_front_image)} />
              <ImagePreview label="License Back" url={getImageUrl(driver.license_back_image)} />
            </div>
          </DetailSection>

          <DetailSection title="Vehicle Details" icon="🚗">
            <DetailItem label="Vehicle Type" value={driver.vehicle} />
            <DetailItem label="Brand / Model" value={driver.vehicle_brand} />
            <DetailItem label="Registration Number" value={driver.vehicle_number} />
            <DetailItem label="Color" value={driver.vehicle_color} />
            <DetailItem label="Seating Capacity" value={`${driver.capacity} Passengers`} />
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <ImagePreview label="Registration Book" url={getImageUrl(driver.vehicle_reg_book_image)} />
              <ImagePreview label="Revenue License" url={getImageUrl(driver.revenue_license_image)} />
              <ImagePreview label="Insurance Certificate" url={getImageUrl(driver.insurance_cert_image)} />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-slate-100 pt-4">
              <ImagePreview label="Vehicle Front View" url={getImageUrl(driver.vehicle_front_image)} />
              <ImagePreview label="Vehicle Rear View" url={getImageUrl(driver.vehicle_rear_image)} />
              <ImagePreview label="Vehicle Side View" url={getImageUrl(driver.vehicle_side_image)} />
            </div>
          </DetailSection>
        </div>

        {/* Footer */}
        <footer className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            <p>Applied on: {driver.created_at ? new Date(driver.created_at).toLocaleString() : 'N/A'}</p>
            <p>Status: <span className="text-orange-500 font-bold uppercase">Pending Review</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                onApprove(driver.id)
                onClose()
              }}
              disabled={approving}
              className="px-8 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition disabled:opacity-50"
            >
              {approving ? 'Approving...' : 'Approve Driver'}
            </button>
          </div>
        </footer>

      </div>
    </div>
  )
}
