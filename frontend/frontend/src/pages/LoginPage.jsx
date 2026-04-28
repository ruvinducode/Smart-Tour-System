import { useEffect, useMemo, useRef, useState } from 'react'
import { registerDriver, registerUser } from '../services/api.js'
import sbImage from '../../images/ sb.png'

const SL_DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
  'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
  'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa',
  'Puttalam','Ratnapura','Trincomalee','Vavuniya',
]

const VEHICLE_TYPES = ['Mini car','Car','Mini van','Van','SUV','Mini bus','Bus']

function ImageUploadField({ label, fieldName, value, onChange, required = false }) {
  const inputRef = useRef(null)
  const previewUrl = value ? URL.createObjectURL(value) : null

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}{required && <span className="ml-0.5 text-orange-500">*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/60 p-4 text-center transition hover:border-sky-400 hover:bg-sky-50"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="h-24 w-full rounded-xl object-cover shadow" />
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs text-slate-500">Click to upload image</p>
            <p className="text-[10px] text-slate-400">PNG, JPG, JPEG, WEBP</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(fieldName, e.target.files[0] || null)}
        />
      </div>
      {value && (
        <p className="mt-1 truncate text-[10px] text-emerald-600">✓ {value.name}</p>
      )}
    </div>
  )
}

const EMPTY_DRIVER_REG = {
  // Personal
  full_name: '', phone: '', email: '', nic_number: '',
  date_of_birth: '', gender: '', home_district: '', home_address: '',
  profile_photo: null,
  // License
  license_number: '', license_expiry_date: '',
  license_front_image: null, license_back_image: null,
  // Vehicle
  vehicle_type: '', vehicle_brand: '', vehicle_number: '',
  vehicle_color: '', capacity: '',
  vehicle_reg_book_image: null, revenue_license_image: null, insurance_cert_image: null,
  // Account
  password: '',
}

