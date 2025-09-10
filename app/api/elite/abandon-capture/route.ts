// /app/api/elite/abandon-capture/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const GHL_API = "https://services.leadconnectorhq.com";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};
const GHL_KEY      = need("GHL_API_KEY");
const LOCATION_ID  = need("GHL_LOCATION_ID");
const ABANDON_TAG  = process.env.GHL_ABANDON_TAG || "Lead-Abandoned"; // create a workflow that triggers on this tag

function headers() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${GHL_KEY}`,
    Version: "2021-07-28",
  };
}
async function ghl(path: string, init: RequestInit = {}) {
  const r = await fetch(`${GHL_API}${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`GHL ${path} ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); // { parentFirst,parentLast,email, parentPhone?, dancerFirst?, age? }

    if (!body?.email) return NextResponse.json({ ok: true, skipped: "no email" });
    // upsert + tag, swallow duplicate logic
    try {
      const res = await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          locationId: LOCATION_ID,
          firstName: body.parentFirst || "",
          lastName:  body.parentLast  || "",
          email:     body.email,
          phone:     body.parentPhone || "",
          tags:      [ABANDON_TAG, "EliteLead"],
          source:    body.utm?.source || "Website",
        }),
      });
      return NextResponse.json({ ok: true, contactId: res.contact?.id || res.id });
    } catch (e: any) {
      const msg = String(e?.message || "");
      const json = msg.includes("{") ? JSON.parse(msg.slice(msg.indexOf("{"))) : null;
      if (json?.statusCode === 400 && json?.meta?.contactId) {
        // Already exists: just patch tags to ensure the workflow fires
        await ghl(`/contacts/${json.meta.contactId}`, { method: "PUT", body: JSON.stringify({ tags: [ABANDON_TAG] }) });
        return NextResponse.json({ ok: true, contactId: json.meta.contactId, deduped: true });
      }
      throw e;
    }
  } catch (err: any) {
    console.error("abandon-capture error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 200 }); // don’t block unload
  }
}