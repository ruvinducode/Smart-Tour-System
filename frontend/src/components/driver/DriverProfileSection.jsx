import DriverSectionHeader from './DriverSectionHeader.jsx'
import { driverUploadUrl } from '../../services/api.js'
import { useDriverLang } from '../../i18n/DriverLanguageContext.jsx'

const DOC_FIELDS = [
  { key: 'license_front_image', labelKey: 'profile.doc.licenseFront' },
  { key: 'license_back_image', labelKey: 'profile.doc.licenseBack' },
  { key: 'vehicle_reg_book_image', labelKey: 'profile.doc.regBook' },
  { key: 'revenue_license_image', labelKey: 'profile.doc.revenueLicense' },
  { key: 'insurance_cert_image', labelKey: 'profile.doc.insurance' },
  { key: 'vehicle_front_image', labelKey: 'profile.doc.vehicleFront' },
  { key: 'vehicle_rear_image', labelKey: 'profile.doc.vehicleRear' },
  { key: 'vehicle_side_image', labelKey: 'profile.doc.vehicleSide' },
]

const EDIT_DOC_FIELDS = [
  { name: 'license_front_image', labelKey: 'profile.doc.licenseFront' },
  { name: 'license_back_image', labelKey: 'profile.doc.licenseBack' },
  { name: 'vehicle_reg_book_image', labelKey: 'profile.doc.regBook' },
  { name: 'revenue_license_image', labelKey: 'profile.doc.revenueLicense' },
  { name: 'insurance_cert_image', labelKey: 'profile.doc.insuranceCert' },
  { name: 'vehicle_front_image', labelKey: 'profile.doc.vehicleFront' },
  { name: 'vehicle_rear_image', labelKey: 'profile.doc.vehicleRear' },
  { name: 'vehicle_side_image', labelKey: 'profile.doc.vehicleSide' },
]

function InfoTile({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <i className={`bi ${icon} text-orange-500 text-sm`} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-black text-slate-800">{value || '—'}</p>
    </div>
  )
}

