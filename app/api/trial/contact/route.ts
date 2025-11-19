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

// === Contact Custom Field IDs ===
const CF = {
  // UTM Fields
  UTM_SOURCE:   "CSCvFURGpjVT3QQq4zMj",
  UTM_MEDIUM:   "DSr9AU4sDkgbCp4EX7XR",
  UTM_CAMPAIGN: "griR53QgvqlnnXDbd1Qi",
  PAGE_PATH:    "f1bLQiSnX2HtnY0vjLAe",

  // Student Fields
  DANCER_FIRST: "scpp296TInQvCwknlSXt",
  DANCER_LAST:  "O6sOZkoTVHW1qjcwQlDm",
  DANCER_AGE:   "HtGv4RUuffIl4UJeXmjT",
  EXPERIENCE:   "SrUlABm2OX3HEgSDJgBG",

  // Class Fields
  CLASS_ID:     "seWdQbk6ZOerhIjAdI7d",
  CLASS_NAME:   "Zd88pTAbiEKK08JdDQNj",

  // SMS Consent
  SMS_CONSENT:  "vZb6JlxDCWfTParnzInw",
};

function headers(readOnly = false) {
  const h: Record<string,string> = {
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
      dancerFirstName,
      dancerLastName,
      dancerAge,
      years,  // experience
      selectedClass, // { id, name }
      smsOptIn,
      utms,
    } = body;

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const cleanedPhone = phone.replace(/\D/g, "");

    // Build custom fields array
    const cf: Array<{ id: string; value: any }> = [];
    const push = (id: string, value: any) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        cf.push({ id, value });
      }
    };

    // UTM Fields
    push(CF.UTM_SOURCE,   utms?.utm_source);
    push(CF.UTM_MEDIUM,   utms?.utm_medium);
    push(CF.UTM_CAMPAIGN, utms?.utm_campaign);
    push(CF.PAGE_PATH,    utms?.page_path);

    // Student fields
    push(CF.DANCER_FIRST, dancerFirstName);
    push(CF.DANCER_LAST,  dancerLastName);
    push(CF.DANCER_AGE,   dancerAge);
    push(CF.EXPERIENCE,   years);

    // Selected Class
    if (selectedClass) {
      push(CF.CLASS_ID, selectedClass.id);
      push(CF.CLASS_NAME, selectedClass.name);
    }

    // SMS Consent
    push(CF.SMS_CONSENT, smsOptIn ? "Yes" : "No");

    const payload: any = {
      firstName: parentFirstName,
      lastName: parentLastName,
      email: email.toLowerCase(),
      phone: cleanedPhone,
      locationId: LOCATION_ID,
      customFields: cf.length ? cf : undefined,
    };

    const res = await fetch(`${API}/contacts/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    let json = null;
    try { json = JSON.parse(txt); } catch {}

    // Normalize response formats
    const contactId =
      json?.id ||
      json?.contact?.id ||
      null;

    if (!res.ok || !contactId) {
      console.error("GHL Contact Create Error:", json || txt);
      return NextResponse.json(
        { error: json || txt, status: res.status },
        { status: res.status }
      );
    }

    return NextResponse.json({ contactId });

  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
