import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      accountName,
      accountEmail,
      studentName,
      studentId,
      classes,
      baseTotal,
      multiClassDiscount,
      familyDiscount,
      finalTotal,
      autoCharge,
      isAdditionalDancer,
      signature,
      submittedAt,
    } = body;

    if (!accountEmail || !studentName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Build class list with * for ineligible classes
    const classLinesHTML = classes
      .map(
        (c: any) =>
          `<li>${c.allowMultiDiscount ? "" : "* "}${c.className} – $${c.price}</li>`
      )
      .join("");

    // Bottom footnote (only if needed)
    const footnoteHTML = classes.some((c: any) => !c.allowMultiDiscount)
      ? `<p style="color:#666;font-size:14px;">* Ineligible for Multi-Class Discount</p>`
      : "";

    // Sibling discount
    const siblingHTML = isAdditionalDancer
      ? `<p><strong>Sibling Discount:</strong> -$50</p>`
      : "";

    // Auto-charge block
    const remainingBalance = Math.max(finalTotal - 100, 0);

    const autoChargeHTML = autoCharge
      ? `
        <h3 style="margin-top:24px;">Auto-Charge Authorization</h3>
        <p>You have elected to be auto-charged for your recital fees:</p>
        <ul>
          <li><strong>$100</strong> will be charged on <strong>December 15th</strong>.</li>
          <li><strong>$${remainingBalance}</strong> will be charged on <strong>January 15th</strong>.</li>
        </ul>
        <p style="font-size:14px;color:#666;">
          By selecting Auto-Charge, you authorize Elite Dance & Music to charge the card on file for these amounts.
        </p>
      `
      : `
        <h3 style="margin-top:24px;">Auto-Charge Authorization</h3>
        <p style="font-size:15px;color:#555;">
          <strong>You did NOT select Auto-Charge.</strong>  
          You will need to make recital payments manually at the front desk or via your Akada account.
        </p>
      `;

    // Final email HTML
    const html = `
      <div style="font-family:Arial, sans-serif;font-size:16px;color:#333;">
        <h2 style="color:#8B5CF6;">Elite Dance 2026 Recital Submission</h2>

        <p><strong>Account:</strong> ${accountName}</p>
        <p><strong>Parent Email:</strong> ${accountEmail}</p>
        <p><strong>Student:</strong> ${studentName}</p>
        <p><strong>Student ID:</strong> ${studentId}</p>

        <h3 style="margin-top:24px;">Recital Classes</h3>
        <ul>
          ${classLinesHTML}
        </ul>

        <p><strong>Base Total:</strong> $${baseTotal}</p>
        <p><strong>Multi-Class Discount:</strong> -$${multiClassDiscount}</p>
        ${siblingHTML}

        <p style="font-size:18px;margin-top:12px;">
          <strong>Final Total: $${finalTotal}</strong>
        </p>

        ${footnoteHTML}

        ${autoChargeHTML}

        <p style="margin-top:20px;"><strong>Signature:</strong> ${signature}</p>

        <p style="margin-top:20px;font-size:14px;color:#777;">
          Submitted: ${submittedAt}
        </p>

        <hr style="margin-top:24px;border:none;border-top:1px solid #ddd;" />

        <p style="font-size:14px;color:#777;">
          This email confirms your 2026 Recital selection submission with Elite Dance & Music.
        </p>
      </div>
    `;

    // Send to parent + studio
    await resend.emails.send({
      from: "Elite Dance <frontdesk@myelitedance.com>",
      to: [accountEmail, "jason@myelitedance.com"],
      subject: "2026 Recital Submission Confirmation",
      html,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Email send error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
