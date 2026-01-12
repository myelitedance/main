// /app/api/elite/get-started/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { sql } from "@/lib/db";

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

const EMAIL_FROM   = need("EMAIL_FROM");
const FRONTDESK_TO = process.env.FRONTDESK_TO || "jason@myelitedance.com";
const resend       = new Resend(process.env.RESEND_API_KEY || "");

// ======== Custom Field IDs (only the ones we need here) ========
const CF = {
  DANCER_FIRST: "scpp296TInQvCwknlSXt",
  DANCER_AGE:   "HtGv4RUuffIl4UJeXmjT",
  SMS_CONSENT:  "vZb6JlxDCWfTParnzInw",
  NOTES:        "2JKj9HTS7Hhu0NUxuswN",
  UTM_SOURCE:   "CSCvFURGpjVT3QQq4zMj",
  UTM_MEDIUM:   "DSr9AU4sDkgbCp4EX7XR",
  UTM_CAMPAIGN: "griR53QgvqlnnXDbd1Qi",
  PAGE_PATH:    "f1bLQiSnX2HtnY0vjLAe",
};

function headers() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
}

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GHL ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

const setText = (id?: string, v?: any) =>
  id && v != null && String(v).trim() !== "" ? { id, value: String(v) } : null;

const setNumber = (id?: string, v?: any) => {
  if (!id) return null;
  const n = Number(v);
  return Number.isFinite(n) ? { id, value: n } : null;
};

const setYesNoText = (id?: string, v?: boolean) =>
  id == null ? null : ({ id, value: v ? "Yes" : "No" });

