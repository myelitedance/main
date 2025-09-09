// /app/api/elite/lead-complete/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const GHL_API = "https://services.leadconnectorhq.com";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const GHL_KEY        = need("GHL_API_KEY");
const LOCATION_ID    = need("GHL_LOCATION_ID");
const PIPELINE_ID    = need("GHL_PIPELINE_ID");
const STAGE_NEW_LEAD = need("GHL_STAGE_NEW_LEAD");

const EMAIL_FROM     = need("EMAIL_FROM");
const FRONTDESK_TO   = process.env.FRONTDESK_TO || "frontdesk@myelitedance.com";
const resend         = new Resend(process.env.RESEND_API_KEY || "");
const ASSIGNED_TO    = process.env.GHL_USER_TASHARA_ID || ""; // optional

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
  if (!res.ok) throw new Error(`GHL ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

// cache name->id
let FIELD_MAP: Record<string, string> | null = null;
async function getFieldMap(): Promise<Record<string, string>> {
  if (FIELD_MAP) return FIELD_MAP;
  // ✅ working endpoint for your tenant:
  const data = await ghl(`/custom-fields?locationId=${encodeURIComponent(LOCATION_ID)}`);
  const list = (data.customFields || []) as Array<{ id: string; name: string }>;
  const map: Record<string, string> = {};
  for (const f of list) map[f.name] = f.id;
  FIELD_MAP = map;
  return map;
}

function cf(customFieldId: string | undefined, value: any) {
  if (!customFieldId) return null;
  if (value === undefined || value === null) return null;
  return { customFieldId, field_value: String(value) };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body.action: "trial" | "inquiry"
    if (!body.action || !["trial", "inquiry"].includes(body.action)) {
      return NextResponse.json({ error: "action must be 'trial' or 'inquiry'" }, { status: 400 });
    }

    // Gather UTM from query string on client (already sent in older code – optional to add later)
    // Resolve class name (optional)
    let selectedClassName = body.selectedClassName || "";
    if (!selectedClassName && body.selectedClassId) {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/elite/classes`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const hit = (j.classes || []).find((c: any) => c.id === body.selectedClassId);
          if (hit) selectedClassName = hit.name;
        }
      } catch {}
    }

    // 1) Create/Update contact at final submit
    //    We do a simple create; if you later need a true "find-or-update", we can add a search by email.
    const upsertRes = await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION_ID,
        firstName: body.parentFirst,
        lastName: body.parentLast,
        email: body.email,
        phone: body.parentPhone || undefined,
        tags: ["EliteLead", "DanceInterest", "Lead-Completed", ...(body.action === "inquiry" ? ["NeedHelp"] : [])],
        source: "Website",
      }),
    });
    const contactId = upsertRes.contact?.id || upsertRes.id;

    // 2) Create Opportunity (New Lead)
    await ghl(`/opportunities/`, {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION_ID,
        pipelineId: PIPELINE_ID,
        pipelineStageId: STAGE_NEW_LEAD,
        name: `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
        contactId,
        status: "open",
        monetaryValue: 0,
        source: "Website",
      }),
    });

    // 3) Custom fields
    const map = await getFieldMap();
    const toPush = (label: string, value: any) => cf(map[label], value);

    const cfPayload = [
      toPush("EDM - Dancer First Name", body.dancerFirst),
      toPush("EDM - Dancer Last Name", body.dancerLast || ""),
      toPush("EDM - Dancer Age", body.age || ""),
      toPush("EDM - Experience (Years)", body.experience || ""),
      toPush("EDM - Selected Class ID", body.selectedClassId || ""),
      toPush("EDM - Selected Class Name", selectedClassName || ""),
      toPush("EDM - SMS Consent", body.smsConsent ? "Yes" : "No"),
      toPush("EDM - Notes", body.notes || ""),
    ].filter(Boolean) as Array<{ customFieldId: string; field_value: string }>;

    if (cfPayload.length) {
      await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          id: contactId,
          locationId: LOCATION_ID,
          customFields: cfPayload,
        }),
      });
    }

    // 4) Email front desk
    if (process.env.RESEND_API_KEY) {
      const subject = body.action === "trial" ? "Trial Class Registration" : "Trial Class Inquiry";
      const html = `
        <h2>${subject}</h2>
        <p><strong>Parent:</strong> ${body.parentFirst || ""} ${body.parentLast || ""}</p>
        <p><strong>Email:</strong> ${body.email || ""}</p>
        ${body.parentPhone ? `<p><strong>Phone:</strong> ${body.parentPhone}</p>` : ""}
        <p><strong>Dancer:</strong> ${body.dancerFirst || ""} ${body.dancerLast || ""}</p>
        <p><strong>Age:</strong> ${body.age || ""}</p>
        <p><strong>Experience:</strong> ${body.experience || ""}</p>
        <p><strong>Selected Class:</strong> ${selectedClassName || body.selectedClassId || "—"}</p>
        <p><strong>SMS Consent:</strong> ${body.smsConsent ? "Yes" : "No"}</p>
        <p><strong>Notes:</strong><br>${(body.notes || "").replace(/\n/g, "<br>")}</p>
        <hr/>
        <p><em>GHL Contact ID:</em> ${contactId}</p>
      `;
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: FRONTDESK_TO,
          subject,
          html,
        });
      } catch (e) {
        console.warn("Resend email failed (non-blocking):", e);
      }
    }

    // 5) Optional task for “inquiry”
    if (body.action === "inquiry") {
      try {
        const due = new Date();
        due.setDate(due.getDate() + 1);
        await ghl(`/tasks/`, {
          method: "POST",
          body: JSON.stringify({
            locationId: LOCATION_ID,
            title: "Follow up: Trial Class Inquiry",
            description: `Please reach out to ${body.parentFirst} ${body.parentLast} (Contact ${contactId}).`,
            contactId,
            dueDate: due.toISOString(),
            assignedTo: ASSIGNED_TO || undefined,
            status: "open",
            priority: "high",
          }),
        });
      } catch (e) {
        console.warn("Task create failed (non-blocking):", e);
      }
    }

    return NextResponse.json({ ok: true, contactId });
  } catch (err: any) {
    console.error("lead-complete error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}