// app/api/send-recital-confirmation/route.ts

import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      accountName,
      accountEmail,
      studentName,
      classes,
      total,
      signature,
      submittedAt,
    } = data;

    const html = `
      <h2>2026 Recital Submission</h2>
      <p><strong>Account:</strong> ${accountName}</p>
      <p><strong>Parent Email:</strong> ${accountEmail}</p>
      <p><strong>Student:</strong> ${studentName}</p>

      <h3>Selected Classes</h3>
      <ul>
        ${classes
          .map(
            (c: any) =>
              `<li>${c.className} — $${c.price} (Yes)</li>`
          )
          .join("")}
      </ul>

      <p><strong>Total:</strong> $${total}</p>
      <p><strong>Signature:</strong> ${signature}</p>
      <p><strong>Submitted:</strong> ${new Date(
        submittedAt
      ).toLocaleString()}</p>
    `;

    await resend.emails.send({
      from: "frontdesk@myelitedance.com",
      to: [accountEmail, "frontdesk@myelitedance.com"],
      subject: "2026 Recital Submission — Confirmation",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Email failed" },
      { status: 500 }
    );
  }
}
