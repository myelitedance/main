// /app/api/elite/classes/route.ts
import { NextResponse, NextRequest } from "next/server";

export const runtime = "nodejs";

const AKADA_API = "https://app.akadadance.com/api/v3/studio";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const AKADA_API_KEY    = need("AKADA_API_KEY");
const AKADA_AUTH_TOKEN = need("AKADA_AUTH_TOKEN"); // Akada user-token

/** Map Akada levelDescription to a numeric-ish rank for optional experience filtering */
function levelRank(levelDesc?: string | null): number {
  const s = (levelDesc || "").toUpperCase().trim();
  if (s.includes("1/2")) return 1.5;
  if (s === "I" || s === "1" || s === "K-1") return 1;
  if (s === "II" || s === "2") return 2;
  if (s === "III" || s === "3") return 3;
  if (s.includes("4")) return 4;
  if (s === "2YR" || s === "3-4" || s === "4-5" || s === "MM" || s === "PW" || s === "PRE") return 0.5;
  return 2; // mid/default
}

function firstDayString(c: any): string {
  const map: [keyof any, string][] = [
    ["monday", "Mon"], ["tuesday", "Tue"], ["wednesday", "Wed"],
    ["thursday", "Thu"], ["friday", "Fri"], ["saturday", "Sat"], ["sunday", "Sun"],
  ];
  const found = map.find(([k]) => !!c[k]);
  return found?.[1] || "";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ageParam = searchParams.get("age");
    const expParam = searchParams.get("experience"); // optional: "0", "1-2", "3-4", "5+"

    const url = new URL(`${AKADA_API}/classes`);

    const res = await fetch(url.toString(), {
      headers: {
        AkadaApiKey: AKADA_API_KEY,
        Authorization: `Bearer ${AKADA_AUTH_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Akada classes ${res.status}: ${txt}`);
    }

    const j = await res.json();
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    // Normalize + carry through sunday + levelDescription
    const normalized = raw.map((c) => {
      const day = firstDayString(c);
      const time = `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;
      return {
        id: String(c.id),
        name: String(c.description || "").trim(),
        level: String(c.levelDescription || "").trim(), // keep raw for filtering
        type: String(c.typeDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        day,
        time,
        sunday: !!c.sunday, // keep raw boolean
        currentEnrollment: c.currentEnrollment,
        maxEnrollment: c.maxEnrollment,
      };
    });

    let filtered = normalized;

    // Age filter: within lowerAgeLimit..upperAgeLimit
    const age = ageParam ? Number(ageParam) : NaN;
    if (!Number.isNaN(age)) {
      filtered = filtered.filter((c) => {
        const lower = Number.isFinite(c.ageMin) ? c.ageMin : 0;
        const upper = Number.isFinite(c.ageMax) ? c.ageMax : 99;
        return age >= lower && age <= upper;
      });
    }

    // Exclude Sunday classes
    filtered = filtered.filter((c) => c.sunday !== true);

    // Exclude levelDescription === "N/A"
    filtered = filtered.filter((c) => (c.level || "").trim().toUpperCase() !== "N/A");

    /* (Optional) Experience buckets — keep if you still want it
    if (expParam) {
      const want = (() => {
        if (expParam === "0" || expParam === "1-2") return { min: 0, max: 1.6 };
        if (expParam === "3-4") return { min: 1.6, max: 3.6 };
        return { min: 3.6, max: 99 }; // "5+"
      })();
      filtered = filtered.filter((c) => {
        const r = levelRank(c.level);
        return r >= want.min && r < want.max;
      });
    }*/

    // Keep only classes that have a day/time (optional polish)
    filtered = filtered.filter((c) => c.day || c.time.trim() !== "-");

    return NextResponse.json({ classes: filtered });
  } catch (err: any) {
    console.error("classes API error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}