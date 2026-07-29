import { useCallback, useEffect, useState } from 'react'
import {
  getFinancePricing,
  getPlatformSettings,
  seedFinancePricing,
  updateFinancePricing,
  updatePlatformSettings,
} from '../../services/api.js'
import { FinanceSectionHeader, FinanceToast } from './FinanceShared.jsx'

const VEHICLE_IMAGES = {
  'Mini car': '/images/mini car.png',
  'Car': '/images/car.png',
  'Mini van': '/images/mini van.png',
  'Van': '/images/van.png',
  'SUV': '/images/SUV.png',
  'Mini bus': '/images/mini bus.png',
  'Bus': '/images/bus.png',
}

export default function PricingManagement({ token }) {
  const [pricing, setPricing] = useState([])
  const [originalPricing, setOriginalPricing] = useState([])
  const [settings, setSettings] = useState({ customer_service_fee_percent: 10, driver_service_fee_percent: 5 })
  const [originalSettings, setOriginalSettings] = useState({ customer_service_fee_percent: 10, driver_service_fee_percent: 5 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  // Simulation State
  const [simDistance, setSimDistance] = useState(100)
  const [simDays, setSimDays] = useState(2)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([getFinancePricing(token), getPlatformSettings(token)])
      setPricing(p)
      setOriginalPricing(JSON.parse(JSON.stringify(p)))
      setSettings(s)
      setOriginalSettings(JSON.parse(JSON.stringify(s)))
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleSaveVehicle = async (vehicle) => {
    setSaving(vehicle.id)
    try {
      await updateFinancePricing(vehicle.id, vehicle, token)
      setToast({ message: `Rates updated for ${vehicle.vehicle_type}!`, type: 'success' })
      
      // Update original representation to match
      setOriginalPricing((prev) =>
        prev.map((r) => (r.id === vehicle.id ? JSON.parse(JSON.stringify(vehicle)) : r))
      )
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  const handleSaveSettings = async () => {
    setSaving('settings')
    try {
      await updatePlatformSettings(settings, token)
      setToast({ message: 'Platform service fees updated successfully!', type: 'success' })
      setOriginalSettings(JSON.parse(JSON.stringify(settings)))
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  const handleSeed = async () => {
    try {
      await seedFinancePricing(token)
      setToast({ message: 'Pricing structures reset to platform defaults.', type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const updateRow = (id, field, value) => {
    setPricing((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const val = field === 'is_active' ? value : value === '' ? '' : Number(value)
          return { ...r, [field]: val }
        }
        return r
      })
    )
  }

  const isRowModified = (v) => {
    const orig = originalPricing.find((r) => r.id === v.id)
    if (!orig) return false
    return (
      Number(orig.base_fare) !== Number(v.base_fare) ||
      Number(orig.price_per_km) !== Number(v.price_per_km) ||
      Number(orig.price_per_day) !== Number(v.price_per_day) ||
      Number(orig.max_passengers) !== Number(v.max_passengers) ||
      orig.is_active !== v.is_active
    )
  }

  const isSettingsModified = () => {
    return (
      Number(settings.customer_service_fee_percent) !== Number(originalSettings.customer_service_fee_percent) ||
      Number(settings.driver_service_fee_percent) !== Number(originalSettings.driver_service_fee_percent)
    )
  }

  // Live Commission Split Math
  const mockBaseAmount = 10000
  const custFeePercent = Number(settings.customer_service_fee_percent) || 0
  const drvFeePercent = Number(settings.driver_service_fee_percent) || 0
  const custServiceFee = Math.round(mockBaseAmount * (custFeePercent / 100))
  const totalCustomerPayment = mockBaseAmount + custServiceFee
  const drvServiceFee = Math.round(mockBaseAmount * (drvFeePercent / 100))
  const driverPayout = mockBaseAmount - drvServiceFee
  const platformRevenue = custServiceFee + drvServiceFee

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#1a2e6f]" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading rates database...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 font-['Plus_Jakarta_Sans']">
      <FinanceSectionHeader
        title="Fleet Pricing Configurator"
        subtitle="Manage base fares, pricing per kilometer, and service commission percentages."
        accent="violet"
      >
        <button
          type="button"
          onClick={handleSeed}
          className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-xs font-black transition-all active:scale-95 cursor-pointer"
        >
          <i className="bi bi-arrow-counterclockwise" /> Reset Defaults
        </button>
      </FinanceSectionHeader>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Side Column - Config and Simulator */}
        <div className="xl:col-span-4 space-y-8">
          {/* Platform Settings Box */}
          <div className="rounded-[2rem] bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
            
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2">
              <i className="bi bi-sliders text-indigo-600 text-base" />
              Service Commissions
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-500">Customer Surcharge</span>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{settings.customer_service_fee_percent}%</span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={settings.customer_service_fee_percent}
                    onChange={(e) => setSettings((s) => ({ ...s, customer_service_fee_percent: e.target.value }))}
                    className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.customer_service_fee_percent}
                    onChange={(e) => setSettings((s) => ({ ...s, customer_service_fee_percent: e.target.value }))}
                    className="w-16 rounded-xl border border-slate-200 px-2.5 py-1 text-center font-black text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-500">Driver Commission</span>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{settings.driver_service_fee_percent}%</span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={settings.driver_service_fee_percent}
                    onChange={(e) => setSettings((s) => ({ ...s, driver_service_fee_percent: e.target.value }))}
                    className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.driver_service_fee_percent}
                    onChange={(e) => setSettings((s) => ({ ...s, driver_service_fee_percent: e.target.value }))}
                    className="w-16 rounded-xl border border-slate-200 px-2.5 py-1 text-center font-black text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Split Visualizer */}
            <div className="mt-6 border-t border-slate-100 pt-5 space-y-3.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">commission split preview (Fare: LKR 10,000)</p>
              
              <div className="relative pt-1">
                <div className="overflow-hidden h-3.5 text-xs flex rounded-full bg-slate-100 shadow-inner">
                  <div
                    style={{ width: `${(driverPayout / totalCustomerPayment) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 transition-all duration-500"
                    title={`Driver Share: LKR ${driverPayout.toLocaleString()}`}
                  />
                  <div
                    style={{ width: `${(platformRevenue / totalCustomerPayment) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#1a2e6f] transition-all duration-500"
                    title={`Platform Revenue: LKR ${platformRevenue.toLocaleString()}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100/50">
                  <p className="font-bold text-slate-500">Driver Share</p>
                  <p className="font-black text-emerald-600 mt-0.5">LKR {driverPayout.toLocaleString()}</p>
                </div>
                <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100/50">
                  <p className="font-bold text-slate-500">Platform Split</p>
                  <p className="font-black text-indigo-700 mt-0.5">LKR {platformRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <p className="font-bold text-slate-500">Passenger Pays</p>
                  <p className="font-black text-slate-700 mt-0.5">LKR {totalCustomerPayment.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving === 'settings' || !isSettingsModified()}
              className="mt-5 w-full rounded-2xl bg-[#1a2e6f] hover:bg-[#253f93] text-white py-3 text-xs font-black shadow-lg shadow-[#1a2e6f]/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {saving === 'settings' ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving Commission...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle" /> Save Service Fees
                </>
              )}
            </button>
          </div>

          {/* Fare Calculator Simulator */}
          <div className="rounded-[2rem] bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
            
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-5 flex items-center gap-2">
              <i className="bi bi-calculator text-emerald-500 text-base" />
              Live Fare Simulator
            </h3>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mb-4">
              Enter test parameters below to preview simulated passenger fares in real-time based on the rates in your grid.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Distance (KM)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={simDistance}
                    onChange={(e) => setSimDistance(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 font-bold text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2.5 text-[9px] font-black text-slate-400">KM</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Duration (Days)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={simDays}
                    onChange={(e) => setSimDays(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 font-bold text-xs text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2.5 text-[9px] font-black text-slate-400">DAYS</span>
                </div>
              </div>
            </div>

            {/* Simulated Rates List */}
            <div className="space-y-2 border-t border-slate-100 pt-4 max-h-[300px] overflow-y-auto pr-1">
              {pricing.map((v) => {
                const total = Math.round(
                  (v.base_fare || 0) +
                  simDistance * (v.price_per_km || 0) +
                  simDays * (v.price_per_day || 0)
                )
                const isModified = isRowModified(v)
                return (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                      v.is_active
                        ? 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                        : 'bg-slate-50/20 border-slate-100/30 opacity-40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-800 truncate">{v.vehicle_type}</span>
                        {!v.is_active && <span className="text-[8px] font-black uppercase text-slate-400">Inactive</span>}
                        {isModified && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" title="Unsaved changes" />}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                        LKR {v.base_fare} + ({simDistance}km × {v.price_per_km}) + ({simDays}d × {v.price_per_day})
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-extrabold text-slate-900 text-xs">LKR {total.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Side Column - Grid of Rates Customizer */}
        <div className="xl:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">Fleet Rates Dashboard</h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Modify individual configuration profiles for vehicle classifications</p>
            </div>
            <div className="text-xs font-bold text-slate-400 bg-white border border-slate-100 rounded-xl px-3.5 py-1.5 shadow-sm">
              <span className="text-slate-900 font-extrabold">{pricing.filter((p) => p.is_active).length}</span> / {pricing.length} Active Classes
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pricing.map((v) => {
              const hasImage = VEHICLE_IMAGES[v.vehicle_type]
              const isModified = isRowModified(v)
              
              return (
                <div
                  key={v.id}
                  className={`group rounded-[2rem] bg-white border overflow-hidden p-6 shadow-sm hover:shadow-md transition-all duration-300 relative ${
                    isModified
                      ? 'border-orange-200 ring-2 ring-orange-500/5'
                      : 'border-slate-100'
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={`absolute top-0 left-0 w-full h-1.5 transition-all duration-300 ${
                      v.is_active ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />

                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900 truncate leading-none">{v.vehicle_type}</h4>
                        {isModified && (
                          <span className="inline-flex items-center text-[8px] font-black uppercase bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full ring-1 ring-orange-100">
                            Unsaved
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">FLEET PROFILE</p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={v.is_active}
                        onChange={(e) => updateRow(v.id, 'is_active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-150 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                  </div>

                  {/* Vehicle Icon & Details Box */}
                  <div className="h-28 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-between p-4 mb-5 overflow-hidden relative">
                    <div className="w-1/2 flex flex-col justify-center text-left">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                        <i className="bi bi-people-fill text-slate-400" />
                        <span>Max Pax:</span>
                        <input
                          type="number"
                          min="1"
                          max="80"
                          value={v.max_passengers ?? ''}
                          onChange={(e) => updateRow(v.id, 'max_passengers', e.target.value)}
                          className="w-10 rounded-lg border border-slate-200 bg-white font-black text-center text-slate-700 py-0.5 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Capacity</span>
                    </div>

                    <div className="w-1/2 h-full flex items-center justify-end p-2 relative">
                      {hasImage ? (
                        <img
                          src={hasImage}
                          alt={v.vehicle_type}
                          className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100 filter drop-shadow-sm"
                        />
                      ) : (
                        <i className="bi bi-truck text-4xl text-slate-300" />
                      )}
                    </div>
                  </div>

                  {/* Pricing Input Grid - CUSTOM DESIGN HIGHLIGHTS BASE AND PRICE PER KM */}
                  <div className="space-y-4">
                    {/* Primary Highlighted Inputs: Base Fare and Price Per KM */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Base Fare */}
                      <div className="rounded-2xl border border-slate-150 p-3 hover:border-slate-300 transition-colors">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                          <i className="bi bi-cash-coin text-slate-400" /> Base Fare
                        </span>
                        <div className="flex items-center">
                          <span className="text-[10px] font-black text-slate-400 mr-1.5">LKR</span>
                          <input
                            type="number"
                            min="0"
                            value={v.base_fare ?? ''}
                            onChange={(e) => updateRow(v.id, 'base_fare', e.target.value)}
                            className="w-full text-slate-800 font-black text-sm outline-none bg-transparent"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Price Per KM */}
                      <div className="rounded-2xl border border-slate-150 p-3 hover:border-slate-300 transition-colors">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                          <i className="bi bi-speedometer text-slate-400" /> Per KM
                        </span>
                        <div className="flex items-center">
                          <span className="text-[10px] font-black text-slate-400 mr-1.5">LKR</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={v.price_per_km ?? ''}
                            onChange={(e) => updateRow(v.id, 'price_per_km', e.target.value)}
                            className="w-full text-slate-800 font-black text-sm outline-none bg-transparent"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Secondary Pricing Input: Per Day */}
                    <div className="rounded-2xl bg-slate-50/20 border border-slate-100 p-3">
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                        Daily Operational Holding Rate
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400">LKR</span>
                        <input
                          type="number"
                          min="0"
                          value={v.price_per_day ?? ''}
                          onChange={(e) => updateRow(v.id, 'price_per_day', e.target.value)}
                          className="w-full text-right text-slate-800 font-extrabold text-xs outline-none bg-transparent"
                          placeholder="0"
                        />
                        <span className="text-[9px] font-bold text-slate-400 ml-2">/Day</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400">
                      {v.is_active ? 'Online and booking' : 'Deactivated profile'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSaveVehicle(v)}
                      disabled={saving === v.id || !isModified}
                      className="rounded-xl bg-[#1a2e6f] hover:bg-[#253f93] text-white px-5 py-2 text-xs font-black shadow-md shadow-[#1a2e6f]/10 transition-all active:scale-[0.96] disabled:opacity-40 disabled:shadow-none cursor-pointer flex items-center gap-1.5"
                    >
                      {saving === v.id ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save2-fill" /> Save Profile
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <FinanceToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '' })}
      />
    </div>
  )
}
