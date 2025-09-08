// /app/api/elite/quick-capture/route.ts
import { NextRequest, NextResponse } from "next/server";

const GHL_API = "https://rest.gohighlevel.com/v1";
const GHL_KEY = process.env.GHL_API_KEY!;
const LOCATION_ID = process.env.GHL_LOCATION_ID!;
const PIPELINE_ID = process.env.GHL_PIPELINE_ID!;
const STAGE_NEW_LEAD = process.env.GHL_STAGE_NEW_LEAD!;

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GHL_KEY}`,
      ...(init.headers || {})
    }
  });
  if (!res.ok) throw new Error(`GHL ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Basic validation
  if (!body.email && !body.phone) {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }
  if (!body.smsConsent) {
    return NextResponse.json({ error: "SMS consent is required" }, { status: 400 });
  }
  if (!body.parentFirst || !body.parentLast || !body.dancerFirst || !body.age) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert Contact (store early intel)
  const contactPayload = {
    locationId: LOCATION_ID,
    firstName: body.parentFirst,
    lastName: body.parentLast,
    email: body.email || undefined,
    phone: body.phone || undefined,
    tags: ["EliteLead", "DanceInterest"],
    source: body.utm?.source || "Website",
    // map by field labels (server-side label mapping is supported)
    customFields: [
      { field: "EDM – Dancer First Name", value: body.dancerFirst || "" },
      { field: "EDM – Dancer Last Name", value: body.dancerLast || "" },
      { field: "EDM – Dancer Age", value: body.age || "" },
      { field: "EDM – UTM Source", value: body.utm?.source || "" },
      { field: "EDM – UTM Medium", value: body.utm?.medium || "" },
      { field: "EDM – UTM Campaign", value: body.utm?.campaign || "" },
      { field: "EDM – Page Path", value: body.page || "" },
      { field: "EDM – SMS Consent", value: "Yes" }
    ]
  };

  // Some GHL stacks accept "field" by label; if yours requires IDs, we can swap to ID-based writes later.
  const upsert = await ghl(`/contacts/`, { method: "POST", body: JSON.stringify(contactPayload) });
  const contactId = upsert.contact?.id || upsert.id;

  // Create Opportunity at New Lead
  await ghl(`/opportunities/`, {
    method: "POST",
    body: JSON.stringify({
      locationId: LOCATION_ID,
      pipelineId: PIPELINE_ID,
      stageId: STAGE_NEW_LEAD,
      name: `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
      contactId,
      status: "open",
      source: body.utm?.source || "Website",
      monetaryValue: 0
    })
  });

  return NextResponse.json({ ok: true, contactId });
}