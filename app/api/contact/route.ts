// /app/api/contact/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const RESEND_API_KEY = requireEnv("RESEND_API_KEY");
const EMAIL_FROM     = requireEnv("EMAIL_FROM"); // e.g. "Elite Dance <hello@myelitedance.com>"
const EMAIL_TO       = requireEnv("EMAIL_TO");   // e.g. "frontdesk@myelitedance.com"

const resend = new Resend(RESEND_API_KEY);

// Helper: read JSON or form-encoded bodies
async function readBody(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await req.json();
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  const obj: Record<string, string> = {};
  params.forEach((v, k) => (obj[k] = v));
  return obj;
}

export async function POST(req: NextRequest) {
  try {
    const { parent, phone, email, dancer, interest, message, hp } = await readBody(req);

    // Honeypot (optional): if bots fill `hp`, drop it silently
    if (hp) {
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    // Basic validation
    if (!parent || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const html = `
      <h2>New Message Inquiry</h2>
      <p><strong>Parent/Guardian Name:</strong> ${escapeHtml(parent)}</p>
      <p><strong>Phone Number:</strong> ${escapeHtml(phone || "")}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Dancer Info:</strong> ${escapeHtml(dancer || "")}</p>
      <p><strong>Interested In:</strong> ${escapeHtml(interest || "")}</p>
      <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `;

    const { error, data } = await resend.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: "Potential Customer Wants More Information!",
      replyTo: email, // Resend v4 uses "replyTo"
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: (error as any).message || "Email send failed" }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("contact route error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

export function GET() {
  // Health check
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
}