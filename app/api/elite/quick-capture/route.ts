import { NextResponse, type NextRequest } from "next/server";
export const runtime = "nodejs";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_BASE       = "https://services.leadconnectorhq.com"; // your proven host
const GHL_API_KEY    = need("GHL_API_KEY");
const GHL_VERSION    = "2021-07-28"; // set if your curl needed it
const LOCATION_ID    = need("GHL_LOCATION_ID");
const PIPELINE_ID    = need("GHL_PIPELINE_ID");
const STAGE_NEW_LEAD = need("GHL_STAGE_NEW_LEAD");

// Custom field IDs you retrieved via curl:
const CF = {
  DANCER_FIRST_NAME: "scpp296TInQvCwknlSXt",
  DANCER_LAST_NAME:  "O6sOZkoTVHW1qjcwQlDm",
  DANCER_AGE:        "HtGv4RUuffIl4UJeXmjT",
  SMS_CONSENT:       "vZb6JlxDCWfTParnzInw",
  UTM_SOURCE:        "CSCvFURGpjVT3QQq4zMj",
  UTM_MEDIUM:        "DSr9AU4sDkgbCp4EX7XR",
  UTM_CAMPAIGN:      "griR53QgvqlnnXDbd1Qi",
  PAGE_PATH:         "f1bLQiSnX2HtnY0vjLAe",
} as const;

function baseHeaders() {
  const h: Record<string,string> = {
    "Authorization": `Bearer ${GHL_API_KEY}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (GHL_VERSION) h["Version"] = GHL_VERSION;
  return h;
}

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_BASE}/v1${path}`, {
    ...init,
    headers: { ...baseHeaders(), ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(`GHL ${path} ${res.status}: ${txt}`);
  }
  return res.json();
}

const cf = (id: string, value: any) =>
  value === undefined || value === null || value === "" ? null : ({ id, value: String(value) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Required fields
    const required = ["parentFirst","parentLast","email","phone","smsConsent","dancerFirst","age"] as const;
    for (const k of required) {
      if (!body?.[k]) return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
    }

    // 1) Upsert contact
    const upsert = await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: body.parentFirst,
        lastName:  body.parentLast,
        email:     body.email,
        phone:     body.phone,
        tags: ["EliteLead", "DanceInterest"],
        source: body.utm?.source || "Website",
      }),
    });
    const contactId = upsert.contact?.id || upsert.id;

    // 2) Initial custom fields (by ID)
    const customFields = [
      cf(CF.DANCER_FIRST_NAME, body.dancerFirst),
      cf(CF.DANCER_LAST_NAME,  body.dancerLast || ""),
      cf(CF.DANCER_AGE,        body.age),
      cf(CF.SMS_CONSENT,       body.smsConsent ? "Yes" : "No"),
      cf(CF.UTM_SOURCE,        body.utm?.source || ""),
      cf(CF.UTM_MEDIUM,        body.utm?.medium || ""),
      cf(CF.UTM_CAMPAIGN,      body.utm?.campaign || ""),
      cf(CF.PAGE_PATH,         body.page || ""),
    ].filter(Boolean);

    if (customFields.length) {
      await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          id: contactId,
          locationId: LOCATION_ID,
          customFields,
        }),
      });
    }

    // 3) Create opportunity (same endpoint/shape as your working call)
    await ghl(`/opportunities/`, {
      method: "POST",
      body: JSON.stringify({
        locationId:      LOCATION_ID,
        pipelineId:      PIPELINE_ID,
        pipelineStageId: STAGE_NEW_LEAD,
        name:            `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
        contactId,
        status:          "open",
        monetaryValue:   0,
        source:          body.utm?.source || "Website",
      }),
    });

    return NextResponse.json({ ok: true, contactId });
  } catch (err:any) {
    console.error("quick-capture error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}