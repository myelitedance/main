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

const GHL_KEY = need("GHL_API_KEY");
const LOCATION_ID = need("GHL_LOCATION_ID");
const EMAIL_FROM = need("EMAIL_FROM");
const FRONTDESK_TO = process.env.FRONTDESK_TO || "frontdesk@myelitedance.com";
const TASHARA_USER_ID = process.env.GHL_USER_TASHARA_ID || ""; // optional for task assignment

const resend = new Resend(process.env.RESEND_API_KEY || "");

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

// Cache field map by name => id
let FIELD_MAP: Record<string, string> | null = null;
async function getFieldMap(): Promise<Record<string, string>> {
  if (FIELD_MAP) return FIELD_MAP;
  const data = await ghl(`/locations/${LOCATION_ID}/custom-fields`);
  const list = (data.customFields || []) as Array<{ id: string; name: string }>;
  FIELD_MAP = {};
  for (const f of list) FIELD_MAP![f.name] = f.id;
  return FIELD_MAP!;
}

function cfEntry(id: string | undefined, value: any) {
  if (!id) return null;
  if (value === undefined || value === null) return null;
  return { customFieldId: id, field_value: String(value) };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });
    if (!body.action || !["trial", "inquiry"].includes(body.action)) {
      return NextResponse.json({ error: "action must be 'trial' or 'inquiry'" }, { status: 400 });
    }

    // Resolve class name via your classes API (optional)
    let selectedClassName = body.selectedClassName || "";
    if (!selectedClassName && body.selectedClassId) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/elite/classes`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          const found = (j.classes || []).find((c: any) => c.id === body.selectedClassId);
          if (found) selectedClassName = found.name;
        }
      } catch {
        /* ignore */
      }
    }

    // Build customFields by NAME → ID using your real list
    const map = await getFieldMap();

    const payloadCF: Array<{ customFieldId: string; field_value: string }> = [];
    const push = (name: string, value: any) => {
      const id = map[name];
      const e = cfEntry(id, value);
      if (e) payloadCF.push(e);
    };

    // Your field names from your curl dump (exact label match):
    // "EDM - Dancer First Name", "EDM - Dancer Last Name", "EDM - Dancer Age",
    // "EDM - Experience (Years)", "EDM - Style Preference (CSV)",
    // "EDM - U7 Recommended Classes (CSV)" (not used in this simplified flow),
    // "EDM - Selected Class ID", "EDM - Selected Class Name",
    // "EDM - SMS Consent", "EDM - Notes",
    // "EDM - UTM Source/Medium/Campaign", "EDM - Page Path"
    push("EDM - Dancer First Name", body.dancerFirst || "");
    push("EDM - Dancer Last Name", body.dancerLast || "");
    push("EDM - Dancer Age", body.age || "");
    push("EDM - Experience (Years)", body.experience || "");
    push("EDM - Selected Class ID", body.selectedClassId || "");
    push("EDM - Selected Class Name", selectedClassName || "");
    push("EDM - SMS Consent", body.smsConsent ? "Yes" : "No");
    push("EDM - Notes", body.notes || "");

    // Update contact (phone + CFs + tags)
    const tags: string[] = ["DanceInterest", "Lead-Completed"];
    if (body.action === "inquiry") tags.push("NeedHelp");

    await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify({
        id: body.contactId,
        locationId: LOCATION_ID,
        phone: body.parentPhone || undefined, // only if supplied
        tags,
        customFields: payloadCF,
      }),
    });

    // Email front desk
    const subject =
      body.action === "trial" ? "Trial Class Registration" : "Trial Class Inquiry";
    const detailsHtml = `
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
      <p><em>Contact ID:</em> ${body.contactId}</p>
    `;

    if (process.env.RESEND_API_KEY && EMAIL_FROM) {
      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: FRONTDESK_TO,
          subject: subject,
          html: detailsHtml,
        });
      } catch (e) {
        console.warn("Resend email failed (non-blocking):", e);
      }
    }

    // Optional: create a follow-up task when "inquiry"
    if (body.action === "inquiry") {
      try {
        const due = new Date();
        due.setDate(due.getDate() + 1);
        await ghl(`/tasks/`, {
          method: "POST",
          body: JSON.stringify({
            locationId: LOCATION_ID,
            title: "Follow up: Trial Class Inquiry",
            description: `Please reach out and help: ${body.parentFirst} ${body.parentLast} (Contact ${body.contactId}).`,
            contactId: body.contactId,
            dueDate: due.toISOString(),
            assignedTo: TASHARA_USER_ID || undefined,
            status: "open",
            priority: "high",
          }),
        });
      } catch (e) {
        console.warn("Task create failed (non-blocking):", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("lead-complete error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}