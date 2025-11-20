import { NextResponse, NextRequest } from "next/server";
import { akadaFetch } from "@/lib/akada";

export const runtime = "nodejs";

// ============================================================
// CONSTANTS
// ============================================================
const TZ = "America/Chicago";

const CLOSED_RANGES = [
  ["2025-11-24", "2025-11-30"],
  ["2025-12-22", "2026-01-04"],
  ["2026-03-02", "2026-03-08"],
];

// ============================================================
// UTILITIES (TS-SAFE VERSIONS)
// ============================================================

// Return YYYY-MM-DD in CST
function localISO(date: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

function formatShortDate(date: Date): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
  });
  return fmt.format(date);
}

function parseAkadaTime(raw: string): { hour: number; min: number; ap: "am" | "pm" } | null {
  const m = raw.trim().match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return null;
  return {
    hour: Number(m[1]),
    min: Number(m[2]),
    ap: m[3].toLowerCase() as "am" | "pm",
  };
}

function buildISO(date: Date, timeStr: string): string {
  const parsed = parseAkadaTime(timeStr);
  if (!parsed) return date.toISOString();

  let hour = parsed.hour;
  if (parsed.ap === "pm" && hour < 12) hour += 12;
  if (parsed.ap === "am" && hour === 12) hour = 0;

  // Create local CST timestamp
  const isoDate = localISO(date);
  const [y, m, d] = isoDate.split("-").map(Number);

  // Build UTC for CST (subtract offset dynamically)
  // CST offset varies with DST, compute properly:
  const asLocal = new Date(Date.UTC(y, m - 1, d, hour, parsed.min));
  const tzOffsetMin =
    -1 *
    new Date(
      asLocal.toLocaleString("en-US", { timeZone: TZ })
    ).getTimezoneOffset();

  const offsetHr = Math.floor(tzOffsetMin / 60);
  const offsetMin = Math.abs(tzOffsetMin % 60);

  const sign = offsetHr >= 0 ? "+" : "-";
  const oh = String(Math.abs(offsetHr)).padStart(2, "0");
  const om = String(offsetMin).padStart(2, "0");

  return `${isoDate}T${String(hour).padStart(2, "0")}:${String(parsed.min).padStart(
    2,
    "0"
  )}:00${sign}${oh}:${om}`;
}

function isClosed(d: Date): boolean {
  const iso = localISO(d);
  return CLOSED_RANGES.some(([start, end]) => iso >= start && iso <= end);
}

function nextWeek(d: Date) {
  const n = new Date(d);
  n.setDate(n.getDate() + 7);
  return n;
}

// Get labels Mon–Sat
function getDays(c: any): string[] {
  const map: [keyof any, string][] = [
    ["monday", "Mon"],
    ["tuesday", "Tue"],
    ["wednesday", "Wed"],
    ["thursday", "Thu"],
    ["friday", "Fri"],
    ["saturday", "Sat"],
  ];
  return map.filter(([k]) => !!c[k]).map(([, label]) => label);
}

// Next date for weekday label in CST
function nextDateForWeekday(label: string): Date {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const target = map[label];
  if (target === undefined) throw new Error("Invalid weekday: " + label);

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const today = now.getDay();

  let delta = target - today;
  if (delta <= 0) delta += 7;

  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + delta);
  return d;
}

// ============================================================
// MAIN ROUTE
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const ageParam = Number(new URL(req.url).searchParams.get("age") || NaN);

    const res = await akadaFetch(`/studio/classes`, { method: "GET" });
    const rawTxt = await res.text();
    if (!res.ok) return NextResponse.json({ error: rawTxt }, { status: res.status });

    const parsed = JSON.parse(rawTxt);
    const raw: any[] = parsed?.returnValue?.currentPageItems || [];

    // Normalize
    const norm = raw.map((c) => {
      const days = getDays(c);
      const timeRangeRaw =
        `${(c.startTimeDisplay || "").trim()} - ${(c.stopTimeDisplay || "").trim()}`;
      return {
        id: String(c.id),
        description: (c.description || "").trim(),
        level: (c.levelDescription || "").trim(),
        ageMin: Number(c.lowerAgeLimit ?? 0),
        ageMax: Number(c.upperAgeLimit ?? 99),
        days,
        timeRange: timeRangeRaw,
        lengthMinutes: Number(c.lengthMinutes ?? 0),
      };
    });

    // Filter
    let filtered = norm
      .filter((c) => c.days.length > 0)
      .filter((c) => c.ageMin !== c.ageMax)
      .filter((c) => !["FLX", "PRE", "DT"].includes(c.level.toUpperCase()));

    if (!isNaN(ageParam)) {
      filtered = filtered.filter((c) => ageParam >= c.ageMin && ageParam <= c.ageMax);
    }

    // Group
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

      const [startRaw, endRaw] = c.timeRange.split("-").map((s) => s.trim());

      for (const dayLabel of c.days) {
        let first = nextDateForWeekday(dayLabel);
        while (isClosed(first)) first = nextWeek(first);

        let second = nextWeek(first);
        while (isClosed(second)) second = nextWeek(second);

        groups[c.description].options.push({
          id: c.id,
          day: dayLabel,
          date: localISO(first),
          dateFormatted: formatShortDate(first),
          label: `${dayLabel} • ${formatShortDate(first)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildISO(first, startRaw),
          endISO: buildISO(first, endRaw),
          lengthMinutes: c.lengthMinutes,
        });

        groups[c.description].options.push({
          id: c.id,
          day: dayLabel,
          date: localISO(second),
          dateFormatted: formatShortDate(second),
          label: `${dayLabel} • ${formatShortDate(second)} @ ${c.timeRange}`,
          timeRange: c.timeRange,
          startISO: buildISO(second, startRaw),
          endISO: buildISO(second, endRaw),
          lengthMinutes: c.lengthMinutes,
        });
      }
    }

    // Final: sort -> keep next 2
    const results = Object.values(groups).map((g: any) => {
      g.options = g.options
        .sort((a: any, b: any) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
        .slice(0, 2);
      return g;
    });

    return NextResponse.json({ classes: results });
  } catch (err: any) {
    console.error("CLASS ERROR:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
