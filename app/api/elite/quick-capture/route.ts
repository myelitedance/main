// app/api/elite/quick-capture/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function toE164US(input?: string): string | null {
  if (!input) return null;
  // strip non-digits
  const digits = input.replace(/\D+/g, "");
  if (!digits) return null;

  // Handle US common cases
  // 10 digits -> add +1, 11 digits starting with 1 -> +1 + rest
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Already E.164-ish (+ then 11+ digits)
  if (/^\+[\d]{11,15}$/.test(input)) return input;

  return null; // let the caller decide what to do if invalid
}

export async function POST(req: NextRequest) {
  try {
    const {
      parentFirst,
      parentLast,
      parentPhone,
      email,
      dancerFirst,
      dancerLast,
      age,
      interest,
      notes,
      utm,
      page,
    } = await req.json();

    const need = (k: string) => {
      const v = process.env[k];
      if (!v) throw new Error(`Missing env: ${k}`);
      return v;
    };

    const GHL_API     = "https://services.leadconnectorhq.com";
    const GHL_KEY     = need("GHL_API_KEY");
    const LOCATION_ID = need("GHL_LOCATION_ID");
    const EMAIL_FROM   = need("EMAIL_FROM");
    const FRONTDESK_TO = process.env.FRONTDESK_TO || "frontdesk@myelitedance.com";
    const resend       = new Resend(process.env.RESEND_API_KEY || "");
    

    // sanitize phone for GHL
    const phoneE164 = toE164US(parentPhone);

    // Build upsert payload; include phone only if valid
    const upsertBody: any = {
      locationId: LOCATION_ID,
      firstName: parentFirst,
      lastName: parentLast,
      email,
      source: utm?.source || "Website",
      tags: ["Website Lead", interest].filter(Boolean),
      // customFields: [...]
    };
    if (phoneE164) upsertBody.phone = phoneE164;

    // If neither email nor valid phone present, fail early with 400
    if (!upsertBody.email && !upsertBody.phone) {
      return NextResponse.json(
        { error: "Please include a valid email or phone number." },
        { status: 400 }
      );
    }

    const upsertRes = await fetch(`${GHL_API}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_KEY}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(upsertBody),
    });

    const upsertJson = await upsertRes.json();
    if (!upsertRes.ok) {
      console.error("GHL upsert error", upsertRes.status, upsertJson);
      return NextResponse.json({ error: upsertJson }, { status: upsertRes.status });
    }

    const contactId =
      upsertJson?.contact?.id || upsertJson?.id || upsertJson?.data?.id;

    if (contactId && notes) {
      await fetch(`${GHL_API}/contacts/${contactId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_KEY}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          body:
            `${notes}\n\n` +
            `Interest: ${interest}\n` +
            (dancerFirst || dancerLast
              ? `Dancer: ${[dancerFirst, dancerLast].filter(Boolean).join(" ")}${age ? `, Age ${age}` : ""}\n`
              : "") +
            (page ? `Page: ${page}\n` : "") +
            (utm?.campaign || utm?.medium || utm?.source
              ? `UTM: ${utm?.source || ""} / ${utm?.medium || ""} / ${utm?.campaign || ""}`
              : ""),
        }),
      });
    }
    // Email front desk (unchanged)
    if (process.env.RESEND_API_KEY) {
      const subject = upsertBody.action === "inquiry" ? "Trial Class Inquiry" : "Trial Class Registration";
      const html = `
        <h2>${subject}</h2>
        <p><strong>Parent:</strong> ${parentFirst || ""} ${parentLast || ""}</p>
        <p><strong>Email:</strong> ${email || ""}</p>
        ${parentPhone ? `<p><strong>Phone:</strong> ${parentPhone}</p>` : ""}
        <p><strong>Dancer:</strong> ${dancerFirst || ""} ${dancerLast || ""}</p>
        <p><strong>Age:</strong> ${age || ""}</p>
        <p><strong>Notes:</strong><br>${(notes || "").replace(/\n/g,"<br>")}</p>
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
    console.error("quick-capture server error", err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}