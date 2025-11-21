// app/api/elite/classes/route.ts
import { Temporal } from "@js-temporal/polyfill";
import { NextRequest, NextResponse } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ===============================================
// CONFIG
// ===============================================
const TZ = "America/Chicago";

const CLOSED_RANGES: [string, string][] = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2026-03-02", "2026-03-08"],
];

// ===============================================
// TYPES
// ===============================================
type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

interface AkadaClass {
  id: number | string;
  description: string;
  levelDescription: string;
  lowerAgeLimit: number;
  upperAgeLimit: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  startTimeDisplay: string;
  stopTimeDisplay: string;
  lengthMinutes: number;
}

interface NormClass {
  id: string;
  description: string;
  level: string;
  ageMin: number;
  ageMax: number;
  days: Weekday[];
  timeRange: string;
  lengthMinutes: number;
}

// ===============================================
// TEMPORAL HELPERS — DST SAFE
// ===============================================
function todayCST(): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(TZ).with({
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

function nextDateForDay(day: Weekday): Temporal.ZonedDateTime {
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(day) + 1;
  const today = todayCST();
  const dow = today.dayOfWeek; // Mon=1..Sun=7

  let delta = index - dow;
  if (delta <= 0) delta += 7;

  return today.add({ days: delta });
}

function nextWeek(d: Temporal.ZonedDateTime) {
  return d.add({ days: 7 });
}

function localISO(d: Temporal.ZonedDateTime): string {
  return d.toPlainDate().toString(); // YYYY-MM-DD
}

function shortDate(d: Temporal.ZonedDateTime): string {
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}


function to24Hour(str: string) {
  const m = str.match(/(\d\d?):(\d\d)(am|pm)/i);
  if (!m) return { hour: 0, min: 0 };

  let hour = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3].toLowerCase();

  if (ap === "pm" && hour < 12) hour += 12;
  if (ap === "am" && hour === 12) hour = 0;

  return { hour, min };
}

function buildISO(date: Temporal.ZonedDateTime, time: string): string {
  const { hour, min } = to24Hour(time);

  // Build the full ZonedDateTime with the correct local clock time
  const dt = date.with({ hour, minute: min, second: 0, millisecond: 0 });

  // Extract date/time "as seen in CST/CDT"
  const pdt = dt.toPlainDateTime();

  // Extract offset e.g. "-06:00"
  const offset = dt.offset.toString(); // already formatted ±HH:MM

  // Build ISO WITHOUT time-zone annotation
  return `${pdt.toString()}${offset}`;
}


function isClosed(d: Temporal.ZonedDateTime): boolean {
  const iso = d.toPlainDate().toString();
  return CLOSED_RANGES.some(([start, end]) => iso >= start && iso <= end);
}

// ===============================================
// ROUTE HANDLER
// ===============================================
export async function GET(req: NextRequest) {
  try {
    const ageParam = new URL(req.url).searchParams.get("age");
    const age = ageParam ? Number(ageParam) : NaN;

    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const txt = await res.text();

    if (!res.ok) {
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const j = JSON.parse(txt);
    const raw: AkadaClass[] = j?.returnValue?.currentPageItems ?? [];

    // Normalize Akada classes
    const norm: NormClass[] = raw.map((c) => ({
      id: String(c.id),
      description: (c.description || "").trim(),
      level: (c.levelDescription || "").trim(),
      ageMin: c.lowerAgeLimit ?? 0,
      ageMax: c.upperAgeLimit ?? 99,
      days: [
        ["monday", "Mon"],
        ["tuesday", "Tue"],
        ["wednesday", "Wed"],
        ["thursday", "Thu"],
        ["friday", "Fri"],
        ["saturday", "Sat"],
      ]
        .filter(([k]) => (c as any)[k])
        .map(([, lbl]) => lbl as Weekday),
      timeRange: `${c.startTimeDisplay.trim()} - ${c.stopTimeDisplay.trim()}`,
      lengthMinutes: c.lengthMinutes ?? 0,
    }));

    // Filter
    let filtered = norm
      .filter((c) => c.days.length > 0)
      .filter((c) => c.ageMin !== c.ageMax)
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(age)) {
      filtered = filtered.filter(
        (c) => age >= c.ageMin && age <= c.ageMax
      );
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

    // Sort and limit to 2
    const results = Object.values(groups).map((g) => {
      g.options = g.options
        .sort(
          (a: any, b: any) =>
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
