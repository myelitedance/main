'use client';

/**
 * Elite — Registration Details (per-dancer classes + per-dancer dance wear)
 * ------------------------------------------------------------------------
 * Big picture:
 * - We read a parent account via GHL lookup
 * - We seed one or more "registrations" (one per dancer)
 * - For each dancer:
 *     • Load age-filtered classes from Akada
 *     • Let user select classes (weekly minutes → monthly tuition via Google Sheet)
 *     • Let user choose a Dance Wear package and toggle items (subtotal per dancer)
 * - Totals shown for the ACTIVE dancer only (reg fee tier + prorated + wear)
 * - Clear signature button + Remove Dancer button (for additional dancers)
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Users, Pencil, Music2, Shirt, CheckCircle2, AlertTriangle, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Signature pad must be client-only (same approach as /newstudent)
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false }) as any;

// --- theme (kept from your existing palette) ---
const DANCE_PURPLE = "#8B5CF6";
const DANCE_PINK   = "#EC4899";
const DANCE_BLUE   = "#3B82F6";

/* =========================================================================
   Types
   ========================================================================= */
type Dancer = { id: string; firstName: string; lastName: string; age: number | string };

type Household = {
  contactId: string | null;
  email: string;
  parent: { firstName: string; lastName: string; full?: string };
  dancers: Dancer[];
  pricing: {
    registrationFee: number;           // legacy fallback (unused in new per-dancer calc)
    monthlyTuitionPerDancer: number;   // legacy fallback (unused if sheet match is found)
    billDay: number;                   // next monthly bill day (1 => first of month)
  };
};

type StudioClass = {
  id: string;
  name: string;
  level: string;
  type: string;
  day: string;               // "Mon"
  time: string;              // "4:30 PM - 5:15 PM"
  ageMin: number;
  ageMax: number;
  currentEnrollment: number;
  maxEnrollment: number;
  lengthMinutes: number;     // exact numeric minutes from API
};

/**
 * Registration = one dancer's working state:
 *  - editable name/age
 *  - their class list + selections
 *  - their dance wear package + selections
 */
type Registration = {
  id: string;
  firstName: string;
  lastName: string;
  age: number | string;
  classesList: StudioClass[];
  selectedClassIds: Record<string, boolean>;
  wearSelectedPackageId: string;
  wearSelections: Record<string, Record<string, boolean>>;
  firstClassDate?: string; // <-- NEW: "YYYY-MM-DD"
};

type DWItem = { sku: string; name: string; price: number };
type DanceWearPackage = { id: string; name: string; items: DWItem[] };

type TuitionRow = { duration: number; price: number };

/* =========================================================================
   Utilities
   ========================================================================= */

/** very light email pattern just for UX */
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
/** currency formatter */
const currency = (n: number) => `$${(n || 0).toFixed(2)}`;

/** Try to compute age from a YYYY-MM-DD birthday string (if needed) */
function calcAgeFromDOB(dob?: string): number | "" {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.valueOf())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age < 0 ? "" : age;
}

/**
 * Proration factor from TODAY until the next bill day.
 * Roughly: days-left-in-period ÷ days-in-period
 */
function prorate(today: Date, billDay: number): number {
  const y = today.getFullYear();
  const m = today.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  if (billDay <= today.getDate()) {
    // next bill is next month → charge fraction for the remainder of THIS month (including today)
    const daysLeftThisMonth = daysInMonth - today.getDate() + 1;
    return Math.min(1, daysLeftThisMonth / daysInMonth);
  } else {
    // bill day later this month → charge fraction for the days until that bill day
    const days = billDay - today.getDate();
    return Math.min(1, days / daysInMonth);
  }
}

// Count raw remaining same-weekday occurrences in the month (including startDate)
function remainingWeekdayOccurrencesRaw(startDate: Date): number {
  const wd = startDate.getDay(); // 0..6
  const y = startDate.getFullYear();
  const m = startDate.getMonth();
  const last = new Date(y, m + 1, 0);

  let cnt = 0;
  for (let d = new Date(startDate); d <= last; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === wd) cnt++;
  }
  return cnt;
}

// Cap the proration numerator at 4 (5th is a bonus, not counted)
function remainingWeekdayOccurrencesCapped(startDate: Date): number {
  return Math.min(remainingWeekdayOccurrencesRaw(startDate), 4);
}

// Map remaining (capped) to ¼ / ½ / ¾ / full of monthly
function prorateFractionFromStartDate(startDate: Date): number {
  const remaining = remainingWeekdayOccurrencesCapped(startDate); // 1..4
  if (remaining === 4) return 1;
  if (remaining === 3) return 0.75;
  if (remaining === 2) return 0.5;
  if (remaining === 1) return 0.25;
  return 0.25; // safety net
}

