import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
};

const RESEND_API_KEY = requireEnv("RESEND_API_KEY");
const EMAIL_FROM = requireEnv("EMAIL_FROM");
const SPONSORSHIP_TO = "jason@myelitedance.com";

const resend = new Resend(RESEND_API_KEY);

type SponsorshipPayload = {
  name?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  message?: string;
  hp?: string;
};

function esc(value: string): string {
  return (value || "").replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SponsorshipPayload;
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const businessName = String(body.businessName || "").trim();
    const phone = String(body.phone || "").trim();
    const message = String(body.message || "").trim();
    const hp = String(body.hp || "").trim();

    // Bot trap: silently accept.
    if (hp) return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const html = `
      <h2>New Recital Sponsorship Inquiry</h2>
      <p><strong>Name:</strong> ${esc(name)}</p>
      <p><strong>Business Name:</strong> ${esc(businessName)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Phone:</strong> ${esc(phone)}</p>
      <p><strong>Message:</strong><br>${esc(message).replace(/\n/g, "<br>")}</p>
    `;

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: SPONSORSHIP_TO,
      subject: "Recital Sponsorship Inquiry",
      replyTo: email,
      html,
    });

    if (error) {
      return NextResponse.json({ error: (error as any).message || "Failed to send inquiry." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

