// /app/api/elite/quick-capture/route.ts
import { NextResponse, type NextRequest } from "next/server";
export const runtime = "nodejs";

const GHL_API = "https://services.leadconnectorhq.com";

const reqEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_KEY        = reqEnv("GHL_API_KEY");        // Private app access_token OR Location API key
const LOCATION_ID    = reqEnv("GHL_LOCATION_ID");
const PIPELINE_ID    = reqEnv("GHL_PIPELINE_ID");
const STAGE_NEW_LEAD = reqEnv("GHL_STAGE_NEW_LEAD");

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${GHL_KEY}`,
      Version: "2021-07-28",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GHL ${path} ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate like the client does
    const required = ["parentFirst","parentLast","email","phone","smsConsent","dancerFirst","age"] as const;
    for (const k of required) {
      if (!body?.[k]) return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
    }

    // 1) Upsert contact (core), gracefully handle "no duplicates" by using meta.contactId
    let contactId: string | undefined;
    try {
      const upsert = await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          locationId: LOCATION_ID,
          firstName: body.parentFirst,
          lastName: body.parentLast,
          email: body.email,
          phone: body.phone,
          tags: ["EliteLead", "DanceInterest"],
          source: body.utm?.source || "Website",
        }),
      });
      contactId = upsert.contact?.id || upsert.id;
    } catch (e: any) {
      const msg = String(e?.message || "");
      // Parse error JSON if available to extract existing contactId
      try {
        const start = msg.indexOf("{");
        const j = start >= 0 ? JSON.parse(msg.slice(start)) : null;
        if (
          j?.statusCode === 400 &&
          typeof j?.message === "string" &&
          j.message.includes("does not allow duplicated contacts") &&
          j?.meta?.contactId
        ) {
          contactId = j.meta.contactId;
        } else {
          throw e;
        }
      } catch {
        throw e;
      }
    }

    if (!contactId) throw new Error("No contactId returned");

    // 2) Create Opportunity (v2 uses pipelineStageId)
    const oppPayload = {
      locationId: LOCATION_ID,
      pipelineId: PIPELINE_ID,
      pipelineStageId: STAGE_NEW_LEAD,
      name: `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
      contactId,
      status: "open",
      monetaryValue: 0,
      source: body.utm?.source || "Website",
    };

    try {
      await ghl(`/opportunities/`, {
        method: "POST",
        body: JSON.stringify(oppPayload),
      });
    } catch (e) {
      // not fatal; we still return contactId so the flow can continue
      console.warn("Opportunity create failed:", e);
    }

    return NextResponse.json({ ok: true, contactId });
  } catch (err: any) {
    console.error("quick-capture error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}