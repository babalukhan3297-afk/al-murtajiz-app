import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

export type VehicleType = 'auto' | 'car' | 'load' | 'bus'
export type PlanType = 'trial_1m' | 'premium'

export interface Driver {
  id: string
  full_name: string
  phone: string
  vehicle_type: VehicleType
  area: string
  manual_fare: number | null
  plan_type: PlanType
  trial_ends_at: string | null
  is_active: boolean
}

const VEHICLE_CATEGORIES: Record<VehicleType, { label: string; desc: string }> = {
  auto: { label: 'Auto Rickshaw', desc: '3-wheeler local & Shirpur route' },
  car: { label: '4-Wheeler Car', desc: 'Commercial car / cab ride' },
  load: { label: 'Load Vehicle', desc: 'Goods, luggage & shifting' },
  bus: { label: 'Bus / Shuttle', desc: 'Route & group travel' },
}

const AREAS = [
  'Main Market / Bus Stand',
  'Shirpur City Center',
  'Highway / Bypass Link',
  'MIDC / Industrial Area',
  'Nearby Village Route',
]

// Admin PIN (Aap apni pasand ka PIN rakh sakte hain)
const ADMIN_PIN = '7860'

function isTrialStillValid(driver: Driver): boolean {
  if (driver.plan_type === 'premium') return true
  if (!driver.trial_ends_at) return true
  return new Date(driver.trial_ends_at).getTime() > Date.now()
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'passenger' | 'driver' | 'admin'>('passenger')

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Passenger states (No ride history stored)
  const [selectedCategory, setSelectedCategory] = useState<VehicleType>('auto')
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')

  // Driver self-management states (Only driver's own work)
  const [drvName, setDrvName] = useState('')
  const [drvPhone, setDrvPhone] = useState('')
  const [drvCategory, setDrvCategory] = useState<VehicleType>('auto')
  const [drvArea, setDrvArea] = useState<string>(AREAS[0])
  const [drvManualFare, setDrvManualFare] = useState('')
  const [savingDriver, setSavingDriver] = useState(false)

  // Admin states (Only Admin controls Trial & Premium plans)
  const [adminPinInput, setAdminPinInput] = useState('')
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [updatingAdminId, setUpdatingAdminId] = useState<string | null>(null)

  async function loadAllDrivers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) {
      setErrorMsg(`Data load error: ${error.message}`)
    } else {
      setDrivers((data as Driver[]) || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAllDrivers()
  }, [])

  // Passenger ke liye sirf active & valid plan wale drivers dikhenge
  const visibleDriversForPassenger = useMemo(() => {
    return drivers.filter((d) => {
      if (!d.is_active) return false
      if (!isTrialStillValid(d)) return false
      if (d.vehicle_type !== selectedCategory) return false
      if (selectedAreaFilter !== 'ALL' && d.area !== selectedAreaFilter) return false
      return true
    })
  }, [drivers, selectedCategory, selectedAreaFilter])

  const chosenDriver = useMemo(
    () => visibleDriversForPassenger.find((d) => d.id === selectedDriverId) || null,
    [visibleDriversForPassenger, selectedDriverId],
  )

  // Passenger direct confirmation (Bina ride history save kiye)
  function handlePassengerConfirm(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setStatusMsg(null)

    if (!passengerName.trim() || !passengerPhone.trim()) {
      setErrorMsg('Kripya apna naam aur mobile number likhein.')
      return
    }
    if (!chosenDriver) {
      setErrorMsg('Kripya directory mein se ek driver chunein.')
      return
    }

    const fareText =
      chosenDriver.manual_fare != null
        ? `₹${chosenDriver.manual_fare} (Driver Manual Fare)`
        : 'Driver se direct baat karke tay karein'

    const payText =
      chosenDriver.plan_type === 'premium'
        ? 'Premium Driver: QR / Payment ya direct len-den available.'
        : 'Trial Driver: QR/Payment band hai — aapas mein direct cash len-den karein.'

    setStatusMsg(
      `Driver ${chosenDriver.full_name} (${chosenDriver.phone}) chuna gaya! Fare: ${fareText}. ${payText}`,
    )
    setPassengerName('')
    setPassengerPhone('')
  }

  // Driver apna profile aur manual fare khud save/update karega (Plan nahi chhed sakta)
  async function handleDriverSave(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setStatusMsg(null)

    const cleanPhone = drvPhone.trim()
    const cleanName = drvName.trim()
    const parsedFare = Number(drvManualFare)

    if (!cleanName || !cleanPhone || Number.isNaN(parsedFare) || parsedFare <= 0) {
      setErrorMsg('Apna naam, mobile number aur sahi manual fare (₹) darj karein.')
      return
    }

    setSavingDriver(true)

    const existing = drivers.find((d) => d.phone === cleanPhone)

    if (existing) {
      // Existing driver sirf apna naam, category, area aur manual fare badal sakta hai
      const { error } = await supabase
        .from('drivers')
        .update({
          full_name: cleanName,
          vehicle_type: drvCategory,
          area: drvArea,
          manual_fare: parsedFare,
        })
        .eq('id', existing.id)

      setSavingDriver(false)
      if (error) {
        setErrorMsg(`Update error: ${error.message}`)
        return
      }
      setStatusMsg(`Aapka manual fare ₹${parsedFare} aur details update ho gayi hain.`)
    } else {
      // Naya driver register hoga (Default 1-month trial admin ke control mein rahega)
      const oneMonthTrialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase.from('drivers').insert([
        {
          full_name: cleanName,
          phone: cleanPhone,
          vehicle_type: drvCategory,
          area: drvArea,
          manual_fare: parsedFare,
          plan_type: 'trial_1m',
          trial_ends_at: oneMonthTrialEnd,
          is_active: true,
        },
      ])

      setSavingDriver(false)
      if (error) {
        setErrorMsg(`Register error: ${error.message}`)
        return
      }
      setStatusMsg(
        `Registration ho gaya! Aapka manual fare ₹${parsedFare} set hai. Plan (Trial / Premium) Admin manage karega.`,
      )
    }

    await loadAllDrivers()
  }

  // Admin: Trial ya Premium plan set karna
  async function handleAdminPlanChange(driver: Driver, newPlan: PlanType) {
    setErrorMsg(null)
    setStatusMsg(null)
    setUpdatingAdminId(driver.id)

    const newTrialEnd =
      newPlan === 'trial_1m'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null

    const { error } = await supabase
      .from('drivers')
      .update({
        plan_type: newPlan,
        trial_ends_at: newTrialEnd,
      })
      .eq('id', driver.id)

    setUpdatingAdminId(null)
    if (error) {
      setErrorMsg(`Plan update nahi ho paaya: ${error.message}`)
      return
    }

    setStatusMsg(
      `${driver.full_name} ka plan "${newPlan === 'premium' ? 'Premium (QR Active)' : '1-Month Trial (No QR)'}" kar diya gaya.`,
    )
    await loadAllDrivers()
  }

  // Admin: Driver Active / Inactive toggle
  async function handleAdminToggleActive(driver: Driver) {
    setErrorMsg(null)
    setStatusMsg(null)
    setUpdatingAdminId(driver.id)

    const { error } = await supabase
      .from('drivers')
      .update({ is_active: !driver.is_active })
      .eq('id', driver.id)

    setUpdatingAdminId(null)
    if (error) {
      setErrorMsg(`Status update error: ${error.message}`)
      return
    }

    setStatusMsg(
      `${driver.full_name} ab ${!driver.is_active ? 'Active' : 'Inactive'} hai.`,
    )
    await loadAllDrivers()
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header & Role Tabs */}
        <header className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              AL MURTAJIZ · Shirpur Directory
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Ride &amp; Driver Directory
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              4 Categories · Driver Manual Fare · Direct Passenger–Driver Len-Den · Admin Controlled Trial &amp; Premium
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('passenger')
                setErrorMsg(null)
                setStatusMsg(null)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'passenger'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 text-slate-300 border border-slate-800'
              }`}
            >
              1. Passenger Directory
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('driver')
                setErrorMsg(null)
                setStatusMsg(null)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'driver'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 text-slate-300 border border-slate-800'
              }`}
            >
              2. Driver Fare Setup
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin')
                setErrorMsg(null)
                setStatusMsg(null)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-950 text-slate-300 border border-slate-800'
              }`}
            >
              3. Admin Panel
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-sm text-red-200">
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-sm text-emerald-200">
            {statusMsg}
          </div>
        )}

        {/* ==================== TAB 1: PASSENGER ==================== */}
        {activeTab === 'passenger' && (
          <div className="space-y-5">
            <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <h2 className="text-base font-semibold">Category Chunein (4 Categories)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(VEHICLE_CATEGORIES) as VehicleType[]).map((cat) => {
                  const active = selectedCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat)
                        setSelectedDriverId('')
                      }}
                      className={`text-left rounded-xl p-3 border transition ${
                        active
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm">{VEHICLE_CATEGORIES[cat].label}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {VEHICLE_CATEGORIES[cat].desc}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="pt-2">
                <label className="block text-xs text-slate-400 mb-1">Area Filter</label>
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => {
                    setSelectedAreaFilter(e.target.value)
                    setSelectedDriverId('')
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white"
                >
                  <option value="ALL">All Shirpur Areas</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Available Drivers List */}
            <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <h2 className="text-base font-semibold">
                Available Drivers ({VEHICLE_CATEGORIES[selectedCategory].label})
              </h2>

              {loading ? (
                <p className="text-sm text-slate-400">Drivers load ho rahe hain...</p>
              ) : visibleDriversForPassenger.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Is category ya area mein abhi koi driver available nahi hai.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {visibleDriversForPassenger.map((d) => {
                    const isSelected = selectedDriverId === d.id
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDriverId(d.id)}
                        className={`cursor-pointer rounded-xl p-3.5 border transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{d.full_name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                              {d.plan_type === 'premium' ? 'Premium' : '1-Month Trial'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Area: {d.area} · Mobile: {d.phone}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {d.plan_type === 'premium'
                              ? 'Payment / QR: Available (Premium)'
                              : 'Payment / QR: Band hai — Direct cash len-den'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-bold text-emerald-300">
                            {d.manual_fare != null ? `₹${d.manual_fare}` : 'Fare by Driver'}
                          </div>
                          <div className="text-[11px] text-slate-400">Driver Manual Rate</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Quick Contact / Confirmation Form (No history stored) */}
            <form
              onSubmit={handlePassengerConfirm}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4"
            >
              <h2 className="text-base font-semibold">Driver Se Sampark Karein</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="Aapka Naam"
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white"
                />
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="Aapka Mobile Number"
                  className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white"
                />
              </div>

              <p className="text-xs text-slate-400">
                Note: Fare driver ke hisaab se manual rahega aur passenger–driver aapas mein hi direct len-den karenge.
              </p>

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 text-sm transition"
              >
                {chosenDriver
                  ? `${chosenDriver.full_name} Ko Select Karein`
                  : 'Upar List Se Driver Chunein'}
              </button>
            </form>
          </div>
        )}

        {/* ==================== TAB 2: DRIVER (ONLY DRIVER'S OWN WORK) ==================== */}
        {activeTab === 'driver' && (
          <form
            onSubmit={handleDriverSave}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold">Driver Apna Rate &amp; Details Set Karein</h2>
              <p className="text-xs text-slate-400 mt-1">
                Yahan driver sirf apna naam, category, area aur manual fare set kar sakta hai. Trial aur Premium plan sirf Admin set karega.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-300">Driver Naam *</span>
                <input
                  type="text"
                  value={drvName}
                  onChange={(e) => setDrvName(e.target.value)}
                  placeholder="Apna poora naam"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                />
              </label>

              <label className="block text-sm">
                <span className="text-slate-300">Mobile Number *</span>
                <input
                  type="tel"
                  value={drvPhone}
                  onChange={(e) => setDrvPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-sm">
                <span className="text-slate-300">Vehicle Category</span>
                <select
                  value={drvCategory}
                  onChange={(e) => setDrvCategory(e.target.value as VehicleType)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                >
                  {(Object.keys(VEHICLE_CATEGORIES) as VehicleType[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {VEHICLE_CATEGORIES[cat].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-slate-300">Service Area</span>
                <select
                  value={drvArea}
                  onChange={(e) => setDrvArea(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                >
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-slate-300">Apna Manual Fare (₹) *</span>
                <input
                  type="number"
                  min={1}
                  value={drvManualFare}
                  onChange={(e) => setDrvManualFare(e.target.value)}
                  placeholder="e.g. 50"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingDriver}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold py-3 transition"
            >
              {savingDriver ? 'Save Ho Raha Hai...' : 'Save / Update My Fare'}
            </button>
          </form>
        )}

        {/* ==================== TAB 3: ADMIN (ONLY ADMIN CONTROLS PLANS) ==================== */}
        {activeTab === 'admin' && (
          <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Admin Control Panel</h2>

            {!isAdminUnlocked ? (
              <div className="space-y-3 max-w-sm">
                <p className="text-xs text-slate-400">
                  Trial aur Premium plan manage karne ke liye Admin PIN daalein:
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    placeholder="Admin PIN"
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (adminPinInput === ADMIN_PIN) {
                        setIsAdminUnlocked(true)
                        setErrorMsg(null)
                      } else {
                        setErrorMsg('Galat Admin PIN.')
                      }
                    }}
                    className="rounded-xl bg-emerald-500 text-slate-950 font-bold px-4 py-2 text-sm"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Sirf Admin yahan se har driver ka <strong>1-Month Trial</strong> ya <strong>Premium Plan (QR/Payment Active)</strong> set kar sakta hai.
                </p>

                {drivers.length === 0 ? (
                  <p className="text-sm text-slate-400">Abhi koi driver registered nahi hai.</p>
                ) : (
                  <div className="space-y-2.5">
                    {drivers.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {d.full_name} ({d.phone})
                          </div>
                          <div className="text-xs text-slate-400">
                            {VEHICLE_CATEGORIES[d.vehicle_type]?.label || d.vehicle_type} · {d.area} · Manual Fare:{' '}
                            {d.manual_fare != null ? `₹${d.manual_fare}` : 'Not set'}
                          </div>
                          <div className="text-xs mt-1">
                            Current Plan:{' '}
                            <span className="font-semibold text-amber-300">
                              {d.plan_type === 'premium' ? 'Premium (QR Active)' : '1-Month Trial (No QR)'}
                            </span>{' '}
                            · Status:{' '}
                            <span className={d.is_active ? 'text-emerald-400' : 'text-red-400'}>
                              {d.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingAdminId === d.id}
                            onClick={() => handleAdminPlanChange(d, 'trial_1m')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              d.plan_type === 'trial_1m'
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            1-Month Trial
                          </button>

                          <button
                            type="button"
                            disabled={updatingAdminId === d.id}
                            onClick={() => handleAdminPlanChange(d, 'premium')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              d.plan_type === 'premium'
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            Premium Plan
                          </button>

                          <button
                            type="button"
                            disabled={updatingAdminId === d.id}
                            onClick={() => handleAdminToggleActive(d)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-200"
                          >
                            {d.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
