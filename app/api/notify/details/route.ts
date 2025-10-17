// app/api/notify/details/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

/* ========================  INTERNAL MAIL SETTINGS  ======================== */
// Hardcode your internal ops addresses here (no env, no parent notify)
const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const INTERNAL_FROM = need("EMAIL_FROM");
const INTERNAL_TO = ["jason@myelitedance.com"]; // add/remove as needed

/* =========================================================================
   Types — mirror details/page.tsx payload
   ========================================================================= */
type StudioClass = {
  id: string;
  name: string;
  level: string;
  type: string;
  day: string;
  time: string;
  lengthMinutes: number;
};

type DWItem = { sku: string; name: string; price: number };

type WearByDancer = {
  dancerId: string;
  dancerName: string;
  packageId: string;
  packageName: string;
  items: DWItem[];
  subtotal: number;
};

type ParentInfo = { firstName: string; lastName: string; full?: string };
type Dancer = { id: string; firstName: string; lastName: string; age: number | string };

type Payload = {
  source: "registration-details";
  contactId?: string | null;
  email: string; // parent email (not used for notify recipients)
  parent: ParentInfo;
  pricing: {
    registrationFee: number;
    monthlyTuitionPerDancer: number;
    billDay: number;
  };

  dancers: Dancer[]; // original GHL read

  activeDancerIndex: number;
  activeDancer: {
    id?: string;
    firstName?: string;
    lastName?: string;
    age?: number | string;
    selectedClasses: StudioClass[];
    selectedWeeklyMinutes: number;
    monthlyFromSheet: number;
  };

  registrations: Array<{
    id: string;
    firstName: string;
    lastName: string;
    age: number | string;
    selectedClassIds: Record<string, boolean>;
    selectedWeeklyMinutes: number;
  }>;

  wearByDancer: WearByDancer[];

  totals: {
    reg: number;
    prorated: number;
    wear: number;
    tax?: number;
    today: number;
    monthly: number;
  };

  salesTax?: {
    rate: number; // e.g., 0.0975
    appliesTo: "dance_wear_only";
    activeDancerWearSubtotal: number;
    activeDancerWearTax: number;
  };

  consent: {
    autoPay: boolean;
    signatureDataUrl: string; // data:image/png;base64,...
    termsAcceptedAt: string;  // ISO
  };

  notes?: string;
};

/* =========================================================================
   Small helpers
   ========================================================================= */
const currency = (n: number) => `$${(n || 0).toFixed(2)}`;

