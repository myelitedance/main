'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import dynamic from "next/dynamic";
import { Loader2, Send, CheckCircle2, Plus, Trash2 } from "lucide-react";

// Signature pad must be client-only.
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false }) as any;

// ---------- Types ----------
export type NewStudentForm = {
  additionalStudents?: { firstName: string; lastName: string; birthdate: string; age?: string }[];
  studentFirstName?: string;
  studentLastName?: string;
  birthdate?: string;
  age?: string;
  parent1?: string;
  parent2?: string;
  primaryPhone?: string;
  primaryPhoneIsCell?: boolean;
  primaryPhoneSmsOptIn?: boolean;
  altPhone?: string;
  altPhoneIsCell?: boolean;
  altPhoneSmsOptIn?: boolean;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  hearAbout?: string;
  hearAboutDetails?: string;
  benefits?: string[];
  benefitsOther?: string;
  area6to12mo?: "Yes" | "No" | "";
  waiverAcknowledged?: boolean; // page 1 checkbox
  waiverSigned?: boolean;       // set when signature drawn on page 2
  waiverDate?: string;
  signatureDataUrl?: string;
};

// ---------- Utils ----------
function ageFromDOB(dob?: string): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.valueOf())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return String(age);
}
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ---------- Component ----------
export default function NewStudentEntry() {
  // page state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [policies, setPolicies] = useState<string>("");

  // form state
  const [form, setForm] = useState<NewStudentForm>({});
  const setField = <K extends keyof NewStudentForm>(name: K, value: NewStudentForm[K]) =>
    setForm((f) => ({ ...f, [name]: value }));

  // signature
  const sigRef = useRef<any>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");

  // lookup state
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");
  const [foundContactId, setFoundContactId] = useState<string | null>(null);

  // derived
  const derivedAge = useMemo(() => ageFromDOB(form.birthdate), [form.birthdate]);
  const derivedAgesExtra = useMemo(
    () => (form.additionalStudents || []).map(s => ageFromDOB(s.birthdate)),
    [form.additionalStudents]
  );

  // base font to avoid iOS zoom
  useEffect(() => {
    document.documentElement.style.fontSize = "16px";
  }, []);

  // load policies when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    fetch("/api/policies")
      .then(r => (r.ok ? r.text() : Promise.reject(new Error("Policies not found"))))
      .then(txt => { if (!cancelled) setPolicies(txt); })
      .catch(() => { if (!cancelled) setPolicies("Studio Policies currently unavailable. Please see the office for a printed copy."); });
    return () => { cancelled = true; };
  }, [step]);

  // helpers
  const addChild = () =>
    setField("additionalStudents", [
      ...(form.additionalStudents || []),
      { firstName: "", lastName: "", birthdate: "", age: "" },
    ]);

  const removeChild = (idx: number) => {
    const arr = [...(form.additionalStudents || [])];
    arr.splice(idx, 1);
    setField("additionalStudents", arr);
  };

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
    // center if sizes differ
    const dx = Math.max(0, (w - src.width) / 2);
    const dy = Math.max(0, (h - src.height) / 2);
    ctx.drawImage(src, dx, dy);
    return off.toDataURL("image/png");
  }

  // === Lookup ===
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
        console.error("[lookup] http", r.status, raw);
        return;
      }
      const data = JSON.parse(raw);
      if (data.found) {
        setFoundContactId(data.contactId || null);
        setForm(prev => ({ ...prev, ...(data.formDraft || {}), email: lookupEmail }));
        setLookupMsg("We found your info and pre-filled the form. Please review and update if needed.");
      } else {
        setFoundContactId(null);
        setField("email", lookupEmail);
        setLookupMsg("No existing record found. You can continue filling out the form.");
      }
    } catch (e: any) {
      console.error("[lookup] fetch threw", e);
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

function validateStep1(form: NewStudentForm) {
  // List of required fields (ids must match your input ids)
  const requiredPairs: Array<[string, string | undefined]> = [
    ["studentFirstName", form.studentFirstName],
    ["studentLastName",  form.studentLastName],
    ["age",        derivedAge || form.age],
    ["parent1",          form.parent1],
    ["primaryPhone",     form.primaryPhone],
    ["email",            form.email],
    ["street",           form.street],
    ["city",             form.city],
    // state handled separately (shadcn Select)
    ["zip",              form.zip],
  ];

  for (const [id, val] of requiredPairs) {
    if (!String(val || "").trim()) {
      const el = document.getElementById(id) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus?.();
      alert("Please complete all required fields (*) before continuing.");
      return false;
    }
  }

  // Validate state (Select)
 /* if (!String(form.state || "").trim()) {
    const el = document.getElementById("state") as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus?.();
    alert("Please select a State (*).");
    return false;
  }
*/
  // Waiver acknowledgement is already enforced below, but leave it here if you want
  return true;
}
  // === Submit ===
  async function handleSubmit(e: React.FormEvent<HTMLButtonElement | HTMLFormElement>) {
  e.preventDefault();

  if (step === 1) {
    // Run required-field validation for Step 1
    if (!validateStep1(form)) return;

    // Also enforce the waiver checkbox (not starred, but required by policy)
    if (!form.waiverAcknowledged) {
      alert("Please acknowledge the Waiver / Release to continue.");
      return;
    }

    setStep(2);
    return;
  }

    // step 2
    setSubmitting(true);

    // Require a signature (captured in onEnd)
    if (!signatureDataUrl) {
      alert("Please sign to acknowledge the studio policies.");
      setSubmitting(false);
      return;
    }

    // Build one clean payload for your API route.
    const ghlPayload = {
      source: "newstudent",
      contact: {
        name: form.parent1 || "",
        firstName: (form.parent1 || "").split(" ")[0] || form.parent1 || "",
        lastName: (form.parent1 || "").split(" ").slice(1).join(" ") || "",
        email: form.email || "",
        phone: form.primaryPhone || "",
        address1: form.street || "",
        city: form.city || "",
        state: form.state || "",
        postalCode: form.zip || "",
        // your server route maps these logical keys to GHL custom field IDs
        customFields: {
          student_first_name: form.studentFirstName || "",
          student_last_name: form.studentLastName || "",
          student_birthdate: form.birthdate || "",
          student_age: (form.age || ageFromDOB(form.birthdate)) || "",
          parent2_name: form.parent2 || "",
          alt_phone: form.altPhone || "",
          primary_phone_is_cell: !!form.primaryPhoneIsCell,
          alt_phone_is_cell: !!form.altPhoneIsCell,
          sms_opt_in_any: !!form.primaryPhoneSmsOptIn || !!form.altPhoneSmsOptIn,
          hear_about: form.hearAbout || "",
          hear_details: form.hearAboutDetails || "",
          benefits_other: form.benefitsOther || "",
          area6to12mo: form.area6to12mo || "",
          waiver_acknowledged: !!form.waiverAcknowledged,
          waiver_date: form.waiverDate || "",
          signature_data_url: signatureDataUrl,
          additional_students_json: JSON.stringify(form.additionalStudents || []),
          form_source: "newstudent",
        },
      },
      meta: { contactId: foundContactId || undefined },
    } as const;

try {
  const resp = await fetch("/api/ghl/new-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ghlPayload),
  });

  const j = await resp.json().catch(() => null);

  if (!resp.ok || !j?.ok) {
    console.error("GHL submit failed", j);
    alert(`GHL error (HTTP ${resp.status}): ${typeof j === "string" ? j : JSON.stringify(j)}`);
    return;
  }

  // Success UI first
  setSubmitted(true);

  // Fire-and-forget email; failure shouldn't affect UX
  (async () => {
    try {
      await fetch("/api/notify/new-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          form: { ...form, signatureDataUrl },     // full form for the email
          meta: { contactId: foundContactId || null },
        }),
      });
    } catch (e) {
      console.warn("Notify email failed:", e);
      // optional: toast/log only—no alert
    }
  })();

} catch (err) {
  console.error(err);
  alert("Something went wrong while submitting. Please try again.");
} finally {
  setSubmitting(false);
}
}
  // ---------- Options ----------
  const benefitsOptions = [
    "improve confidence",
    "improve focus",
    "physical fitness/lose weight",
    "learn to show respect",
    "leadership skills",
    "goal setting (making commitments)",
    "acrobatic skills",
    "foreign language skills",
    "cultural awareness",
    "positive role models",
  ];

  const hearOptions = [
    { key: "Referral", detail: "Name" },
    { key: "Show/demonstration", detail: "Location" },
    { key: "Print advertisement", detail: "Type/Publication" },
    { key: "Flier", detail: "Location" },
    { key: "Internet Search", detail: "Search term or site" },
    { key: "Social Media", detail: "Platform" },
    { key: "Other", detail: "Please specify" },
  ] as const;

  const hearDetailMeta: Record<string, { label: string; placeholder: string; hint?: string }> = {
    Referral: { label: "Who referred you?", placeholder: "Parent/Student name (optional details)" },
    "Show/demonstration": { label: "Where did you see us?", placeholder: "Event or school name" },
    "Print advertisement": { label: "Which publication?", placeholder: "Magazine/newspaper name" },
    Flier: { label: "Where did you find the flier?", placeholder: "Location" },
    "Internet Search": { label: "Search term or site", placeholder: "e.g., 'Elite Dance Nashville' or Google" },
    "Social Media": { label: "Which platform/account?", placeholder: "e.g., Instagram @myelitedance" },
    Other: { label: "Please specify", placeholder: "Tell us more" },
  };

  const usStates = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
  ] as const;

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ borderColor: "#8B5CF6" }}>
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#8B5CF6" }}>Elite Dance & Music — New Student</h1>
          <div className="text-xs text-neutral-500">/newstudent</div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-sm px-4 pb-32 pt-4">
        <Card className="shadow-lg rounded-2xl border" style={{ borderColor: "#3B82F6" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">New Student Information</CardTitle>
            <div className="text-sm text-neutral-500">Please complete one form per child.</div>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                {/* Email lookup */}
                <section className="space-y-2 rounded-xl border p-3">
                  <h2 className="text-base font-semibold" style={{ color: "#8B5CF6" }}>Find your info</h2>
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
                    <Button
                      type="button"
                      onClick={handleLookup}
                      disabled={lookupBusy}
                      className="h-10"
                      style={{ backgroundColor: "#8B5CF6" }}
                    >
                      {lookupBusy ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                        </span>
                      ) : (
                        "Lookup"
                      )}
                    </Button>
                  </div>
                  <p className="text-[12px] text-neutral-500">
                    We’ll pre-fill the form if we already have your info in our system. You can still edit anything before submitting.
                  </p>
                </section>

                {/* Student */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Student</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="studentFirstName">First name *</Label>
                        <Input
                          id="studentFirstName"
                          autoComplete="given-name"
                          inputMode="text"
                          value={form.studentFirstName || ""}
                          onChange={(e) => setField("studentFirstName", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="studentLastName">Last name *</Label>
                        <Input
                          id="studentLastName"
                          autoComplete="family-name"
                          inputMode="text"
                          value={form.studentLastName || ""}
                          onChange={(e) => setField("studentLastName", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="birthdate">Birthdate </Label>
                        <Input
                          id="birthdate"
                          type="date"
                          value={form.birthdate || ""}
                          onChange={(e) => setField("birthdate", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="age">Age *</Label>
                        <Input
                          id="age"
                          value={derivedAge || form.age || ""}
                          onChange={(e) => setField("age", e.target.value)}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Additional children */}
                <section className="space-y-3">
                  <div className="grid grid-cols-1 gap-4">
                    {(form.additionalStudents || []).map((s, idx) => (
                      <div key={idx} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-neutral-700">Child {idx + 2}</div>
                          <button
                            type="button"
                            onClick={() => removeChild(idx)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                            aria-label={`Remove child ${idx + 2}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Remove</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`child${idx + 2}-first`}>First name</Label>
                            <Input
                              id={`child${idx + 2}-first`}
                              autoComplete="given-name"
                              value={s.firstName || ""}
                              onChange={(e) => {
                                const arr = [...(form.additionalStudents || [])];
                                arr[idx] = { ...arr[idx], firstName: e.target.value };
                                setField("additionalStudents", arr);
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`child${idx + 2}-last`}>Last name</Label>
                            <Input
                              id={`child${idx + 2}-last`}
                              autoComplete="family-name"
                              value={s.lastName || ""}
                              onChange={(e) => {
                                const arr = [...(form.additionalStudents || [])];
                                arr[idx] = { ...arr[idx], lastName: e.target.value };
                                setField("additionalStudents", arr);
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <Label htmlFor={`child${idx + 2}-dob`}>Birthdate</Label>
                            <Input
                              id={`child${idx + 2}-dob`}
                              type="date"
                              value={s.birthdate || ""}
                              onChange={(e) => {
                                const arr = [...(form.additionalStudents || [])];
                                arr[idx] = { ...arr[idx], birthdate: e.target.value };
                                setField("additionalStudents", arr);
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`child${idx + 2}-age`}>Age</Label>
                            <Input
                              id={`child${idx + 2}-age`}
                              inputMode="numeric"
                              value={(form.additionalStudents && form.additionalStudents[idx] && (derivedAgesExtra[idx] || s.age)) || ""}
                              onChange={(e) => {
                                const arr = [...(form.additionalStudents || [])];
                                arr[idx] = { ...arr[idx], age: e.target.value };
                                setField("additionalStudents", arr);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(form.additionalStudents || []).length < 2 && (
                      <Button
                        type="button"
                        onClick={addChild}
                        size="sm"
                        variant="outline"
                        className="inline-flex w-fit items-center gap-1.5 rounded-md border-[#E9D5FF] bg-[#F3E8FF] px-2 py-1 text-xs font-medium text-[#8B5CF6] hover:bg-[#EDE9FE] focus:ring-[#8B5CF6]"
                      >
                        <Plus className="h-3 w-3" />
                        Add Another Child
                      </Button>
                    )}
                  </div>
                </section>

                {/* Parents */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Parent / Guardian</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="parent1">Parent/Guardian 1 (Account Name) *</Label>
                      <Input
                        id="parent1"
                        autoComplete="name"
                        value={form.parent1 || ""}
                        onChange={(e) => setField("parent1", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent2">Parent/Guardian 2 (optional)</Label>
                      <Input
                        id="parent2"
                        autoComplete="name"
                        value={form.parent2 || ""}
                        onChange={(e) => setField("parent2", e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Contact */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Contact</h2>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Primary phone */}
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="primaryPhone">Primary phone *</Label>
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                        <Input
                          id="primaryPhone"
                          placeholder="###-###-####"
                          inputMode="tel"
                          autoComplete="tel"
                          value={form.primaryPhone || ""}
                          onChange={(e) => setField("primaryPhone", e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="primaryPhoneIsCell"
                            checked={!!form.primaryPhoneIsCell}
                            onCheckedChange={(v) => setField("primaryPhoneIsCell", Boolean(v))}
                          />
                          <Label htmlFor="primaryPhoneIsCell" className="text-xs">cell</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="primaryPhoneSmsOptIn"
                            checked={!!form.primaryPhoneSmsOptIn}
                            onCheckedChange={(v) => setField("primaryPhoneSmsOptIn", Boolean(v))}
                          />
                          <Label htmlFor="primaryPhoneSmsOptIn" className="text-xs">SMS opt-in</Label>
                        </div>
                      </div>
                      {form.primaryPhoneSmsOptIn && (
                        <p className="text-xs mt-1 text-neutral-600">
                          By checking SMS opt-in, you agree to receive recurring automated promotional and transactional
                          text messages from Elite Dance & Music at the number provided. Consent is not a condition of
                          purchase. Msg & data rates may apply. Reply STOP to opt out, HELP for help.
                        </p>
                      )}
                    </div>

                    {/* Alternate phone */}
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="altPhone">Alternate phone</Label>
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                        <Input
                          id="altPhone"
                          placeholder="###-###-####"
                          inputMode="tel"
                          autoComplete="tel"
                          value={form.altPhone || ""}
                          onChange={(e) => setField("altPhone", e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="altPhoneIsCell"
                            checked={!!form.altPhoneIsCell}
                            onCheckedChange={(v) => setField("altPhoneIsCell", Boolean(v))}
                          />
                          <Label htmlFor="altPhoneIsCell" className="text-xs">cell</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="altPhoneSmsOptIn"
                            checked={!!form.altPhoneSmsOptIn}
                            onCheckedChange={(v) => setField("altPhoneSmsOptIn", Boolean(v))}
                          />
                          <Label htmlFor="altPhoneSmsOptIn" className="text-xs">SMS opt-in</Label>
                        </div>
                      </div>
                      {form.altPhoneSmsOptIn && (
                        <p className="text-xs mt-1 text-neutral-600">
                          By checking SMS opt-in, you agree to receive recurring automated promotional and transactional
                          text messages from Elite Dance & Music at the number provided. Consent is not a condition of
                          purchase. Msg & data rates may apply. Reply STOP to opt out, HELP for help.
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="email">Email address *</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        value={form.email || ""}
                        onChange={(e) => setField("email", e.target.value)}
                      />
                    </div>

                    {/* Street */}
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="street">Street address *</Label>
                      <Input
                        id="street"
                        autoComplete="address-line1"
                        value={form.street || ""}
                        onChange={(e) => setField("street", e.target.value)}
                      />
                    </div>

                    {/* City / State / Zip */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          autoComplete="address-level2"
                          value={form.city || ""}
                          onChange={(e) => setField("city", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Select value={form.state || "TN"} onValueChange={(v) => setField("state", v)}>
                          <SelectTrigger id="state" aria-label="State">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-neutral-200 shadow-lg z-50">
                            {usStates.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="zip">Zip *</Label>
                        <Input
                          id="zip"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          value={form.zip || ""}
                          onChange={(e) => setField("zip", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* How did you hear about us? */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>How did you hear about us?</h2>
                  <div className="space-y-2">
                    <Label htmlFor="hear-select">Select one</Label>
                    <Select
                      value={form.hearAbout || ""}
                      onValueChange={(v) => setField("hearAbout", v)}
                    >
                      <SelectTrigger
                        id="hear-select"
                        aria-label="How did you hear about us?"
                        className="bg-white border border-neutral-300 focus:ring-2 focus:ring-[#8B5CF6] focus:border-[#8B5CF6]"
                      >
                        <SelectValue placeholder="Choose an option" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-neutral-200 shadow-lg z-50">
                        {hearOptions.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key} className="focus:bg-[#EEF2FF]">
                            {opt.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {form.hearAbout && (
                      <div className="pt-2">
                        <Label htmlFor="hear-details">
                          {hearDetailMeta[form.hearAbout]?.label || "Details"}
                        </Label>
                        <Input
                          id="hear-details"
                          placeholder={hearDetailMeta[form.hearAbout]?.placeholder || "Add a note"}
                          value={form.hearAboutDetails || ""}
                          onChange={(e) => setField("hearAboutDetails", e.target.value)}
                          className="bg-white"
                        />
                        {hearDetailMeta[form.hearAbout]?.hint && (
                          <p className="text-xs text-neutral-500 mt-1">{hearDetailMeta[form.hearAbout]?.hint}</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Benefits */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>
                    What benefits were you hoping for <span className="font-normal">(check all that apply)</span>?
                  </h2>
                  <div className="grid grid-cols-1 gap-2">
                    {benefitsOptions.map((label) => {
                      const checked = (form.benefits || []).includes(label);
                      return (
                        <label key={label} className="flex items-center gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const current = new Set(form.benefits || []);
                              if (v) current.add(label);
                              else current.delete(label);
                              setField("benefits", Array.from(current));
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="benefitsOther">Other</Label>
                      <Input
                        id="benefitsOther"
                        value={form.benefitsOther || ""}
                        onChange={(e) => setField("benefitsOther", e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Waiver acknowledgment */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Waiver / Release of Liability</h2>
                  <Textarea
                    readOnly
                    className="h-40 text-[13px] leading-snug"
                    value={`The practice of dance involves the risk of physical injury (with bruises being the most likely injury and broken bones or other more serious physical injuries also being possible.) Understanding this I declare:

That I am willing to accept responsibility for such an eventuality, and;

That I have adequate medical insurance for such an eventuality, and;

That I will not hold any club, member, instructor, or the owners or operators of any facility in which I might practice liable for any injury that I might sustain while practicing dance.

Further, I understand the physical demand of this activity and the practice required for its development and mastery. As a consideration for my own safety and enjoyment, as well as that of other students, I commit to dedicate necessary practice of the instructions and techniques given to me in class.
PHOTOGRAPHY/VIDEO RELEASE:
I, the undersigned parent or legal guardian of the student, hereby grant permission to Elite Dance LLC d/b/a Elite Dance & Music (“Elite Dance”) to photograph and/or video record my child during classes, rehearsals, and performances. I authorize Elite Dance to use such photos or videos for any lawful purpose, including but not limited to internal client files, company website, printed materials, social media, advertising, and promotional content. I understand that all such photos and videos are the property of Elite Dance and that I will not receive any compensation for their use. This consent is ongoing and may only be revoked by providing written notice to Elite Dance.`}
                  />
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={!!form.waiverAcknowledged}
                      onCheckedChange={(v) => setField("waiverAcknowledged", Boolean(v))}
                    />
                    <span>I have read and acknowledge the Waiver / Release above.</span>
                  </label>
                  <p className="text-xs text-neutral-500">
                    By continuing, you also agree to our{" "}
                    <a href="/privacy-policy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>{" "}
                    and{" "}
                    <a href="/terms" className="underline" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>.
                  </p>
                </section>
              </>
            )}

            {step === 2 && (
              <>
                {/* Policies */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Studio Policies</h2>
                  <Textarea readOnly className="h-72 text-[13px] leading-snug" value={policies} />
                </section>

                {/* Signature */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Signature</h2>
                  <div className="space-y-2">
                    <Label>Signature (Student or Parent/Guardian) *</Label>
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#8B5CF6" }}>
                      <SignatureCanvas
                        ref={sigRef}
                        penColor="#111827"
                        backgroundColor="#ffffff"
                        canvasProps={{ width: 740, height: 180, className: "w-full h-[180px] bg-white" }}
                        onBegin={() => setSignatureDataUrl("")}
                        onEnd={() => {
                          const png = snapshotSignature();
                          setSignatureDataUrl(png);
                          setField("waiverSigned", true);
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 ml-auto items-center">
                      <div>
                        <Label htmlFor="waiverDate">Date *</Label>
                        <Input
                          id="waiverDate"
                          type="date"
                          value={form.waiverDate || new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setField("waiverDate", e.target.value)}
                        />
                      </div>
                      <div className="flex items-end justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            sigRef.current?.clear?.();
                            setSignatureDataUrl("");
                            setField("waiverSigned", false);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Submit spacer */}
            <div className="h-12" />
          </CardContent>
        </Card>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60" style={{ borderColor: "#3B82F6" }}>
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center gap-3">
          {!submitted ? (
            <>
              <div className="text-xs text-neutral-600 flex-1">
                {step === 1 ? (
                  <>Step 1 of 2 — Complete student & contact info, then acknowledge the waiver.</>
                ) : (
                  <>Step 2 of 2 — Review policies and sign.</>
                )}
              </div>
              {step === 1 ? (
                <Button onClick={handleSubmit} className="px-5" style={{ backgroundColor: "#8B5CF6" }} disabled={submitting}>
                  Continue
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="px-5" style={{ backgroundColor: "#8B5CF6" }} disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</span>
                  ) : (
                    <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Submit</span>
                  )}
                </Button>
              )}
              {step === 2 && (
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" /> Submitted!</div>
              <Button
                variant="outline"
                onClick={() => {
                  // full reset for another child
                  setSubmitted(false);
                  setForm({});
                  setSignatureDataUrl("");
                  setFoundContactId(null);
                  setLookupEmail("");
                  setLookupMsg("");
                  setStep(1);
                  // clear canvas if present
                  sigRef.current?.clear?.();
                }}
              >
                Start another child
              </Button>
            </div>
          )}
        </div>
      </footer>

      {/* Mobile UX polish for focus/keyboard */}
      <style>{`
        html, body { overscroll-behavior-y: contain; }
        input, textarea { scroll-margin-top: 96px; }
        @supports (padding: max(0px)) {
          footer { padding-bottom: max(env(safe-area-inset-bottom), 0px); }
        }
        input, textarea, button, [role="radio"], [role="checkbox"] { min-height: 44px; }
        main { max-width: 720px; }
        @media (max-width: 400px) { main { padding-left: 12px; padding-right: 12px; } }
      `}</style>
    </div>
  );
}