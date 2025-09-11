// /components/BookTrialForm.tsx
"use client";
import { useEffect, useState } from "react";

// Types
type ClassItem = {
  id: string;
  name: string;
  day?: string;
  time?: string;
  ageMin?: number;
  ageMax?: number;
  level?: string;
  sunday?: boolean;
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
  decision: "" | "trial" | "inquiry";
  parentPhone: string;
  smsConsent: boolean;
  dancerLast?: string;
  notes: string;

  selectedClassIds: string[];
  selectedClassLabels: string[]; // "Name — Day Time"
};

type BookTrialFormProps = {
  onClose?: () => void;
};

// Styles
const styles = {
  chip: (on: boolean) =>
    `px-3 py-2 rounded-2xl border ${on ? "bg-dance-blue text-white border-dance-blue" : "border-gray-300"}`,
  btn: "inline-flex items-center px-5 py-3 rounded-2xl font-medium bg-dance-pink text-white hover:opacity-90",
  btnGhost: "inline-flex items-center px-4 py-2 rounded-xl font-medium text-dance-purple hover:underline",
  bar: (active: number, i: number) => `h-2 flex-1 rounded-full ${i <= active ? "bg-dance-pink" : "bg-gray-200"}`,
};

export default function BookTrialForm({ onClose }: BookTrialFormProps) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [contactId] = useState<string | undefined>(undefined);

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
    decision: "",
    parentPhone: "",
    smsConsent: false,
    dancerLast: "",
    notes: "",
    selectedClassIds: [],
    selectedClassLabels: [],
  });

  // Helpers
  const emailOk = (e: string) => /\S+@\S+\.\S+/.test(e);
  const phoneOk = (p: string) => {
    const digits = (p || "").replace(/[^\d]/g, "");
    return digits.length >= 10 && digits.length <= 15;
  };
  const req = (s: string) => s.trim().length > 0;

  const [attemptedNext, setAttemptedNext] = useState(false);

  const ageNum = Number(s1.dancerAge || 0);
  const isUnder7 = ageNum > 0 && ageNum < 7;

  const formatClassLabel = (c: ClassItem) => {
    const when = [c.day, c.time].filter(Boolean).join(" ");
    return when ? `${c.name} — ${when}` : c.name;
  };

  const DEBUG = false;

  // Reset step-2 and fetch classes when age/experience change
  useEffect(() => {
    // Reset step-2 selections so we don't carry stale choices
    setS2((prev) => ({
      ...prev,
      selectedClassIds: [],
      selectedClassLabels: [],
      decision: "",
      parentPhone: "",
      smsConsent: true, // default checked on step 2
      notes: "",
    }));

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
    // console.log("[Classes] Request URL:", url);

    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || (j && j.error)) {
          setClasses([]);
          setMsg(typeof j.error === "string" ? j.error : "Unable to load classes.");
          return;
        }
        setClasses(Array.isArray(j.classes) ? j.classes : []);
      } catch {
        setClasses([]);
        setMsg("Unable to load classes (network).");
      }
    })();
  }, [s1.dancerAge, s1.experience]);

  // Build suggestions from already-filtered classes
  const buildSuggestions = (): ClassItem[] => {
    if (!classes.length) return [];
    if (isUnder7) {
      const fav = classes.filter((c) => /tumble|acro|peewee|mini|pre/i.test(c.name));
      return fav.length ? fav : classes.slice(0, 10);
    }
    return classes.slice(0, 15);
  };

  const toStep2 = () => {
    setMsg(null);
    setS2((prev) => ({ ...prev, suggested: buildSuggestions(), smsConsent: true }));
    setStep(1);
  };

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

    if (!valid) return;
    toStep2();
  };

  const submitFinal = async () => {
    setMsg(null);

    if (s2.decision === "trial") {
      if (!phoneOk(s2.parentPhone)) {
        setMsg("Please enter a valid mobile number (10–15 digits).");
        return;
      }
      if (!s2.smsConsent) {
        setMsg("Please agree to SMS so we can text scheduling details, or choose the inquiry option.");
        return;
      }
      if (s2.selectedClassIds.length === 0) {
        setMsg("Please select at least one class for your trial.");
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch("/api/elite/lead-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: s2.decision, // "trial" | "inquiry"
          contactId,
          parentFirst: s1.parentFirst,
          parentLast: s1.parentLast,
          email: s1.email,
          parentPhone: s2.parentPhone,
          smsConsent: s2.smsConsent,
          dancerFirst: s1.dancerFirst,
          dancerLast: s2.dancerLast || "",
          age: s1.dancerAge,
          experience: s1.experience,

          // arrays (IDs + friendly labels)
          selectedClassIds: s2.selectedClassIds,
          selectedClassLabels: s2.selectedClassLabels,

          wantsTeam: s1.wantsTeam,
          notes: s2.notes || "",
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);

      setMsg(
        s2.decision === "trial"
          ? "Awesome! We’ve sent your trial request to our front desk. Watch for a confirmation."
          : "Thanks! We’ve sent your question to our front desk and will follow up shortly."
      );
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl shadow">
      <h2 className="text-2xl font-bold mb-1">Find the Perfect Class</h2>
      <p className="text-gray-600 mb-6">
        A few quick questions so we can match your dancer for their best first experience.
      </p>

      <div className="flex gap-2 mb-6">
        {[0, 1].map((i) => (
          <div key={i} className={styles.bar(step, i)} />
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Parent First Name *"
                value={s1.parentFirst}
                onChange={(e) => setS1({ ...s1, parentFirst: e.target.value })}
              />
              {attemptedNext && !req(s1.parentFirst) && (
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
              {attemptedNext && !req(s1.parentLast) && (
                <p className="text-xs text-red-600 mt-1">Please enter a last name.</p>
              )}
            </div>
          </div>

          <div>
            <input
              className="border rounded-xl p-3 w-full"
              placeholder="Email Address *"
              type="email"
              value={s1.email}
              onChange={(e) => setS1({ ...s1, email: e.target.value })}
            />
            {attemptedNext && !emailOk(s1.email) && (
              <p className="text-xs text-red-600 mt-1">Please enter a valid email address.</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                className="border rounded-xl p-3 w-full"
                placeholder="Dancer First Name *"
                value={s1.dancerFirst}
                onChange={(e) => setS1({ ...s1, dancerFirst: e.target.value })}
              />
              {attemptedNext && !req(s1.dancerFirst) && (
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
              {attemptedNext && Number.isNaN(Number(s1.dancerAge)) && (
                <p className="text-xs text-red-600 mt-1">Please enter a valid age.</p>
              )}
            </div>
          </div>

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
            {attemptedNext && !req(s1.experience) && (
              <p className="text-xs text-red-600 mt-1">Please select experience.</p>
            )}
          </div>

          {Number(s1.dancerAge || 0) >= 7 && (s1.experience === "3-4" || s1.experience === "5+") && (
            <label className="flex items-center gap-3 text-lg font-medium text-gray-800">
              <input
                type="checkbox"
                className="w-6 h-6 accent-dance-pink"
                checked={s1.wantsTeam}
                onChange={(e) => setS1({ ...s1, wantsTeam: e.target.checked })}
              />
              <span>Are you interested in Dance Team?</span>
            </label>
          )}

          <div className="flex justify-end">
            <button
              disabled={busy}
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
            <p className="mb-2 text-gray-700">Great! Here are some class options based on age and experience.</p>

            {DEBUG && (
              <div className="text-xs text-gray-500 mb-2">
                Classes loaded: {classes.length}
                {classes.length > 0 && (
                  <>
                    {" "}
                    — e.g. {classes.slice(0, 3).map((c) => c.name).join(", ")}
                    {classes.length > 3 ? "…" : ""}
                  </>
                )}
              </div>
            )}

            <p className="text-sm text-gray-600">Pick any classes that look interesting (you can choose multiple):</p>

            <div className="space-y-2">
              {classes.map((c) => {
                const label = formatClassLabel(c);
                const checked = s2.selectedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                      checked ? "border-dance-pink bg-pink-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-dance-pink"
                      checked={checked}
                      onChange={(e) => {
                        setS2((prev) => {
                          const nextIds = new Set(prev.selectedClassIds);
                          const nextLabels = new Set(prev.selectedClassLabels);
                          if (e.target.checked) {
                            nextIds.add(c.id);
                            nextLabels.add(label);
                          } else {
                            nextIds.delete(c.id);
                            nextLabels.delete(label);
                          }
                          return {
                            ...prev,
                            selectedClassIds: Array.from(nextIds),
                            selectedClassLabels: Array.from(nextLabels),
                          };
                        });
                      }}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {(c.day || c.time) && <div className="text-sm text-gray-600">{[c.day, c.time].filter(Boolean).join(" ")}</div>}
                    </div>
                  </label>
                );
              })}
            </div>

            {s2.decision === "trial" && s2.selectedClassIds.length === 0 && (
              <p className="text-sm text-red-600 mt-2">Please select at least one class for your trial.</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <p className="font-medium text-gray-800">Would you like to sign up for a free trial class today?</p>
            <div className="flex gap-3">
              <button className={styles.chip(s2.decision === "trial")} onClick={() => setS2((d) => ({ ...d, decision: "trial" }))} type="button">
                Yes
              </button>
              <button className={styles.chip(s2.decision === "inquiry")} onClick={() => setS2((d) => ({ ...d, decision: "inquiry" }))} type="button">
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
                  <div>
                    <input
                      className="border rounded-xl p-3 w-full"
                      placeholder="Parent Mobile (for scheduling text) *"
                      value={s2.parentPhone}
                      onChange={(e) => setS2({ ...s2, parentPhone: e.target.value })}
                    />
                    {s2.decision === "trial" && s2.parentPhone && !phoneOk(s2.parentPhone) && (
                      <p className="text-xs text-red-600 mt-1">Please enter a valid mobile number (10–15 digits).</p>
                    )}
                  </div>
                </div>
                <label className="flex items-start gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={s2.smsConsent}
                    onChange={(e) => setS2({ ...s2, smsConsent: e.target.checked })}
                  />
                  <span>
                    I agree to receive SMS from Elite Dance &amp; Music. Msg/data rates may apply. Reply STOP to opt out.
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
            <button
              onClick={() => {
                setS2((prev) => ({
                  ...prev,
                  selectedClassIds: [],
                  selectedClassLabels: [],
                  decision: "",
                  parentPhone: "",
                  smsConsent: true,
                  notes: "",
                }));
                setStep(0);
              }}
              className={styles.btnGhost}
            >
              Back
            </button>
            <div className="flex gap-2">
              {onClose && (
                <button type="button" className={styles.btnGhost} onClick={onClose}>
                  Cancel
                </button>
              )}
              <button
                disabled={
                  busy ||
                  !s2.decision ||
                  (s2.decision === "trial" && (!s2.parentPhone || !s2.smsConsent || s2.selectedClassIds.length === 0))
                }
                onClick={submitFinal}
                className={styles.btn}
              >
                Submit
              </button>
            </div>
          </div>

          {msg && <p className="mt-4 text-sm">{msg}</p>}
        </div>
      )}

      {step === 0 && msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}