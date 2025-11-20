import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");
const CALENDAR_ID = "ZQfdk4DMSCu0yhUSjell"; // your trial calendar

function headers() {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-04-15",
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      contactId,
      opportunityId,
      selectedClass   // { id, name, day, time, lengthMinutes }
    } = body;

    if (!contactId || !selectedClass) {
      return NextResponse.json(
        { error: "Missing contactId or selectedClass" },
        { status: 400 }
      );
    }

    // Start/End times must be real ISO datetime stamps.
    // selectedClass.time is like: "6:00pm - 7:00pm"
console.log("DEBUG selectedClass:", JSON.stringify(selectedClass, null, 2));


    const [startStr, endStr] = selectedClass.time
  .split("-")
  .map((s: string) => s.trim());


    // We need a date—use the *next upcoming day* for the class
    function nextClassDate(dayName: string) {
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const target = days.indexOf(dayName);
      const now = new Date();
      const result = new Date(now);
      result.setHours(0,0,0,0);
      let delta = target - now.getDay();
      if (delta <= 0) delta += 7;
      result.setDate(now.getDate() + delta);
      return result;
    }

    const runDate = nextClassDate(selectedClass.day);

    function parseTime(t: string) {
      const d = new Date(runDate);
      const [time, period] = t.split(/(am|pm)/i);
      let [h, m] = time.split(":").map(Number);
      if (period.toLowerCase() === "pm" && h < 12) h += 12;
      if (period.toLowerCase() === "am" && h === 12) h = 0;
      d.setHours(h, m, 0, 0);
      return d;
    }
function toOffsetString(date: Date) {
  const pad = (n: number) => `${n < 10 ? "0" : ""}${n}`;
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const oh = pad(Math.floor(Math.abs(offset) / 60));
  const om = pad(Math.abs(offset) % 60);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${oh}:${om}`
  );
}

const startTimeISO = toOffsetString(parseTime(startStr));
const endTimeISO = toOffsetString(parseTime(endStr));


const payload = {
  title: `${selectedClass.name} Trial Class`,
  meetingLocationType: "custom",
  meetingLocationId: "custom_0",
  overrideLocationConfig: true,
  appointmentStatus: "confirmed",

  description: "Elite Dance Trial Class",
  address: "7177 Nolensville Rd Suite B3, Nolensville, TN 37135",

  ignoreDateRange: false,
  toNotify: false,
  ignoreFreeSlotValidation: true,

  calendarId: CALENDAR_ID,
  locationId: LOCATION_ID,
  contactId: "rFk7ihMifzRtxcpxRXYj",

   startTime: "2025-11-23T03:30:00+05:30",
  endTime: "2025-11-23T04:30:00+05:30"

  //startTime: startTimeISO,   // MUST include offset
  //endTime: endTimeISO        // MUST include offset
};

    const res = await fetch(`${API}/calendars/events/appointments`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch {}

    const appointmentId =
      json?.id ||
      json?.appointment?.id ||
      null;

if (!res.ok || !appointmentId) {
  console.error("Appointment Create Error:");
  console.error("Status:", res.status);
  console.error("Raw Text:", txt);
  console.error("Parsed JSON:", json);

  return NextResponse.json(
    {
      error: json || txt || "Unknown error",
      status: res.status
    },
    { status: res.status }
  );
}


    return NextResponse.json({ appointmentId });

  } catch (err: any) {
    console.error("Appointment API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