export default function DriverProfileSection({
  profileData,
  editMode,
  setEditMode,
  updatingProfile,
  onSubmit,
  userName,
}) {
  const { t } = useDriverLang()

  if (!profileData) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
        <p className="text-slate-500 font-bold mt-4">{t('profile.loading')}</p>
      </div>
    )
  }

  const photoUrl = driverUploadUrl(profileData.profile_photo)

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <DriverSectionHeader
        title={t('profile.title')}
        subtitle={t('profile.subtitle')}
        icon="bi-person-circle"
        accent="orange"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 -mt-2">
        <button
          type="button"
          onClick={() => setEditMode(!editMode)}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg ${
            editMode
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
          }`}
        >
          <i className={`bi ${editMode ? 'bi-x-lg' : 'bi-pencil-fill'}`} />
          {editMode ? t('profile.cancelEditing') : t('profile.editProfile')}
        </button>
      </div>

      {!editMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="lg:col-span-1">
            <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600" />
              <div className="px-6 pb-6 -mt-14 text-center">
                <div className="relative inline-block">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="h-28 w-28 rounded-3xl object-cover border-4 border-white shadow-xl" />
                  ) : (
                    <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center text-orange-600 text-4xl font-black border-4 border-white shadow-xl">
                      {(profileData.full_name || userName || 'D').charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-emerald-500 border-3 border-white flex items-center justify-center text-white text-xs shadow-lg">
                    <i className="bi bi-patch-check-fill" />
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-4">{profileData.full_name}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mt-1">
                  {t('profile.specialist', { vehicle: profileData.vehicle_type || t('profile.driver') })}
                </p>
                <div className="mt-6 space-y-3 text-left">
                  {[
                    { icon: 'bi-envelope', text: profileData.email },
                    { icon: 'bi-telephone', text: profileData.phone },
                    { icon: 'bi-geo-alt', text: profileData.home_district },
                    { icon: 'bi-house', text: profileData.home_address },
                  ].map((row) => (
                    <div key={row.icon} className="flex items-center gap-3 text-sm">
                      <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                        <i className={`bi ${row.icon} text-slate-400`} />
                      </div>
                      <span className="font-semibold text-slate-600 truncate">{row.text || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <i className="bi bi-truck-front-fill" />
                </div>
                <h4 className="text-base font-black text-slate-900">{t('profile.vehicleSpecs')}</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoTile icon="bi-tag" label={t('profile.brand')} value={profileData.vehicle_brand} />
                <InfoTile icon="bi-123" label={t('profile.plate')} value={profileData.vehicle_number} />
                <InfoTile icon="bi-palette" label={t('profile.color')} value={profileData.vehicle_color} />
                <InfoTile icon="bi-people" label={t('profile.capacity')} value={profileData.capacity ? t('profile.seats', { count: profileData.capacity }) : null} />
              </div>
            </div>

            <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <i className="bi bi-card-checklist" />
                </div>
                <h4 className="text-base font-black text-slate-900">{t('profile.licenseInfo')}</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoTile icon="bi-credit-card-2-front" label={t('profile.licenseNumber')} value={profileData.license_number} />
                <InfoTile icon="bi-calendar-x" label={t('profile.expiryDate')} value={profileData.license_expiry_date} />
                <InfoTile icon="bi-person-vcard" label={t('profile.nic')} value={profileData.nic_number} />
                <InfoTile icon="bi-gender-ambiguous" label={t('profile.gender')} value={profileData.gender} />
              </div>
            </div>

            <div className="rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500">
                  <i className="bi bi-file-earmark-image" />
                </div>
                <h4 className="text-base font-black text-slate-900">{t('profile.verifiedDocuments')}</h4>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {DOC_FIELDS.map((doc) => {
                  const img = profileData[doc.key]
                  const label = t(doc.labelKey)
                  return (
                    <div key={doc.key} className="group">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
                      {img ? (
                        <img
                          src={driverUploadUrl(img)}
                          alt={label}
                          className="w-full h-28 rounded-2xl object-cover border border-slate-100 group-hover:scale-[1.02] transition-transform cursor-zoom-in shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-28 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300">
                          <i className="bi bi-image text-xl" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="rounded-[2rem] bg-white border border-slate-100 shadow-xl overflow-hidden">
          <div className="p-6 sm:p-10 space-y-10">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <i className="bi bi-person-fill text-orange-500" /> {t('profile.form.personalInfo')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.form.fullName')}</label>
                  <input name="full_name" defaultValue={profileData.full_name} required className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-400 outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.form.phone')}</label>
                  <input name="phone" defaultValue={profileData.phone} required className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-400 outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.form.nicNumber')}</label>
                  <input name="nic_number" defaultValue={profileData.nic_number} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-400 outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.gender')}</label>
                  <select name="gender" defaultValue={profileData.gender} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-400 outline-none transition">
                    <option value="Male">{t('profile.form.genderMale')}</option>
                    <option value="Female">{t('profile.form.genderFemale')}</option>
                    <option value="Other">{t('profile.form.genderOther')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.form.homeDistrict')}</label>
                  <input name="home_district" defaultValue={profileData.home_district} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-400 outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.form.profilePhoto')}</label>
                  <input name="profile_photo" type="file" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-orange-50 file:text-orange-700" />
                </div>
              </div>
              <div className="mt-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.form.homeAddress')}</label>
                <textarea name="home_address" defaultValue={profileData.home_address} rows={2} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-orange-400 outline-none transition resize-none" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <i className="bi bi-card-checklist text-blue-500" /> {t('profile.form.licenseDocs')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.licenseNumber')}</label>
                  <input name="license_number" defaultValue={profileData.license_number} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-blue-400 outline-none transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.expiryDate')}</label>
                  <input name="license_expiry_date" type="date" defaultValue={profileData.license_expiry_date} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-3 font-bold focus:border-blue-400 outline-none transition" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {EDIT_DOC_FIELDS.map((doc) => (
                  <div key={doc.name} className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <label className="text-xs font-bold text-slate-600">{t(doc.labelKey)}</label>
                    {profileData[doc.name] && (
                      <img src={driverUploadUrl(profileData[doc.name])} alt="" className="w-full h-16 rounded-xl object-cover opacity-60" />
                    )}
                    <input name={doc.name} type="file" className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-orange-50 file:text-orange-600" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <i className="bi bi-truck-front-fill text-emerald-500" /> {t('profile.form.vehicleDetails')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { name: 'vehicle_type', label: t('profile.form.type') },
                  { name: 'vehicle_brand', label: t('profile.brand') },
                  { name: 'vehicle_number', label: t('profile.form.plateNumber') },
                  { name: 'vehicle_color', label: t('profile.color') },
                  { name: 'capacity', label: t('profile.form.seatsLabel'), type: 'number' },
                ].map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1">{f.label}</label>
                    <input name={f.name} type={f.type || 'text'} defaultValue={profileData[f.name]} className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold focus:border-emerald-400 outline-none transition" />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setEditMode(false)} className="px-6 py-3 rounded-2xl font-black text-sm text-slate-500 hover:bg-slate-50 transition">
                {t('profile.form.discard')}
              </button>
              <button type="submit" disabled={updatingProfile} className="px-8 py-3 rounded-2xl bg-orange-500 text-white font-black text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 disabled:opacity-60">
                {updatingProfile ? t('profile.form.saving') : t('profile.form.saveChanges')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
