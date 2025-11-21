// app/api/elite/classes/route.ts
console.log("🔥🔥🔥 LOADED ELITE ROUTE FROM APP/API/ELITE/CLASSES/ROUTE.TS 🔥🔥🔥");

import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// CONFIG
// ============================================================================
const TZ = "America/Chicago";

// Closure windows (inclusive)
const CLOSED_RANGES: [string, string][] = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2026-03-02", "2026-03-08"],
];

// ============================================================================
// TYPES
// ============================================================================
type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

interface ClassOption {
  id: string;
  day: Weekday;
  date: string;
  dateFormatted: string;
  label: string;
  timeRange: string;
  startISO: string;
  endISO: string;
  lengthMinutes: number;
}

// ============================================================================
// HELPERS
// ============================================================================
const WEEKDAY_MAP: Record<Weekday, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function nextDateForDay(day: Weekday): Date {
  const now = new Date();

  // Convert real-time UTC → CST using Intl
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const y = Number(parts.find(p => p.type === "year")?.value);
  const m = Number(parts.find(p => p.type === "month")?.value);
  const d = Number(parts.find(p => p.type === "day")?.value);

  const cstToday = new Date(y, m - 1, d);

  const todayDow = cstToday.getDay(); 
  const target = WEEKDAY_MAP[day];
  const todayFixed = todayDow === 0 ? 7 : todayDow;

  let delta = target - todayFixed;
  if (delta <= 0) delta += 7;

  cstToday.setDate(cstToday.getDate() + delta);
  return cstToday;
}


function nextWeek(d: Date): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + 7);
  return n;
}

// Convert Date → "YYYY-MM-DD" in CST
function localISO(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  }).format(d);
}

function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(d);
}

// Convert AM/PM to 24hr
function to24Hour(str: string): { hour: number; min: number } {
  const m = str.trim().match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return { hour: 0, min: 0 };
  let [, hh, mm, ap] = m;
  let hour = parseInt(hh, 10);
  const min = parseInt(mm, 10);

  ap = ap.toLowerCase();
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;

  return { hour, min };
}

// Build proper ISO-8601 with offset (e.g. 2021-06-23T03:30:00+05:30)
function buildISO(date: Date, timeStr: string): string {
  const { hour, min } = to24Hour(timeStr);

  const localDate = new Date(
    new Date(date.toLocaleString("en-US", { timeZone: TZ }))
  );
  localDate.setHours(hour, min, 0, 0);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const offsetMin = localDate.getTimezoneOffset() * -1;
  const offHr = Math.floor(offsetMin / 60);
  const offMin = Math.abs(offsetMin % 60);

  const offset =
    `${offHr >= 0 ? "+" : "-"}${pad(Math.abs(offHr))}:${pad(offMin)}`;

  return (
    `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}` +
    `T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:00${offset}`
  );
}

function isClosed(d: Date): boolean {
  const iso = localISO(d);
  return CLOSED_RANGES.some(([start, end]) => iso >= start && iso <= end);
}

function extractDays(c: any): Weekday[] {
  const map: [keyof any, Weekday][] = [
    ["monday", "Mon"],
    ["tuesday", "Tue"],
    ["wednesday", "Wed"],
    ["thursday", "Thu"],
    ["friday", "Fri"],
    ["saturday", "Sat"],
  ];
  return map.filter(([k]) => !!c[k]).map(([, lbl]) => lbl);
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ageParam = searchParams.get("age");
    const age = ageParam ? Number(ageParam) : NaN;

    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const txt = await res.text();

    if (!res.ok) {
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const j = JSON.parse(txt);
    const raw: any[] = j?.returnValue?.currentPageItems || [];

    const norm = raw.map((c) => {
      const days = extractDays(c);
      const start = (c.startTimeDisplay || "").trim();
      const end = (c.stopTimeDisplay || "").trim();
      const timeRange = `${start} - ${end}`;

      return {
        id: String(c.id),
        description: (c.description || "").trim(),
        level: (c.levelDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        days,
        timeRange,
        lengthMinutes: Number(c.lengthMinutes ?? 0),
      };
    });

    let filtered = norm
      .filter((c) => c.days.length > 0)
      .filter((c) => c.ageMin !== c.ageMax)
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(age)) {
      filtered = filtered.filter((c) => age >= c.ageMin && age <= c.ageMax);
    }

    const groups: Record<string, any> = {};

    for (const c of filtered) {
      if (!groups[c.description]) {
        groups[c.description] = {
          groupId: c.description,
          name: c.description,
          className: c.description,
          ageMin: c.ageMin,
          ageMax: c.ageMax,
          lengthMinutes: c.lengthMinutes,
          options: [],
        };
      }

      for (const day of c.days) {
        let first = nextDateForDay(day);
        while (isClosed(first)) first = nextWeek(first);

        let second = nextWeek(first);
        while (isClosed(second)) second = nextWeek(second);

        const [startStr, endStr] = c.timeRange.split("-").map((s) => s.trim());

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(first),
          dateFormatted: shortDate(first),
          label: `${day} • ${shortDate(first)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildISO(first, startStr),
          endISO: buildISO(first, endStr),
          lengthMinutes: c.lengthMinutes,
        });

        groups[c.description].options.push({
          id: c.id,
          day,
          date: localISO(second),
          dateFormatted: shortDate(second),
          label: `${day} • ${shortDate(second)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildISO(second, startStr),
          endISO: buildISO(second, endStr),
          lengthMinutes: c.lengthMinutes,
        });
      }
    }

    // FINAL SORT
    const results = Object.values(groups).map((g: any) => {
      g.options = (g.options as ClassOption[])
        .sort(
          (a: ClassOption, b: ClassOption) =>
            new Date(a.startISO).getTime() -
            new Date(b.startISO).getTime()
        )
        .slice(0, 2);

      return g;
    });

    return NextResponse.json({ classes: results });
  } catch (err: any) {
    console.error("CLASS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
