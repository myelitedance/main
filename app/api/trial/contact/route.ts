import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GHL API base URL
const GHL_BASE = "https://services.leadconnectorhq.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      parentFirstName,
      parentLastName,
      email,
      phone,
      dancerFirstName,
      smsOptIn,
      utms,
    } = body;

    if (!parentFirstName || !parentLastName || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required contact fields" },
        { status: 400 }
      );
    }

    // Normalize phone
    const cleanedPhone = phone.replace(/\D/g, "");

    // Build contact payload for GHL
    const payload = {
      firstName: parentFirstName,
      lastName: parentLastName,
      email: email.toLowerCase(),
      phone: cleanedPhone,
      // SMS opt-in
      sms: smsOptIn ? "1" : "0",

      // Custom fields: UTM data
      customField: {
        // Contact custom fields
        edm__utm_source: utms?.utm_source || "",
        edm__utm_medium: utms?.utm_medium || "",
        edm__utm_campaign: utms?.utm_campaign || "",
        edm__page_path: utms?.page_path || "",
      },
    };

    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.id) {
      console.error("GHL contact error:", json);
      return NextResponse.json(
        { error: "Failed to create or update GHL contact" },
        { status: 500 }
      );
    }

    return NextResponse.json({ contactId: json.id });
  } catch (err: any) {
    console.error("Trial Contact API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
