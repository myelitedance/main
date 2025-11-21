// app/api/elite/classes/route.ts
console.log("🔥 Elite Route Loaded");
console.log("SERVER NOW:", new Date().toString());
console.log("OFFSET (min):", new Date().getTimezoneOffset());


import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// CONFIG
// ============================================================================
const TZ = "America/Chicago";

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

// Weekday mapping (Mon=1,...)
const WEEKDAY_MAP: Record<Weekday, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Get current date in CST (no UTC shift)
function nowInCST(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = Number(parts.find(p => p.type === "year")!.value);
  const m = Number(parts.find(p => p.type === "month")!.value);
  const d = Number(parts.find(p => p.type === "day")!.value);

  return new Date(y, m - 1, d);
}

// Next weekday (in CST)
function nextDateForDay(day: Weekday): Date {
  const today = nowInCST();

  const todayDow = today.getDay() === 0 ? 7 : today.getDay(); // Sun→7
  const target = WEEKDAY_MAP[day];

  let delta = target - todayDow;
  if (delta <= 0) delta += 7;

  const next = new Date(today);
  next.setDate(today.getDate() + delta);
  next.setHours(0, 0, 0, 0);

  return next;
}

function nextWeek(d: Date): Date {
  const n = new Date(d);
  n.setDate(d.getDate() + 7);
  return n;
}

// YYYY-MM-DD (CST)
function localISO(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// "Dec 1"
function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  }).format(d);
}

// Convert 9:15am → 24hr
function to24Hour(str: string): { hour: number; min: number } {
  const m = str.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return { hour: 0, min: 0 };

  let [, hh, mm, ap] = m;
  let hour = Number(hh);
  const min = Number(mm);

  ap = ap.toLowerCase();
  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;

  return { hour, min };
}

// ISO with offset: 2025-12-01T18:15:00-06:00
function buildISO(date: Date, timeStr: string): string {
  const { hour, min } = to24Hour(timeStr);

  // Build CST datetime
  const local = new Date(
    date.toLocaleString("en-US", { timeZone: TZ })
  );

  local.setHours(hour, min, 0, 0);

  const pad = (n: number) => String(n).padStart(2, "0");

  // Offset (negative minutes = CST)
  const offsetMin = local.getTimezoneOffset() * -1;
  const offHr = Math.floor(offsetMin / 60);
  const offMin = Math.abs(offsetMin % 60);

  const offset =
    `${offHr >= 0 ? "+" : "-"}${pad(Math.abs(offHr))}:${pad(offMin)}`;

  return (
    `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}` +
    `T${pad(local.getHours())}:${pad(local.getMinutes())}:00${offset}`
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

  return map.filter(([k]) => c[k]).map(([, lbl]) => lbl);
}

// ============================================================================
// ROUTE
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

    // Normalize raw classes
    const norm = raw.map((c) => ({
      id: String(c.id),
      description: (c.description || "").trim(),
      level: (c.levelDescription || "").trim(),
      ageMin: Number(c.lowerAgeLimit ?? 0),
      ageMax: Number(c.upperAgeLimit ?? 99),
      days: extractDays(c),
      timeRange: `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`,
      lengthMinutes: Number(c.lengthMinutes ?? 0),
    }));

    // Filter invalid classes
    let filtered = norm
      .filter((c) => c.days.length > 0)
      .filter((c) => c.ageMin !== c.ageMax)
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(age)) {
      filtered = filtered.filter((c) => age >= c.ageMin && age <= c.ageMax);
    }

    // Grouping
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

    // Keep next 2 dates
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
    return NextResponse.json(
      { error: err.message || "Server Error" },
      { status: 500 }
    );
  }
}
