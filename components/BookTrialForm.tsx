// /components/BookTrialForm.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

const steps = ["Quick Capture", "Details", "Review"];
const AGE_CLASSES = [
  { label: "Mini Movers", min: 3, max: 6 },
  { label: "Pre-Ballet", min: 3, max: 5 },
  { label: "Combo Pre (Ballet/Tap)", min: 5, max: 6 },
  { label: "Hip Hop Kids", min: 5, max: 6 },
  { label: "Acro Tots", min: 4, max: 6 },
];
const STYLES_7_PLUS = ["Ballet","Tap","Jazz/Lyrical","Hip Hop","Contemporary","Acro","Musical Theatre"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat"];

type ClassItem = { id: string; name: string; ageMin?: number; ageMax?: number; day?: string; time?: string };

type Data = {
  // quick capture
  parentFirst: string; parentLast: string; email: string; phone: string; smsConsent: boolean;
  dancerFirst: string; age: string;

  // details
  classOptionsU7: string[];
  experienceYears: "" | "0" | "1–2" | "3+";
  stylePreference: string[];
  wantsRecs: boolean; wantsTeam: boolean;
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
  const [data, setData] = useState<Data>({
    parentFirst:"", parentLast:"", email:"", phone:"", smsConsent:false,
    dancerFirst:"", age:"",
    classOptionsU7:[], experienceYears:"", stylePreference:[],
    wantsRecs:true, wantsTeam:false, preferDays:[],
    selectedClassId:"", notes:"", hasQuestions:false
  });

  const ageNum = Number(data.age || 0);
  const isU7 = ageNum > 0 && ageNum < 7;

  const recommendedU7 = useMemo(
    () => AGE_CLASSES.filter(c => ageNum >= c.min && ageNum <= c.max).map(c => c.label),
    [ageNum]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/elite/classes", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          setClasses(j.classes || []);
        }
      } catch {}
    })();
  }, []);

  const chip = (active:boolean) =>
    `px-3 py-2 rounded-2xl border ${active ? "bg-dance-blue text-white border-dance-blue" : "border-gray-300"}`;
  const btn = "inline-flex items-center px-5 py-3 rounded-2xl font-medium bg-dance-pink text-white hover:opacity-90";

  // In /components/BookTrialForm.tsx
