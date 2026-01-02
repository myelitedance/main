// /components/BookTrialForm.tsx
"use client";
import { useState } from "react";

type BookTrialFormProps = {
  onClose?: () => void;
};

// Step 1 fields (now includes phone + sms opt-in, unchecked by default)
type Step1Data = {
  parentFirst: string;
  parentLast: string;
  email: string;
  parentPhone: string;       // NEW: phone on step 1
  smsConsent: boolean;       // NEW: opt-in checkbox (unchecked by default)
  dancerFirst: string;
  dancerAge: string;         // numeric text
  experience: "" | "0" | "1-2" | "3-4" | "5+";
  wantsTeam: boolean;
  notes: string;             // optional free text
};

// ——— styles ———
const styles = {
  btn: "inline-flex items-center px-5 py-3 rounded-2xl font-medium bg-dance-pink text-white hover:opacity-90",
  btnGhost: "inline-flex items-center px-4 py-2 rounded-xl font-medium text-dance-purple hover:underline",
  bar: (active: number, i: number) => `h-2 flex-1 rounded-full ${i <= active ? "bg-dance-pink" : "bg-gray-200"}`,
};

// ——— validators ———
const emailOk = (e: string) => /\S+@\S+\.\S+/.test(e);
const phoneOk = (p: string) => {
  const digits = (p || "").replace(/[^\d]/g, "");
  return digits.length >= 10 && digits.length <= 15;
};
const req = (s: string) => s.trim().length > 0;

