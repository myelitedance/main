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

// for CONTACT updates, use { id, value } (not field_value)
const cf = (id: string, value: any) =>
  value === undefined || value === null || value === ""
    ? null
    : ({ id, value: String(value) });

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
// --- type-aware set helpers ---
const setText = (id?: string, v?: any) =>
  id && v != null && String(v).trim() !== "" ? { customFieldId: id, field_value: String(v) } : null;

const setNumber = (id?: string, v?: any) => {
  if (!id || v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return { customFieldId: id, field_value: n };
};

const setBool = (id?: string, v?: any) =>
  id && typeof v === "boolean" ? { customFieldId: id, field_value: v } : null;

const setCSV = (id?: string, arr?: any[]) =>
  id && Array.isArray(arr) && arr.length
    ? { customFieldId: id, field_value: arr.join(", ") }
    : null;
    const ageNum = Number(body.age || 0);
const experienceFixed =
  body.experienceYears && ["0","1-2","3-4","5+"].includes(body.experienceYears)
    ? body.experienceYears
    : ""; // ignore mismatched values

const customFields = [
  setText(CF.DANCER_FIRST, body.dancerFirst),
  setText(CF.DANCER_LAST,  body.dancerLast || ""),
  setNumber(CF.DANCER_AGE, ageNum),

  // Under-7 vs 7+ branches
  ageNum > 0 && ageNum < 7
    ? setCSV(CF.U7_RECS_CSV, body.classOptionsU7 || [])
    : setCSV(CF.STYLE_CSV,   body.stylePreference || []),

  // Experience only for 7+
  ageNum >= 7 ? setText(CF.EXPERIENCE, experienceFixed) : null,

  // Checkboxes as booleans
  setBool(CF.TEAM_INT,   !!body.wantsTeam),
  setBool(CF.WANTS_RECS, !!body.wantsRecs),
  setBool(CF.SMS_CONSENT,!!body.smsConsent),

  // Misc
  setText(CF.CLASS_ID,     body.selectedClassId || ""),
  setText(CF.CLASS_NAME,   selectedClassName || ""),
  setText(CF.NOTES,        body.notes || ""),
  setText(CF.UTM_SOURCE,   body.utm?.source || ""),
  setText(CF.UTM_MEDIUM,   body.utm?.medium || ""),
  setText(CF.UTM_CAMPAIGN, body.utm?.campaign || ""),
  setText(CF.PAGE_PATH,    body.page || ""),
].filter(Boolean) as Array<{ customFieldId: string; field_value: string | number | boolean }>;
    const tags: string[] = ["DanceInterest", "Lead-Completed"];
    if (body.wantsTeam) tags.push("DanceTeamInterest");
    if (body.hasQuestions || body.action === "inquiry") tags.push("NeedHelp");

    // Update contact PUT to /contacts/{id}, no "id" in body
    await ghl(`/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify({
        tags,
        customFields,
      }),
    });

    // Optional: create the Opportunity here if you want it at Step 2
await ghl(`/opportunities/`, {
  method: "POST",
  body: JSON.stringify({
    locationId: LOCATION_ID,
    pipelineId: process.env.GHL_PIPELINE_ID,
    pipelineStageId: process.env.GHL_STAGE_NEW_LEAD,
    name: `${body.parentFirst} ${body.parentLast} – Dance Inquiry`,
    contactId,
    status: "open",
    monetaryValue: 0,
    source: body.utm?.source || "Website",
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