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

// === UTM Custom Field IDs from your system ===
const CF = {
  UTM_SOURCE:   "CSCvFURGpjVT3QQq4zMj",
  UTM_MEDIUM:   "DSr9AU4sDkgbCp4EX7XR",
  UTM_CAMPAIGN: "griR53QgvqlnnXDbd1Qi",
  PAGE_PATH:    "f1bLQiSnX2HtnY0vjLAe",
};

function headers(readOnly = false) {
  const h: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
  if (!readOnly) h["Content-Type"] = "application/json";
  return h;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      parentFirstName,
      parentLastName,
      email,
      phone,
      smsOptIn,
      utms,
    } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Missing required email" },
        { status: 400 }
      );
    }

    const cleanedPhone = phone?.replace(/\D/g, "") || "";

    // ---- CustomFields array ----
    const cf: Array<{ id: string; value: any }> = [];
    const push = (id: string, val: any) => {
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        cf.push({ id, value: val });
      }
    };

    push(CF.UTM_SOURCE,   utms?.utm_source);
    push(CF.UTM_MEDIUM,   utms?.utm_medium);
    push(CF.UTM_CAMPAIGN, utms?.utm_campaign);
    push(CF.PAGE_PATH,    utms?.page_path);

    const payload: any = {
      firstName: parentFirstName,
      lastName: parentLastName,
      email: email.toLowerCase(),
      phone: cleanedPhone,
      locationId: LOCATION_ID,  // REQUIRED
      customFields: cf.length ? cf : undefined,
    };

    const res = await fetch(`${API}/contacts/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    let json: any = null;
    try { json = JSON.parse(txt); } catch {}

    if (!res.ok || !json?.id) {
      console.error("GHL Contact Create Error:", json || txt);
      return NextResponse.json(
        { error: json || txt, status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({ contactId: json.id });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
