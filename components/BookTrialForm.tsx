// /components/BookTrialForm.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type ClassItem = { id: string; name: string; level?: number; day?: string; time?: string; ageMin?: number; ageMax?: number };

const AGE_CLASSES_UNDER7 = [
  { id: "tumbling_tots", name: "Tumbling Tots (3–4)", level: 0 },
  { id: "peewee_combo", name: "PeeWee Combo (5–6)", level: 0 },
]; // placeholder list; your /api/elite/classes can override

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
};
type Step2Data = {
  suggested: ClassItem[];     // rendered options
  selectedClassId: string;    // chosen trial class
  decision: "" | "trial" | "inquiry";
  // If "trial" (Yes)
  parentPhone: string;
  smsConsent: boolean;
  dancerLast?: string;
  // Notes for both
  notes: string;
};
type Data = {
  // quick capture
  parentFirst: string;
  parentLast: string;
  email: string;
  phone: string;
  smsConsent: boolean;
  dancerFirst: string;
  age: string;

  // details
  classOptionsU7: string[];
  /** Use regular hyphens here to match the rest of your code */
  experienceYears: "" | "0" | "1-2" | "3-4" | "5+";
  stylePreference: string[];
  wantsRecs: boolean;
  wantsTeam: boolean;
  preferDays: string[];
  selectedClassId: string;
  notes: string;
  hasQuestions: boolean;

  // internal
  contactId?: string;
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
  });

  const [s2, setS2] = useState<Step2Data>({
    suggested: [],
    selectedClassId: "",
    decision: "",
    parentPhone: "",
    smsConsent: false,
    dancerLast: "",
    notes: "",
  });

  const ageNum = Number(s1.dancerAge || 0);
  const isUnder7 = ageNum > 0 && ageNum < 7;

  const [data, setData] = useState<Data>({
    parentFirst:"", parentLast:"", email:"", phone:"", smsConsent:false,
    dancerFirst:"", age:"",
    classOptionsU7:[], experienceYears:"", stylePreference:[],
    wantsRecs:true, wantsTeam:false, preferDays:[],
    selectedClassId:"", notes:"", hasQuestions:false
  });

  // Load classes (placeholder-friendly: if API absent, keep fallback for U7)
  // inside BookTrialForm.tsx
useEffect(() => {
  // only fetch when we have enough to filter
  const a = Number(data.age || 0);
  if (!a) return;

  const exp = data.experienceYears || (a < 7 ? "" : "1-2"); // default for 7+ if blank
  const q = new URLSearchParams();
  q.set("age", String(a));
  if (exp) q.set("experience", exp);

  (async () => {
    try {
      const res = await fetch(`/api/elite/classes?${q.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setClasses(j.classes || []);
      } else {
        console.warn("classes fetch failed", await res.text());
      }
    } catch (e) {
      console.warn(e);
    }
  })();
  // re-run when age/experience changes
}, [s1.dancerAge, s1.experience]);

  // Build suggestions when going to Step 2
  const buildSuggestions = (): ClassItem[] => {
    if (isUnder7) {
      // Under 7 → show Tumbling / PeeWee (placeholder or filter from API)
      const apiUnder7 = classes.filter(
        c =>
          (c.ageMin && c.ageMax ? ageNum >= (c.ageMin ?? 0) && ageNum <= (c.ageMax ?? 99) : true) &&
          /tumble|acro|peewee|mini|pre/i.test(c.name)
      );
      return apiUnder7.length ? apiUnder7 : AGE_CLASSES_UNDER7;
    }
    // 7+ route by experience
    let targetLevel = 1;
    if (s1.experience === "0" || s1.experience === "1-2") targetLevel = 1;
    else if (s1.experience === "3-4") targetLevel = 2; // 2/3 bucket
    else if (s1.experience === "5+") targetLevel = 4;

    // Heuristic: look for "Level X" in class name, else fall back to a simple filter
    const api7 = classes.filter(c => {
      if (/level\s*1/i.test(c.name) && targetLevel === 1) return true;
      if (/level\s*(2|3)/i.test(c.name) && targetLevel === 2) return true;
      if (/level\s*4/i.test(c.name) && targetLevel === 4) return true;
      // fallback by inferred level property if present
      if (typeof c.level === "number") {
        if (targetLevel === 1 && c.level === 1) return true;
        if (targetLevel === 2 && (c.level === 2 || c.level === 3)) return true;
        if (targetLevel === 4 && c.level >= 4) return true;
      }
      return false;
    });

    // If nothing matched, return a top slice of classes so page isn’t empty.
    return api7.length ? api7 : classes.slice(0, 5);
  };

  // Replace your current toStep2 with this:
const toStep2 = async () => {
  setMsg(null);
  // just build suggestions and go to step 2; no GHL calls here
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
          // summary
          parentFirst: s1.parentFirst,
          parentLast: s1.parentLast,
          email: s1.email,
          // trial details (when applicable)
          parentPhone: s2.parentPhone,
          smsConsent: s2.smsConsent,
          dancerFirst: s1.dancerFirst,
          dancerLast: s2.dancerLast || "",
          age: s1.dancerAge,
          experience: s1.experience,
          selectedClassId: s2.selectedClassId || "",
          notes: s2.notes || "",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg(
        s2.decision === "trial"
          ? "Awesome! We’ve sent your trial request to our front desk. Watch for a confirmation."
          : "Thanks! We’ve sent your question to our front desk and will follow up shortly."
      );
      // soft reset decision button visibility
    } catch (e: any) {
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
              onClick={toStep2}
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
            <div className="grid gap-2">
              <select
  className="border rounded-xl p-3"
  value={s2.selectedClassId}
  onChange={e => setS2(prev => ({ ...prev, selectedClassId: e.target.value }))}
>
  <option value="">Choose a class (optional)</option>
  {classes.map(c => (
    <option key={c.id} value={c.id}>
      {c.name} {c.level ? `(${c.level})` : ""} {c.day && c.time ? `— ${c.day} ${c.time}` : ""}
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

            {/* If "Yes", collect last name + phone + sms consent */}
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
                (s2.decision === "trial" &&
                  (!s2.parentPhone || !s2.smsConsent))
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