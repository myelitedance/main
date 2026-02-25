import { NextResponse } from "next/server";
import { Resend } from "resend";
import { pool } from "@/lib/db";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";

type CongratsSize = "none" | "quarter" | "half" | "full";
type PaymentOption = "charge_account" | "pay_now";

const MESSAGE_LIMITS: Record<CongratsSize, number> = {
  none: 0,
  quarter: 120,
  half: 240,
  full: 500,
};

const YEARBOOK_AMOUNT_CENTS = 2000;
const AD_AMOUNT_CENTS: Record<CongratsSize, number> = {
  none: 0,
  quarter: 2500,
  half: 5000,
  full: 10000,
};

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

function need(k: string) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}

const resend = new Resend(process.env.RESEND_API_KEY!);
const EMAIL_FROM = need("EMAIL_FROM");

function asText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function adDisplay(size: CongratsSize): string {
  if (size === "quarter") return "1/4 page dancer congratulations";
  if (size === "half") return "1/2 page dancer congratulations";
  if (size === "full") return "Full page dancer congratulations";
  return "None";
}

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const formData = await req.formData();

    const parentFirstName = asText(formData, "parentFirstName");
    const parentLastName = asText(formData, "parentLastName");
    const parentEmail = asText(formData, "parentEmail").toLowerCase();
    const parentPhone = asText(formData, "parentPhone");
    const dancerFirstName = asText(formData, "dancerFirstName");
    const dancerLastName = asText(formData, "dancerLastName");
    const yearbookRequested = asText(formData, "yearbookRequested") === "true";
    const congratsSizeRaw = asText(formData, "congratsSize");
    const congratsMessage = asText(formData, "congratsMessage");
    const paymentOptionRaw = asText(formData, "paymentOption");
    const photos = formData.getAll("congratsPhotos").filter((item): item is File => item instanceof File);

    if (
      !parentFirstName ||
      !parentLastName ||
      !parentEmail ||
      !parentPhone ||
      !dancerFirstName ||
      !dancerLastName
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!isValidEmail(parentEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!isValidPhone(parentPhone)) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }

    if (!["none", "quarter", "half", "full"].includes(congratsSizeRaw)) {
      return NextResponse.json({ error: "Invalid congratulations option." }, { status: 400 });
    }

    if (!["charge_account", "pay_now"].includes(paymentOptionRaw)) {
      return NextResponse.json({ error: "Invalid payment option." }, { status: 400 });
    }

    const congratsSize = congratsSizeRaw as CongratsSize;
    const paymentOption = paymentOptionRaw as PaymentOption;
    const messageLimit = MESSAGE_LIMITS[congratsSize];

    if (!yearbookRequested && congratsSize === "none") {
      return NextResponse.json(
        { error: "At least one item must be selected (yearbook or congratulations ad)." },
        { status: 400 }
      );
    }

    if (congratsSize === "none") {
      if (congratsMessage.length > 0 || photos.length > 0) {
        return NextResponse.json(
          { error: "Message/photos require a dancer congratulations selection." },
          { status: 400 }
        );
      }
    } else {
      if (!congratsMessage) {
        return NextResponse.json({ error: "A congratulations message is required." }, { status: 400 });
      }
      if (congratsMessage.length > messageLimit) {
        return NextResponse.json(
          { error: `Message exceeds ${messageLimit} characters for selected ad size.` },
          { status: 400 }
        );
      }
    }

    if (photos.length > 5) {
      return NextResponse.json({ error: "Maximum 5 photos allowed." }, { status: 400 });
    }

    for (const photo of photos) {
      if (photo.size <= 0) {
        return NextResponse.json({ error: "One or more photos are empty." }, { status: 400 });
      }
      if (photo.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Photo ${photo.name} exceeds 10MB limit.` },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIME_TYPES.has(photo.type)) {
        return NextResponse.json(
          { error: `Photo type not allowed: ${photo.type || "unknown"}.` },
          { status: 400 }
        );
      }
    }

    const yearbookAmountCents = yearbookRequested ? YEARBOOK_AMOUNT_CENTS : 0;
    const congratsAmountCents = AD_AMOUNT_CENTS[congratsSize];
    const totalAmountCents = yearbookAmountCents + congratsAmountCents;

    await client.query("BEGIN");

    const insertRes = await client.query(
      `
      INSERT INTO recital_preorders (
        parent_first_name,
        parent_last_name,
        parent_email,
        parent_phone,
        dancer_first_name,
        dancer_last_name,
        yearbook_requested,
        congrats_size,
        congrats_message,
        congrats_message_max,
        yearbook_amount_cents,
        congrats_amount_cents,
        total_amount_cents,
        payment_option,
        payment_status,
        xero_sync_status
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14,
        CASE WHEN $14 = 'pay_now' THEN 'queued_for_xero' ELSE 'pending' END,
        CASE WHEN $14 = 'pay_now' THEN 'pending' ELSE 'not_configured' END
      )
      RETURNING id, created_at
      `,
      [
        parentFirstName,
        parentLastName,
        parentEmail,
        parentPhone,
        dancerFirstName,
        dancerLastName,
        yearbookRequested,
        congratsSize,
        congratsSize === "none" ? null : congratsMessage,
        messageLimit,
        yearbookAmountCents,
        congratsAmountCents,
        totalAmountCents,
        paymentOption,
      ]
    );

    const preorderId = insertRes.rows[0].id as string;
    const submittedAt = insertRes.rows[0].created_at as string;

    for (let i = 0; i < photos.length; i += 1) {
      const file = photos[i];
      const uploadPathPrefix = `recital-preorders/${preorderId}/photo-${i + 1}-${Date.now()}`;
      const url = await uploadImage(file, uploadPathPrefix);

      await client.query(
        `
        INSERT INTO recital_preorder_photos (
          preorder_id,
          file_url,
          file_name,
          file_size_bytes,
          mime_type,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [preorderId, url, file.name, file.size, file.type, i + 1]
      );
    }

    await client.query("COMMIT");

    const xeroPayNowNote =
      paymentOption === "pay_now"
        ? "Pay now selected. Xero checkout integration is being finalized; front desk will follow up with payment instructions."
        : "Studio account charge requested.";

    const photoLines = photos.length > 0 ? `<p><strong>Photos uploaded:</strong> ${photos.length}</p>` : "";

    const safeParentFirstName = escapeHtml(parentFirstName);
    const safeParentLastName = escapeHtml(parentLastName);
    const safeParentEmail = escapeHtml(parentEmail);
    const safeParentPhone = escapeHtml(parentPhone);
    const safeDancerFirstName = escapeHtml(dancerFirstName);
    const safeDancerLastName = escapeHtml(dancerLastName);
    const safeCongratsMessage = escapeHtml(congratsMessage);

    const html = `
      <div style="font-family:Arial, sans-serif;font-size:16px;color:#222;line-height:1.4;">
        <h2 style="margin:0 0 12px 0;">PREORDER Received</h2>
        <p><strong>Order ID:</strong> ${preorderId}</p>
        <p><strong>Submitted:</strong> ${submittedAt}</p>

        <h3 style="margin-top:20px;">Parent</h3>
        <p>${safeParentFirstName} ${safeParentLastName}</p>
        <p>${safeParentEmail}</p>
        <p>${safeParentPhone}</p>

        <h3 style="margin-top:20px;">Dancer</h3>
        <p>${safeDancerFirstName} ${safeDancerLastName}</p>

        <h3 style="margin-top:20px;">Selections</h3>
        <p><strong>Yearbook:</strong> ${yearbookRequested ? "Yes" : "No"} (${formatDollars(yearbookAmountCents)})</p>
        <p><strong>Dancer Congratulations:</strong> ${adDisplay(congratsSize)} (${formatDollars(congratsAmountCents)})</p>
        ${
          congratsSize === "none"
            ? ""
            : `<p><strong>Message (${congratsMessage.length}/${messageLimit}):</strong> ${safeCongratsMessage}</p>`
        }
        ${photoLines}

        <h3 style="margin-top:20px;">Payment</h3>
        <p><strong>Option:</strong> ${paymentOption === "pay_now" ? "Pay now" : "Charge my studio account"}</p>
        <p>${xeroPayNowNote}</p>

        <p style="margin-top:20px;font-size:18px;"><strong>Total: ${formatDollars(totalAmountCents)}</strong></p>
      </div>
    `;

    await resend.emails.send({
      from: EMAIL_FROM,
      to: [parentEmail, "jason@myelitedance.com"],
      subject: "PREORDER Received",
      html,
    });

    return NextResponse.json({
      success: true,
      preorderId,
      paymentOption,
      totalAmountCents,
      payNowIntegrationStatus: paymentOption === "pay_now" ? "pending_xero_setup" : null,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("Preorder submission failed:", err);
    return NextResponse.json(
      { error: "Failed to save preorder. Please try again." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
