// /app/api/elite/classes/route.ts
import { NextResponse, NextRequest } from "next/server";

export const runtime = "nodejs";

const AKADA_API = "https://app.akadadance.com/api/v3/studio";

const AKADA_API_KEY    = process.env.AKADA_API_KEY || "";
const AKADA_AUTH_TOKEN = process.env.AKADA_AUTH_TOKEN || "";

/** Map Akada levelDescription to a numeric-ish rank for simple filtering */
function levelRank(levelDesc?: string | null): number {
  const s = (levelDesc || "").toUpperCase().trim();
  if (s.includes("1/2")) return 1.5;
  if (s === "I" || s === "1" || s === "K-1") return 1;
  if (s === "II" || s === "2") return 2;
  if (s === "III" || s === "3") return 3;
  if (s.includes("4")) return 4;
  if (["N/A", "FLX", "ALL", "SOL", "PW", "PRE"].includes(s)) return 2;
  if (["2YR", "3-4", "4-5", "MM"].includes(s)) return 0.5;
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
  const started = Date.now();
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get("debug") === "1";

  const ageParam = searchParams.get("age");
  const expParam = searchParams.get("experience"); // "0", "1-2", "3-4", "5+"

  if (!AKADA_API_KEY || !AKADA_AUTH_TOKEN) {
    const msg = `Missing Akada env: ${!AKADA_API_KEY ? "AKADA_API_KEY " : ""}${!AKADA_AUTH_TOKEN ? "AKADA_AUTH_TOKEN " : ""}`;
    return NextResponse.json({ error: msg.trim() }, { status: 500 });
  }

  const url = new URL(`${AKADA_API}/classes`);
  url.searchParams.set("pageSize", "500");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        AkadaApiKey: AKADA_API_KEY,
        Authorization: `Bearer ${AKADA_AUTH_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "(no body)");
      return NextResponse.json(
        debug
          ? { status: res.status, statusText: res.statusText, body: txt }
          : { error: `Akada error ${res.status}` },
        { status: 502 }
      );
    }

    const j = await res.json();
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    const normalized = raw.map((c) => {
      const day = firstDayString(c);
      const time = `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;
      return {
        id: String(c.id),
        name: String(c.description || "").trim(),
        level: String(c.levelDescription || "").trim(),
        type: String(c.typeDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        day,
        time,
        currentEnrollment: c.currentEnrollment,
        maxEnrollment: c.maxEnrollment,
      };
    });

    // --- Age filter: within lowerAgeLimit and <= lowerAgeLimit+2, capped by upperAgeLimit
    let filtered = normalized;
    const age = ageParam ? Number(ageParam) : NaN;
    if (!Number.isNaN(age)) {
      filtered = filtered.filter((c) => {
        const lower = c.ageMin ?? 0;
        const upper = c.ageMax ?? 99;
        const cap = Math.min(upper, lower + 2);
        return age >= lower && age <= cap;
      });
    }

    // --- Experience filter
    if (expParam) {
      const want = (() => {
        if (expParam === "0" || expParam === "1-2") return { min: 0, max: 1.6 };
        if (expParam === "3-4") return { min: 1.6, max: 3.6 };
        return { min: 3.6, max: 99 };
      })();
      filtered = filtered.filter((c) => {
        const r = levelRank(c.level);
        return r >= want.min && r < want.max;
      });
    }

    filtered = filtered.filter((c) => c.day || c.time.trim() !== "-");

    return NextResponse.json({
      ok: true,
      count: filtered.length,
      classes: filtered,
      elapsedMs: Date.now() - started,
      ...(debug ? { totalFromAkada: raw.length, url: url.toString() } : {}),
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}