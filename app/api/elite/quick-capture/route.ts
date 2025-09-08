import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

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
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GHL ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Basic validation
  if (!body.parentFirst || !body.parentLast || !body.email || !body.phone || !body.smsConsent || !body.dancerFirst || !body.age) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert contact (write core fields + our EDM fields by label)
  const upsertPayload = {
    locationId: LOCATION_ID,
    firstName: body.parentFirst,
    lastName: body.parentLast,
    email: body.email,
    phone: body.phone,
    tags: ["EliteLead", "DanceInterest"],
    source: body.utm?.source || "Website",
    customFields: [
      { field: "EDM – Dancer First Name", value: body.dancerFirst || "" },
      { field: "EDM – Dancer Last Name", value: body.dancerLast || "" },
      { field: "EDM – Dancer Age", value: String(body.age || "") },
      { field: "EDM – UTM Source", value: body.utm?.source || "" },
      { field: "EDM – UTM Medium", value: body.utm?.medium || "" },
      { field: "EDM – UTM Campaign", value: body.utm?.campaign || "" },
      { field: "EDM – Page Path", value: body.page || "" },
      { field: "EDM – SMS Consent", value: "Yes" },
    ],
  };

  const upsert = await ghl(`/contacts/`, { method: "POST", body: JSON.stringify(upsertPayload) });
  const contactId = upsert.contact?.id || upsert.id;

  // Create opportunity in New Lead stage
  await ghl(`/opportunities/`, {
    method: "POST",
    body: JSON.stringify({
      locationId: LOCATION_ID,
      pipelineId: PIPELINE_ID,
      stageId: STAGE_NEW_LEAD,
      name: `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
      contactId,
      status: "open",
      monetaryValue: 0,
      source: body.utm?.source || "Website",
    }),
  });

  return NextResponse.json({ ok: true, contactId });
}