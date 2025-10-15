'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Users, Pencil, Shirt, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Signature pad must be client-only (same approach as /newstudent)
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false }) as any;

// --- theme ---
const DANCE_PURPLE = "#8B5CF6";
const DANCE_PINK   = "#EC4899";
const DANCE_BLUE   = "#3B82F6";

// ---------- Types ----------
type Dancer = { id: string; firstName: string; lastName: string; age: number | string };
type Household = {
  contactId: string | null;
  email: string;
  parent: { firstName: string; lastName: string; full?: string };
  dancers: Dancer[];
  pricing: {
    registrationFee: number;
    monthlyTuitionPerDancer: number;
    billDay: number; // 1 => first of month
  };
};

type StudioClass = {
  id: string;
  name: string;
  level: string;
  type: string;
  day: string;      // "Mon"
  time: string;     // "4:30 PM - 5:15 PM"
  ageMin: number;
  ageMax: number;
  currentEnrollment: number;
  maxEnrollment: number;
  lengthMinutes: number; // from API (exact number)
};

type DWItem = { sku: string; name: string; price: number };
type DanceWearPackage = { id: string; name: string; items: DWItem[] };
type TuitionRow = { duration: number; price: number };


function priceFromDurationExact(mins: number, rows: TuitionRow[]): number {
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  const hit = rows.find(r => r.duration === mins);
  return hit ? hit.price : 0;
}
// ---------- utils ----------
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const currency = (n: number) => `$${(n || 0).toFixed(2)}`;

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

// Bill proration from TODAY until next bill day (simple daily basis on current month length)
function prorate(today: Date, billDay: number): number {
  const y = today.getFullYear();
  const m = today.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  if (billDay <= today.getDate()) {
    const daysLeftThisMonth = daysInMonth - today.getDate() + 1; // include today
    return Math.min(1, daysLeftThisMonth / daysInMonth);
  } else {
    const days = billDay - today.getDate();
    return Math.min(1, days / daysInMonth);
  }
}

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

// ---------- component ----------
export default function RegistrationDetailsPage() {
  // Lookup
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

  // Tuition
  const [tuitionRows, setTuitionRows] = useState<TuitionRow[]>([]);
  const [tuitionError, setTuitionError] = useState<string>("");

  // Data
  const [household, setHousehold] = useState<Household | null>(null);

  // Classes (Akada)
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState<string>("");
  const [classesList, setClassesList] = useState<StudioClass[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Record<string, boolean>>({});

  // Dance Wear
  const [danceWear, setDanceWear] = useState<DanceWearPackage[]>([]);
  const [selectedWearItems, setSelectedWearItems] = useState<Record<string, Record<string, boolean>>>({});
  const [wearError, setWearError] = useState<string>("");
  const [wearLoaded, setWearLoaded] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  // Consent / signature / notes
  const [autoPayConsent, setAutoPayConsent] = useState(false);
  const sigRef = useRef<any>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { document.documentElement.style.fontSize = "16px"; }, []);

  // ---------- lookup ----------
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

      // ----- Build dancers from GHL (keys from your route) -----
      const f = (data.formDraft || {}) as Record<string, any>;
      const parentFull = f.parent1 || f.name || "";
      const [pf, ...plRest] = parentFull.split(" ").filter(Boolean);
      const parent = { firstName: pf || parentFull || "", lastName: plRest.join(" ") || "", full: parentFull || "" };

      const dancers: Dancer[] = [];
      const primaryAge =
        (Number.isFinite(Number(f.age)) ? Number(f.age) : "") ||
        calcAgeFromDOB(f.birthdate) || "";
      if (f.studentFirstName || f.studentLastName || primaryAge !== "") {
        dancers.push({
          id: "primary",
          firstName: f.studentFirstName || "",
          lastName: f.studentLastName || "",
          age: primaryAge,
        });
      }
      try {
        const arr = Array.isArray(f.additionalStudents) ? f.additionalStudents : [];
        arr.forEach((s: any, i: number) => {
          const sAge =
            (Number.isFinite(Number(s.age)) ? Number(s.age) : "") ||
            calcAgeFromDOB(s.birthdate) || "";
          dancers.push({
            id: s.id || `extra_${i}`,
            firstName: s.firstName || s.studentFirstName || "",
            lastName: s.lastName || s.studentLastName || "",
            age: sAge,
          });
        });
      } catch {}

      if (dancers.length === 0) {
        dancers.push({ id: "primary", firstName: "Student", lastName: "", age: "" });
      }

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

      // Load dependent data
      await loadDanceWear();
      await loadClassesForPrimaryAge(dancers[0]?.age);
      await loadTuition();
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
  // ---------- Classes (Akada) ----------
  async function loadClassesForPrimaryAge(age?: number | string) {
    setClassesLoading(true);
    setClassesError("");
    setClassesList([]);
    setSelectedClassIds({});

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

      setClassesList(norm);
    } catch (e: any) {
      console.error("classes load failed:", e);
      setClassesError(e?.message || "Classes load failed.");
    } finally {
      setClassesLoading(false);
    }
  }

  function toggleClass(id: string, on: boolean) {
    setSelectedClassIds(prev => ({ ...prev, [id]: on }));
  }

  const selectedClasses = useMemo(
    () => classesList.filter(c => !!selectedClassIds[c.id]),
    [classesList, selectedClassIds]
  );

  const selectedWeeklyMinutes = useMemo(
    () => selectedClasses.reduce((sum, c) => sum + (c.lengthMinutes || 0), 0),
    [selectedClasses]
  );