/** Grab a trimmed PNG of the signature pad with a white background (for storage) */
function snapshotSignature(ref?: any): string {
  const pad = (ref as any)?.current;
  if (!pad || typeof pad.isEmpty !== "function" || pad.isEmpty()) return "";

  let src: HTMLCanvasElement | null = null;
  try { src = typeof pad.getTrimmedCanvas === "function" ? pad.getTrimmedCanvas() : null; } catch {}
  if (!src) try { src = typeof pad.getCanvas === "function" ? pad.getCanvas() : null; } catch {}
  if (!src) return "";

  const w = src.width || 740;
  const h = src.height || 180;
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  const ctx = off.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  const dx = Math.max(0, (w - src.width) / 2);
  const dy = Math.max(0, (h - src.height) / 2);
  ctx.drawImage(src, dx, dy);
  return off.toDataURL("image/png");
}

/** Tuition lookup: EXACT duration match from sheet rows (duration → price) */
function priceFromDurationExact(mins: number, rows: TuitionRow[]): number {
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  const hit = rows.find(r => r.duration === mins);
  return hit ? hit.price : 0;
}

/** Registration fee tiers based on dancer index (0=first, 1=second, 2+=free) */
function regFeeForIndex(i: number) {
  if (i === 0) return 75;
  if (i === 1) return 30;
  return 0;
}

/** Create a reg record from a GHL dancer */
function makeRegFromGHL(d?: Dancer): Registration {
  return {
    id: d?.id || `reg_${Date.now()}`,
    firstName: (d?.firstName || "").trim(),
    lastName: (d?.lastName || "").trim(),
    age: d?.age ?? "",
    classesList: [],
    selectedClassIds: {},
    wearSelectedPackageId: "",
    wearSelections: {},
    firstClassDate: "", // <-- NEW
  };
}

/* =========================================================================
   Per-dancer Dance Wear helpers
   ========================================================================= */

/** Return the selected package object for a reg (or null) */
function getSelectedPackageForReg(r: Registration | undefined, all: DanceWearPackage[]) {
  if (!r?.wearSelectedPackageId) return null;
  return all.find(p => p.id === r.wearSelectedPackageId) || null;
}

/** Ensure that when a package is chosen for a reg, all items default to "un-selected" once */
function ensureWearDefaultsForRegPackage(r: Registration, pkg: DanceWearPackage): Registration {
  if (r.wearSelections[pkg.id]) return r;
  const allOff: Record<string, boolean> = {};
  (pkg.items || []).forEach(it => { allOff[it.sku] = false; });
  return { ...r, wearSelections: { ...r.wearSelections, [pkg.id]: allOff } };
}

/** Toggle a single wear item for a given reg */
function toggleWearItemForReg(r: Registration, pkgId: string, sku: string, on: boolean): Registration {
  return {
    ...r,
    wearSelections: {
      ...r.wearSelections,
      [pkgId]: { ...(r.wearSelections[pkgId] || {}), [sku]: on },
    },
  };
}

/** Subtotal for a reg's package (sum of selected item prices) */
function packageSubtotalForReg(r: Registration, pkg: DanceWearPackage): number {
  const sel = r.wearSelections[pkg.id] || {};
  return (pkg.items || []).reduce((sum, it) => sum + ((sel[it.sku] ? it.price : 0) || 0), 0);
}

/* =========================================================================
   Component
   ========================================================================= */
export default function RegistrationDetailsPage() {
  /* -----------------------------
     Top-level UI / workflow state
     ----------------------------- */
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

  const [household, setHousehold] = useState<Household | null>(null);

  // Tuition sheet (duration → monthly price)
  const [tuitionRows, setTuitionRows] = useState<TuitionRow[]>([]);
  const [tuitionError, setTuitionError] = useState<string>("");

  // Classes per dancer (Akada)
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState<string>("");

  // All dancer registrations
  const [regs, setRegs] = useState<Registration[]>([]);
  const [activeRegIdx, setActiveRegIdx] = useState(0);

  // Dance wear package catalog (same sheet as before; we just render per dancer now)
  const [danceWear, setDanceWear] = useState<DanceWearPackage[]>([]);
  const [wearError, setWearError] = useState<string>("");
  const [wearLoaded, setWearLoaded] = useState(false);

  // First class date (for prorating)
  const [firstClassDate, setFirstClassDate] = useState<Date | null>(null);

  // Sales tax: loaded from /api/elite/settings or env fallback
  const [salesTaxRate, setSalesTaxRate] = useState<number>(0);

  // Sign + submit
  const [autoPayConsent, setAutoPayConsent] = useState(false);
  const sigRef = useRef<any>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = "16px";
  }, []);

