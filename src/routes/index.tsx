import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/')({
  component: HomePage,
})

type VehicleType = 'auto' | 'load' | 'four_wheeler'

interface Driver {
  id: string
  full_name: string
  phone: string
  vehicle_type: VehicleType
  vehicle_number: string | null
  area: string
  base_fare: number
  upi_id: string | null
  is_active: boolean
}

const VEHICLE_RATES: Record<
  VehicleType,
  { label: string; baseFare: number; perAreaFare: number; note: string }
> = {
  auto: {
    label: '3-Wheeler Auto',
    baseFare: 30,
    perAreaFare: 20,
    note: 'Local & city shared/private auto',
  },
  load: {
    label: 'Load Vehicle',
    baseFare: 150,
    perAreaFare: 80,
    note: 'Goods, luggage & commercial shifting',
  },
  four_wheeler: {
    label: '4-Wheeler',
    baseFare: 100,
    perAreaFare: 60,
    note: 'Car / cab for family & outstation',
  },
}

const AREAS = [
  'Main Market / Bus Stand',
  'Shirpur City Center',
  'Railway / Highway Link',
  'Industrial / MIDC Zone',
  'Nearby Village Route',
]

function HomePage() {
  const [vehicleType, setVehicleType] = useState<VehicleType>('auto')
  const [pickupArea, setPickupArea] = useState<string>(AREAS[0])
  const [dropArea, setDropArea] = useState<string>(AREAS[1])

  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const estimatedFare = useMemo(() => {
    const rate = VEHICLE_RATES[vehicleType]
    if (pickupArea === dropArea) return rate.baseFare
    return rate.baseFare + rate.perAreaFare
  }, [vehicleType, pickupArea, dropArea])

  useEffect(() => {
    let active = true
    async function loadDrivers() {
      setLoadingDrivers(true)
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!active) return
      if (error) {
        setErrorMessage(`Drivers load nahi ho paaye: ${error.message}`)
      } else {
        setDrivers((data as Driver[]) || [])
      }
      setLoadingDrivers(false)
    }

    loadDrivers()
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

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setStatusMessage(null)

    if (!passengerName.trim() || !passengerPhone.trim()) {
      setErrorMessage('Kripya apna naam aur mobile number darj karein.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('bookings').insert([
      {
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim(),
        pickup_area: pickupArea,
        drop_area: dropArea,
        vehicle_type: vehicleType,
        driver_id: selectedDriver ? selectedDriver.id : null,
        estimated_fare: estimatedFare,
        payment_method: 'UPI_QR',
        status: 'pending',
      },
    ])
    setSubmitting(false)

    if (error) {
      setErrorMessage(`Booking save nahi ho paayi: ${error.message}`)
      return
    }

    setStatusMessage(
      `Booking request submit ho gayi! Estimated Fare: ₹${estimatedFare} (PhonePe / Google Pay QR se payment karein).`,
    )
    setPassengerName('')
    setPassengerPhone('')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
            Public Ride &amp; Driver Directory
          </p>
          <h1 className="text-3xl font-bold mt-1">AL MURTAJIZ</h1>
          <p className="text-sm text-slate-400 mt-1">
            3-Wheeler Auto, Load Vehicle aur 4-Wheeler booking — area-wise fare &amp; direct UPI QR payment.
          </p>
        </header>

        {/* Vehicle Selection */}
        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <h2 className="text-lg font-semibold">1. Vehicle Chunein</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(VEHICLE_RATES) as VehicleType[]).map((type) => {
              const item = VEHICLE_RATES[type]
              const active = vehicleType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setVehicleType(type)
                    setSelectedDriverId('')
                  }}
                  className={`text-left rounded-xl p-4 border transition ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-400 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-xs text-emerald-300 mt-1">
                    Base ₹{item.baseFare} · +₹{item.perAreaFare}/route
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{item.note}</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Booking Form & Fare */}
        <form
          onSubmit={handleBookingSubmit}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">2. Route &amp; Ride Booking</h2>
            <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-sm font-semibold text-emerald-300">
              Est. Fare: ₹{estimatedFare}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-300">Pickup Area</span>
              <select
                value={pickupArea}
                onChange={(e) => setPickupArea(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
              >
                {AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
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
                {AREAS.map((area) => (
                  <option key={area} value={area}>
                    {area}
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
            <span className="text-slate-300">Driver Chunein (Optional)</span>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-white"
            >
              <option value="">Koi bhi available {VEHICLE_RATES[vehicleType].label} driver</option>
              {filteredDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} — {d.area} (₹{d.base_fare || VEHICLE_RATES[vehicleType].baseFare})
                </option>
              ))}
            </select>
          </label>

          {/* Payment Info Box */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm space-y-1">
            <div className="font-semibold text-amber-300">
              PhonePe / Google Pay QR Payment
            </div>
            <p className="text-slate-300">
              Payable Amount: <span className="font-bold text-white">₹{estimatedFare}</span>
            </p>
            <p className="text-xs text-slate-400">
              {selectedDriver?.upi_id
                ? `Driver UPI ID: ${selectedDriver.upi_id}`
                : 'Booking ke baad driver/counter ke PhonePe ya Google Pay QR se direct pay karein.'}
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-sm text-emerald-200">
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold py-3 transition"
          >
            {submitting ? 'Booking Bheji Ja Rahi Hai...' : `Book Ride — ₹${estimatedFare}`}
          </button>
        </form>

        {/* Drivers Directory */}
        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <h2 className="text-lg font-semibold">
            3. Available Drivers ({VEHICLE_RATES[vehicleType].label})
          </h2>

          {loadingDrivers ? (
            <p className="text-sm text-slate-400">Drivers load ho rahe hain...</p>
          ) : filteredDrivers.length === 0 ? (
            <p className="text-sm text-slate-400">
              Abhi is category mein koi active driver record nahi hai. Supabase `drivers` table mein driver add karke yahan live dekh sakte hain.
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-white">{driver.full_name}</div>
                    <div className="text-xs text-slate-400">
                      Area: {driver.area}
                      {driver.vehicle_number ? ` · Vehicle: ${driver.vehicle_number}` : ''}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-300">
                    ₹{driver.base_fare || VEHICLE_RATES[vehicleType].baseFare} base
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
