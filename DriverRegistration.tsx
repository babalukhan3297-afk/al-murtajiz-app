import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoPicker } from "./PhotoPicker";
import { CATEGORIES, normalizeMobile } from "@/lib/rules";
import { MAX_AREA_RATES, type AreaRateItem } from "@/lib/drivers";
import { updateAccount, type DriverProfile } from "@/lib/session";
import { useSheetSubmit } from "@/lib/useSheet";
import { cn } from "@/lib/utils";

export type AreaRateEntry = AreaRateItem & {
  seat1?: string;
  seat2?: string;
  seat3?: string;
  autoRate?: string;
};

type DraftRow = {
  area: string;
  seat1: string;
  seat2: string;
  seat3: string;
  autoRate: string;
};

const EMPTY_DRAFT: DraftRow = {
  area: "",
  seat1: "",
  seat2: "",
  seat3: "",
  autoRate: "",
};

const AL_MURTAJIZ_CAR_ART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 155">
    <defs>
      <linearGradient id="bodyBlue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2563eb" />
        <stop offset="55%" stop-color="#0b47b8" />
        <stop offset="100%" stop-color="#041d56" />
      </linearGradient>
      <linearGradient id="goldTrim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#fde047" />
        <stop offset="50%" stop-color="#facc15" />
        <stop offset="100%" stop-color="#ca8a04" />
      </linearGradient>
      <linearGradient id="glassTint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#334155" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>

    <!-- Ground shadow -->
    <ellipse cx="162" cy="134" rx="126" ry="12" fill="#020617" opacity="0.45" />

    <!-- Yellow roof toppers -->
    <ellipse cx="144" cy="24" rx="18" ry="6" fill="url(#goldTrim)" stroke="#713f12" stroke-width="2" />
    <ellipse cx="186" cy="24" rx="18" ry="6" fill="url(#goldTrim)" stroke="#713f12" stroke-width="2" />

    <!-- Cabin & roofline -->
    <path
      d="M72 74 L106 31 L212 31 L256 74 Z"
      fill="url(#bodyBlue)"
      stroke="#fde047"
      stroke-width="3"
      stroke-linejoin="round"
    />

    <!-- Front & side windows -->
    <path d="M88 69 L114 38 L156 38 L156 69 Z" fill="url(#glassTint)" />
    <path d="M164 38 L206 38 L238 69 L164 69 Z" fill="url(#glassTint)" />

    <!-- Yellow side mirrors -->
    <rect x="74" y="62" width="18" height="11" rx="5" fill="url(#goldTrim)" stroke="#713f12" stroke-width="1.5" />
    <rect x="242" y="62" width="18" height="11" rx="5" fill="url(#goldTrim)" stroke="#713f12" stroke-width="1.5" />

    <!-- Main car chassis -->
    <path
      d="M26 78 Q28 66 44 65 L278 65 Q296 67 298 86 L296 112 Q295 121 282 122 L38 122 Q26 121 26 108 Z"
      fill="url(#bodyBlue)"
      stroke="#fde047"
      stroke-width="3"
    />

    <!-- Yellow side skirt & front bumper trim -->
    <path d="M44 107 L256 107" stroke="url(#goldTrim)" stroke-width="7" stroke-linecap="round" />
    <path d="M34 114 L92 119 L118 106" fill="none" stroke="url(#goldTrim)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Front grille & emblem -->
    <rect x="44" y="83" width="84" height="22" rx="8" fill="#0f172a" stroke="#cbd5e1" stroke-width="2" />
    <line x1="50" y1="89" x2="122" y2="89" stroke="#94a3b8" stroke-width="2" />
    <line x1="50" y1="94" x2="122" y2="94" stroke="#94a3b8" stroke-width="2" />
    <line x1="50" y1="99" x2="122" y2="99" stroke="#94a3b8" stroke-width="2" />
    <circle cx="86" cy="94" r="8" fill="#1e293b" stroke="#e2e8f0" stroke-width="2" />

    <!-- Headlights -->
    <path d="M26 84 Q42 82 44 96 L28 100 Z" fill="#fef08a" stroke="#eab308" stroke-width="1.5" />
    <path d="M132 84 Q156 80 166 93 Q148 101 132 98 Z" fill="#e0f2fe" stroke="#93c5fd" stroke-width="1.5" />

    <!-- Front number plate -->
    <rect x="60" y="108" width="52" height="12" rx="2" fill="#ffffff" stroke="#1e293b" stroke-width="1.2" />

    <!-- Front & Rear Alloy Wheels -->
    <g transform="translate(88, 118)">
      <circle r="21" fill="#0f172a" stroke="#e2e8f0" stroke-width="3" />
      <circle r="13" fill="#cbd5e1" />
      <circle r="5" fill="#0f172a" />
    </g>
    <g transform="translate(248, 118)">
      <circle r="21" fill="#0f172a" stroke="#e2e8f0" stroke-width="3" />
      <circle r="13" fill="#cbd5e1" />
      <circle r="5" fill="#0f172a" />
    </g>
  </svg>
