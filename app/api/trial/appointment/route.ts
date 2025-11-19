import { NextRequest, NextResponse } from "next/server";
import { buildAppointmentTitle } from "@/app/book-trial/utils/format";

export const runtime = "nodejs";

const GHL_BASE = "https://services.leadconnectorhq.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      classId,
      className,
      lengthMinutes,
      dancerFirstName,
      day,
      time,
      contactId,
      opportunityId,
      appointmentTitle, // built client-side
    } = body;

    if (!contactId || !opportunityId) {
      return NextResponse.json(
        { error: "Missing contact or opportunity ID" },
        { status: 400 }
      );
    }

    // -------------------------------------------
    // Convert "Tue" + "6:00pm – 7:00pm" into an ISO datetime
    // -------------------------------------------
    const dateForNextClass = getNextClassDate(day, time);
    if (!dateForNextClass) {
      return NextResponse.json(
        { error: "Invalid class day/time format" },
        { status: 400 }
      );
    }

    const startISO = dateForNextClass.toISOString();

    // Add lengthMinutes for end time
    const endISO = new Date(
      dateForNextClass.getTime() + lengthMinutes * 60000
    ).toISOString();

    // -------------------------------------------
    // Build payload for GHL appointment
    // -------------------------------------------
    const payload = {
      title: appointmentTitle || buildAppointmentTitle(
        dancerFirstName,
        className,
        day,
        time
      ),
      contactId,
      opportunityId,
      calendarId: process.env.GHL_TRIAL_CALENDAR_ID, // Should be set to ZQfdk4DMSCu0yhUSjell
      startTime: startISO,
      endTime: endISO,
      status: "confirmed",
      location: "Elite Dance & Music",
    };

    const res = await fetch(`${GHL_BASE}/calendars/events/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.id) {
      console.error("GHL Appointment Error:", json);
      return NextResponse.json(
        { error: "Failed to schedule appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointmentId: json.id });

  } catch (err: any) {
    console.error("Appointment API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}



/* ---------------------------------------------------
   Helper: Convert Class Day + Time to Next Occurrence
   Example:
     day = "Tue"
     time = "6:00pm – 7:00pm"
--------------------------------------------------- */

function getNextClassDate(day: string, timeRange: string): Date | null {
  try {
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const targetDay = dayMap[day];
    if (targetDay === undefined) return null;

    const [startTime] = timeRange.split("–").map((s) => s.trim());
    const parsed = parseTime(startTime);
    if (!parsed) return null;

    const now = new Date();
    const date = new Date();

    // Move to next matching weekday
    const diff = (targetDay + 7 - now.getDay()) % 7;
    date.setDate(now.getDate() + diff);

    // Apply the time (hours/minutes)
    date.setHours(parsed.hours, parsed.minutes, 0, 0);

    // If today + time already passed, move to next week
    if (date < now) date.setDate(date.getDate() + 7);

    return date;
  } catch {
    return null;
  }
}

/* Parse "6:00pm" into hours/minutes */
function parseTime(str: string): { hours: number; minutes: number } | null {
  try {
    const match = str.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toLowerCase();

    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    return { hours, minutes };
  } catch {
    return null;
  }
}
