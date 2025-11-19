import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://services.leadconnectorhq.com";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env variable: ${k}`);
  return v;
};

const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");
const CALENDAR_ID = "ZQfdk4DMSCu0yhUSjell"; // Trial Class calendar

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
      contactId,
      opportunityId,
      classDate,      // YYYY-MM-DD
      classStartTime, // "18:00"
      classEndTime,   // "19:00"
      selectedClass,  // { id, name }
      parentName,
      dancerFirstName,
      smsOptIn,
    } = body;

    // Validation
    if (!contactId) {
      return NextResponse.json(
        { error: "Missing contactId for appointment" },
        { status: 400 }
      );
    }
    if (!classDate || !classStartTime || !classEndTime) {
      return NextResponse.json(
        { error: "Date and time required" },
        { status: 400 }
      );
    }

    // Build the appointment payload
    const payload: any = {
      locationId: LOCATION_ID,
      calendarId: CALENDAR_ID,
      contactId,
      title: `Trial Class: ${selectedClass?.name || "Class"}`,
      startTime: `${classDate}T${classStartTime}:00`,
      endTime: `${classDate}T${classEndTime}:00`,
      status: "confirmed",
      appointmentStatus: "confirmed",
      additionalNotes: `Parent: ${parentName}\nDancer: ${dancerFirstName}\nClass: ${selectedClass?.name}`,
      smsReminder: smsOptIn ? true : false,
    };

    // Attach opportunity if we have one
    if (opportunityId) {
      payload.opportunityId = opportunityId;
    }

    // Make the API request
    const res = await fetch(`${API}/appointments/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    let json = null;
    try { json = JSON.parse(txt); } catch {}

    if (!res.ok || !json?.id) {
      console.error("Appointment Create Error:", json || txt);
      return NextResponse.json(
        { error: json || txt, status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({
      appointmentId: json.id,
      ok: true,
    });

  } catch (err: any) {
    console.error("Trial Appointment Error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
