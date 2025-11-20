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
const CALENDAR_ID = "ZQfdk4DMSCu0yhUSjell"; // Trial Calendar

function headers() {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      classId,
      className,
      lengthMinutes,
      dancerFirstName,
      day,
      date,         // "2025-12-01"
      timeRange,    // "4:45pm - 5:45pm"
      startISO,     // FULL ISO timestamp w/ offset (we generated earlier)
      endISO,
      contactId,
      opportunityId
    } = body;

    if (!contactId || !startISO || !endISO) {
      return NextResponse.json(
        { error: "Missing required appointment fields." },
        { status: 400 }
      );
    }

    // ----------------------------
    // BUILD APPOINTMENT PAYLOAD
    // ----------------------------
    const payload = {
      title: `${className} Trial Class`,
      appointmentStatus: "confirmed",
      calendarId: CALENDAR_ID,
      locationId: LOCATION_ID,
      contactId,

      // Where appointment happens
      meetingLocationType: "custom",
      meetingLocationId: "custom_0",
      overrideLocationConfig: true,

      // Info for the parent
      description: `${dancerFirstName}'s trial class for ${className}`,
      address: "7177 Nolensville Rd Suite B3, Nolensville, TN 37135",

      // Allow booking outside calendar bounds
      ignoreDateRange: true,
      ignoreFreeSlotValidation: true,
      toNotify: true,

      // Real scheduling data (the important part)
      startTime: startISO,
      endTime: endISO,

      // Link to Opportunity
      opportunityId: opportunityId || undefined
    };

    // ----------------------------
    // SEND TO GHL
    // ----------------------------
    const res = await fetch(`${API}/calendars/events/appointments`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    let json = null;
    try {
      json = JSON.parse(txt);
    } catch (e) {}

    const appointmentId =
      json?.id ||
      json?.appointment?.id ||
      null;

    if (!res.ok || !appointmentId) {
      console.error("❌ Appointment Create Error");
      console.error("Status:", res.status);
      console.error("Payload Sent:", payload);
      console.error("Raw Response:", txt);
      return NextResponse.json(
        { error: json || txt || "Appointment creation failed", status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({ appointmentId });

  } catch (err: any) {
    console.error("❌ Appointment API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
