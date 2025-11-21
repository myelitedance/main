import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// Simple in-memory cache (per server instance)
let classesCache: { key: string; data: any[]; exp: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

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

    // cache key based on filters that affect results
    const key = `classes:${ageParam || ""}`;
    if (classesCache && classesCache.key === key && Date.now() < classesCache.exp) {
      return NextResponse.json({ classes: classesCache.data, cached: true });
    }

    // NOTE: BASE is .../api/v3; include /studio here
    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const text = await res.text();
    if (!res.ok) {
      // helpful surface of Akada error
      return NextResponse.json({ error: `Akada classes ${res.status}: ${text}` }, { status: res.status });
    }

    // Akada wraps in returnValue.currentPageItems
    const j = JSON.parse(text);
    const raw: any[] = j?.returnValue?.currentPageItems || j?.returnValue || [];

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
        sunday: !!c.sunday,
        currentEnrollment: c.currentEnrollment,
        maxEnrollment: c.maxEnrollment,
        lengthMinutes: Number(c.lengthMinutes ?? 0)
      };
    });

    // Filters
    let filtered = normalized;

    const age = ageParam ? Number(ageParam) : NaN;
    if (!Number.isNaN(age)) {
      filtered = filtered.filter((c) => {
        const lower = Number.isFinite(c.ageMin) ? c.ageMin : 0;
        const upper = Number.isFinite(c.ageMax) ? c.ageMax : 99;
        return age >= lower && age <= upper;
      });
    }

    filtered = filtered
      .filter((c) => c.sunday !== true)                                  // drop Sundays
      //.filter((c) => (c.level || "").trim().toUpperCase() !== "N/A")     // drop N/A
      .filter((c) => c.day || c.time.trim() !== "-");                     // ensure has schedule

    // Cache it
    classesCache = { key, data: filtered, exp: Date.now() + CACHE_TTL_MS };

    return NextResponse.json({ classes: filtered });
  } catch (err: any) {
    console.error("classes API error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}