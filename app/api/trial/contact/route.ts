import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

    // Build payload for GHL
    const payload = {
      firstName: parentFirstName,
      lastName: parentLastName,
      email: email.toLowerCase(),
      phone: cleanedPhone,
      customField: {
        edm__utm_source: utms?.utm_source ?? "",
        edm__utm_medium: utms?.utm_medium ?? "",
        edm__utm_campaign: utms?.utm_campaign ?? "",
        edm__page_path: utms?.page_path ?? "",
      }
    };

    const res = await fetch(`${GHL_BASE}/contacts/`, {
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
      console.error("GHL Contact Error:", json);
      return NextResponse.json(
        { error: json, status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({ contactId: json.id });

  } catch (err: any) {
    console.error("Trial Contact API Error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