export default function LoginPage({
  error,
  info,
  loading,
  loginForm,
  setLoginForm,
  driverLoginForm,
  setDriverLoginForm,
  showLoginPassword,
  setShowLoginPassword,
  onLogin,
  onDriverLogin,
  initialAccountType = 'user',
  initialMode = 'login',
}) {
  const [accountType, setAccountType] = useState(initialAccountType)
  const [mode, setMode] = useState(initialMode)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerInfo, setRegisterInfo] = useState('')
  const [reg, setReg] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    country: '',
  })
  const [driverReg, setDriverReg] = useState(EMPTY_DRIVER_REG)

  const inputClassName =
    'w-full rounded-2xl border border-sky-300 bg-linear-to-r from-sky-50 to-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100'

  const selectClassName =
    'w-full rounded-2xl border border-sky-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100 cursor-pointer'

  const panelTitle = useMemo(() => {
    if (accountType === 'driver' && mode === 'register') return 'Driver Registration'
    if (accountType === 'driver') return 'Driver Portal'
    if (mode === 'register') return 'Create your account'
    return 'Welcome back'
  }, [accountType, mode])

  const panelSubtitle = useMemo(() => {
    if (accountType === 'driver' && mode === 'register') return 'Complete all sections to register as a verified driver.'
    if (accountType === 'driver') return 'Sign in to manage your driver profile and trips.'
    if (mode === 'register') return 'Start your Sri Lanka travel planning journey.'
    return 'Sign in and manage your Sri Lanka tours in one place.'
  }, [accountType, mode])

  const handleDriverFieldChange = (field, value) => {
    setDriverReg((prev) => ({ ...prev, [field]: value }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterInfo('')
    setRegisterLoading(true)

    try {
      const data = await registerUser(reg)
      setRegisterInfo(data.message || 'Registration complete. Please sign in.')
      setMode('login')
      setLoginForm((prev) => ({ ...prev, email: reg.email }))
    } catch (err) {
      setRegisterError(err.message || 'Registration failed')
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleDriverRegister = async (e) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterInfo('')
    setRegisterLoading(true)

    try {
      const data = await registerDriver(driverReg)
      setRegisterInfo(data.message || 'Driver registration complete. Await admin approval.')
      setMode('login')
    } catch (err) {
      setRegisterError(err.message || 'Driver registration failed')
    } finally {
      setRegisterLoading(false)
    }
  }

  useEffect(() => {
    setAccountType(initialAccountType)
    setMode(initialMode)
    setRegisterError('')
    setRegisterInfo('')
  }, [initialAccountType, initialMode])


  return (
    <div className="min-h-screen bg-linear-to-br from-orange-100 via-sky-100/60 to-sky-50 px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-7xl rounded-4xl border border-sky-200 bg-[#f8f7f2] p-3 shadow-[0_35px_80px_rgba(30,64,175,0.2)] sm:p-5">
        <div className="grid min-h-170 gap-3 rounded-3xl bg-linear-to-br from-white/90 to-sky-50/60 p-3 lg:grid-cols-[1fr_0.9fr] lg:gap-4 lg:p-4">
          <section className="relative max-h-[90vh] overflow-y-auto rounded-3xl bg-linear-to-b from-orange-50 via-sky-50 to-orange-100/60 px-6 py-6 sm:px-8 sm:py-8">
            <button
              type="button"
              className="inline-flex rounded-full border border-sky-300 bg-sky-100 px-5 py-2 text-sm font-medium text-sky-700"
            >
              Smart Tour Sri Lanka
            </button>

            <div className="mt-8 inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-sky-200">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  mode === 'login' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  mode === 'register' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                Register
              </button>
            </div>

            <div className="mt-8 max-w-sm">
              <h2 className="font-['Space_Grotesk'] text-4xl font-semibold tracking-tight text-slate-800">{panelTitle}</h2>
              <p className="mt-2 text-sm text-slate-500">{panelSubtitle}</p>

              {mode === 'login' ? (
                <form onSubmit={accountType === 'driver' ? onDriverLogin : onLogin} className="mt-8 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={loginForm.email}
                      onChange={(ev) => setLoginForm((prev) => ({ ...prev, email: ev.target.value }))}
                      className={inputClassName}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={loginForm.password}
                        onChange={(ev) => setLoginForm((prev) => ({ ...prev, password: ev.target.value }))}
                        className={`${inputClassName} pr-20`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                      >
                        {showLoginPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
                  ) : null}

                  {info || registerInfo ? (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      {registerInfo || info}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Signing in...' : 'Submit'}
                  </button>
                </form>
              ) : (
                <>
                  {accountType === 'driver' ? (
                    /* ══════════════════════════════════════════════════
                       DRIVER REGISTRATION — 3-SECTION COMPREHENSIVE FORM
                    ══════════════════════════════════════════════════ */
                    <form onSubmit={handleDriverRegister} className="mt-6 space-y-6">

                      {/* ── SECTION 1: Personal Information ── */}
                      <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow">1</div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Personal Information</h3>
                            <p className="text-[11px] text-slate-500">As per your National Identity Card</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Full Name (as per NIC)<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="text" required value={driverReg.full_name}
                                onChange={(e) => handleDriverFieldChange('full_name', e.target.value)}
                                className={inputClassName} placeholder="Your full legal name" />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">NIC Number<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="text" required value={driverReg.nic_number}
                                onChange={(e) => handleDriverFieldChange('nic_number', e.target.value)}
                                className={inputClassName} placeholder="e.g. 199012345678" />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Date of Birth<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="date" required value={driverReg.date_of_birth}
                                onChange={(e) => handleDriverFieldChange('date_of_birth', e.target.value)}
                                className={inputClassName} />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Gender<span className="ml-0.5 text-orange-500">*</span></label>
                              <select required value={driverReg.gender}
                                onChange={(e) => handleDriverFieldChange('gender', e.target.value)}
                                className={selectClassName}>
                                <option value="">Select gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mobile Number<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="tel" required value={driverReg.phone}
                                onChange={(e) => handleDriverFieldChange('phone', e.target.value)}
                                className={inputClassName} placeholder="+94 7X XXX XXXX" />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email Address <span className="text-slate-400">(optional)</span></label>
                              <input type="email" value={driverReg.email}
                                onChange={(e) => handleDriverFieldChange('email', e.target.value)}
                                className={inputClassName} placeholder="driver@example.com" />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">District<span className="ml-0.5 text-orange-500">*</span></label>
                            <select required value={driverReg.home_district}
                              onChange={(e) => handleDriverFieldChange('home_district', e.target.value)}
                              className={selectClassName}>
                              <option value="">Select your district</option>
                              {SL_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Home Address<span className="ml-0.5 text-orange-500">*</span></label>
                            <textarea required value={driverReg.home_address}
                              onChange={(e) => handleDriverFieldChange('home_address', e.target.value)}
                              className={`${inputClassName} resize-none`} rows={2}
                              placeholder="Full home address" />
                          </div>

                          <ImageUploadField label="Profile Photo (clear face image)" fieldName="profile_photo"
                            value={driverReg.profile_photo} onChange={handleDriverFieldChange} required />
                        </div>
                      </div>

                      {/* ── SECTION 2: Driving License ── */}
                      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow">2</div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Driving License</h3>
                            <p className="text-[11px] text-slate-500">Official Sri Lanka driving license details</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">License Number<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="text" required value={driverReg.license_number}
                                onChange={(e) => handleDriverFieldChange('license_number', e.target.value)}
                                className={inputClassName} placeholder="e.g. B1234567" />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">License Expiry Date<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="date" required value={driverReg.license_expiry_date}
                                onChange={(e) => handleDriverFieldChange('license_expiry_date', e.target.value)}
                                className={inputClassName} />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <ImageUploadField label="License Front Image" fieldName="license_front_image"
                              value={driverReg.license_front_image} onChange={handleDriverFieldChange} required />
                            <ImageUploadField label="License Back Image" fieldName="license_back_image"
                              value={driverReg.license_back_image} onChange={handleDriverFieldChange} required />
                          </div>
                        </div>
                      </div>

                      {/* ── SECTION 3: Vehicle Details ── */}
                      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">3</div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Vehicle Details</h3>
                            <p className="text-[11px] text-slate-500">Your registered vehicle information</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Vehicle Type<span className="ml-0.5 text-orange-500">*</span></label>
                              <select required value={driverReg.vehicle_type}
                                onChange={(e) => handleDriverFieldChange('vehicle_type', e.target.value)}
                                className={selectClassName}>
                                <option value="">Select vehicle type</option>
                                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Vehicle Brand<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="text" required value={driverReg.vehicle_brand}
                                onChange={(e) => handleDriverFieldChange('vehicle_brand', e.target.value)}
                                className={inputClassName} placeholder="Toyota, Nissan, KIA..." />
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Vehicle Reg. Number<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="text" required value={driverReg.vehicle_number}
                                onChange={(e) => handleDriverFieldChange('vehicle_number', e.target.value)}
                                className={inputClassName} placeholder="WP-XXXX" />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Vehicle Color<span className="ml-0.5 text-orange-500">*</span></label>
                              <input type="text" required value={driverReg.vehicle_color}
                                onChange={(e) => handleDriverFieldChange('vehicle_color', e.target.value)}
                                className={inputClassName} placeholder="e.g. White, Silver" />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Seating Capacity<span className="ml-0.5 text-orange-500">*</span></label>
                            <input type="number" required min={1} max={60} value={driverReg.capacity}
                              onChange={(e) => handleDriverFieldChange('capacity', e.target.value)}
                              className={inputClassName} placeholder="Number of passengers (excl. driver)" />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <ImageUploadField label="Vehicle Reg. Book" fieldName="vehicle_reg_book_image"
                              value={driverReg.vehicle_reg_book_image} onChange={handleDriverFieldChange} required />
                            <ImageUploadField label="Revenue License" fieldName="revenue_license_image"
                              value={driverReg.revenue_license_image} onChange={handleDriverFieldChange} required />
                            <ImageUploadField label="Insurance Certificate" fieldName="insurance_cert_image"
                              value={driverReg.insurance_cert_image} onChange={handleDriverFieldChange} required />
                          </div>
                        </div>
                      </div>

                      {/* ── Account Password ── */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white shadow">🔒</div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Account Password</h3>
                            <p className="text-[11px] text-slate-500">Used to log in to your driver portal</p>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            required
                            value={driverReg.password}
                            onChange={(e) => handleDriverFieldChange('password', e.target.value)}
                            className={`${inputClassName} pr-20`}
                            placeholder="Create a strong password"
                          />
                          <button type="button" onClick={() => setShowRegisterPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100">
                            {showRegisterPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      {registerError ? (
                        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{registerError}</div>
                      ) : null}

                      {registerInfo ? (
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{registerInfo}</div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={registerLoading}
                        className="w-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registerLoading ? 'Submitting Registration...' : '🚗 Submit Driver Registration'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="mt-8 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Full name</label>
                        <input
                          type="text"
                          required
                          value={reg.full_name}
                          onChange={(ev) => setReg((prev) => ({ ...prev, full_name: ev.target.value }))}
                          className={inputClassName}
                          placeholder="Your full name"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                        <input
                          type="email"
                          required
                          value={reg.email}
                          onChange={(ev) => setReg((prev) => ({ ...prev, email: ev.target.value }))}
                          className={inputClassName}
                          placeholder="you@example.com"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
                        <div className="relative">
                          <input
                            type={showRegisterPassword ? 'text' : 'password'}
                            required
                            value={reg.password}
                            onChange={(ev) => setReg((prev) => ({ ...prev, password: ev.target.value }))}
                            className={`${inputClassName} pr-20`}
                            placeholder="Create your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            {showRegisterPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">Phone</label>
                          <input
                            type="tel"
                            required
                            value={reg.phone}
                            onChange={(ev) => setReg((prev) => ({ ...prev, phone: ev.target.value }))}
                            className={inputClassName}
                            placeholder="+94..."
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-500">Country</label>
                          <input
                            type="text"
                            required
                            value={reg.country}
                            onChange={(ev) => setReg((prev) => ({ ...prev, country: ev.target.value }))}
                            className={inputClassName}
                            placeholder="Country"
                          />
                        </div>
                      </div>

                      {registerError ? (
                        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{registerError}</div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={registerLoading}
                        className="mt-2 w-full rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registerLoading ? 'Creating account...' : 'Create account'}
                      </button>
                    </form>
                  )}
                </>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('user')
                    setRegisterError('')
                    setRegisterInfo('')
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    accountType === 'user'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-50'
                  }`}
                >
                  User Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('driver')
                    setRegisterError('')
                    setRegisterInfo('')
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    accountType === 'driver'
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-50'
                  }`}
                >
                  Driver Register
                </button>
              </div>

              <div className="mt-10 flex items-center justify-between text-xs text-slate-500">
                <p>
                  Need help? <span className="font-semibold text-slate-700">Support center</span>
                </p>
                <button type="button" className="underline decoration-slate-400 underline-offset-4">
                  Terms & Conditions
                </button>
              </div>
            </div>
          </section>

          <section className="relative flex min-h-80 flex-col justify-stretch gap-3 lg:min-h-0">
            <div className="overflow-hidden rounded-3xl border border-sky-200/70 bg-white/70 shadow-sm">
              <img src={sbImage} alt="Sri Lanka travel" className="h-full min-h-80 w-full object-cover" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