const monthlyTuitionExact = useMemo(() => {
  return priceFromDurationExact(selectedWeeklyMinutes, tuitionRows);
}, [selectedWeeklyMinutes, tuitionRows]);

  // ---------- Dance Wear ----------
  async function loadDanceWear() {
    setWearError("");
    setDanceWear([]);
    setSelectedWearItems({});
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

      if (Array.isArray(list) && list.length > 0) {
        const firstId = list[0].id;
        setSelectedPackageId(firstId);

        const defaults: Record<string, Record<string, boolean>> = {};
        list.forEach((pkg) => {
          defaults[pkg.id] = {};
          pkg.items.forEach((it) => { defaults[pkg.id][it.sku] = true; });
        });
        setSelectedWearItems(defaults);
      }
    } catch (e: any) {
      console.error("Dance Wear load failed:", e);
      setWearError(e?.message || "Dance Wear load failed.");
      setWearLoaded(true);
    }
  }

  function toggleWearItem(pkgId: string, sku: string, checked: boolean) {
    setSelectedWearItems((prev) => ({
      ...prev,
      [pkgId]: { ...(prev[pkgId] || {}), [sku]: checked },
    }));
  }

  function getSelectedPackage(): DanceWearPackage | null {
    if (!selectedPackageId) return null;
    return danceWear.find((p) => p.id === selectedPackageId) || null;
  }

  function ensureDefaultsForPackage(pkgId: string) {
    const pkg = danceWear.find((p) => p.id === pkgId);
    if (!pkg) return;
    setSelectedWearItems((prev) => {
      if (prev[pkgId]) return prev;
      const next = { ...prev, [pkgId]: {} as Record<string, boolean> };
      pkg.items.forEach((it) => { next[pkgId][it.sku] = true; });
      return next;
    });
  }

  const selectedPkg = getSelectedPackage();

  const packageSubtotal = (pkg: DanceWearPackage) =>
    (pkg.items || []).reduce((sum, it) => {
      const on = selectedWearItems[pkg.id]?.[it.sku];
      return sum + (on ? it.price : 0);
    }, 0);

  const wearSubtotal = useMemo(() => {
    if (!selectedPkg) return 0;
    return packageSubtotal(selectedPkg);
  }, [selectedPkg, selectedWearItems]);

  // ---------- totals with proration ----------
 const breakdown = useMemo(() => {
  if (!household) return { reg: 0, prorated: 0, wear: 0, today: 0, monthly: 0 };
  const { registrationFee, monthlyTuitionPerDancer, billDay } = household.pricing;

  // Prefer exact-match sheet price; fallback to legacy per-dancer calc if not found.
  const computedMonthly = monthlyTuitionExact || (monthlyTuitionPerDancer * household.dancers.length);

  const today = new Date();
  const factor = prorate(today, billDay); // fraction of monthly for proration
  const prorated = computedMonthly * factor;

  const reg = registrationFee;
  const wear = wearSubtotal;
  const dueToday = reg + prorated + wear;
  const dueMonthly = computedMonthly;

  return { reg, prorated, wear, today: dueToday, monthly: dueMonthly };
}, [household, wearSubtotal, monthlyTuitionExact]);

  const canSubmit = !!household && autoPayConsent && !!signatureDataUrl;

  // ---------- submit ----------
  async function handleSubmit() {
    if (!canSubmit || !household) return;
    setSubmitting(true);

    const payload = {
      source: "registration-details",
      contactId: household.contactId,
      email: household.email,
      parent: household.parent,
      dancers: household.dancers,
      pricing: household.pricing,
      selectedClasses: selectedClasses.map(c => ({
        id: c.id,
        name: c.name,
        level: c.level,
        type: c.type,
        day: c.day,
        time: c.time,
        lengthMinutes: c.lengthMinutes,
      })),
      selectedWeeklyMinutes,
      selectedWearPackages: selectedPkg ? [{
        id: selectedPkg.id,
        name: selectedPkg.name,
        items: selectedPkg.items.filter((it) => selectedWearItems[selectedPkg.id]?.[it.sku]),
        subtotal: packageSubtotal(selectedPkg),
      }] : [],
      totals: breakdown, // includes reg, prorated, wear, today, monthly
      consent: { autoPay: true, signatureDataUrl, termsAcceptedAt: new Date().toISOString() },
      notes,
      tuition: {
  weeklyMinutes: selectedWeeklyMinutes,
  monthlyFromSheet: monthlyTuitionExact,
  source: "Tuition tab (duration→price exact match)",
},
    };

    try {
      const resp = await fetch("/api/elite/register-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await resp.json().catch(() => null);
      if (!resp.ok || !j?.ok) {
        console.error("submit failed", j);
        alert(`Error (HTTP ${resp.status}): ${typeof j === "string" ? j : JSON.stringify(j)}`);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- render ----------
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ borderColor: DANCE_PURPLE }}>
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: DANCE_PURPLE }}>
            Elite Dance & Music — Registration Details
          </h1>
          <div className="text-xs text-neutral-500">/elite/details</div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-4 pb-28 pt-4">
        {/* Lookup */}
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
            {/* Account & Dancers */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_PURPLE }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: DANCE_PURPLE }} />
                  Account & Dancers
                </CardTitle>
                <CardDescription>Pulled from your signup and GHL custom fields.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border p-3">
                  <div className="text-sm text-neutral-500">Account Name</div>
                  <div className="text-lg font-medium">
                    {household.parent.full || `${household.parent.firstName} ${household.parent.lastName}`.trim()}
                  </div>
                </div>
                <div className="space-y-2">
                  {household.dancers.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <div className="font-medium">{d.firstName} {d.lastName}</div>
                        <div className="text-sm text-neutral-500">Age {String(d.age ?? "")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Select Classes */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_BLUE }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="h-5 w-5" style={{ color: DANCE_BLUE }} />
                  Select your dance classes
                </CardTitle>
                <CardDescription>
                  Choose one or more classes that fit your schedule. Length is used to calculate tuition.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {classesError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {classesError}{" "}
                    <Button size="sm" variant="link" className="p-0 ml-1" onClick={() => loadClassesForPrimaryAge(household?.dancers?.[0]?.age)}>
                      Retry
                    </Button>
                  </div>
                )}

                {!classesError && classesLoading && (
                  <div className="text-sm text-neutral-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading classes…
                  </div>
                )}

                {!classesError && !classesLoading && classesList.length === 0 && (
                  <div className="text-sm text-neutral-500">No classes available for the selected age.</div>
                )}

                {!classesError && !classesLoading && classesList.length > 0 && (
                  <div className="space-y-2">
                    {classesList.map((c) => {
                      const seatsLeft = Math.max(0, Number(c.maxEnrollment || 0) - Number(c.currentEnrollment || 0));
                      const selected = !!selectedClassIds[c.id];
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
                            <Checkbox
                              id={`cls-${c.id}`}
                              checked={selected}
                              onCheckedChange={(v) => toggleClass(c.id, Boolean(v))}
                            />
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

            {/* Dance Wear — dropdown + items */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_BLUE }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="h-5 w-5" style={{ color: DANCE_BLUE }} />
                  Dance Wear Packages
                </CardTitle>
                <CardDescription>All items are preselected. Uncheck anything you don’t need—your price updates automatically.</CardDescription>
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
                        <Button size="sm" variant="link" className="ml-2 p-0" onClick={() => window.open("/api/elite/dancewear?debug=1", "_blank")}>View API error</Button>
                      </div>
                    </div>
                  </div>
                )}

                {!wearError && !wearLoaded && (
                  <div className="text-sm text-neutral-500">Loading packages…</div>
                )}

                {!wearError && wearLoaded && danceWear.length === 0 && (
                  <div className="text-sm text-neutral-500">No packages available right now.</div>
                )}

                {/* Package selector */}
                {!wearError && danceWear.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="dw-package">Select the right package for your dancer</Label>
                    <Select
                      value={selectedPackageId}
                      onValueChange={(v) => { setSelectedPackageId(v); ensureDefaultsForPackage(v); }}
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

                {/* Selected package details */}
                {selectedPkg && (
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{selectedPkg.name}</div>
                        <div className="text-sm text-neutral-500">
                          Package subtotal: <span className="font-medium">{currency(packageSubtotal(selectedPkg))}</span>
                        </div>
                      </div>
                    </div>

                    <ul className="mt-2 divide-y">
                      {selectedPkg.items.map((it) => (
                        <li key={it.sku} className="py-2 flex items-center justify-between">
                          <div className="flex-1 pr-3">
                            <div className="text-sm">{it.name}</div>
                            <div className="text-xs text-neutral-500">{currency(it.price)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`${selectedPkg.id}-${it.sku}`} className="text-sm">Include</Label>
                            <Checkbox
                              id={`${selectedPkg.id}-${it.sku}`}
                              checked={!!selectedWearItems[selectedPkg.id]?.[it.sku]}
                              onCheckedChange={(v) => toggleWearItem(selectedPkg.id, it.sku, Boolean(v))}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dynamic subtotal footer for Dance Wear */}
                {!wearError && (
                  <div className="mt-2 rounded-xl border p-3 bg-neutral-50 flex items-center justify-between">
                    <div className="text-sm">Dance Wear Subtotal</div>
                    <div className="text-lg font-semibold" style={{ color: DANCE_BLUE }}>{currency(wearSubtotal)}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review & Sign — full math breakdown */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_PINK }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" style={{ color: DANCE_PINK }} />
                  Review & Sign
                </CardTitle>
                <CardDescription>Auto-Pay required. Monthly tuition is billed on the {household.pricing.billDay === 1 ? "1st" : `${household.pricing.billDay}th`}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
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
                  <div className="my-1 border-t" />
                  <div className="flex items-center justify-between">
                    <div className="text-sm">DUE TODAY</div>
                    <div className="text-xl font-semibold" style={{ color: DANCE_PINK }}>{currency(breakdown.today)}</div>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-sm">DUE MONTHLY</div>
                    <div className="text-xs text-neutral-500">
  {selectedWeeklyMinutes} minutes → {currency(monthlyTuitionExact)}
</div>
{tuitionError && (
  <div className="mt-2 text-xs text-red-600">{tuitionError}</div>
)}
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border p-3">
                  <Checkbox id="autopay" checked={autoPayConsent} onCheckedChange={(v) => setAutoPayConsent(Boolean(v))} />
                  <Label htmlFor="autopay" className="text-sm">
                    I give Elite Dance permission to keep my card on file and charge monthly tuition on Auto-Pay.
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Signature (parent/guardian) *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for the Studio (optional)</Label>
                  <Textarea id="notes" placeholder="Sizing notes, preferences, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="px-5 text-white" style={{ backgroundColor: DANCE_PURPLE }}>
                    {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span> : "Confirm & Sign"}
                  </Button>
                </div>
              </CardContent>
            </Card>

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