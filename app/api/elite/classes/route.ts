// /app/api/elite/classes/route.ts
import { NextResponse, NextRequest } from "next/server";

export const runtime = "nodejs";

const AKADA_API = "https://app.akadadance.com/api/v3/studio";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const AKADA_API_KEY   = need("AKADA_API_KEY");
const AKADA_AUTH_TOKEN = need("AKADA_AUTH_TOKEN"); // the user-token you received
// Optional: pin to a session
const AKADA_SESSION_ID = process.env.AKADA_SESSION_ID || ""; // leave empty to let Akada use default session

/** Map Akada levelDescription to a numeric-ish rank for simple filtering */
function levelRank(levelDesc?: string | null): number {
  const s = (levelDesc || "").toUpperCase().trim();
  // common variants we saw in your payload:
  if (s.includes("1/2")) return 1.5;
  if (s === "I" || s === "1" || s === "K-1") return 1;
  if (s === "II" || s === "2") return 2;
  if (s === "III" || s === "3") return 3;
  if (s.includes("4")) return 4; // if you end up with 4+
  // buckets we don't want to throw away; treat as mid unless clearly for tiny dancers
  if (s === "N/A" || s === "FLX" || s === "ALL" || s === "SOL" || s === "PW" || s === "PRE") return 2;
  if (s === "2YR" || s === "3-4" || s === "4-5" || s === "MM") return 0.5; // preschool-ish
  return 2;
}

function firstDayString(c: any): string {
  const map: [keyof any, string][] = [
    ["monday", "Mon"],
    ["tuesday", "Tue"],
    ["wednesday", "Wed"],
    ["thursday", "Thu"],
    ["friday", "Fri"],
    ["saturday", "Sat"],
    ["sunday", "Sun"],
  ];
  const found = map.find(([k]) => !!c[k]);
  return found?.[1] || "";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ageParam = searchParams.get("age");
    const expParam = searchParams.get("experience"); // "0", "1-2", "3-4", "5+"
    const sessionId = searchParams.get("sessionId") || AKADA_SESSION_ID;

    const url = new URL(`${AKADA_API}/classes`);
    if (sessionId) url.searchParams.set("sessionId", String(sessionId));

    const res = await fetch(url.toString(), {
      headers: {
        "AkadaApiKey": AKADA_API_KEY,
        "Authorization": `Bearer ${AKADA_AUTH_TOKEN}`,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Akada classes ${res.status}: ${txt}`);
    }

    const j = await res.json();

    const raw: any[] = j?.returnValue?.currentPageItems || [];
    const normalized = raw.map((c) => {
      const day = firstDayString(c);
      const time = `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;
      return {
        id: String(c.id),
        name: String(c.description || "").trim(),
        level: String(c.levelDescription || "").trim(), // e.g. "I", "II", "III", "1/2", "PW", "MM"
        type: String(c.typeDescription || "").trim(),   // e.g. "BALLET", "TUMBLING", "MM"
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        day,
        time,
        // keep these in case you want to show/hide by enrollment later
        currentEnrollment: c.currentEnrollment,
        maxEnrollment: c.maxEnrollment,
      };
    });

    // Optional server-side filtering based on age/experience
    let filtered = normalized;
    const age = ageParam ? Number(ageParam) : NaN;

    // --- Age filter: within lowerAgeLimit and no more than 2 years above it, capped by upperAgeLimit
if (!Number.isNaN(age)) {
  filtered = filtered.filter((c) => {
    const lower = Number.isFinite(c.ageMin!) ? (c.ageMin as number) : 0;
    const upper = Number.isFinite(c.ageMax!) ? (c.ageMax as number) : 99;
    const cap   = Math.min(upper, lower + 2); // <= 2 years above lower, but never past upper
    return age >= lower && age <= cap;
  });
}

    if (expParam) {
      // Your rule:
      //  - "0" or "1-2" -> level 1-ish
      //  - "3-4" -> level 2/3
      //  - "5+" -> level 4+
      const want = (() => {
        if (expParam === "0" || expParam === "1-2") return { min: 0, max: 1.6 };
        if (expParam === "3-4") return { min: 1.6, max: 3.6 };
        return { min: 3.6, max: 99 }; // "5+" or anything else -> advanced
      })();

      filtered = filtered.filter((c) => {
        const r = levelRank(c.level);
        return r >= want.min && r < want.max;
      });
    }

    // Keep only classes that have a day/time (optional UX polish)
    filtered = filtered.filter(c => c.day || c.time.trim() !== "-");

    return NextResponse.json({ classes: filtered });
  } catch (err: any) {
    console.error("classes API error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}