`);

function AlMurtajizCarImage({ className }: { className?: string }) {
  return (
    <img
      src={AL_MURTAJIZ_CAR_ART}
      alt="AL MURTAJIZ Blue and Yellow Car"
      className={className}
    />
  );
}

function MiniAppLogoBadge() {
  return (
    <div className="relative flex h-14 w-14 shrink-0 flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-[#facc15] bg-gradient-to-b from-[#0b47b8] via-[#062463] to-[#031338] p-1 shadow-md">
      <AlMurtajizCarImage className="h-9 w-full object-contain" />
      <span className="w-full rounded bg-[#031338]/90 text-center text-[7px] font-black tracking-tight text-[#facc15]">
        AL MURTAJIZ
      </span>
    </div>
  );
}

function AlMurtajizBottomBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#0648d8] bg-gradient-to-b from-[#dbeafe] via-[#bfdbfe] to-[#062463] shadow-md">
      <svg
        viewBox="0 0 600 135"
        className="block h-28 w-full select-none"
        role="img"
        aria-label="AL MURTAJIZ Skyline and Road Banner"
      >
        <defs>
          <linearGradient id="skyWash2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#eff6ff" />
            <stop offset="65%" stop-color="#bae6fd" />
            <stop offset="100%" stop-color="#60a5fa" />
          </linearGradient>
        </defs>
        <rect width="600" height="135" fill="url(#skyWash2)" />
        <path
          d="M0 95 L0 72 L24 72 L24 55 L36 55 L36 76 L58 76 L58 46 L66 32 L74 46 L74 76 L98 76 L98 58 L118 58 L118 80 L146 80 L146 42 L154 28 L162 42 L162 74 L194 74 L194 52 L218 52 L218 78 L252 78 L252 48 L266 38 L280 48 L280 82 L322 82 L322 60 L348 60 L348 84 L390 84 L390 66 L600 66 L600 135 L0 135 Z"
          fill="#60a5fa"
          opacity="0.55"
        />
        <path d="M0 88 Q210 118 600 84 L600 135 L0 135 Z" fill="#062463" />
        <path
          d="M0 84 Q210 114 600 80"
          fill="none"
          stroke="#facc15"
          strokeWidth="7"
        />
        <path
          d="M0 94 Q210 124 600 90"
          fill="none"
          stroke="#0648d8"
          strokeWidth="8"
        />
        <path d="M235 135 Q350 92 600 94 L600 135 Z" fill="#1e293b" />
        <path
          d="M275 132 Q365 104 455 103"
          fill="none"
          stroke="#f8fafc"
          strokeWidth="3.5"
          strokeDasharray="16 12"
        />
      </svg>

      <div className="pointer-events-none absolute bottom-1 right-3 w-40 sm:w-44">
        <AlMurtajizCarImage className="h-auto w-full object-contain drop-shadow-lg" />
      </div>
    </div>
  );
}

function formatRupee(val?: string): string {
  const clean = (val ?? "").trim();
  if (!clean) return "—";
  return clean.startsWith("₹") ? clean : `₹${clean}`;
}

function summarizeRowToAreaRate(row: DraftRow): AreaRateEntry {
  const area = row.area.trim();
  const s1 = row.seat1.trim();
  const s2 = row.seat2.trim();
  const s3 = row.seat3.trim();
  const auto = row.autoRate.trim();

  const parts: string[] = [];
  if (s1) parts.push(`S1: ${formatRupee(s1)}`);
  if (s2) parts.push(`S2: ${formatRupee(s2)}`);
  if (s3) parts.push(`S3: ${formatRupee(s3)}`);
  if (auto) parts.push(`Auto: ${formatRupee(auto)}`);

  return {
    area,
    rate: parts.length > 0 ? parts.join(" | ") : "₹0",
    seat1: s1,
    seat2: s2,
    seat3: s3,
    autoRate: auto,
  };
}

function entryToDraft(entry: AreaRateEntry): DraftRow {
  if (
    entry.seat1 !== undefined ||
    entry.seat2 !== undefined ||
    entry.seat3 !== undefined ||
    entry.autoRate !== undefined
  ) {
    return {
      area: entry.area ?? "",
      seat1: entry.seat1 ?? "",
      seat2: entry.seat2 ?? "",
      seat3: entry.seat3 ?? "",
      autoRate: entry.autoRate ?? "",
    };
  }

  const rawRate = entry.rate ?? "";
  const autoMatch = rawRate.match(/Auto:\s*₹?([0-9,\s-]+)/i);
  const s1Match = rawRate.match(/S1:\s*₹?([0-9,\s-]+)/i);
  const s2Match = rawRate.match(/S2:\s*₹?([0-9,\s-]+)/i);
  const s3Match = rawRate.match(/S3:\s*₹?([0-9,\s-]+)/i);
  const hasStructured = Boolean(autoMatch || s1Match || s2Match || s3Match);

  return {
    area: entry.area ?? "",
    seat1: s1Match?.[1]?.trim() ?? "",
    seat2: s2Match?.[1]?.trim() ?? "",
    seat3: s3Match?.[1]?.trim() ?? "",
    autoRate: hasStructured
      ? (autoMatch?.[1]?.trim() ?? "")
      : rawRate.replace(/^₹/, "").trim(),
  };
}

export function DriverRegistrationForm({
  mobile,
  initial,
  onDone,
}: {
  mobile: string;
  initial: DriverProfile | undefined;
  onDone: () => void;
}) {
  const submit = useSheetSubmit();
  const [busy, setBusy] = useState(false);

  const initialEntries: AreaRateEntry[] = useMemo(() => {
    const raw = (initial?.areaRates ?? []) as AreaRateEntry[];
    if (raw.length > 0) {
      return raw.slice(0, MAX_AREA_RATES).map((item) => ({
        ...item,
        area: item.area.trim(),
        rate: item.rate.trim(),
      }));
    }
    return [];
  }, [initial?.areaRates]);

  const [f, setF] = useState<DriverProfile>({
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    contact: initial?.contact || mobile,
    altContact: initial?.altContact ?? "",
    whatsapp: initial?.whatsapp || mobile,
    category: initial?.category || CATEGORIES[0].name,
    photo: initial?.photo,
    areaRates: initialEntries,
  });

  const [areaRates, setAreaRates] = useState<AreaRateEntry[]>(initialEntries);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [jumpQuery, setJumpQuery] = useState<string>("");

  const swipeTrackRef = useRef<HTMLDivElement | null>(null);
  const [swipeX, setSwipeX] = useState<number>(0);
  const [swiping, setSwiping] = useState<boolean>(false);
  const startClientXRef = useRef<number | null>(null);

  const set = (k: keyof DriverProfile) => (v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const setDraftField = (k: keyof DraftRow) => (v: string) =>
    setDraft((prev) => ({ ...prev, [k]: v }));

  function handleAddOrUpdateEntry(): void {
    const cleanArea = draft.area.trim();
    const s1 = draft.seat1.trim();
    const s2 = draft.seat2.trim();
    const s3 = draft.seat3.trim();
    const auto = draft.autoRate.trim();

    if (!cleanArea) {
      toast.error("Please enter Area Name.");
      return;
    }

    if (!s1 && !s2 && !s3 && !auto) {
      toast.error("Please enter at least one rate (Seat 1, Seat 2, Seat 3, or Full Auto).");
      return;
    }

    const builtEntry = summarizeRowToAreaRate({
      area: cleanArea,
      seat1: s1,
      seat2: s2,
      seat3: s3,
      autoRate: auto,
    });

    if (editingIndex !== null) {
      setAreaRates((prev) =>
        prev.map((item, idx) => (idx === editingIndex ? builtEntry : item)),
      );
      toast.success(`Row #${editingIndex + 1} (${cleanArea}) updated.`);
      setEditingIndex(null);
      setDraft(EMPTY_DRAFT);
      return;
    }

    if (areaRates.length >= MAX_AREA_RATES) {
      toast.error(`Maximum ${MAX_AREA_RATES} area-rate entries allowed.`);
      return;
    }

    setAreaRates((prev) => [...prev, builtEntry]);
    toast.success(`Added "${cleanArea}" (${areaRates.length + 1}/${MAX_AREA_RATES}).`);
    setDraft(EMPTY_DRAFT);
  }

  function handleStartEdit(index: number): void {
    const target = areaRates[index];
    if (!target) return;
    setEditingIndex(index);
    setDraft(entryToDraft(target));
    toast.info(`Editing Row #${index + 1}: ${target.area}`);
  }

  function handleCancelEdit(): void {
    setEditingIndex(null);
    setDraft(EMPTY_DRAFT);
  }

  function handleDeleteRow(index: number): void {
    const target = areaRates[index];
    if (!target) return;

    setAreaRates((prev) => prev.filter((_, idx) => idx !== index));

    if (editingIndex === index) {
      setEditingIndex(null);
      setDraft(EMPTY_DRAFT);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }

    toast.success(`Deleted Row #${index + 1} (${target.area}).`);
  }

  const filteredEntries = useMemo(() => {
    const q = jumpQuery.trim().toLowerCase();
    return areaRates
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry, index }) => {
        if (!q) return true;
        const rowNumMatch = String(index + 1) === q.replace(/^#/, "");
        const areaMatch = entry.area.toLowerCase().includes(q);
        const rateMatch = entry.rate.toLowerCase().includes(q);
        return rowNumMatch || areaMatch || rateMatch;
      });
  }, [areaRates, jumpQuery]);

  async function saveDriverData(): Promise<void> {
    if (busy) return;

    const contact = normalizeMobile(f.contact);
    const whatsapp = normalizeMobile(f.whatsapp);
    const alt = f.altContact ? normalizeMobile(f.altContact) : "";

    if (!f.photo) {
      toast.error("Please upload your driver photo.");
      return;
    }
    if (f.name.trim().length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    if (f.address.trim().length < 5) {
      toast.error("Enter your full address.");
      return;
    }
    if (!contact) {
      toast.error("Enter a valid contact number.");
      return;
    }
    if (alt === null) {
      toast.error("Enter a valid alternate mobile number.");
      return;
    }
    if (!whatsapp) {
      toast.error("Enter a valid WhatsApp number.");
      return;
    }

    const sanitizedRates: AreaRateEntry[] = areaRates
      .slice(0, MAX_AREA_RATES)
      .filter((r) => r.area.trim().length > 0 && r.rate.trim().length > 0)
      .map((r) => ({
        ...r,
        area: r.area.trim(),
        rate: r.rate.trim(),
      }));

    const clean: DriverProfile = {
      ...f,
      name: f.name.trim(),
      address: f.address.trim(),
      serviceArea:
        f.address.trim() ||
        sanitizedRates.map((item) => item.area).join(", "),
      contact,
      whatsapp,
      altContact: alt,
      areaRates: sanitizedRates,
    };

    setBusy(true);
    updateAccount(mobile, (a) => ({
      ...a,
      driver: clean,
      duty: a.duty ?? true,
    }));

    await submit(
      {
        action: "registerDriver",
        Driver_Name: clean.name,
        Category: clean.category,
        Phone: `91${contact}`,
        Alternate_Phone: alt ? `91${alt}` : "",
        WhatsApp: `91${whatsapp}`,
        Address: clean.address,
        Area_Rates: sanitizedRates.map(({ area, rate }) => ({ area, rate })),
        Photo_URL: clean.photo,
        Status: "Online",
      } as Parameters<typeof submit>[0],
      "AL MURTAJIZ Driver Profile & Rate Card updated",
    );

    setBusy(false);
    setSwipeX(0);
    onDone();
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    await saveDriverData();
  }

  function getMaxSwipeTravel(): number {
    const el = swipeTrackRef.current;
    if (!el) return 150;
    return Math.max(80, el.clientWidth - 78);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    if (busy) return;
    startClientXRef.current = e.clientX;
    setSwiping(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!swiping || startClientXRef.current === null || busy) return;
    const maxTravel = getMaxSwipeTravel();
    const delta = Math.max(0, Math.min(maxTravel, e.clientX - startClientXRef.current));
    setSwipeX(delta);
  }

  function handlePointerUp(): void {
    if (!swiping) return;
    const maxTravel = getMaxSwipeTravel();
    const threshold = maxTravel * 0.72;
    setSwiping(false);
    startClientXRef.current = null;

    if (swipeX >= threshold) {
      setSwipeX(maxTravel);
      void saveDriverData();
    } else {
      setSwipeX(0);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 overflow-hidden rounded-3xl border-2 border-[#0648d8] bg-gradient-to-b from-[#e8f1ff] via-white to-[#dbeafe] p-3.5 text-[#062463] shadow-xl sm:p-4"
    >
      {/* Top AL MURTAJIZ Glossy Royal Blue + Gold Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#facc15]/80 bg-gradient-to-r from-[#041d56] via-[#0648d8] to-[#05297a] px-3.5 py-3 text-white shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-center">
            <svg viewBox="0 0 220 22" className="mx-auto -mb-1 h-4 w-44">
              <path
                d="M15 18 Q95 2 175 12 Q195 14 208 17"
                fill="none"
                stroke="#facc15"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="text-xl font-black italic tracking-wider text-white drop-shadow sm:text-2xl">
              AL MURTAJIZ
            </div>
            <div className="mx-auto mt-0.5 inline-block rounded-full border border-[#854d0e] bg-gradient-to-r from-[#fde047] via-[#facc15] to-[#eab308] px-4 py-0.5 text-xs font-extrabold text-[#062463] shadow-sm">
              Driver Profile
            </div>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#facc15] bg-[#041d56] text-white shadow">
            <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
              <circle cx="16" cy="9" r="4.5" fill="#ffffff" />
              <path d="M11 6 H21 L19.5 4 H12.5 Z" fill="#facc15" />
              <path
                d="M8 23 C8 17.5 11.5 15 16 15 C20.5 15 24 17.5 24 23"
                fill="#ffffff"
              />
              <circle
                cx="16"
                cy="23"
                r="5.5"
                stroke="#0648d8"
                strokeWidth="2.2"
                fill="#facc15"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Subheader Card: Manual Area & Rate Card */}
      <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-[#dbeafe] via-[#