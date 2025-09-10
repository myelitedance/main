// /components/BookTrialForm.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type ClassItem = {
  id: string;
  name: string;
  level?: string; // normalized text from Akada, e.g. "I", "II", "1/2"
  type?: string;
  ageMin?: number;
  ageMax?: number;
  day?: string;
  time?: string;
  currentEnrollment?: number;
  maxEnrollment?: number;
};

const styles = {
  chip: (on: boolean) =>
    `px-3 py-2 rounded-2xl border ${on ? "bg-dance-blue text-white border-dance-blue" : "border-gray-300"}`,
  btn: "inline-flex items-center px-5 py-3 rounded-2xl font-medium bg-dance-pink text-white hover:opacity-90",
  btnGhost: "inline-flex items-center px-4 py-2 rounded-xl font-medium text-dance-purple hover:underline",
  bar: (active: number, i: number) => `h-2 flex-1 rounded-full ${i <= active ? "bg-dance-pink" : "bg-gray-200"}`,
};

type Step1Data = {
  parentFirst: string;
  parentLast: string;
  email: string;
  dancerFirst: string;
  dancerAge: string; // numeric text
  experience: "" | "0" | "1-2" | "3-4" | "5+";
  wantsTeam: boolean;
};

type Step2Data = {
  suggested: ClassItem[];
  selectedClassId: string;
  selectedClassName?: string;
  decision: "" | "trial" | "inquiry";
  parentPhone: string;
  smsConsent: boolean;
  dancerLast?: string;
  notes: string;
};
type BookTrialFormProps = {
  onClose?: () => void; // <-- add this
};
export default function BookTrialForm() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [contactId, setContactId] = useState<string | undefined>(undefined);

  const [s1, setS1] = useState<Step1Data>({
    parentFirst: "",
    parentLast: "",
    email: "",
    dancerFirst: "",
    dancerAge: "",
    experience: "",
    wantsTeam: false,
  });

  const [s2, setS2] = useState<Step2Data>({
    suggested: [],
    selectedClassId: "",
    decision: "",
    parentPhone: "",
    smsConsent: true,
    dancerLast: "",
    notes: "",
  });

  // --- validation helpers ---
const emailOk = (e: string) => /\S+@\S+\.\S+/.test(e);
const phoneOk = (p: string) => {
  const digits = (p || "").replace(/[^\d]/g, "");
  return digits.length >= 10 && digits.length <= 15;
};
const req = (s: string) => s.trim().length > 0;

// --- show-error flags ---
const [attemptedNext, setAttemptedNext] = useState(false);
const [attemptedSubmit, setAttemptedSubmit] = useState(false);
const handleNext = () => {
  setAttemptedNext(true);
  const ageNum = Number(s1.dancerAge);
  const valid =
    req(s1.parentFirst) &&
    req(s1.parentLast) &&
    emailOk(s1.email) &&
    req(s1.dancerFirst) &&
    !Number.isNaN(ageNum) &&
    req(s1.experience);

  if (!valid) return; // show errors; don't advance
  toStep2();          // your existing function
};
  const ageNum = Number(s1.dancerAge || 0);
  const isUnder7 = ageNum > 0 && ageNum < 7;
