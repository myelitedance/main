'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import dynamic from "next/dynamic";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

// Signature pad must be client-only. We'll use an any-typed alias to satisfy TS for the ref.
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false });
const SignatureCanvasAny = SignatureCanvas as unknown as React.ComponentType<any>;

// ---------- Types ----------
export type NewStudentForm = {
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
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

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

const STORAGE_KEY = "elite-newstudent-draft";

export default function NewStudentEntry() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // two-page flow
  const [policies, setPolicies] = useState<string>("");
  const sigRef = useRef<any>(null);

  const [form, setForm] = useState<NewStudentForm>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as NewStudentForm) : {};
      } catch {
        // ignore
      }
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form]);

  // Ensure 16px base font-size to prevent zoom on mobile inputs
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.fontSize = "16px";
    }
  }, []);

  // Load studio policies from a server document so content stays centralized
  useEffect(() => {
    if (step === 2) {
      fetch("/api/policies")
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error("Policies not found"))))
        .then((txt) => setPolicies(txt))
        .catch(() => setPolicies("Studio Policies currently unavailable. Please see the office for a printed copy."));
    }
  }, [step]);

  const setField = <K extends keyof NewStudentForm>(name: K, value: NewStudentForm[K]) =>
    setForm((f) => ({ ...f, [name]: value }));

  const derivedAge = useMemo(() => ageFromDOB(form.birthdate), [form.birthdate]);

  // ---------- Payloads ----------
  function buildGhlPayload(f: NewStudentForm & { age?: string; signatureDataUrl?: string }) {
    return {
      source: "newstudent",
      contact: {
        name: f.parent1 || "",
        firstName: (f.parent1 || "").split(" ")[0] || f.parent1 || "",
        lastName: (f.parent1 || "").split(" ").slice(1).join(" ") || "",
        email: f.email || "",
        phone: f.primaryPhone || "",
        smsOptIn: !!f.primaryPhoneSmsOptIn || !!f.altPhoneSmsOptIn,
        address1: f.street || "",
        city: f.city || "",
        state: f.state || "",
        postalCode: f.zip || "",
        customFields: {
          student_name: `${f.studentFirstName || ""} ${f.studentLastName || ""}`.trim(),
          student_birthdate: f.birthdate || "",
          parent2_name: f.parent2 || "",
          alt_phone: f.altPhone || "",
          primary_phone_is_cell: !!f.primaryPhoneIsCell,
          alt_phone_is_cell: !!f.altPhoneIsCell,
          hear_about: f.hearAbout || "",
          hear_details: f.hearAboutDetails || "",
          benefits: (f.benefits || []).join(", ") || "",
          benefits_other: f.benefitsOther || "",
          area6to12mo: f.area6to12mo || "",
          waiverAcknowledged: !!f.waiverAcknowledged,
          waiverSignedAt: f.waiverDate || "",
        },
      },
    };
  }

  function buildAkadaPayload(f: NewStudentForm & { age?: string; signatureDataUrl?: string }) {
    return {
      source: "newstudent",
      account: {
        accountName: f.parent1 || "",
        email: f.email || "",
        phone: f.primaryPhone || "",
        address: {
          street: f.street || "",
          city: f.city || "",
          state: f.state || "",
          zip: f.zip || "",
        },
        alternatePhone: f.altPhone || "",
        parent2: f.parent2 || "",
        smsOptIn: !!f.primaryPhoneSmsOptIn || !!f.altPhoneSmsOptIn,
        marketing: {
          howHeard: f.hearAbout || "",
          details: f.hearAboutDetails || "",
          benefits: f.benefits || [],
          area6to12mo: f.area6to12mo || "",
        },
      },
      student: {
        firstName: f.studentFirstName || "",
        lastName: f.studentLastName || "",
        birthdate: f.birthdate || "",
        age: derivedAge || f.age || "",
        waiver: {
          acknowledged: !!f.waiverAcknowledged,
          signed: !!f.waiverSigned,
          signedAt: f.waiverDate || "",
          signatureDataUrl: f.signatureDataUrl || "",
        },
      },
    };
  }

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent<HTMLButtonElement | HTMLFormElement>) {
    e.preventDefault();

    if (step === 1) {
      if (!form.waiverAcknowledged) {
        alert("Please acknowledge the Waiver / Release to continue.");
        return;
      }
      setStep(2);
      return;
    }

    setSubmitting(true);

    // Capture signature as data URL (required on page 2)
    let signatureDataUrl = "";
    try {
      if (sigRef.current && !sigRef.current.isEmpty()) {
        signatureDataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      }
    } catch {
      // ignore
    }

    if (!signatureDataUrl) {
      alert("Please sign to acknowledge the studio policies.");
      setSubmitting(false);
      return;
    }

    const payload = { ...form, age: derivedAge, signatureDataUrl, waiverSigned: true };

    const ghlPayload = buildGhlPayload(payload);
    const akadaPayload = buildAkadaPayload(payload);

    const AKADA_ENABLED = false; // No create/update endpoints available yet

    try {
      const promises: Promise<Response>[] = [
        fetch("/api/ghl/new-student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ghlPayload),
        }),
      ];

      if (AKADA_ENABLED) {
        promises.push(
          fetch("/api/akada/new-student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(akadaPayload),
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const errors: string[] = [];
      // GHL
      if (results[0].status === "rejected" || (results[0].status === "fulfilled" && !results[0].value.ok)) {
        errors.push("GHL");
      }

      if (AKADA_ENABLED) {
        const r = results[1];
        if (r && (r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok))) errors.push("AKADA");
      }

      if (errors.length) {
        alert(`Submitted, but there was a problem sending to: ${errors.join(", ")}. Please notify the office.`);
      } else {
        setSubmitted(true);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
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

  const usStates = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
  ] as const;

const hearDetailMeta: Record<string, { label: string; placeholder: string; hint?: string }> = {
  Referral: { label: "Who referred you?", 
    placeholder: "Parent/Student name (optional details)" },
  "Show/demonstration": { label: "Where did you see us?", 
    placeholder: "Event or school name" },
  "Print advertisement": { label: "Which publication?", 
    placeholder: "Magazine/newspaper name" },
  Flier: { label: "Where did you find the flier?", placeholder: "Location" },
  "Internet Search": { label: "Search term or site", placeholder: "e.g., 'Elite Dance Nashville' or Google" },
  "Social Media": { label: "Which platform/account?", placeholder: "e.g., Instagram @elitedancetn" },
  Other: { label: "Please specify", placeholder: "Tell us more" },
};

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
                {/* Student */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Student</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="studentFirstName">First name *</Label>
                        <Input id="studentFirstName" required autoComplete="given-name" inputMode="text" value={form.studentFirstName || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("studentFirstName", e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="studentLastName">Last name *</Label>
                        <Input id="studentLastName" required autoComplete="family-name" inputMode="text" value={form.studentLastName || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("studentLastName", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="birthdate">Birthdate *</Label>
                        <Input id="birthdate" type="date" required value={form.birthdate || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("birthdate", e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="age">Age</Label>
                        <Input id="age" value={derivedAge || form.age || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("age", e.target.value)} inputMode="numeric" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Parents */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Parent / Guardian</h2>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label htmlFor="parent1">Parent/Guardian 1 (Account Name) *</Label>
                      <Input id="parent1" required autoComplete="name" value={form.parent1 || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("parent1", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="parent2">Parent/Guardian 2 (optional)</Label>
                      <Input id="parent2" autoComplete="name" value={form.parent2 || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("parent2", e.target.value)} />
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
          required
          placeholder="###-###-####"
          inputMode="tel"
          autoComplete="tel"
          value={form.primaryPhone || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("primaryPhone", e.target.value)}
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("altPhone", e.target.value)}
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
        required
        autoComplete="email"
        inputMode="email"
        value={form.email || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("email", e.target.value)}
      />
    </div>

    {/* Street */}
    <div className="grid grid-cols-1 gap-2">
      <Label htmlFor="street">Street address *</Label>
      <Input
        id="street"
        required
        autoComplete="address-line1"
        value={form.street || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("street", e.target.value)}
      />
    </div>

    {/* City / State / Zip */}
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label htmlFor="city">City *</Label>
        <Input
          id="city"
          required
          autoComplete="address-level2"
          value={form.city || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("city", e.target.value)}
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
          required
          inputMode="numeric"
          autoComplete="postal-code"
          value={form.zip || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("zip", e.target.value)}
        />
      </div>
    </div>
  </div>
</section>

                {/* How did you hear about us? */}
                <section className="space-y-3">
  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>
    How did you hear about us?
  </h2>
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
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setField("hearAboutDetails", e.target.value)
      }
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
                  <h2
  className="text-base font-semibold"
  style={{ color: "#EC4899" }}
>
  What benefits were you hoping for{" "}
  <span className="font-normal">(check all that apply)</span>?
</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {benefitsOptions.map((label) => {
                      const checked = (form.benefits || []).includes(label);
                      return (
                        <label key={label} className="flex items-center gap-3">
                          <Checkbox checked={checked} onCheckedChange={(v) => {
                            const current = new Set(form.benefits || []);
                            if (v) current.add(label);
                            else current.delete(label);
                            setField("benefits", Array.from(current));
                          }} />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                    <div className="grid grid-cols-1 gap-2">
                      <Label htmlFor="benefitsOther">Other</Label>
                      <Input id="benefitsOther" value={form.benefitsOther || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("benefitsOther", e.target.value)} />
                    </div>
                  </div>
                </section>

                {/* Waiver acknowledgment */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Waiver / Release of Liability</h2>
                  <Textarea readOnly className="h-40 text-[13px] leading-snug" value={`The practice of dance involves the risk of physical injury (with bruises being the most likely injury and broken bones or other more serious physical injuries also being possible.) Understanding this I declare:

That I am willing to accept responsibility for such an eventuality, and;

That I have adequate medical insurance for such an eventuality, and;

That I will not hold any club, member, instructor, or the owners or operators of any facility in which I might practice liable for any injury that I might sustain while practicing dance.

Further, I understand the physical demand of this activity and the practice required for its development and mastery. As a consideration for my own safety and enjoyment, as well as that of other students, I commit to dedicate necessary practice of the instructions and techniques given to me in class.`} />
                  <label className="flex items-center gap-3">
                    <Checkbox required checked={!!form.waiverAcknowledged} onCheckedChange={(v) => setField("waiverAcknowledged", Boolean(v))} />
                    <span>I have read and acknowledge the Waiver / Release above.</span>
                  </label>
                  <p className="text-xs text-neutral-500">
                    By continuing, you also agree to our {" "}
                    <a href="/privacy-policy" className="underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    {" "}and{" "}
                    <a href="/terms" className="underline" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>.
                  </p>
                </section>
              </>
            )}

            {step === 2 && (
              <>
                {/* Policies loaded from server document */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Studio Policies</h2>
                  <Textarea readOnly className="h-72 text-[13px] leading-snug" value={policies} />
                </section>

                {/* Signature at bottom of policies page */}
                <section className="space-y-3">
                  <h2 className="text-base font-semibold" style={{ color: "#EC4899" }}>Signature</h2>
                  <div className="space-y-2">
                    <Label>Signature (Student or Parent/Guardian) *</Label>
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#8B5CF6" }}>
                      <SignatureCanvasAny
                        ref={sigRef}
                        penColor="#111827"
                        canvasProps={{ width: 740, height: 180, className: "w-full h-[180px] bg-white" }}
                        onEnd={() => setField("waiverSigned", true)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 ml-auto items-center">
                      <div>
                        <Label htmlFor="waiverDate">Date *</Label>
                        <Input id="waiverDate" type="date" required value={form.waiverDate || new Date().toISOString().slice(0, 10)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setField("waiverDate", e.target.value)} />
                      </div>
                      <div className="flex items-end justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => { (sigRef.current as any)?.clear(); setField("waiverSigned", false); }}>Clear</Button>
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
              <Button onClick={() => { setSubmitted(false); setForm({}); try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }} variant="outline">Start another child</Button>
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
