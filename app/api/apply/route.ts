// =============================
// app/api/apply/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Create a Resend client with your API key in env.
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract fields
    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const email = (formData.get("email") as string) || "";
    const phone = (formData.get("phone") as string) || "";
    const disciplines = (formData.get("disciplines") as string) || "";
    const availability = (formData.get("availability") as string) || "";
    const links = (formData.get("links") as string) || "";
    const source = (formData.get("source") as string) || "teach-page";

    // Attachment (optional)
    const file = formData.get("attachment") as File | null;

    let attachments: { filename: string; content: Buffer }[] = [];
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      attachments.push({ filename: file.name, content: buffer });
    }

    // Build a nice HTML email
    const subject = `New Teaching Application – ${firstName} ${lastName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2 style="margin:0 0 8px;">New Teaching Application</h2>
        <p style="margin:0 0 16px; color:#374151;">Source: ${source}</p>
        <table style="border-collapse:collapse; width:100%; max-width:680px;">
          <tbody>
            <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Name</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${firstName} ${lastName}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Email</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${email}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Phone</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${phone}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Disciplines</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${disciplines}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Availability</strong></td><td style="padding:8px; border-bottom:1px solid #eee; white-space:pre-wrap;">${availability}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Links</strong></td><td style="padding:8px; border-bottom:1px solid #eee;">${links}</td></tr>
          </tbody>
        </table>
        <p style="margin-top:16px; color:#6b7280;">This message was sent from the Teach page on myelitedance.com.</p>
      </div>
    `;

    // CHANGE THESE to your desired from/to
    const toAddress = process.env.APPLY_TO_EMAIL || "info@myelitedance.com";
    const fromAddress = process.env.APPLY_FROM_EMAIL || "Elite Dance <no-reply@myelitedance.com>";

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      replyTo: email ? [email] : undefined,
      subject,
      html,
      attachments,
    });

    if (error) {
      console.error("Resend error", error);
      return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unable to process application." }, { status: 500 });
  }
}