function cleanPhone(raw: string) {
  return String(raw || "").trim();
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let leadIntakeId: string | null = null;

  try {
    const body = await req.json();

    const parentFirst = String(body.parentFirstName || "").trim();
    const parentLast  = String(body.parentLastName || "").trim();
    const email       = String(body.parentEmail || "").trim().toLowerCase();
    const phone       = cleanPhone(body.parentPhone || "");
    const smsOptIn    = !!body.smsOptIn;

    const dancerFirst = String(body.dancerFirstName || "").trim();
    const dancerAge   = Number(body.dancerAge);

    const notes       = String(body.notes || "").trim();
    const utm         = body.utm || {};
    const pagePath    = String(body.pagePath || "/get-started");

    // ---- Validation (server-side, non-negotiable) ----
    if (!parentFirst) return NextResponse.json({ error: "Parent first name is required" }, { status: 400 });
    if (!parentLast)  return NextResponse.json({ error: "Parent last name is required" }, { status: 400 });
    if (!email || !isEmail(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    if (!dancerFirst) return NextResponse.json({ error: "Dancer first name is required" }, { status: 400 });
    if (!Number.isFinite(dancerAge) || dancerAge < 2 || dancerAge > 18) {
      return NextResponse.json({ error: "Dancer age must be between 2 and 18" }, { status: 400 });
    }
    if (smsOptIn && phone.length < 10) {
      return NextResponse.json({ error: "Phone is required for SMS opt-in" }, { status: 400 });
    }

    // ---- INSERT into Neon FIRST (source of truth) ----
    const inserted = await sql`
      INSERT INTO lead_intakes (
        parent_first_name,
        parent_last_name,
        parent_email,
        parent_phone,
        sms_opt_in,
        sms_opt_in_at,
        dancer_first_name,
        dancer_age,
        notes,
        source_path,
        ghl_status
      ) VALUES (
        ${parentFirst},
        ${parentLast},
        ${email},
        ${phone || null},
        ${smsOptIn},
        ${smsOptIn ? sql`now()` : null},
        ${dancerFirst},
        ${dancerAge},
        ${notes || null},
        ${pagePath},
        'pending'
      )
      RETURNING id;
    `;

    leadIntakeId = inserted?.[0]?.id ?? null;

    // ---- Upsert contact (duplicate-safe) ----
    type ContactResolution =
      | { contactId: string; policy: "safe-update" }
      | { contactId: string; policy: "conflict-phone" };

    async function getOrCreateContact(): Promise<ContactResolution> {
      try {
        const upsert = await ghl(`/contacts/`, {
          method: "POST",
          body: JSON.stringify({
            locationId: LOCATION_ID,
            firstName: parentFirst,
            lastName: parentLast,
            email,
            phone: phone || undefined,
            tags: ["EliteLead", "GetStarted"],
            source: utm.source || "Website",
          }),
        });
        const id = upsert.contact?.id || upsert.id;
        return { contactId: id, policy: "safe-update" };
      } catch (e: any) {
        const msg = String(e?.message || "");
        const start = msg.indexOf("{");
        const j = start >= 0 ? JSON.parse(msg.slice(start)) : null;

        if (j?.statusCode === 400 && j?.meta?.contactId) {
          const dupId = j.meta.contactId as string;
          const matchingField = j.meta.matchingField as string | undefined;

          if (matchingField === "phone") {
            // phone duplicate: don't overwrite fields
            return { contactId: dupId, policy: "conflict-phone" };
          }
          return { contactId: dupId, policy: "safe-update" };
        }

        throw new Error("Something went wrong saving your info. Please try again or contact our front desk.");
      }
    }

    const { contactId, policy } = await getOrCreateContact();

    // Attach intake id to notes for traceability (optional but extremely useful)
    const notesWithId =
      `${notes || ""}${notes ? "\n\n" : ""}Lead Intake ID: ${leadIntakeId || "n/a"}`.trim();

    const customFields = [
      setText(CF.DANCER_FIRST, dancerFirst),
      setNumber(CF.DANCER_AGE, dancerAge),
      setYesNoText(CF.SMS_CONSENT, smsOptIn),
      setText(CF.NOTES, notesWithId),

      setText(CF.UTM_SOURCE, utm.source || ""),
      setText(CF.UTM_MEDIUM, utm.medium || ""),
      setText(CF.UTM_CAMPAIGN, utm.campaign || ""),
      setText(CF.PAGE_PATH, pagePath),
    ].filter(Boolean) as Array<{ id: string; value: string | number | boolean }>;

    const tags = ["EliteLead", "GetStarted", "Stage-NewLead"];
    if (smsOptIn) tags.push("SMS-OptIn");
    if (policy === "conflict-phone") tags.push("Needs-Manual-Review", "Phone-Dupe");

    // Only update fields if safe
    await ghl(`/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(
        policy === "safe-update"
          ? { tags, customFields }
          : { tags }
      ),
    });

    // ---- Create Opportunity ----
    const inferredSource =
      (utm.source && String(utm.source).trim()) ? String(utm.source).trim() : "FB/IG Ad";

    await ghl(`/opportunities/`, {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION_ID,
        pipelineId: PIPELINE_ID,
        pipelineStageId: STAGE_NEW_LEAD,
        name: `${parentFirst} ${parentLast} – Get Started (${dancerFirst}, Age ${dancerAge})`,
        contactId,
        status: "open",
        monetaryValue: 0,
        source: inferredSource,
      }),
    });

    // ---- Update Neon record as successful ----
    if (leadIntakeId) {
      await sql`
        UPDATE lead_intakes
        SET ghl_contact_id = ${contactId},
            ghl_status = 'ok',
            ghl_error = null
        WHERE id = ${leadIntakeId};
      `;
    }

    // ---- Email front desk (non-blocking) ----
    if (process.env.RESEND_API_KEY) {
      const subject = "New Get Started Lead";
      const html = `
        <h2>${subject}</h2>
        <p><strong>Parent:</strong> ${parentFirst} ${parentLast}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone} ${smsOptIn ? "(SMS Opt-in)" : ""}</p>` : ""}
        <p><strong>Dancer:</strong> ${dancerFirst}</p>
        <p><strong>Age:</strong> ${dancerAge}</p>
        ${notes ? `<p><strong>Notes:</strong><br>${notes.replace(/\n/g, "<br>")}</p>` : ""}
        <hr/>
        <p><em>Lead Intake ID:</em> ${leadIntakeId || "n/a"}</p>
        <p><em>GHL Contact ID:</em> ${contactId}</p>
        <p><em>Source:</em> ${inferredSource}</p>
      `;

      try {
        await resend.emails.send({ from: EMAIL_FROM, to: FRONTDESK_TO, subject, html });
      } catch (e) {
        console.warn("Resend email failed (non-blocking):", e);
      }
    }

    return NextResponse.json({ ok: true, contactId, leadIntakeId });
  } catch (err: any) {
    console.error("get-started error:", err);

    // If we inserted but GHL failed later, mark record as error
    try {
      if (leadIntakeId) {
        await sql`
          UPDATE lead_intakes
          SET ghl_status = 'error',
              ghl_error = ${String(err?.message || err)}
          WHERE id = ${leadIntakeId};
        `;
      }
    } catch (dbErr) {
      console.error("Failed to update lead_intakes error status:", dbErr);
    }

    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