const abandoned = async () => {
    if (!s1.email || !s1.parentFirst || !s1.parentLast) return;
    try {
      await fetch("/api/elite/abandon-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true, // important for page close
        body: JSON.stringify({
          parentFirst: s1.parentFirst,
          parentLast: s1.parentLast,
          email: s1.email,
          parentPhone: s2.parentPhone || "",
          dancerFirst: s1.dancerFirst || "",
          age: s1.dancerAge || "",
        }),
      });
    } catch {}
  };
  
  // --- DEBUG: set to true to also show a small summary in the UI
  const DEBUG = false;

  // Fetch classes whenever age/experience change (and we have a valid age)
  useEffect(() => {
    const a = Number(s1.dancerAge || 0);
    if (!a) {
      setClasses([]);
      return;
    }

    // default experience for 7+ if blank
    const exp = s1.experience || (a < 7 ? "" : "1-2");
    const q = new URLSearchParams();
    q.set("age", String(a));
    if (exp) q.set("experience", exp);

    const url = `/api/elite/classes?${q.toString()}${DEBUG ? "&debug=1" : ""}`;
    console.log("[Classes] Request URL:", url);

    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        console.log("[Classes] HTTP", res.status, res.statusText);
        const j = await res.json().catch(() => ({}));
        console.log("[Classes] JSON:", j);

        if (!res.ok || j.error) {
          console.warn("[Classes] Failed:", j.error || res.status);
          setClasses([]);
          setMsg(typeof j.error === "string" ? j.error : "Unable to load classes.");
          return;
        }

        setClasses(Array.isArray(j.classes) ? j.classes : []);
      } catch (err) {
        console.warn("[Classes] Fetch error:", err);
        setClasses([]);
        setMsg("Unable to load classes (network).");
      }
    })();
  }, [s1.dancerAge, s1.experience]);

  // Build suggestions (uses `classes` already filtered by the API)
  const buildSuggestions = (): ClassItem[] => {
    if (!classes.length) return [];
    if (isUnder7) {
      // For under-7 we already filtered by age; just surface relevant tumbling/peewee-ish items first
      const fav = classes.filter(c => /tumble|acro|peewee|mini|pre/i.test(c.name));
      return fav.length ? fav : classes.slice(0, 10);
    }
    // For 7+, classes are filtered by experience bucket server-side; just return top slice
    return classes.slice(0, 15);
  };

  const toStep2 = () => {
    setMsg(null);
    setS2(prev => ({ ...prev, suggested: buildSuggestions() }));
    setStep(1);
  };

  const submitFinal = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/elite/lead-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: s2.decision, // "trial" | "inquiry"
          contactId,
          // summary (make sure your lead-complete route expects these names)
          parentFirst: s1.parentFirst,
          parentLast: s1.parentLast,
          email: s1.email,

          parentPhone: s2.parentPhone,
          smsConsent: s2.smsConsent,
          dancerFirst: s1.dancerFirst,
          dancerLast: s2.dancerLast || "",
          age: s1.dancerAge,
          experience: s1.experience,
          selectedClassId: s2.selectedClassId || "",
          selectedClassName: s2.selectedClassName || "",
          notes: s2.notes || "",
          wantsTeam: s1.wantsTeam,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);

      console.log("[Lead Complete] OK:", text);
      setMsg(
        s2.decision === "trial"
          ? "Awesome! We’ve sent your trial request to our front desk. Watch for a confirmation."
          : "Thanks! We’ve sent your question to our front desk and will follow up shortly."
      );
    } catch (e: any) {
      console.error("[Lead Complete] Error:", e);
      setMsg(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // UI
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl shadow">
      <h2 className="text-2xl font-bold mb-1">Find the Perfect Class</h2>
      <p className="text-gray-600 mb-6">
        A few quick questions so we can match your dancer for their best first experience.
      </p>

      <div className="flex gap-2 mb-6">
        {[0, 1].map((i) => <div key={i} className={styles.bar(step, i)} />)}
      </div>

      {step === 0 && (
        <div className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              className="border rounded-xl p-3"
              placeholder="Parent First Name *"
              value={s1.parentFirst}
              onChange={(e) => setS1({ ...s1, parentFirst: e.target.value })}
            />
            <input
              className="border rounded-xl p-3"
              placeholder="Parent Last Name *"
              value={s1.parentLast}
              onChange={(e) => setS1({ ...s1, parentLast: e.target.value })}
            />
          </div>
          <input
            className="border rounded-xl p-3"
            placeholder="Email Address *"
            type="email"
            value={s1.email}
            onChange={(e) => setS1({ ...s1, email: e.target.value })}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <input
              className="border rounded-xl p-3"
              placeholder="Dancer First Name *"
              value={s1.dancerFirst}
              onChange={(e) => setS1({ ...s1, dancerFirst: e.target.value })}
            />
            <input
              className="border rounded-xl p-3"
              placeholder="Dancer Age *"
              inputMode="numeric"
              value={s1.dancerAge}
              onChange={(e) =>
                setS1({ ...s1, dancerAge: e.target.value.replace(/\D/g, "") })
              }
            />
          </div>

          <select
            className="border rounded-xl p-3"
            value={s1.experience}
            onChange={(e) =>
              setS1({ ...s1, experience: e.target.value as Step1Data["experience"] })
            }
          >
            <option value="">Years of Experience *</option>
            <option value="0">0</option>
            <option value="1-2">1–2</option>
            <option value="3-4">3–4</option>
            <option value="5+">5+</option>
          </select>
          {Number(s1.dancerAge || 0) >= 7 && (s1.experience === "3-4" || s1.experience === "5+") && (
  <label className="flex items-start gap-3 text-sm text-gray-700">
    <input
      type="checkbox"
      checked={s1.wantsTeam}
      onChange={(e) => setS1({ ...s1, wantsTeam: e.target.checked })}
    />
    <span>Interested in Dance Team?</span>
  </label>
)}

          <div className="flex justify-end">
            <button
              disabled={
                busy ||
                !s1.parentFirst ||
                !s1.parentLast ||
                !s1.email ||
                !s1.dancerFirst ||
                !s1.dancerAge ||
                !s1.experience
              }
              onClick={handleNext}
              className={styles.btn}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-gray-700">
              Great! Here are some class options based on age and experience.
            </p>

            {/* Small on-page debug summary */}
            {DEBUG && (
              <div className="text-xs text-gray-500 mb-2">
                Classes loaded: {classes.length}
                {classes.length > 0 && (
                  <> — e.g. {classes.slice(0, 3).map(c => c.name).join(", ")}{classes.length > 3 ? "…" : ""}</>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <select
  className="border rounded-xl p-3"
  value={s2.selectedClassId}
  onChange={(e) => {
    const id = e.target.value;
    const c = classes.find(x => x.id === id);
    setS2({ ...s2, selectedClassId: id, ...(c ? { selectedClassName: c.name } : {}) });
  }}
>
                <option value="">Choose a class (optional)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.level ? ` (${c.level})` : ""}
                    {c.day && c.time ? ` — ${c.day} ${c.time}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <p className="font-medium text-gray-800">
              Would you like to sign up for a free trial class today?
            </p>
            <div className="flex gap-3">
              <button
                className={styles.chip(s2.decision === "trial")}
                onClick={() => setS2((d) => ({ ...d, decision: "trial" }))}
                type="button"
              >
                Yes
              </button>
              <button
                className={styles.chip(s2.decision === "inquiry")}
                onClick={() => setS2((d) => ({ ...d, decision: "inquiry" }))}
                type="button"
              >
                I need more information first
              </button>
            </div>

            {s2.decision === "trial" && (
              <div className="grid gap-3 pt-2">
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    className="border rounded-xl p-3"
                    placeholder="Dancer Last Name (optional)"
                    value={s2.dancerLast}
                    onChange={(e) => setS2({ ...s2, dancerLast: e.target.value })}
                  />
                  <input
                    className="border rounded-xl p-3"
                    placeholder="Parent Mobile (for scheduling text) *"
                    value={s2.parentPhone}
                    onChange={(e) => setS2({ ...s2, parentPhone: e.target.value })}
                  />
                </div>
                <label className="flex items-start gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={s2.smsConsent}
                    onChange={(e) => setS2({ ...s2, smsConsent: e.target.checked })}
                  />
                  <span>
                    I agree to receive SMS from Elite Dance &amp; Music. Msg/data rates may
                    apply. Reply STOP to opt out.
                  </span>
                </label>
              </div>
            )}
          </div>

          <textarea
            className="border rounded-xl p-3 w-full"
            placeholder="Anything we should know?"
            value={s2.notes}
            onChange={(e) => setS2({ ...s2, notes: e.target.value })}
          />

          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className={styles.btnGhost}>
              Back
            </button>
            <button
              disabled={
                busy ||
                !s2.decision ||
                (s2.decision === "trial" && (!s2.parentPhone || !s2.smsConsent))
              }
              onClick={submitFinal}
              className={styles.btn}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}