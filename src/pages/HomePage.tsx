import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

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

const VEHICLE_CATEGORIES: Record<
  VehicleType,
  { label: string; desc: string }
> = {
  auto: {
    label: 'Auto Rickshaw',
    desc: '3-wheeler local & Shirpur route',
  },
  car: {
    label: '4-Wheeler Car',
    desc: 'Commercial car / cab ride',
  },
  load: {
    label: 'Load Vehicle',
    desc: 'Goods, luggage & shifting',
  },
  bus: {
    label: 'Bus / Shuttle',
    desc: 'Route & group travel',
  },
}

const AREAS = [
  'Main Market / Bus Stand',
  'Shirpur City Center',
  'Highway / Bypass Link',
  'MIDC / Industrial Area',
  'Nearby Village Route',
]

function isTrialActive(driver: Driver): boolean {
  if (driver.plan_type === 'premium') return false
  if (!driver.trial_ends_at) return true
  return new Date(driver.trial_ends_at).getTime() > Date.now()
}

export default function HomePage() {
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger')

  // Passenger booking state
  const [vehicleType, setVehicleType] = useState<VehicleType>('auto')
  const [pickupArea, setPickupArea] = useState<string>(AREAS[0])
  const [dropArea, setDropArea] = useState<string>(AREAS[1])
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Driver manual fare & plan state
  const [driverPhoneInput, setDriverPhoneInput] = useState('')
  const [driverManualFare, setDriverManualFare] = useState('')
  const [driverAreaInput, setDriverAreaInput] = useState(AREAS[0])
  const [driverVehicleInput, setDriverVehicleInput] = useState<VehicleType>('auto')
  const [driverPlanInput, setDriverPlanInput] = useState<PlanType>('trial_1m')
  const [savingDriver, setSavingDriver] = useState(false)

  useEffect(() => {
    let active = true
    async function fetchDrivers() {
      setLoadingDrivers(true)
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)

      if (!active) return
      if (error) {
        setErrorMsg(`Drivers load nahi ho paaye: ${error.message}`)
      } else {
        setDrivers((data as Driver[]) || [])
      }
      setLoadingDrivers(false)
    }

    fetchDrivers()
    return () => {
      active = false
    }
  }, [])

  const filteredDrivers = useMemo(
    () => drivers.filter((d) => d.vehicle_type === vehicleType),
    [drivers, vehicleType],
  )

  const selectedDriver = useMemo(
    () => filteredDrivers.find((d) => d.id === selectedDriverId) || null,
    [filteredDrivers, selectedDriverId],
  )

  const isPremiumDriverSelected = Boolean(
    selectedDriver && selectedDriver.plan_type === 'premium',
  )

  async function handlePassengerBooking(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setStatusMsg(null)

    if (!passengerName.trim() || !passengerPhone.trim()) {
      setErrorMsg('Kripya apna naam aur mobile number darj karein.')
      return
    }

    setSubmitting(true)
    const quotedFare =
      selectedDriver && selectedDriver.manual_fare != null
        ? selectedDriver.manual_fare
        : null

    const { error } = await supabase.from('bookings').insert([
      {
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim(),
        pickup_area: pickupArea,
        drop_area: dropArea,
        vehicle_type: vehicleType,
        driver_id: selectedDriver ? selectedDriver.id : null,
        manual_fare: quotedFare,
        settlement_mode: isPremiumDriverSelected
          ? 'PREMIUM_QR_OR_DIRECT'
          : 'DIRECT_PEER_TO_PEER',
        status: 'pending',
      },
    ])
    setSubmitting(false)

    if (error) {
      setErrorMsg(`Booking save nahi ho paayi: ${error.message}`)
      return
    }

    setStatusMsg(
      quotedFare != null
        ? `Ride request bhej di gayi! Driver ka manual fare: ₹${quotedFare}. Len-den aapas mein direct karein.`
        : 'Ride request bhej di gayi! Fare driver manually set/confirm karega aur len-den aapas mein direct hoga.',
    )
    setPassengerName('')
    setPassengerPhone('')
  }

  async function handleDriverFareSave(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setStatusMsg(null)

    const parsedFare = Number(driverManualFare)
    if (!driverPhoneInput.trim() || Number.isNaN(parsedFare) || parsedFare <= 0) {
      setErrorMsg('Driver mobile number aur sahi manual fare (₹) darj karein.')
      return
    }

    setSavingDriver(true)
    const oneMonthLater = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString()

    const { error } = await supabase
      .from('drivers')
      .update({
        vehicle_type: driverVehicleInput,
        area: driverAreaInput,
        manual_fare: parsedFare,
        plan_type: driverPlanInput,
        trial_ends_at: driverPlanInput === 'trial_1m' ? oneMonthLater : null,
      })
      .eq('phone', driverPhoneInput.trim())

    setSavingDriver(false)

    if (error) {
      setErrorMsg(`Driver fare update nahi ho paaya: ${error.message}`)
      return
    }

    setStatusMsg(
      driverPlanInput === 'premium'
        ? `Manual fare ₹${parsedFare} aur Premium plan save ho gaya (QR/Payment option available).`
        : `1-Month Trial active hai. Manual fare ₹${parsedFare} save ho gaya; QR/Payment sirf Premium plan mein milega.`,
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              AL MURTAJIZ · Shirpur
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Ride &amp; Driver Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              4 Categories · Manual Fare by Driver · Direct Passenger–Driver Len-Den · 1-Month Trial (QR Only in Premium)
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setRole('passenger')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                role === 'passenger'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300'
              }`}
            >
              Passenger
            </button>
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                role === 'driver'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300'
              }`}
            >
              Driver Fare &amp; Plan
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

        {role === 'passenger' ? (
          <>
            <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <h2 className="text-base sm:text-lg font-semibold">
                1. Vehicle Category Chunein (4 Categories)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(Object.keys(VEHICLE_CATEGORIES) as VehicleType[]).map((cat) => {
                  const item = VEHICLE_CATEGORIES[cat]
                  const active = vehicleType === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setVehicleType(cat)
                        setSelectedDriverId('')
                      }}
                      className={`text-left rounded-xl p-3 border transition ${
                        active
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm">{item.label}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {item.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <form
              onSubmit={handlePassengerBooking}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4"
            >
              <h2 className="text-base sm:text-lg font-semibold">
                2. Route &amp; Driver Selection
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-slate-300">Pickup Area</span>
                  <select
                    value={pickupArea}
                    onChange={(e) => setPickupArea(e.target.value)}
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
                  <span className="text-slate-300">Drop Area</span>
                  <select
                    value={dropArea}
                    onChange={(e) => setDropArea(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-slate-300">Aapka Naam *</span>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Naam likhein"
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-slate-300">Mobile Number *</span>
                  <input
                    type="tel"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="text-slate-300">
                  Driver Chunein ({VEHICLE_CATEGORIES[vehicleType].label})
                </span>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                >
                  <option value="">
                    Koi bhi available {VEHICLE_CATEGORIES[vehicleType].label} driver
                  </option>
                  {filteredDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} — {d.area} (
                      {d.manual_fare != null
                        ? `Manual Fare: ₹${d.manual_fare}`
                        : 'Fare by Driver'}
                      )
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm space-y-1.5">
                <div className="font-semibold text-amber-300">
                  Fare &amp; Payment Settlement
                </div>
                <p className="text-slate-200">
                  Fare:{' '}
                  <span className="font-bold">
                    {selectedDriver && selectedDriver.manual_fare != null
                      ? `₹${selectedDriver.manual_fare} (Driver Manual Fare)`
                      : 'Driver manually tay karega'}
                  </span>
                </p>
                <p className="text-xs text-slate-300">
                  Passenger aur driver aapas mein direct len-den karenge.
                </p>
                {isPremiumDriverSelected ? (
                  <p className="text-xs text-emerald-300">
                    Premium Plan Driver — QR / Payment option active.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    QR / Payment feature sirf Premium plan mein hai (Trial plan 1 month tak rehta hai).
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold py-3 transition"
              >
                {submitting ? 'Request Bheji Ja Rahi Hai...' : 'Confirm Ride Request'}
              </button>
            </form>

            <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <h2 className="text-base sm:text-lg font-semibold">
                3. Available Drivers ({VEHICLE_CATEGORIES[vehicleType].label})
              </h2>

              {loadingDrivers ? (
                <p className="text-sm text-slate-400">Drivers load ho rahe hain...</p>
              ) : filteredDrivers.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Is category mein abhi koi driver record nahi hai.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {filteredDrivers.map((d) => {
                    const trialOn = isTrialActive(d)
                    return (
                      <div
                        key={d.id}
                        className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {d.full_name}{' '}
                            <span className="ml-2 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                              {d.plan_type === 'premium'
                                ? 'Premium'
                                : trialOn
                                  ? '1-Month Trial'
                                  : 'Trial Expired'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Area: {d.area} ·{' '}
                            {d.plan_type === 'premium'
                              ? 'QR/Payment: Available'
                              : 'QR/Payment: Only in Premium'}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-emerald-300">
                          {d.manual_fare != null
                            ? `₹${d.manual_fare} (Manual)`
                            : 'Fare by Driver'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <form
            onSubmit={handleDriverFareSave}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4"
          >
            <h2 className="text-lg font-semibold">
              Driver Manual Fare &amp; Plan Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="text-slate-300">Driver Mobile Number *</span>
                <input
                  type="tel"
                  value={driverPhoneInput}
                  onChange={(e) => setDriverPhoneInput(e.target.value)}
                  placeholder="Registered driver mobile"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                />
              </label>

              <label className="block text-sm">
                <span className="text-slate-300">Manual Fare (₹) *</span>
                <input
                  type="number"
                  min={1}
                  value={driverManualFare}
                  onChange={(e) => setDriverManualFare(e.target.value)}
                  placeholder="Apna fare likhein (e.g. 50)"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-sm">
                <span className="text-slate-300">Category</span>
                <select
                  value={driverVehicleInput}
                  onChange={(e) =>
                    setDriverVehicleInput(e.target.value as VehicleType)
                  }
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
                <span className="text-slate-300">Area</span>
                <select
                  value={driverAreaInput}
                  onChange={(e) => setDriverAreaInput(e.target.value)}
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
                <span className="text-slate-300">Plan</span>
                <select
                  value={driverPlanInput}
                  onChange={(e) => setDriverPlanInput(e.target.value as PlanType)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
                >
                  <option value="trial_1m">1-Month Trial</option>
                  <option value="premium">Premium Plan</option>
                </select>
              </label>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-400">
              {driverPlanInput === 'premium'
                ? 'Premium plan select hai: QR / Payment option available hai aur len-den aapas mein direct bhi ho sakta hai.'
                : '1-Month Trial plan select hai: QR / Payment feature nahi hai. Passenger aur driver aapas mein direct len-den karenge.'}
            </div>

            <button
              type="submit"
              disabled={savingDriver}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold py-3 transition"
            >
              {savingDriver ? 'Save Ho Raha Hai...' : 'Save Manual Fare & Plan'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
