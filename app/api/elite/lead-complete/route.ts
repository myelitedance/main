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

const EMAIL_FROM   = need("EMAIL_FROM");
const FRONTDESK_TO = process.env.FRONTDESK_TO || "frontdesk@myelitedance.com";
const resend       = new Resend(process.env.RESEND_API_KEY || "");

// ======== Custom Field IDs (from your curl) ========
const CF = {
  DANCER_FIRST: "scpp296TInQvCwknlSXt",
  DANCER_LAST:  "O6sOZkoTVHW1qjcwQlDm",
  DANCER_AGE:   "HtGv4RUuffIl4UJeXmjT",

  U7_RECS_CSV:  "IRFoGYtxrdlerisKdi1o",
  EXPERIENCE:   "SrUlABm2OX3HEgSDJgBG",
  STYLE_CSV:    "uoAhDKEmTR2k7PcxCcag",
  TEAM_INT:     "pTnjhy6ilHaY1ykoPly4",
  WANTS_RECS:   "gxIoT6RSun7KL9KDu0Qs",

  CLASS_ID:     "seWdQbk6ZOerhIjAdI7d",
  CLASS_NAME:   "Zd88pTAbiEKK08JdDQNj",

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

const cf = (id: string, value: any) =>
  value === undefined || value === null || value === "" ? null : ({ customFieldId: id, field_value: String(value) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- helper to get or create a contact id (duplicate-safe, same headers/base as quick-capture) ---
    async function getOrCreateContactId() {
      // if we got one from the client, use it
      if (body.contactId) return body.contactId;

      // otherwise, try to upsert with the info we likely have from the form
      if (!body.parentFirst || !body.parentLast || !body.email || !body.parentPhone) {
        throw new Error("contactId required (and not enough fields to upsert)");
      }

      try {
        const upsert = await ghl(`/contacts/`, {
          method: "POST",
          body: JSON.stringify({
            locationId: LOCATION_ID,
            firstName: body.parentFirst,
            lastName: body.parentLast,
            email: body.email,
            phone: body.parentPhone,
            tags: ["EliteLead", "DanceInterest"],
            source: body.utm?.source || "Website",
          }),
        });
        return upsert.contact?.id || upsert.id;
      } catch (e: any) {
        const msg = String(e?.message || "");
        try {
          const start = msg.indexOf("{");
          const j = start >= 0 ? JSON.parse(msg.slice(start)) : null;
          if (
            j?.statusCode === 400 &&
            typeof j?.message === "string" &&
            j.message.includes("does not allow duplicated contacts") &&
            j?.meta?.contactId
          ) {
            return j.meta.contactId;
          }
        } catch {}
        throw e;
      }
    }

    // Resolve/ensure a contactId first (fallback handles missing)
    const contactId = await getOrCreateContactId();

    // Optional: resolve selected class name via your classes API (unchanged)
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

    // Build customFields by ID (unchanged)
    const customFields = [
      cf(CF.DANCER_FIRST, body.dancerFirst),
      cf(CF.DANCER_LAST,  body.dancerLast || ""),
      cf(CF.DANCER_AGE,   body.age || ""),
      Number(body.age || 0) < 7
        ? cf(CF.U7_RECS_CSV, (body.classOptionsU7 || []).join(", "))
        : cf(CF.STYLE_CSV,   (body.stylePreference || []).join(", ")),
      Number(body.age || 0) < 7 ? null : cf(CF.EXPERIENCE, body.experienceYears || body.experience || ""),
      cf(CF.TEAM_INT,   body.wantsTeam ? "Yes" : "No"),
      cf(CF.WANTS_RECS, body.wantsRecs ? "Yes" : "No"),
      cf(CF.CLASS_ID,   body.selectedClassId || ""),
      cf(CF.CLASS_NAME, selectedClassName || ""),
      cf(CF.SMS_CONSENT, body.smsConsent ? "Yes" : "No"),
      cf(CF.NOTES,       body.notes || ""),
      cf(CF.UTM_SOURCE,  body.utm?.source || ""),
      cf(CF.UTM_MEDIUM,  body.utm?.medium || ""),
      cf(CF.UTM_CAMPAIGN,body.utm?.campaign || ""),
      cf(CF.PAGE_PATH,   body.page || ""),
    ].filter(Boolean) as Array<{ customFieldId: string; field_value: string }>;

    const tags: string[] = ["DanceInterest", "Lead-Completed"];
    if (body.wantsTeam) tags.push("DanceTeamInterest");
    if (body.hasQuestions || body.action === "inquiry") tags.push("NeedHelp");

    // Update contact with CFs + tags
    await ghl(`/contacts/`, {
      method: "POST",
      body: JSON.stringify({
        id: contactId,
        locationId: LOCATION_ID,
        tags,
        customFields,
      }),
    });

    // Email front desk (unchanged)
    if (process.env.RESEND_API_KEY) {
      const subject = body.action === "inquiry" ? "Trial Class Inquiry" : "Trial Class Registration";
      const html = `
        <h2>${subject}</h2>
        <p><strong>Parent:</strong> ${body.parentFirst || ""} ${body.parentLast || ""}</p>
        <p><strong>Email:</strong> ${body.email || ""}</p>
        ${body.parentPhone ? `<p><strong>Phone:</strong> ${body.parentPhone}</p>` : ""}
        <p><strong>Dancer:</strong> ${body.dancerFirst || ""} ${body.dancerLast || ""}</p>
        <p><strong>Age:</strong> ${body.age || ""}</p>
        <p><strong>Experience:</strong> ${body.experienceYears || body.experience || ""}</p>
        <p><strong>Selected Class:</strong> ${selectedClassName || body.selectedClassId || "—"}</p>
        <p><strong>Wants Recs:</strong> ${body.wantsRecs ? "Yes" : "No"}</p>
        <p><strong>Dance Team:</strong> ${body.wantsTeam ? "Yes" : "No"}</p>
        <p><strong>Notes:</strong><br>${(body.notes || "").replace(/\n/g,"<br>")}</p>
        <hr/>
        <p><em>GHL Contact ID:</em> ${contactId}</p>
      `;
      try {
        await resend.emails.send({ from: EMAIL_FROM, to: FRONTDESK_TO, subject, html });
      } catch (e) {
        console.warn("Resend email failed (non-blocking):", e);
      }
    }

    return NextResponse.json({ ok: true, contactId });
  } catch (err: any) {
    console.error("lead-complete error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}