/* - ----------------------------
        Load Settings (sales tax rate)   
    ----------------------------- */  
  async function loadSettings() {
        try {
            const r = await fetch("/api/elite/settings", { cache: "no-store" });
            const j = await r.json();
        if (j?.ok && typeof j.salesTaxRate === "number") {
            setSalesTaxRate(j.salesTaxRate);
        } else {
        // fallback to env if any, otherwise 0
            const envRate = Number(process.env.NEXT_PUBLIC_SALES_TAX_RATE ?? 0) || 0;
            setSalesTaxRate(envRate);
        }
        } catch {
        const envRate = Number(process.env.NEXT_PUBLIC_SALES_TAX_RATE ?? 0) || 0;
        setSalesTaxRate(envRate);
        }
    }

  /* -----------------------------
     Lookup flow (GHL → seed regs)
     ----------------------------- */
  async function handleLookup() {
    setLookupMsg("");
    if (!isValidEmail(lookupEmail)) {
      setLookupMsg("Enter a valid email (e.g., name@example.com).");
      return;
    }
    setLookupBusy(true);

    const url = `/api/ghl/lookup?query=${encodeURIComponent(lookupEmail)}`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 10000);

    try {
      const r = await fetch(url, { method: "GET", cache: "no-store", signal: ctrl.signal });
      const raw = await r.text();
      if (!r.ok) {
        setLookupMsg(`Lookup failed (HTTP ${r.status}). See console for details.`);
        console.error("[details/lookup] http", r.status, raw);
        setHousehold(null);
        return;
      }
      const data = JSON.parse(raw);
      if (!data.found) {
        setLookupMsg("No record found for that email. Please verify spelling or contact the office.");
        setHousehold(null);
        return;
      }

      // Build dancers from your /api/ghl/lookup route
      const f = (data.formDraft || {}) as Record<string, any>;
      const parentFull = f.parent1 || f.name || "";
      const [pf, ...plRest] = parentFull.split(" ").filter(Boolean);
      const parent = { firstName: pf || parentFull || "", lastName: plRest.join(" ") || "", full: parentFull || "" };

      const dancers: Dancer[] = [];
      const primaryAge = (Number.isFinite(Number(f.age)) ? Number(f.age) : "") || calcAgeFromDOB(f.birthdate) || "";
      if (f.studentFirstName || f.studentLastName || primaryAge !== "") {
        dancers.push({ id: "primary", firstName: f.studentFirstName || "", lastName: f.studentLastName || "", age: primaryAge });
      }
      try {
        const arr = Array.isArray(f.additionalStudents) ? f.additionalStudents : [];
        arr.forEach((s: any, i: number) => {
          const sAge = (Number.isFinite(Number(s.age)) ? Number(s.age) : "") || calcAgeFromDOB(s.birthdate) || "";
          dancers.push({
            id: s.id || `extra_${i}`,
            firstName: s.firstName || s.studentFirstName || "",
            lastName: s.lastName || s.studentLastName || "",
            age: sAge,
          });
        });
      } catch {}

      if (dancers.length === 0) dancers.push({ id: "primary", firstName: "Student", lastName: "", age: "" });

      const pricing = {
        registrationFee: Number(data.registrationFee ?? 25),
        monthlyTuitionPerDancer: Number(data.monthlyTuitionPerDancer ?? 89),
        billDay: Number(data.billDay ?? 1),
      };

      setHousehold({
        contactId: data.contactId || null,
        email: lookupEmail,
        parent,
        dancers,
        pricing,
      });

      setLookupMsg("Found your account. Review below.");

      // Seed registrations with the primary dancer & load dependents
      const initialRegs = [makeRegFromGHL(dancers[0])];
      setRegs(initialRegs);
      setActiveRegIdx(0);

      await loadDanceWear();                       // catalog (shared)
      await loadClassesForAge(initialRegs[0].age, 0);
      await loadTuition();                         // duration → monthly price table
      await loadSettings();                        // sales tax rate
    } catch (e: any) {
      console.error("[details/lookup] fetch threw", e);
      setLookupMsg(e?.name === "AbortError" ? "Lookup timed out. Please try again." : `We couldn’t check right now. ${e?.message || ""}`);
      setHousehold(null);
    } finally {
      clearTimeout(to);
      setLookupBusy(false);
    }
  }

  function onLookupKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !lookupBusy) {
      e.preventDefault();
      handleLookup();
    }
  }

  /* -----------------------------
     Tuition (Google Sheet)
     ----------------------------- */
  async function loadTuition() {
    setTuitionError("");
    setTuitionRows([]);
    try {
      const r = await fetch("/api/elite/tuition", { cache: "no-store" });
      const text = await r.text();
      if (!r.ok) {
        let msg = `Unable to load Tuition (${r.status}).`;
        try { const j = JSON.parse(text); if (j?.error) msg = j.error; } catch {}
        setTuitionError(msg);
        return;
      }
      const j = JSON.parse(text);
      setTuitionRows(Array.isArray(j?.rows) ? j.rows : []);
    } catch (e: any) {
      console.error("tuition load failed:", e);
      setTuitionError(e?.message || "Tuition load failed.");
    }
  }

  /* -----------------------------
     Classes (Akada) per-dancer
     ----------------------------- */
  async function loadClassesForAge(age?: number | string, regIndex: number = activeRegIdx) {
    setClassesLoading(true);
    setClassesError("");

    try {
      const ageNum = Number(age);
      const q = Number.isFinite(ageNum) ? `?age=${ageNum}` : "";
      const r = await fetch(`/api/elite/classes${q}`, { cache: "no-store" });
      const text = await r.text();
      if (!r.ok) {
        let msg = `Unable to load classes (${r.status}).`;
        try { const j = JSON.parse(text); if (j?.error) msg = j.error; } catch {}
        setClassesError(msg);
        return;
      }
      const j = JSON.parse(text);
      const apiClasses = (j?.classes || []) as any[];

      const norm: StudioClass[] = apiClasses.map((c) => ({
        id: String(c.id),
        name: String(c.name ?? c.description ?? "").trim(),
        level: String(c.level ?? c.levelDescription ?? "").trim(),
        type: String(c.type ?? c.typeDescription ?? "").trim(),
        day: String(c.day ?? "").trim(),
        time: String(c.time ?? "").trim(),
        ageMin: Number(c.ageMin ?? c.lowerAgeLimit ?? 0),
        ageMax: Number(c.ageMax ?? c.upperAgeLimit ?? 99),
        currentEnrollment: Number(c.currentEnrollment ?? 0),
        maxEnrollment: Number(c.maxEnrollment ?? 0),
        lengthMinutes: Number(c.lengthMinutes ?? 0),
      }));

      // Write into that registration slot
      setRegs((prev) => {
        const next = [...prev];
        if (!next[regIndex]) return prev;
        next[regIndex] = { ...next[regIndex], classesList: norm, selectedClassIds: {} }; // reset selections
        return next;
      });
    } catch (e: any) {
      console.error("classes load failed:", e);
      setClassesError(e?.message || "Classes load failed.");
    } finally {
      setClassesLoading(false);
    }
  }

  function toggleClass(id: string, on: boolean) {
    setRegs((prev) => {
      const next = [...prev];
      const cur = next[activeRegIdx];
      if (!cur) return prev;
      next[activeRegIdx] = { ...cur, selectedClassIds: { ...cur.selectedClassIds, [id]: on } };
      return next;
    });
  }

  /* -----------------------------
     Dance Wear (catalog + per-dancer selections)
     ----------------------------- */
  async function loadDanceWear() {
    setWearError("");
    setDanceWear([]);
    setWearLoaded(false);
    try {
      const r = await fetch("/api/elite/dancewear", { method: "GET", cache: "no-store" });
      const text = await r.text();
      if (!r.ok) {
        let msg = "Unable to load Dance Wear from Google Sheets.";
        try { const j = JSON.parse(text); if (j?.error) msg = j.error; } catch {}
        setWearError(msg);
        setWearLoaded(true);
        return;
      }
      const list: DanceWearPackage[] = JSON.parse(text);
      setDanceWear(Array.isArray(list) ? list : []);
      setWearLoaded(true);
    } catch (e: any) {
      console.error("Dance Wear load failed:", e);
      setWearError(e?.message || "Dance Wear load failed.");
      setWearLoaded(true);
    }
  }

  /* -----------------------------
     Derived values for ACTIVE dancer
     ----------------------------- */
  const activeReg = regs[activeRegIdx];

  const selectedClasses = useMemo(
    () => (activeReg?.classesList || []).filter(c => !!activeReg?.selectedClassIds?.[c.id]),
    [activeReg?.classesList, activeReg?.selectedClassIds]
  );

  const selectedWeeklyMinutes = useMemo(
    () => selectedClasses.reduce((sum, c) => sum + (c.lengthMinutes || 0), 0),
    [selectedClasses]
  );

  const monthlyTuitionExact = useMemo(
    () => priceFromDurationExact(selectedWeeklyMinutes, tuitionRows),
    [selectedWeeklyMinutes, tuitionRows]
  );

  const selectedWearPkg = getSelectedPackageForReg(activeReg, danceWear);
  const wearSubtotalActive = useMemo(
    () => (activeReg && selectedWearPkg) ? packageSubtotalForReg(activeReg, selectedWearPkg) : 0,
    [activeReg, selectedWearPkg]
  );
  const wearSalesTaxActive = useMemo(
  () => (wearSubtotalActive > 0 ? wearSubtotalActive * (salesTaxRate || 0) : 0),
  [wearSubtotalActive, salesTaxRate]
);

  /* -----------------------------
     Totals (ACTIVE dancer only)
     ----------------------------- */
  const breakdown = useMemo(() => {
  if (!household) return { reg: 0, prorated: 0, wear: 0, tax: 0, today: 0, monthly: 0 };

  const reg = regFeeForIndex(activeRegIdx);
  const monthly = monthlyTuitionExact || 0;

  // NEW: prorate by active dancer's firstClassDate
  let prorated = 0;
  const iso = activeReg?.firstClassDate;
  if (monthly > 0 && iso) {
    const start = new Date(iso);
    const frac = prorateFractionFromStartDate(start);
    prorated = monthly * frac;
  }

  const wear = wearSubtotalActive;
  const tax = wearSalesTaxActive;
  const todayDue = reg + prorated + wear + tax;

  return { reg, prorated, wear, tax, today: todayDue, monthly };
}, [
  household,
  activeRegIdx,
  monthlyTuitionExact,
  activeReg?.firstClassDate,  // <-- make it reactive
  wearSubtotalActive,
  wearSalesTaxActive,
]);
  /* -----------------------------
     Signature helpers
     ----------------------------- */
  function clearSignature() {
    try {
      sigRef.current?.clear?.();
    } catch {}
    setSignatureDataUrl("");
  }

  const canSubmit = !!household && autoPayConsent && !!signatureDataUrl;

  /* -----------------------------
     Remove dancer (additional only)
     ----------------------------- */
  function removeActiveDancer() {
    if (activeRegIdx === 0) return; // keep first dancer (you can relax this if desired)
    setRegs((prev) => {
      const next = prev.filter((_, i) => i !== activeRegIdx);
      const newIdx = Math.max(0, activeRegIdx - 1);
      setActiveRegIdx(newIdx);
      return next;
    });
  }

  /* -----------------------------
     Submit payload
     ----------------------------- */