export default function BookTrialForm({ onClose }: BookTrialFormProps) {
  // Step 0 = form, Step 1 = thank you
  const [step, setStep] = useState<0 | 1>(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const AUTO_CLOSE_MS = 3000;

  // contactId not used here but preserved for payload compatibility
  const [contactId] = useState<string | undefined>(undefined);

  const [s1, setS1] = useState<Step1Data>({
    parentFirst: "",
    parentLast: "",
    email: "",
    parentPhone: "",
    smsConsent: false, // ← unchecked by default (requested)
    dancerFirst: "",
    dancerAge: "",
    experience: "",
    wantsTeam: false,
    notes: "",
  });

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // ——— submit handler ———
  const submit = async () => {
    setAttemptedSubmit(true);
    setMsg(null);

    const ageNum = Number(s1.dancerAge);
    const valid =
      req(s1.parentFirst) &&
      req(s1.parentLast) &&
      emailOk(s1.email) &&
      phoneOk(s1.parentPhone) &&
      req(s1.dancerFirst) &&
      !Number.isNaN(ageNum) &&
      req(s1.experience);

    if (!valid) {
      setMsg("Please fix the highlighted fields.");
      return;
    }

    // Build payload to match existing /api/elite/lead-complete expectations
    const payload = {
      action: "trial" as const,           // no lookup; always a trial request
      contactId,
      parentFirst: s1.parentFirst,
      parentLast: s1.parentLast,
      email: s1.email,
      parentPhone: s1.parentPhone,
      smsConsent: s1.smsConsent,          // unchecked allowed
      dancerFirst: s1.dancerFirst,
      dancerLast: "",                     // not collected now; keep empty for compatibility
      age: s1.dancerAge,
      experience: s1.experience,
      selectedClassIds: [] as string[],   // no class selection
      selectedClassLabels: [] as string[],// no class selection
      wantsTeam: s1.wantsTeam,
      notes:
        s1.notes?.trim()
          ? s1.notes.trim()
          : "Trial request via popup form (no class lookup).",
    };

    setBusy(true);
    try {
      const res = await fetch("/api/elite/lead-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Request failed");

      // FB pixel (if present)
      if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Lead");
      }

      setSubmitted(true);
      // Move to thank-you step
      setStep(1);

      // Auto-close (if a modal provided onClose)
      if (onClose) {
        setTimeout(() => {
          onClose();
          setSubmitted(false);
        }, AUTO_CLOSE_MS);
      }
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
  <div
    className="
      bg-white text-black px-6 py-5
      max-h-[calc(100dvh-3rem)] sm:max-h-[80vh]
      overflow-y-auto overscroll-contain
      pb-[max(1rem,env(safe-area-inset-bottom))]
      rounded-2xl
    "
    style={{
      WebkitOverflowScrolling: "touch", // iOS momentum scrolling
      touchAction: "pan-y",             // allow vertical touch scroll
    }}
    role="dialog"
    aria-label="Book Trial Form"
  >
      {/* Progress */}
      <div className="flex gap-2 mb-5">
        {[0, 1].map((i) => (
          <div key={i} className={styles.bar(step, i)} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Looking to book your trial class? <span className="text-dance-pink">GREAT!</span>
            </h2>
            <p className="text-gray-700">
              Let’s gather a little information about you and your dancer, and our front desk team will get you scheduled.
            </p>
          </div>

          {/* Parent name */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Parent First Name *"
                value={s1.parentFirst}
                onChange={(e) => setS1({ ...s1, parentFirst: e.target.value })}
              />
              {attemptedSubmit && !req(s1.parentFirst) && (
                <p className="text-xs text-red-600 mt-1">Please enter a first name.</p>
              )}
            </div>
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Parent Last Name *"
                value={s1.parentLast}
                onChange={(e) => setS1({ ...s1, parentLast: e.target.value })}
              />
              {attemptedSubmit && !req(s1.parentLast) && (
                <p className="text-xs text-red-600 mt-1">Please enter a last name.</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Email Address *"
                type="email"
                value={s1.email}
                onChange={(e) => setS1({ ...s1, email: e.target.value })}
              />
              {attemptedSubmit && !emailOk(s1.email) && (
                <p className="text-xs text-red-600 mt-1">Please enter a valid email address.</p>
              )}
            </div>
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Parent Mobile (for scheduling) *"
                inputMode="tel"
                pattern="[\d\s\-\(\)\+]{7,}"
                title="Please enter a valid phone number"
                value={s1.parentPhone}
                onChange={(e) => setS1({ ...s1, parentPhone: e.target.value })}
              />
              {attemptedSubmit && !phoneOk(s1.parentPhone) && (
                <p className="text-xs text-red-600 mt-1">Please enter a valid mobile number (10–15 digits).</p>
              )}
            </div>
          </div>
{/* SMS opt-in (unchecked by default) */}
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={s1.smsConsent}
              onChange={(e) => setS1({ ...s1, smsConsent: e.target.checked })}
            />
            <span>
              I agree to receive SMS from Elite Dance &amp; Music. Msg/data rates may apply. Reply STOP to opt out.
            </span>
          </label>
          {/* Dancer */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Dancer First Name *"
                value={s1.dancerFirst}
                onChange={(e) => setS1({ ...s1, dancerFirst: e.target.value })}
              />
              {attemptedSubmit && !req(s1.dancerFirst) && (
                <p className="text-xs text-red-600 mt-1">Please enter your dancer&apos;s name.</p>
              )}
            </div>
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Dancer Age *"
                inputMode="numeric"
                value={s1.dancerAge}
                onChange={(e) => setS1({ ...s1, dancerAge: e.target.value.replace(/\D/g, "") })}
              />
              {attemptedSubmit && Number.isNaN(Number(s1.dancerAge)) && (
                <p className="text-xs text-red-600 mt-1">Please enter a valid age.</p>
              )}
            </div>
          </div>

          {/* Experience + Team */}
          <div>
            <select
              className="border rounded-xl p-3 w-full"
              value={s1.experience}
              onChange={(e) => setS1({ ...s1, experience: e.target.value as Step1Data["experience"] })}
            >
              <option value="">Years of Experience *</option>
              <option value="0">0</option>
              <option value="1-2">1–2</option>
              <option value="3-4">3–4</option>
              <option value="5+">5+</option>
            </select>
            {attemptedSubmit && !req(s1.experience) && (
              <p className="text-xs text-red-600 mt-1">Please select experience.</p>
            )}
          </div>

          {Number(s1.dancerAge || 0) >= 7 && (s1.experience === "3-4" || s1.experience === "5+") && (
            <label className="flex items-center gap-3 text-gray-700">
              <input
                type="checkbox"
                className="w-6 h-6 accent-dance-pink"
                checked={s1.wantsTeam}
                onChange={(e) => setS1({ ...s1, wantsTeam: e.target.checked })}
              />
              <span>Interested in Dance Team?</span>
            </label>
          )}


          {/* Notes */}
          <textarea
            className="border rounded-xl p-3 w-full"
            placeholder="Are there any days that don't work for your trial?"
            value={s1.notes}
            onChange={(e) => setS1({ ...s1, notes: e.target.value })}
          />

          {/* Actions */}
          <div className="flex justify-between">
            <div />
            <div className="flex gap-2">
              {onClose && (
                <button type="button" className={styles.btnGhost} onClick={onClose}>
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={busy || submitted}
                onClick={submit}
                className={styles.btn}
              >
                {busy ? "Sending..." : "Submit"}
              </button>
            </div>
          </div>

          {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Thank you!</h2>
          <p className="text-gray-700">
            Our front desk staff will be reaching out to get the best fit for your child&apos;s trial class and finalize the
            scheduling.
          </p>
          {!onClose && (
            <button
              type="button"
              className={styles.btn}
              onClick={() => setStep(0)}
            >
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}