const esc = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;`");

/** Convert a data: URL to a Buffer for attachments */
function dataUrlToAttachment(dataUrl?: string) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return undefined;
  const [meta, b64] = dataUrl.split(",", 2);
  const mime = /data:(.+);base64/.exec(meta || "")?.[1] || "image/png";
  try {
    return {
      filename: `signature-${Date.now()}.png`,
      content: Buffer.from(b64, "base64"),
      contentType: mime,
    };
  } catch {
    return undefined;
  }
}

/* =========================================================================
   Email body (HTML + Text)
   ========================================================================= */
function buildHtml(p: Payload) {
  const parentName = p.parent.full || `${p.parent.firstName} ${p.parent.lastName}`.trim();
  const taxPct = typeof p.salesTax?.rate === "number" ? `(${(p.salesTax.rate * 100).toFixed(2)}%)` : "";
  const activeDancerLabel = `${p.activeDancer.firstName || "Dancer"} ${p.activeDancer.lastName || ""}`.trim();

  const classesRows =
    p.activeDancer.selectedClasses.length > 0
      ? p.activeDancer.selectedClasses
          .map(
            (c) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #eee;">${esc(c.name)}</td>
            <td style="padding:6px 8px;border:1px solid #eee;">${esc(c.type)}${c.level ? " • " + esc(c.level) : ""}</td>
            <td style="padding:6px 8px;border:1px solid #eee;">${esc(c.day)} ${esc(c.time)}</td>
            <td style="padding:6px 8px;border:1px solid #eee;text-align:right;">${Number(c.lengthMinutes) || 0} min</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="4" style="padding:8px;border:1px solid #eee;color:#666;">No classes selected</td></tr>`;

  const wearBlocks =
    p.wearByDancer.length > 0
      ? p.wearByDancer
          .map((w) => {
            const items =
              w.items.length > 0
                ? w.items
                    .map(
                      (it) => `
                <tr>
                  <td style="padding:6px 8px;border:1px solid #eee;">${esc(it.name)}</td>
                  <td style="padding:6px 8px;border:1px solid #eee;color:#666;">${esc(it.sku)}</td>
                  <td style="padding:6px 8px;border:1px solid #eee;text-align:right;">${currency(it.price)}</td>
                </tr>`
                    )
                    .join("")
                : `<tr><td colspan="3" style="padding:8px;border:1px solid #eee;color:#666;">No items selected</td></tr>`;

            return `
              <h4 style="margin:16px 0 6px;">${esc(w.dancerName || "Dancer")} — ${esc(w.packageName || "No package")}</h4>
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
                <thead>
                  <tr style="background:#f7f7fb;">
                    <th style="text-align:left;padding:6px 8px;border:1px solid #eee;">Item</th>
                    <th style="text-align:left;padding:6px 8px;border:1px solid #eee;">SKU</th>
                    <th style="text-align:right;padding:6px 8px;border:1px solid #eee;">Price</th>
                  </tr>
                </thead>
                <tbody>${items}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding:8px;border:1px solid #eee;text-align:right;"><strong>Subtotal</strong></td>
                    <td style="padding:8px;border:1px solid #eee;text-align:right;"><strong>${currency(w.subtotal || 0)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            `;
          })
          .join("")
      : `<p style="color:#666;">No dance wear selected for any dancer.</p>`;

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45;color:#111;">
    <h2 style="margin:0 0 6px;color:#8B5CF6;">New Registration Details</h2>
    <p style="margin:0 0 14px;color:#555;">Submitted ${new Date().toLocaleString()}</p>

    <h3 style="margin:18px 0 6px;">Account</h3>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
      <tbody>
        <tr><td style="padding:4px 0;color:#666;width:160px;">Parent</td><td>${esc(parentName)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Email</td><td>${esc(p.email)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">GHL Contact</td><td>${esc(p.contactId || "—")}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Bill Day</td><td>${p.pricing.billDay === 1 ? "1st" : `${p.pricing.billDay}th`}</td></tr>
      </tbody>
    </table>

    <h3 style="margin:18px 0 6px;">Active Dancer</h3>
    <p style="margin:0 0 6px;"><strong>${esc(activeDancerLabel)}</strong> • Age: ${esc(p.activeDancer.age ?? "")}</p>

    <h4 style="margin:12px 0 6px;">Selected Classes</h4>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="background:#f7f7fb;">
          <th style="text-align:left;padding:6px 8px;border:1px solid #eee;">Class</th>
          <th style="text-align:left;padding:6px 8px;border:1px solid #eee;">Type/Level</th>
          <th style="text-align:left;padding:6px 8px;border:1px solid #eee;">When</th>
          <th style="text-align:right;padding:6px 8px;border:1px solid #eee;">Length</th>
        </tr>
      </thead>
      <tbody>${classesRows}</tbody>
    </table>

    <p style="margin:8px 0 0;color:#333;">
      Weekly minutes: <strong>${p.activeDancer.selectedWeeklyMinutes}</strong><br/>
      Monthly tuition (exact from sheet): <strong>${currency(p.activeDancer.monthlyFromSheet || 0)}</strong>
    </p>

    <h3 style="margin:18px 0 6px;">Dance Wear (per dancer)</h3>
    ${wearBlocks}

    <h3 style="margin:18px 0 6px;">Totals (Active Dancer)</h3>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
      <tbody>
        <tr><td style="padding:6px 8px;border:1px solid #eee;">Registration Fee</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right;">${currency(p.totals.reg)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee;">Prorated First Month</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right;">${currency(p.totals.prorated)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #eee;">Dance Wear</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right;">${currency(p.totals.wear)}</td></tr>
        ${typeof p.totals.tax === "number"
          ? `<tr><td style="padding:6px 8px;border:1px solid #eee;">Sales Tax ${(p.salesTax?.rate ?? 0) * 100}%</td><td style="padding:6px 8px;border:1px solid #eee;text-align:right;">${currency(p.totals.tax || 0)}</td></tr>`
          : ""
        }
        <tr>
          <td style="padding:6px 8px;border:1px solid #eee;"><strong>DUE TODAY</strong></td>
          <td style="padding:6px 8px;border:1px solid #eee;text-align:right;"><strong>${currency(p.totals.today)}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 8px;border:1px solid #eee;">DUE MONTHLY</td>
          <td style="padding:6px 8px;border:1px solid #eee;text-align:right;">${currency(p.totals.monthly)}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="margin:18px 0 6px;">Meta</h3>
    <ul style="margin:0 0 6px 18px;padding:0;">
      <li>Auto-Pay consent: <strong>${p.consent?.autoPay ? "Yes" : "No"}</strong></li>
      <li>Terms accepted at: <strong>${esc(p.consent?.termsAcceptedAt || "")}</strong></li>
      ${p.salesTax
        ? `<li>Tax rate used (wear only): <strong>${(p.salesTax.rate * 100).toFixed(2)}%</strong> on ${currency(p.salesTax.activeDancerWearSubtotal)} = ${currency(p.salesTax.activeDancerWearTax)}</li>`
        : ""
      }
    </ul>

    ${p.notes
      ? `<h3 style="margin:18px 0 6px;">Notes from Parent</h3>
         <div style="white-space:pre-wrap;border:1px solid #eee;padding:10px;border-radius:8px;background:#fafafa;">${esc(p.notes)}</div>`
      : ""
    }

    <p style="margin:16px 0 0;color:#777;font-size:12px;">
      Form source: ${esc(p.source)} • Environment: ${esc(process.env.VERCEL_ENV || process.env.NODE_ENV)}
    </p>
  </div>`;
}

function buildText(p: Payload) {
  const parentName = p.parent.full || `${p.parent.firstName} ${p.parent.lastName}`.trim();
  const dancerName = `${p.activeDancer.firstName || "Dancer"} ${p.activeDancer.lastName || ""}`.trim();
  const taxLine = typeof p.totals.tax === "number" ? `Sales Tax: ${currency(p.totals.tax)}\n` : "";

  return [
    `New Registration Details`,
    `Submitted: ${new Date().toLocaleString()}`,
    ``,
    `Account`,
    `  Parent: ${parentName}`,
    `  Email: ${p.email}`,
    `  GHL Contact: ${p.contactId || "-"}`,
    `  Bill Day: ${p.pricing.billDay}`,
    ``,
    `Active Dancer`,
    `  ${dancerName} (Age ${p.activeDancer.age ?? ""})`,
    `  Weekly minutes: ${p.activeDancer.selectedWeeklyMinutes}`,
    `  Monthly (sheet): ${currency(p.activeDancer.monthlyFromSheet || 0)}`,
    ``,
    `Totals (Active)`,
    `  Registration Fee: ${currency(p.totals.reg)}`,
    `  Prorated: ${currency(p.totals.prorated)}`,
    `  Dance Wear: ${currency(p.totals.wear)}`,
    `  ${taxLine}DUE TODAY: ${currency(p.totals.today)}`,
    `  DUE MONTHLY: ${currency(p.totals.monthly)}`,
    ``,
    `Auto-Pay consent: ${p.consent?.autoPay ? "Yes" : "No"}`,
    `Terms accepted at: ${p.consent?.termsAcceptedAt || ""}`,
    p.notes ? `\nNotes:\n${p.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================================================================
   Resend send helper (primary & only)
   ========================================================================= */
async function sendWithResend({
  to,
  from,
  subject,
  html,
  text,
  signatureAttachment,
}: {
  to: string[];
  from: string;
  subject: string;
  html: string;
  text: string;
  signatureAttachment?: { filename: string; content: Buffer; contentType: string };
}) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const attachments = signatureAttachment
    ? [{ filename: signatureAttachment.filename, content: signatureAttachment.content, contentType: signatureAttachment.contentType }]
    : undefined;

  return resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
    attachments,
  });
}

/* =========================================================================
   Route
   ========================================================================= */
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as Payload;

    // Basic validation
    if (payload.source !== "registration-details") {
      return NextResponse.json({ ok: false, error: "Invalid source" }, { status: 400 });
    }
    if (!payload.email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    // Build email
    const html = buildHtml(payload);
    const text = buildText(payload);

    // Subject & recipients (internal only)
    const parentName = payload.parent.full || `${payload.parent.firstName} ${payload.parent.lastName}`.trim();
    const dancerName = `${payload.activeDancer.firstName || "Dancer"} ${payload.activeDancer.lastName || ""}`.trim();
    const subject = `Registration Details — ${parentName} (${dancerName})`;

    // attach signature (PNG)
    const sig = dataUrlToAttachment(payload.consent?.signatureDataUrl);

    await sendWithResend({
      to: INTERNAL_TO,
      from: INTERNAL_FROM,
      subject,
      html,
      text,
      signatureAttachment: sig,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[notify/details] error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}