async function handleSubmit() {
  if (!canSubmit || !household) return;
  setSubmitting(true);

  // Snapshot classes for the active dancer
  const activeClassesPayload = selectedClasses.map(c => ({
    id: c.id,
    name: c.name,
    level: c.level,
    type: c.type,
    day: c.day,
    time: c.time,
    lengthMinutes: c.lengthMinutes,
  }));

  // --- ONLY active dancer wear snapshot ---
const activeWear = (() => {
  if (!activeReg) return null;
  const pkg = selectedWearPkg; // already derived for the active reg
  const selMap = activeReg.wearSelections || {};
  const items = pkg ? pkg.items.filter(it => !!selMap[pkg.id]?.[it.sku]) : [];
  const subtotal = items.reduce((s, it) => s + (it.price || 0), 0);
  return {
    dancerId: activeReg.id,
    dancerName: `${activeReg.firstName} ${activeReg.lastName}`.trim(),
    packageId: pkg?.id || "",
    packageName: pkg?.name || "",
    items,
    subtotal,
  };
})();

  // Payload expected by /api/notify/details
  const payload = {
    source: "registration-details",
    contactId: household.contactId,
    email: household.email,
    parent: household.parent,
    pricing: household.pricing,

    dancers: household.dancers, // reference

    activeDancerIndex: activeRegIdx,
    activeDancer: {
  id: activeReg?.id,
  firstName: activeReg?.firstName,
  lastName: activeReg?.lastName,
  age: activeReg?.age,
  selectedClasses: activeClassesPayload,
  selectedWeeklyMinutes,
  monthlyFromSheet: monthlyTuitionExact,
  firstClassDate: activeReg?.firstClassDate || "", // <-- NEW
},

    registrations: regs.map(r => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      age: r.age,
      selectedClassIds: r.selectedClassIds,
      selectedWeeklyMinutes: Object.entries(r.selectedClassIds || {}).reduce((mins, [id, on]) => {
        if (!on) return mins;
        const cls = r.classesList.find(cc => cc.id === id);
        return mins + (cls?.lengthMinutes || 0);
      }, 0),
    })),

    wearByDancer: activeWear ? [activeWear] : [], // only active dancer wear included

    totals: breakdown, // { reg, prorated, wear, tax, today, monthly }

    salesTax: {
      rate: salesTaxRate,
      appliesTo: "dance_wear_only" as const,
      activeDancerWearSubtotal: wearSubtotalActive,
      activeDancerWearTax: wearSalesTaxActive,
    },

    consent: {
      autoPay: true,
      signatureDataUrl,
      termsAcceptedAt: new Date().toISOString(),
    },

    notes,
  };

  try {
    const resp = await fetch("/api/notify/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Read text first so we can surface good error info if JSON parsing fails
    const text = await resp.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    if (!resp.ok || !json?.ok) {
      console.error("[notify/details] send failed", { status: resp.status, body: text });
      alert(`Email send failed (HTTP ${resp.status}). ${text || resp.statusText}`);
      setSubmitting(false);
      return;
    }

    // 🎉 success
    setSubmitted(true);
  } catch (e: any) {
    console.error("[notify/details] network error", e);
    alert("We couldn't submit right now. Please try again.");
  } finally {
    setSubmitting(false);
  }
}

  /* =========================================================================
     UI
     ========================================================================= */
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ borderColor: DANCE_PURPLE }}>
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: DANCE_PURPLE }}>
            Elite Dance & Music — Registration Details
          </h1>
          <div className="text-xs text-neutral-500">/elite/details</div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-4 pb-28 pt-4">
        {/* ---------------- Lookup Card ---------------- */}
        <Card className="shadow-lg rounded-2xl border mb-6" style={{ borderColor: DANCE_BLUE }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Find Your Account</CardTitle>
            <CardDescription>Enter the parent email you used previously.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <Label htmlFor="lookupEmail">Parent email</Label>
                <Input
                  id="lookupEmail"
                  type="email"
                  inputMode="email"
                  placeholder="name@example.com"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  onKeyDown={onLookupKeyDown}
                />
                {lookupMsg && <p className="text-xs mt-1 text-neutral-600">{lookupMsg}</p>}
              </div>
              <Button type="button" onClick={handleLookup} disabled={lookupBusy} className="h-10" style={{ backgroundColor: DANCE_PURPLE }}>
                {lookupBusy ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</span> : "Lookup"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {household && (
          <div className="space-y-6">
            {/* ---------------- Account & Dancers ---------------- */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_PURPLE }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: DANCE_PURPLE }} />
                  Account & Dancers
                </CardTitle>
                <CardDescription>Pulled from your signup and GHL custom fields.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Dancer switcher + actions */}
                {regs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {regs.map((r, i) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setActiveRegIdx(i)}
                        className={`px-3 py-1.5 rounded-full border ${
                          i === activeRegIdx
                            ? "border-[#BFDBFE] bg-[#F0F9FF] text-[#1e40af]"
                            : "border-neutral-200 bg-white text-neutral-700"
                        } text-sm`}
                        aria-label={`Switch to dancer ${i + 1}`}
                      >
                        {r.firstName || "Dancer"} {r.lastName || ""} {i === activeRegIdx ? "• active" : ""}
                      </button>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRegs((prev) => {
                          const newIdx = prev.length;
                          const next = [...prev, makeRegFromGHL(undefined)];
                          setActiveRegIdx(newIdx);
                          return next;
                        });
                      }}
                      className="text-xs"
                    >
                      Register another
                    </Button>

                    {activeRegIdx > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={removeActiveDancer}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 inline-flex items-center gap-1"
                        title="Remove this dancer from the registration"
                      >
                        <X className="h-3.5 w-3.5" /> Remove dancer
                      </Button>
                    )}
                  </div>
                )}

                {/* Account name */}
                <div className="rounded-xl border p-3">
                  <div className="text-sm text-neutral-500">Account Name</div>
                  <div className="text-lg font-medium">
                    {household.parent.full || `${household.parent.firstName} ${household.parent.lastName}`.trim()}
                  </div>
                </div>

                {/* Active dancer info (editable) */}
                {activeReg && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="d-first">Dancer first name</Label>
                      <Input
                        id="d-first"
                        value={activeReg.firstName}
                        onChange={(e) =>
                          setRegs((prev) => {
                            const next = [...prev];
                            next[activeRegIdx] = { ...next[activeRegIdx], firstName: e.target.value };
                            return next;
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="d-last">Dancer last name</Label>
                      <Input
                        id="d-last"
                        value={activeReg.lastName}
                        onChange={(e) =>
                          setRegs((prev) => {
                            const next = [...prev];
                            next[activeRegIdx] = { ...next[activeRegIdx], lastName: e.target.value };
                            return next;
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="d-age">Age</Label>
                      <Input
                        id="d-age"
                        inputMode="numeric"
                        value={String(activeReg.age ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRegs((prev) => {
                            const next = [...prev];
                            next[activeRegIdx] = { ...next[activeRegIdx], age: v };
                            return next;
                          });
                        }}
                        onBlur={() => loadClassesForAge(activeReg.age, activeRegIdx)}
                        placeholder="e.g., 7"
                      />
                      <div className="text-[11px] text-neutral-500 mt-1">
                        Changing age will refresh class options for this dancer.
                      </div>
                    </div>
                    <div>
  <Label htmlFor="d-firstclass">First class date</Label>
  <Input
    id="d-firstclass"
    type="date"
    value={String(activeReg.firstClassDate || "")}
    onChange={(e) => {
      const val = e.target.value; // "YYYY-MM-DD"
      setRegs((prev) => {
        const next = [...prev];
        if (!next[activeRegIdx]) return prev;
        next[activeRegIdx] = { ...next[activeRegIdx], firstClassDate: val };
        return next;
      });
    }}
  />
  {activeReg.firstClassDate && (
  <div className="text-[11px] text-neutral-500 mt-1">
    {(() => {
      const d = new Date(activeReg.firstClassDate as string);
      const raw = remainingWeekdayOccurrencesRaw(d);          // can be 5
      const capped = remainingWeekdayOccurrencesCapped(d);    // max 4
      const frac = prorateFractionFromStartDate(d);
      return raw > 4
        ? `Classes remaining this month (counted for proration): ${capped} of 4 (5th is a bonus) • First-month tuition: ${(frac * 100).toFixed(0)}%`
        : `Classes remaining this month: ${capped} • First-month tuition: ${(frac * 100).toFixed(0)}%`;
    })()}
  </div>
)}
</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ---------------- Select Classes (per active dancer) ---------------- */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_BLUE }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-5 w-5" style={{ color: DANCE_BLUE }} />
                  Select your dance classes
                </CardTitle>
                <CardDescription>Choose one or more classes that fit your schedule. Length is used to calculate tuition.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {classesError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {classesError}{" "}
                    <Button size="sm" variant="link" className="p-0 ml-1"
                      onClick={() => loadClassesForAge(activeReg?.age, activeRegIdx)}>
                      Retry
                    </Button>
                  </div>
                )}

                {!classesError && classesLoading && (
                  <div className="text-sm text-neutral-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading classes…
                  </div>
                )}

                {!classesError && !classesLoading && (activeReg?.classesList?.length || 0) === 0 && (
                  <div className="text-sm text-neutral-500">No classes available for the selected age.</div>
                )}

                {!classesError && !classesLoading && (activeReg?.classesList?.length || 0) > 0 && (
                  <div className="space-y-2">
                    {activeReg!.classesList.map((c) => {
                      const seatsLeft = Math.max(0, Number(c.maxEnrollment || 0) - Number(c.currentEnrollment || 0));
                      const selected = !!activeReg!.selectedClassIds[c.id];
                      return (
                        <label key={c.id} className={`flex items-center justify-between rounded-xl border p-3 ${selected ? "bg-[#F8FAFF] border-[#BFDBFE]" : ""}`}>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className="text-xs text-neutral-600">
                              {c.type}{c.level ? ` • ${c.level}` : ""} • {c.day} {c.time} • {Number(c.lengthMinutes) || 0} min
                            </div>
                            <div className="text-xs text-neutral-500">
                              {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-3 shrink-0">
                            <Label htmlFor={`cls-${c.id}`} className="text-sm">Select</Label>
                            <Checkbox id={`cls-${c.id}`} checked={selected} onCheckedChange={(v) => toggleClass(c.id, Boolean(v))} />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Classes summary bar */}
                <div className="mt-2 rounded-xl border p-3 bg-neutral-50 flex items-center justify-between">
                  <div className="text-sm">
                    Selected classes: <span className="font-medium">{selectedClasses.length}</span>
                  </div>
                  <div className="text-sm">
                    Weekly minutes: <span className="font-semibold" style={{ color: DANCE_BLUE }}>{selectedWeeklyMinutes}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ---------------- Dance Wear — per active dancer ---------------- */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_BLUE }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="h-5 w-5" style={{ color: DANCE_BLUE }} />
                  Dance Wear (for {activeReg?.firstName || "this dancer"})
                </CardTitle>
                <CardDescription>All items are preselected. Uncheck anything you don’t need—your price updates for this dancer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {wearError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-medium">Dance Wear unavailable</div>
                      <div>{wearError}</div>
                      <div className="mt-2">
                        <Button size="sm" variant="outline" onClick={loadDanceWear}>Retry</Button>
                      </div>
                    </div>
                  </div>
                )}

                {!wearError && !wearLoaded && <div className="text-sm text-neutral-500">Loading packages…</div>}
                {!wearError && wearLoaded && danceWear.length === 0 && (
                  <div className="text-sm text-neutral-500">No packages available right now.</div>
                )}

                {/* Package selector (per dancer) */}
                {!wearError && danceWear.length > 0 && activeReg && (
                  <div className="space-y-2">
                    <Label htmlFor="dw-package">Select the right package for this dancer</Label>
                    <Select
                      value={activeReg.wearSelectedPackageId}
                      onValueChange={(pkgId) => {
                        const pkg = danceWear.find(p => p.id === pkgId);
                        if (!pkg) return;
                        setRegs(prev => {
                          const next = [...prev];
                          const cur = next[activeRegIdx];
                          if (!cur) return prev;
                          const withDefaults = ensureWearDefaultsForRegPackage(cur, pkg);
                          next[activeRegIdx] = { ...withDefaults, wearSelectedPackageId: pkgId };
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger id="dw-package" className="bg-white border border-neutral-300 focus:ring-2 focus:ring-[#8B5CF6]">
                        <SelectValue placeholder="Choose a package" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-neutral-200 shadow-lg z-50">
                        {danceWear.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Selected package details (per dancer) */}
                {activeReg && selectedWearPkg && (
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{selectedWearPkg.name}</div>
                        <div className="text-sm text-neutral-500">
                          Package subtotal: <span className="font-medium">{currency(wearSubtotalActive)}</span>
                        </div>
                      </div>
                    </div>

                    <ul className="mt-2 divide-y">
                      {selectedWearPkg.items.map((it) => {
                        const checked = !!activeReg.wearSelections[selectedWearPkg.id]?.[it.sku];
                        return (
                          <li key={it.sku} className="py-2 flex items-center justify-between">
                            <div className="flex-1 pr-3">
                              <div className="text-sm">{it.name}</div>
                              <div className="text-xs text-neutral-500">{currency(it.price)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`${selectedWearPkg.id}-${it.sku}`} className="text-sm">Include</Label>
                              <Checkbox
                                id={`${selectedWearPkg.id}-${it.sku}`}
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setRegs(prev => {
                                    const next = [...prev];
                                    const cur = next[activeRegIdx];
                                    if (!cur) return prev;
                                    next[activeRegIdx] = toggleWearItemForReg(cur, selectedWearPkg.id, it.sku, Boolean(v));
                                    return next;
                                  });
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Subtotal footer */}
                    <div className="mt-2 rounded-xl border p-3 bg-neutral-50 flex items-center justify-between">
                      <div className="text-sm">Dance Wear Subtotal (for {activeReg?.firstName || "this dancer"})</div>
                      <div className="text-lg font-semibold" style={{ color: DANCE_BLUE }}>{currency(wearSubtotalActive)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ---------------- Review & Sign ---------------- */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_PINK }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" style={{ color: DANCE_PINK }} />
                  Review & Sign
                </CardTitle>
                <CardDescription>
                  Auto-Pay required. Monthly tuition is billed on the {household.pricing.billDay === 1 ? "1st" : `${household.pricing.billDay}th`}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Totals block */}
                <div className="rounded-2xl bg-neutral-50 p-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div>Registration Fee</div>
                    <div>{currency(breakdown.reg)}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>Prorated First Month</div>
                    <div>{currency(breakdown.prorated)}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>Dance Wear</div>
                    <div>{currency(breakdown.wear)}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>Sales Tax (wear only){typeof salesTaxRate === "number" ? ` • ${(salesTaxRate * 100).toFixed(2)}%` : ""}</div>
                    <div>{currency(breakdown.tax)}</div>
                  </div>

                  <div className="my-1 border-t" />

                  <div className="flex items-center justify-between">
                    <div className="text-sm">DUE TODAY</div>
                    <div className="text-xl font-semibold" style={{ color: DANCE_PINK }}>{currency(breakdown.today)}</div>
                  </div>

                  {/* DUE MONTHLY */}
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-sm">DUE MONTHLY</div>
                    <div className="text-right">
                      <div className="text-xs text-neutral-500">{selectedWeeklyMinutes} minutes</div>
                      <div className="text-xl font-semibold" style={{ color: DANCE_BLUE }}>{currency(monthlyTuitionExact)}</div>
                      {tuitionError && <div className="mt-1 text-[11px] text-red-600">{tuitionError}</div>}
                    </div>
                  </div>
                </div>

                {/* Consent */}
                <div className="flex items-start gap-2 rounded-xl border p-3">
                  <Checkbox id="autopay" checked={autoPayConsent} onCheckedChange={(v) => setAutoPayConsent(Boolean(v))} />
                  <Label htmlFor="autopay" className="text-sm">
                    I give Elite Dance permission to keep my card on file and charge monthly tuition on Auto-Pay.
                  </Label>
                </div>

                {/* Signature + Clear */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Signature (parent/guardian) *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                      Clear signature
                    </Button>
                  </div>
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: DANCE_PURPLE }}>
                    <SignatureCanvas
                      ref={sigRef}
                      penColor="#111827"
                      backgroundColor="#ffffff"
                      canvasProps={{ width: 740, height: 180, className: "w-full h-[180px] bg-white" }}
                      onBegin={() => setSignatureDataUrl("")}
                      onEnd={() => setSignatureDataUrl(snapshotSignature(sigRef))}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for the Studio (optional)</Label>
                  <Textarea id="notes" placeholder="Sizing notes, preferences, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3">
                  <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="px-5 text-white" style={{ backgroundColor: DANCE_PURPLE }}>
                    {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span> : "Confirm & Sign"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Saved notice */}
            {submitted && (
              <div className="mt-6 rounded-xl border p-4 text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Saved! We’ll finalize enrollment and securely add your payment method for Auto-Pay.</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}