const quickCapture = async () => {
  setBusy(true); setMsg(null);
  try {
    const phone = data.phone.replace(/[^\d+]/g, "");
    const res = await fetch("/api/elite/quick-capture", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        parentFirst: data.parentFirst,
        parentLast: data.parentLast,
        email: data.email,
        phone,
        smsConsent: data.smsConsent,
        dancerFirst: data.dancerFirst,
        age: data.age,
        page: typeof window !== "undefined" ? window.location.pathname : "",
        utm: {
          source: (window as any).utm_source || "",
          medium: (window as any).utm_medium || "",
          campaign: (window as any).utm_campaign || ""
        }
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const j = await res.json();
    setData(d => ({ ...d, contactId: j.contactId }));
    setStep(1);
  } catch (e:any) {
    console.error(e);
    setMsg(e?.message || "Couldn’t save. Please try again.");
  } finally {
    setBusy(false);
  }
};
  const finalize = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/elite/lead-complete", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ ...data })
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Thanks! We’ll text/email you with next steps for your free trial.");
    } catch (e:any) {
      setMsg(e.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl shadow">
      <h2 className="text-2xl font-bold mb-1">Book Your Free Trial</h2>
      <p className="text-gray-600 mb-6">We’ll match you to the perfect class in seconds.</p>

      <div className="flex gap-2 mb-6">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-dance-pink" : "bg-gray-200"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input className="border rounded-xl p-3" placeholder="Parent First Name *"
              value={data.parentFirst} onChange={e=>setData({...data,parentFirst:e.target.value})}/>
            <input className="border rounded-xl p-3" placeholder="Parent Last Name *"
              value={data.parentLast} onChange={e=>setData({...data,parentLast:e.target.value})}/>
          </div>
          <input className="border rounded-xl p-3" placeholder="Email *" type="email"
            value={data.email} onChange={e=>setData({...data,email:e.target.value})}/>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="border rounded-xl p-3" placeholder="Mobile (for scheduling text) *"
              value={data.phone} onChange={e=>setData({...data,phone:e.target.value})}/>
            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" checked={data.smsConsent}
                onChange={e=>setData({...data,smsConsent:e.target.checked})}/>
              <span>I agree to receive SMS from Elite Dance & Music. Msg/data rates may apply. Reply STOP to opt out.</span>
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="border rounded-xl p-3" placeholder="Dancer First Name *"
              value={data.dancerFirst} onChange={e=>setData({...data,dancerFirst:e.target.value})}/>
            <input className="border rounded-xl p-3" placeholder="Age *" inputMode="numeric"
              value={data.age} onChange={e=>setData({...data,age:e.target.value.replace(/\D/g,"")})}/>
          </div>
          <button
            disabled={busy || !data.parentFirst || !data.parentLast || !data.email || !data.phone || !data.smsConsent || !data.dancerFirst || !data.age}
            onClick={quickCapture} className={btn}>
            {busy ? "Saving..." : "Continue"}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          {isU7 ? (
            <>
              <div>
                <p className="mb-2 text-gray-700">Recommended classes for age {data.age}:</p>
                <div className="flex flex-wrap gap-2">
                  {recommendedU7.map(opt => {
                    const active = data.classOptionsU7.includes(opt);
                    return (
                      <button key={opt} type="button" className={chip(active)}
                        onClick={() => setData(d => ({...d,
                          classOptionsU7: active ? d.classOptionsU7.filter(o=>o!==opt) : [...d.classOptionsU7,opt]
                        }))}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={data.wantsRecs}
                  onChange={e=>setData({...data,wantsRecs:e.target.checked})}/>
                <span>Would you like recommendations from our team?</span>
              </div>
            </>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <select className="border rounded-xl p-3" value={data.experienceYears}
                        onChange={e=>setData({...data,experienceYears:e.target.value as any})}>
                  <option value="">Years of experience</option>
                  <option value="0">0</option><option>1–2</option><option>3+</option>
                </select>
                <div>
                  <p className="mb-2 text-gray-700">Style preference</p>
                  <div className="flex flex-wrap gap-2">
                    {STYLES_7_PLUS.map(s=>{
                      const active = data.stylePreference.includes(s);
                      return (
                        <button key={s} type="button" className={chip(active)}
                          onClick={()=>setData(d=>({...d, stylePreference: active ? d.stylePreference.filter(x=>x!==s) : [...d.stylePreference,s]}))}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={data.wantsTeam}
                  onChange={e=>setData({...data,wantsTeam:e.target.checked})}/>
                <span>Interested in Dance Team?</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={data.wantsRecs}
                  onChange={e=>setData({...data,wantsRecs:e.target.checked})}/>
                <span>Would you like recommendations from our team?</span>
              </div>
            </>
          )}

          <div>
            <p className="mb-2 text-gray-700">Preferred days</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d=>{
                const active = data.preferDays.includes(d);
                return (
                  <button key={d} className={chip(active)} type="button"
                    onClick={()=>setData(x=>({...x, preferDays: active ? x.preferDays.filter(v=>v!==d) : [...x.preferDays,d]}))}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-gray-700">Select a class you’d like to try</label>
            <select className="border rounded-xl p-3" value={data.selectedClassId}
                    onChange={e=>setData({...data,selectedClassId:e.target.value})}>
              <option value="">Choose a class (optional)</option>
              {classes
                .filter(c => !ageNum || !c.ageMin || !c.ageMax || (ageNum >= (c.ageMin || 0) && ageNum <= (c.ageMax || 99)))
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.day && c.time ? ` — ${c.day} ${c.time}` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid gap-3">
            <textarea className="border rounded-xl p-3" placeholder="Anything we should know?"
              value={data.notes} onChange={e=>setData({...data,notes:e.target.value})}/>
            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input type="checkbox" checked={data.hasQuestions}
                     onChange={e=>setData({...data,hasQuestions:e.target.checked})}/>
              <span>I have more questions (please have the front desk reach out)</span>
            </label>
          </div>

          <div className="flex justify-between">
            <button onClick={()=>setStep(0)} className="text-gray-600">Back</button>
            <button onClick={()=>setStep(2)} className={btn}>Review</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-2xl text-sm text-gray-700">
            <p><strong>Parent:</strong> {data.parentFirst} {data.parentLast} • {data.email} • {data.phone}</p>
            <p><strong>Dancer:</strong> {data.dancerFirst} • Age {data.age}</p>
            {isU7 ? (
              <p><strong>Under-7 Classes:</strong> {data.classOptionsU7.join(", ") || "—"}</p>
            ) : (
              <>
                <p><strong>Experience:</strong> {data.experienceYears || "—"}</p>
                <p><strong>Styles:</strong> {data.stylePreference.join(", ") || "—"}</p>
                <p><strong>Dance Team:</strong> {data.wantsTeam ? "Yes" : "No"}</p>
              </>
            )}
            <p><strong>Preferred Days:</strong> {data.preferDays.join(", ") || "—"}</p>
            <p><strong>Selected Class:</strong> {classes.find(c=>c.id===data.selectedClassId)?.name || "—"}</p>
            <p><strong>Wants Recs:</strong> {data.wantsRecs ? "Yes" : "No"}</p>
            <p><strong>Has Questions:</strong> {data.hasQuestions ? "Yes" : "No"}</p>
            <p><strong>Notes:</strong> {data.notes || "—"}</p>
          </div>
          <div className="flex justify-between">
            <button onClick={()=>setStep(1)} className="text-gray-600">Back</button>
            <button disabled={busy} onClick={finalize} className={btn}>
              {busy ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}