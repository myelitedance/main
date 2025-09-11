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
   type ContactResolution =
  | { contactId: string; policy: "safe-update" }      // ok to update fields
  | { contactId: string; policy: "conflict-phone" };  // don't update fields

async function getOrCreateContact(): Promise<ContactResolution> {
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
    const id = upsert.contact?.id || upsert.id;
    return { contactId: id, policy: "safe-update" };
  } catch (e: any) {
    const msg = String(e?.message || "");
    const start = msg.indexOf("{");
    const j = start >= 0 ? JSON.parse(msg.slice(start)) : null;

    if (j?.statusCode === 400 && j?.meta?.contactId) {
      const dupId = j.meta.contactId as string;
      const matchingField = j.meta.matchingField as string | undefined;

      // 👇 Human-friendly error for duplicate phone number
      if (matchingField === "phone") {
        throw new Error(
          "That phone number is already in our system under a different contact. " +
          "Please double-check the phone number you entered, or use a different one."
        );
      }

      // If duplicate by email, allow safe update
      if (matchingField === "email") {
        return { contactId: dupId, policy: "safe-update" };
      }

      // Fallback: safe update
      return { contactId: dupId, policy: "safe-update" };
    }

    // If not a duplicate, just bubble a generic user-friendly error
    throw new Error(
      "Something went wrong saving your info. Please try again or contact our front desk."
    );
  }
}

    // Resolve/ensure a contactId first (fallback handles missing)
    const { contactId, policy } = await getOrCreateContact();

  // Gather selected class names/ids (support single or multiple)
// Gather selected class names/ids (support single OR multi, and both key names)
const selectedNamesArr: string[] =
  Array.isArray(body.selectedClassNames)
    ? body.selectedClassNames
    : Array.isArray(body.selectedClassLabels)
    ? body.selectedClassLabels
    : body.selectedClassName
    ? [String(body.selectedClassName)]
    : [];

const selectedIdsArr: string[] =
  Array.isArray(body.selectedClassIds)
    ? body.selectedClassIds.map(String)
    : body.selectedClassId
    ? [String(body.selectedClassId)]
    : [];

// Fallback: if we only got IDs, try to resolve display names from your classes API
let selectedNames = selectedNamesArr.slice();
if (!selectedNames.length && selectedIdsArr.length) {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/elite/classes`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      const catalog = (j.classes || []) as Array<{ id: string; name: string; day?: string; time?: string }>;
      const labels = selectedIdsArr
        .map((id) => {
          const c = catalog.find((x) => String(x.id) === String(id));
          if (!c) return null;
          const when = [c.day, c.time].filter(Boolean).join(" ");
          return when ? `${c.name} — ${when}` : c.name;
        })
        .filter(Boolean) as string[];
      if (labels.length) selectedNames = labels;
    }
  } catch {}
}

// Final CSVs for GHL
const selectedNamesCSV = selectedNames.join(", ");
const selectedIdsCSV   = selectedIdsArr.join(", ");
const classesHtml =
  selectedNamesArr.length
    ? selectedNamesArr.map((n) => `<li>${n}</li>`).join("")
    : (selectedIdsArr.length ? selectedIdsArr.map((id)=>`<li>${id}</li>`).join("") : "<li>—</li>");

// --- type-aware set helpers for CONTACT update: use { id, value } ---
const setText = (id?: string, v?: any) =>
  id && v != null && String(v).trim() !== "" ? { id, value: String(v) } : null;

const setNumber = (id?: string, v?: any) => {
  if (!id) return null;
  const n = Number(v);
  return Number.isFinite(n) ? { id, value: n } : null;
};

const setYesNoText = (id?: string, v?: boolean) =>
  id == null ? null : ({ id, value: v ? "Yes" : "No" });

const setCSV = (id?: string, arr?: any[]) =>
  id && Array.isArray(arr) && arr.length ? { id, value: arr.join(", ") } : null;

// normalize experience to match your picklist: ["0","1-2","3-4","5+"]
function normalizeExperience(raw?: string): string {
  if (!raw) return "";
  const t = String(raw).trim().replace("–", "-"); // swap en–dash to hyphen
  if (t === "0") return "0";
  if (t === "1-2" || t === "1-2 years") return "1-2";
  if (t === "3+" || t === "3-4" || t === "3-4 years") return "3-4";
  if (t === "5+" || t === "5-plus") return "5+";
  return ""; // ignore non-matching
}

const ageNum = Number(body.age || 0);
const experienceFixed =
  normalizeExperience(body.experienceYears || body.experience);
const setYesNo = (id?: string, v?: boolean) =>
  id == null ? null : ({ customFieldId: id, field_value: v ? "Yes" : "No" });

const customFields = [
  setText(CF.DANCER_FIRST, body.dancerFirst),
  setText(CF.DANCER_LAST,  body.dancerLast || ""),
  setNumber(CF.DANCER_AGE, ageNum),

  // U7 vs 7+ branches
  ageNum > 0 && ageNum < 7
    ? setCSV(CF.U7_RECS_CSV, body.classOptionsU7 || [])
    : setCSV(CF.STYLE_CSV,   body.stylePreference || []),

  // Experience only for 7+
  ageNum >= 7 ? setText(CF.EXPERIENCE, experienceFixed) : null,

  // Checkboxes -> booleans
  setYesNoText(CF.TEAM_INT,    !!body.wantsTeam),
  setYesNoText(CF.WANTS_RECS,  !!body.wantsRecs),
  setYesNoText(CF.SMS_CONSENT, !!body.smsConsent),

  // Misc
  setText(CF.CLASS_ID,   selectedIdsCSV),
  setText(CF.CLASS_NAME, selectedNamesCSV), 
  setText(CF.NOTES,        body.notes || ""),
  setText(CF.UTM_SOURCE,   body.utm?.source || ""),
  setText(CF.UTM_MEDIUM,   body.utm?.medium || ""),
  setText(CF.UTM_CAMPAIGN, body.utm?.campaign || ""),
  setText(CF.PAGE_PATH,    body.page || ""),
].filter(Boolean) as Array<{ id: string; value: string | number | boolean }>;

    // ...build selectedClassName and customFields as before ...

const tags: string[] = ["DanceInterest", "Lead-Completed"];
if (body.wantsTeam) tags.push("DanceTeamInterest");
if (body.hasQuestions || body.action === "inquiry") tags.push("NeedHelp");

// Only update fields when policy says it's safe
if (policy === "safe-update") {
  await ghl(`/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify({
      tags,
      customFields, // see fix for SMS below
    }),
  });
} else {
  // conflict-phone: don't touch existing fields — just add a safety tag
  await ghl(`/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify({
      tags: Array.from(new Set([...tags, "Needs-Manual-Review", "Phone-Dupe"])),
    }),
  });
}
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
        <p><strong>Selected Class:</strong></p><ul>${classesHtml}</ul>
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