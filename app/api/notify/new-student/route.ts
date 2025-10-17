import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const RESEND_API_KEY = need("RESEND_API_KEY");
const NOTIFY_FROM = need("EMAIL_FROM");
const NOTIFY_TO = "jason@myelitedance.com"

const resend = new Resend(RESEND_API_KEY);

function htmlEscape(s: any) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
const kv = (label: string, value: any) => `
  <tr>
    <td style="padding:6px 10px;font-weight:600;background:#fafafa;border:1px solid #eee;">${htmlEscape(label)}</td>
    <td style="padding:6px 10px;border:1px solid #eee;">${htmlEscape(value)}</td>
  </tr>`;

function decodeDataUrl(dataUrl?: string) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1] || "image/png";
  const b64 = m[2];
  return { mime, b64, buf: Buffer.from(b64, "base64") };
}
function formatDateMDY(input?: any): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // Accept "YYYY-MM-DD" or anything Date can parse; prefer the ISO path so it’s stable.
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  let d: Date | null = null;
  if (iso.test(s)) {
    const [y, m, day] = s.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) d = new Date(t);
  }
  if (!d || Number.isNaN(d.valueOf())) return s; // fallback: show as-is
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatPhone10(input?: any): string {
  const digits = String(input ?? "").replace(/\D+/g, "");
  if (digits.length !== 10) return String(input ?? ""); // leave non-10-digit as-is
  const area = digits.slice(0, 3);
  const exch = digits.slice(3, 6);
  const line = digits.slice(6);
  return `${area}-${exch}-${line}`; // xxx-xxx-xxxx
}
function renderHtml(form: any) {
  const studentName =
    `${form.studentFirstName || ""} ${form.studentLastName || ""}`.trim() || "(unknown)";

  const addl = Array.isArray(form.additionalStudents) ? form.additionalStudents : [];
  const addlHtml =
    addl.length === 0
      ? `<div style="color:#6b7280;">(No additional students)</div>`
      : `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin-top:8px;border:1px solid #eee;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 10px;background:#f3f4f6;border:1px solid #eee;">#</th>
              <th style="text-align:left;padding:6px 10px;background:#f3f4f6;border:1px solid #eee;">First</th>
              <th style="text-align:left;padding:6px 10px;background:#f3f4f6;border:1px solid #eee;">Last</th>
              <th style="text-align:left;padding:6px 10px;background:#f3f4f6;border:1px solid #eee;">Birthdate</th>
              <th style="text-align:left;padding:6px 10px;background:#f3f4f6;border:1px solid #eee;">Age</th>
            </tr>
          </thead>
          <tbody>
            ${addl
              .map(
                (s: any, i: number) => `
                <tr>
                  <td style="padding:6px 10px;border:1px solid #eee;">${i + 2}</td>
                  <td style="padding:6px 10px;border:1px solid #eee;">${htmlEscape(s.firstName)}</td>
                  <td style="padding:6px 10px;border:1px solid #eee;">${htmlEscape(s.lastName)}</td>
                  <td style="padding:6px 10px;border:1px solid #eee;">${htmlEscape(formatDateMDY(s.birthdate))}</td>
                  <td style="padding:6px 10px;border:1px solid #eee;">${htmlEscape(s.age)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>`;

  const benefitsList = Array.isArray(form.benefits) ? form.benefits.join(", ") : form.benefits || "";
  const primaryPhoneFmt = formatPhone10(form.primaryPhone);
  const altPhoneFmt = formatPhone10(form.altPhone);
  const birthdateFmt = formatDateMDY(form.birthdate);
  const waiverDateFmt = formatDateMDY(form.waiverDate);

 return `
  <div style="font:14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <h2 style="margin:0 0 12px;">NEW STUDENT Form — ${htmlEscape(studentName)}</h2>

    <h3 style="margin:18px 0 8px;">Student</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #eee;">
      ${kv("First Name", form.studentFirstName)}
      ${kv("Last Name", form.studentLastName)}
      ${kv("Birthdate", birthdateFmt)}
      ${kv("Age", form.age)}
    </table>

    <h3 style="margin:18px 0 8px;">Additional Students</h3>
    ${addlHtml}

    <h3 style="margin:18px 0 8px;">Parent / Guardian</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #eee;">
      ${kv("Parent/Guardian 1", form.parent1)}
      ${kv("Parent/Guardian 2", form.parent2)}
    </table>

    <h3 style="margin:18px 0 8px;">Contact</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #eee;">
      ${kv("Primary Phone", primaryPhoneFmt)}
      ${kv("Primary Phone Is Cell", form.primaryPhoneIsCell ? "Yes" : "No")}
      ${kv("Primary Phone SMS Opt-In", form.primaryPhoneSmsOptIn ? "Yes" : "No")}
      ${kv("Alternate Phone", altPhoneFmt)}
      ${kv("Alt Phone Is Cell", form.altPhoneIsCell ? "Yes" : "No")}
      ${kv("Alt Phone SMS Opt-In", form.altPhoneSmsOptIn ? "Yes" : "No")}
      ${kv("Email", form.email)}
      ${kv("Street", form.street)}
      ${kv("City", form.city)}
      ${kv("State", form.state)}
      ${kv("Zip", form.zip)}
    </table>

    <h3 style="margin:18px 0 8px;">Marketing</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #eee;">
      ${kv("How did you hear about us?", form.hearAbout)}
      ${kv("Details", form.hearAboutDetails)}
      ${kv("Benefits (other)", form.benefitsOther)}
      ${kv("Benefits (list)", benefitsList)}
      ${kv("Area 6–12 mo", form.area6to12mo || "")}
    </table>

    <h3 style="margin:18px 0 8px;">Waiver</h3>
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #eee;">
      ${kv("Acknowledged", form.waiverAcknowledged ? "Yes" : "No")}
      ${kv("Signed", form.waiverSigned ? "Yes" : "No")}
      ${kv("Signed Date", waiverDateFmt)}
    </table>

    ${
      form.signatureDataUrl
        ? `<p style="margin:16px 0 6px;">Signature:</p>
           <img alt="Signature" src="cid:signature.png" style="max-width:520px;border:1px solid #eee" />`
        : `<p style="margin:16px 0;color:#6b7280;">(No signature image provided)</p>`
    }
  </div>`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

    // Accept either { form } or a flat form object:
    const form = body.form ?? body;
    const studentName =
      `${form.studentFirstName || ""} ${form.studentLastName || ""}`.trim() || "New Student";
    const subject = `NEW STUDENT Form - ${studentName}`;

    const attachments: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
      contentId?: string;
    }> = [];

    // Signature attachment (inline via CID)
    const sig = decodeDataUrl(form.signatureDataUrl);
    if (sig) {
      attachments.push({
        filename: "signature.png",
        content: sig.buf,
        contentType: sig.mime,
        contentId: "signature.png", // matches cid: in HTML
      });
    }

    // Raw JSON attachment (optional)
    attachments.push({
      filename: "submission.json",
      content: Buffer.from(JSON.stringify(form, null, 2)),
      contentType: "application/json",
    });

    const html = renderHtml(form);

    const { error, data } = await resend.emails.send({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject,
      html,
      attachments,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ ok: false, error: String(error) }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e: any) {
    console.error("notify/new-student error", e);
    return NextResponse.json({ ok: false, error: e?.message || "Send failed" }, { status: 500 });
  }
}