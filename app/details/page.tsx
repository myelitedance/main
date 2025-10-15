'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Users, Pencil, Shirt, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// Signature pad must be client-only (same approach as /newstudent)
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false }) as any;

// --- Theme (Elite Dance) ---
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
    registrationFee: number;            // one-time (today)
    monthlyTuitionPerDancer: number;    // first month due today + monthly going forward
    billDay: number;                    // 1 = first of month
  };
};

type DWItem = { sku: string; name: string; price: number };
type DanceWearPackage = { id: string; name: string; items: DWItem[] };

// ---------- Utils ----------
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const currency = (n: number) => `$${(n || 0).toFixed(2)}`;

// ---------- Page ----------
export default function RegistrationDetailsPage() {
  // Lookup state
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

  // Data
  const [household, setHousehold] = useState<Household | null>(null);
  const [danceWear, setDanceWear] = useState<DanceWearPackage[]>([]);
  const [selectedWearItems, setSelectedWearItems] = useState<Record<string, Record<string, boolean>>>({});

  // Consent / Signature / Notes
  const [autoPayConsent, setAutoPayConsent] = useState(false);
  const sigRef = useRef<any>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Base font to avoid iOS zoom (matching your /newstudent)
  useEffect(() => { document.documentElement.style.fontSize = "16px"; }, []);

  // ---------- Lookup ----------
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
        return;
      }
      const data = JSON.parse(raw);

      // Your /api/ghl/lookup returned { found, contactId, formDraft } in /newstudent.
      // We'll map that into the minimal Household shape we need here.
      if (data.found) {
        const f = (data.formDraft || {}) as Record<string, any>;

        // Parent name
        const parentFull = f.parent1 || f.name || "";
        const [pf, ...plRest] = parentFull.split(" ").filter(Boolean);
        const parent = {
          firstName: pf || parentFull || "",
          lastName: plRest.join(" ") || "",
          full: parentFull || "",
        };

        // Dancer(s): prefer structured additional_students_json if present
        let dancers: Dancer[] = [];
        try {
          const extra = f.additional_students_json ? JSON.parse(f.additional_students_json) : [];
          if (Array.isArray(extra)) {
            dancers = extra
              .filter(Boolean)
              .map((s: any, i: number) => ({
                id: s.id || `extra_${i}`,
                firstName: s.firstName || s.studentFirstName || "",
                lastName: s.lastName || s.studentLastName || "",
                age: Number(s.age || 0) || "",
              }));
          }
        } catch {}

        // Include primary student if present
        if (f.studentFirstName || f.studentLastName || f.student_age) {
          dancers.unshift({
            id: "primary",
            firstName: f.studentFirstName || "",
            lastName: f.studentLastName || "",
            age: Number(f.student_age || 0) || "",
          });
        }

        // Fallback if no student data
        if (dancers.length === 0) {
          dancers = [{ id: "primary", firstName: "Student", lastName: "", age: "" }];
        }

        // Pricing defaults (override on server as needed)
        const pricing = {
          registrationFee: Number(data.registrationFee ?? 25),
          monthlyTuitionPerDancer: Number(data.monthlyTuitionPerDancer ?? 89),
          billDay: Number(data.billDay ?? 1),
        };

        const hh: Household = {
          contactId: data.contactId || null,
          email: lookupEmail,
          parent,
          dancers,
          pricing,
        };

        setHousehold(hh);
        setLookupMsg("Found your account. Review below.");
        await loadDanceWear();
      } else {
        setLookupMsg("No record found for that email. Please check spelling or contact the office.");
        setHousehold(null);
      }
    } catch (e: any) {
      console.error("[details/lookup] fetch threw", e);
      setLookupMsg(e?.name === "AbortError" ? "Lookup timed out. Please try again." : `We couldn’t check right now. ${e?.message || ""}`);
    } finally {
      clearTimeout(to);
      setLookupBusy(false);
    }
  }

  function onLookupKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!lookupBusy) handleLookup();
    }
  }

  // ---------- Dance Wear (spreadsheet) ----------
  async function loadDanceWear() {
  try {
    const r = await fetch("/api/elite/dancewear", { method: "GET", cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const list: DanceWearPackage[] = await r.json();

    setDanceWear(Array.isArray(list) ? list : []);

    // Default all items selected
    const defaults: Record<string, Record<string, boolean>> = {};
    (list || []).forEach((pkg) => {
      defaults[pkg.id] = {};
      pkg.items.forEach((it) => { defaults[pkg.id][it.sku] = true; });
    });
    setSelectedWearItems(defaults);
  } catch (e) {
    console.warn("Dance Wear load failed:", e);
    const fallback: DanceWearPackage[] = [
      {
        id: "starter-combo",
        name: "Starter Combo",
        items: [
          { sku: "shoes-youth",  name: "Ballet Shoes (Youth)", price: 28 },
          { sku: "tights-youth", name: "Tights (Youth)",       price: 12 },
          { sku: "uniform-y",    name: "Uniform (Youth)",      price: 38 },
          { sku: "bag",          name: "Drawstring Bag",       price: 10 },
          { sku: "bow",          name: "Team Bow",             price: 6  },
        ],
      },
    ];
    setDanceWear(fallback);
    const defaults: Record<string, Record<string, boolean>> = {};
    fallback.forEach((pkg) => {
      defaults[pkg.id] = {};
      pkg.items.forEach((it) => { defaults[pkg.id][it.sku] = true; });
    });
    setSelectedWearItems(defaults);
  }
}

  // ---------Toggle Helper---------
function toggleWearItem(pkgId: string, sku: string, checked: boolean) {
  setSelectedWearItems((prev) => ({
    ...prev,
    [pkgId]: { ...(prev[pkgId] || {}), [sku]: checked },
  }));
}
  // ---------- Totals ----------
  const packageSubtotal = (pkg: DanceWearPackage) =>
  (pkg.items || []).reduce((sum, it) => {
    const on = selectedWearItems[pkg.id]?.[it.sku];
    return sum + (on ? it.price : 0);
  }, 0);

const wearSubtotal = useMemo(() => {
  return danceWear.reduce((acc, pkg) => acc + packageSubtotal(pkg), 0);
}, [danceWear, selectedWearItems]);
  const totals = useMemo(() => {
  if (!household) return { today: 0, monthly: 0, wear: 0 };
  const { registrationFee, monthlyTuitionPerDancer } = household.pricing;
  const dancerCount = household.dancers.length;

  const firstMonth = monthlyTuitionPerDancer * dancerCount;
  const today = registrationFee + firstMonth + wearSubtotal;
  const monthly = monthlyTuitionPerDancer * dancerCount;

  return { today, monthly, wear: wearSubtotal };
}, [household, wearSubtotal]);

  // ---------- Signature helpers ----------
  function snapshotSignature(): string {
    const pad = sigRef.current as any;
    if (!pad || typeof pad.isEmpty !== "function" || pad.isEmpty()) return "";

    // Prefer trimmed; fall back to full
    let src: HTMLCanvasElement | null = null;
    try { src = typeof pad.getTrimmedCanvas === "function" ? pad.getTrimmedCanvas() : null; } catch {}
    if (!src) try { src = typeof pad.getCanvas === "function" ? pad.getCanvas() : null; } catch {}
    if (!src) return "";

    // Offscreen copy with white background
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

  // ---------- Submit ----------
  const canSubmit = !!household && autoPayConsent && !!signatureDataUrl;

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
      selectedWearPackages: danceWear.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    items: pkg.items
      .filter((it) => selectedWearItems[pkg.id]?.[it.sku])
      .map(({ sku, name, price }) => ({ sku, name, price })),
    subtotal: packageSubtotal(pkg),
  })),
  totals, // contains .wear, .today, .monthly
      consent: {
        autoPay: true,
        signatureDataUrl,
        termsAcceptedAt: new Date().toISOString(),
      },
      notes,
    };

    try {
      // You can implement this route to store the consent, signature, and selections,
      // and notify staff to add card-on-file securely (no card captured here).
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

      // Optional: studio notification
      (async () => {
        try {
          await fetch("/api/notify/registration-details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({ payload }),
          });
        } catch (e) {
          console.warn("notify failed", e);
        }
      })();
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60"
        style={{ borderColor: DANCE_PURPLE }}
      >
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !lookupBusy) handleLookup();
                  }}
                />
                {lookupMsg && <p className="text-xs mt-1 text-neutral-600">{lookupMsg}</p>}
              </div>
              <Button
                type="button"
                onClick={handleLookup}
                disabled={lookupBusy}
                className="h-10"
                style={{ backgroundColor: DANCE_PURPLE }}
              >
                {lookupBusy ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</span> : "Lookup"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content after lookup */}
        {household && (
          <div className="space-y-6">
            {/* Account + Dancers (Top Summary) */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_PURPLE }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: DANCE_PURPLE }} />
                  Account & Dancers
                </CardTitle>
                <CardDescription>Pulled from your original signup and GHL custom fields.</CardDescription>
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
                        <div className="text-sm text-neutral-500">Age {String(d.age || "")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dance Wear */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_BLUE }}>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Shirt className="h-5 w-5" style={{ color: DANCE_BLUE }} />
      Dance Wear Packages
    </CardTitle>
    <CardDescription>
      All items are preselected. Uncheck anything you don’t need—your price updates automatically.
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    {danceWear.length === 0 && (
      <div className="text-sm text-neutral-500">No packages available right now.</div>
    )}

    {danceWear.map((pkg) => (
      <div key={pkg.id} className="rounded-xl border p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{pkg.name}</div>
            <div className="text-sm text-neutral-500">
              Package subtotal: <span className="font-medium">{currency(packageSubtotal(pkg))}</span>
            </div>
          </div>
        </div>

        <ul className="mt-2 divide-y">
          {pkg.items.map((it) => (
            <li key={it.sku} className="py-2 flex items-center justify-between">
              <div className="flex-1 pr-3">
                <div className="text-sm">{it.name}</div>
                <div className="text-xs text-neutral-500">{currency(it.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${pkg.id}-${it.sku}`} className="text-sm">Include</Label>
                <Checkbox
                  id={`${pkg.id}-${it.sku}`}
                  checked={!!selectedWearItems[pkg.id]?.[it.sku]}
                  onCheckedChange={(v) => toggleWearItem(pkg.id, it.sku, Boolean(v))}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    ))}

    {/* Dynamic subtotal footer for Dance Wear */}
    <div className="mt-2 rounded-xl border p-3 bg-neutral-50 flex items-center justify-between">
      <div className="text-sm">Dance Wear Subtotal</div>
      <div className="text-lg font-semibold" style={{ color: DANCE_BLUE }}>{currency(wearSubtotal)}</div>
    </div>
  </CardContent>
</Card>

            {/* Review & Sign */}
            <Card className="rounded-2xl border" style={{ borderColor: DANCE_PINK }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" style={{ color: DANCE_PINK }} />
                  Review & Sign
                </CardTitle>
                <CardDescription>Auto-Pay required. Monthly tuition is billed on the 1st.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Totals */}
                <div className="rounded-2xl bg-neutral-50 p-3">
  <div className="flex items-center justify-between">
    <div className="text-sm">DUE TODAY</div>
    <div className="text-xl font-semibold" style={{ color: DANCE_PINK }}>{currency(totals.today)}</div>
  </div>
  <div className="mt-1 flex items-center justify-between text-sm">
    <div className="text-neutral-600">Includes Dance Wear</div>
    <div className="font-medium">{currency(totals.wear)}</div>
  </div>
  <div className="mt-1 flex items-center justify-between">
    <div className="text-sm">DUE MONTHLY (on the {household.pricing.billDay === 1 ? "1st" : `${household.pricing.billDay}th`})</div>
    <div className="text-lg font-medium" style={{ color: DANCE_BLUE }}>{currency(totals.monthly)}</div>
  </div>
</div>

                {/* Consent */}
                <div className="flex items-start gap-2 rounded-xl border p-3">
                  <Checkbox
                    id="autopay"
                    checked={autoPayConsent}
                    onCheckedChange={(v) => setAutoPayConsent(Boolean(v))}
                  />
                  <Label htmlFor="autopay" className="text-sm">
                    I give Elite Dance permission to keep my card on file and charge monthly tuition on Auto-Pay.
                  </Label>
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <Label>Signature (parent/guardian) *</Label>
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: DANCE_PURPLE }}>
                    <SignatureCanvas
                      ref={sigRef}
                      penColor="#111827"
                      backgroundColor="#ffffff"
                      canvasProps={{ width: 740, height: 180, className: "w-full h-[180px] bg-white" }}
                      onBegin={() => setSignatureDataUrl("")}
                      onEnd={() => setSignatureDataUrl(snapshotSignature())}
                    />
                  </div>
                </div>

                {/* Notes (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for the Studio (optional)</Label>
                  <Textarea id="notes" placeholder="Sizing notes, preferences, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="px-5 text-white"
                style={{ backgroundColor: DANCE_PURPLE }}
              >
                {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span> : "Confirm & Sign"}
              </Button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="mt-6 rounded-xl border p-4 text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Saved! We’ll finalize enrollment and securely add your payment method for Auto-Pay.</span>
          </div>
        )}
      </main>

      {/* Mobile polish */}
      <style>{`
        html, body { overscroll-behavior-y: contain; }
        input, textarea { scroll-margin-top: 96px; }
        @supports (padding: max(0px)) {
          footer { padding-bottom: max(env(safe-area-inset-bottom), 0px); }
        }
        input, textarea, button, [role="checkbox"] { min-height: 44px; }
        main { max-width: 720px; }
        @media (max-width: 400px) { main { padding-left: 12px; padding-right: 12px; } }
      `}</style>
    </div>
  );
}