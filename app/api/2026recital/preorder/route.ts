import { NextResponse } from "next/server";
import { Resend } from "resend";
import { pool } from "@/lib/db";
import { uploadImage } from "@/lib/storage";
import { createXeroInvoiceForPreorder } from "@/lib/xero";

export const runtime = "nodejs";

type PaymentOption = "charge_account" | "pay_now";
type CalloutTier = "quarter" | "half" | "full";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  taxable: boolean;
  xero_account_code: string;
  xero_tax_type: string;
};

const CALL_OUT_CHAR_LIMITS: Record<CalloutTier, number> = {
  quarter: 120,
  half: 240,
  full: 360,
};

const CALL_OUT_PHOTO_LIMITS: Record<CalloutTier, number> = {
  quarter: 1,
  half: 2,
  full: 3,
};

const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024;

const resend = new Resend(process.env.RESEND_API_KEY!);

function needEnv(k: string) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}

const EMAIL_FROM = needEnv("EMAIL_FROM");
const FRONTDESK_EMAIL = "frontdesk@myelitedance.com";

function extractEmailAddress(fromValue: string): string {
  const m = fromValue.match(/<([^>]+)>/);
  return (m?.[1] ?? fromValue).trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

function parseTaxRate(): number {
  const raw = Number(process.env.PREORDER_SALES_TAX_RATE ?? process.env.NEXT_PUBLIC_SALES_TAX_RATE ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw > 1 ? raw / 100 : raw;
}

function dollars(cents: number): string {
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

function detectCalloutTier(name: string): CalloutTier | null {
  const n = name.toLowerCase();
  const isCallout = n.includes("callout") || n.includes("congrat");
  if (!isCallout) return null;

  if (n.includes("1/4") || n.includes("quarter")) return "quarter";
  if (n.includes("1/2") || n.includes("half")) return "half";
  if (n.includes("full")) return "full";
  return null;
}

export async function POST(req: Request) {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const formData = await req.formData();

    const paymentOption = String(formData.get("paymentOption") ?? "") as PaymentOption;
    const customerType = paymentOption === "charge_account" ? "akada" : "guest";
    const akadaChargeAuthorized = String(formData.get("akadaChargeAuthorized") ?? "false") === "true";

    const parentFirstName = String(formData.get("parentFirstName") ?? "").trim();
    const parentLastName = String(formData.get("parentLastName") ?? "").trim();
    const parentEmail = String(formData.get("parentEmail") ?? "").trim().toLowerCase();
    const parentPhone = String(formData.get("parentPhone") ?? "").trim();

    const itemsRaw = String(formData.get("items") ?? "[]");
    const parsedItems = JSON.parse(itemsRaw) as Array<{ productId: string; quantity: number }>;
    const items = Array.isArray(parsedItems)
      ? parsedItems
          .map((i) => ({ productId: String(i.productId ?? "").trim(), quantity: Number(i.quantity ?? 0) }))
          .filter((i) => i.productId.length > 0 && Number.isFinite(i.quantity) && i.quantity > 0)
      : [];

    const calloutTierRaw = String(formData.get("calloutTier") ?? "").trim();
    const calloutMessage = String(formData.get("calloutMessage") ?? "").trim();
    const calloutPhotos = formData.getAll("calloutPhotos").filter((x): x is File => x instanceof File && x.size > 0);

    if (paymentOption !== "charge_account" && paymentOption !== "pay_now") {
      return NextResponse.json({ error: "Invalid payment option." }, { status: 400 });
    }

    if (!parentFirstName || !parentLastName || !parentEmail || !parentPhone) {
      return NextResponse.json({ error: "Missing required contact fields." }, { status: 400 });
    }

    if (!isValidEmail(parentEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!isValidPhone(parentPhone)) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Please select at least one product." }, { status: 400 });
    }

    if (paymentOption === "charge_account" && !akadaChargeAuthorized) {
      return NextResponse.json(
        { error: "Authorization is required for studio account charge." },
        { status: 400 }
      );
    }

    const uniqueProductIds = [...new Set(items.map((i) => i.productId))];

    const productsRes = await client.query<ProductRow>(
      `
      SELECT id, name, description, price_cents, taxable, xero_account_code, xero_tax_type
      FROM public.recital_preorder_products
      WHERE is_active = true
        AND id = ANY($1::uuid[])
      `,
      [uniqueProductIds]
    );

    const productMap = new Map(productsRes.rows.map((p) => [p.id, p]));

    const selectedCalloutProducts = items
      .map((it) => {
        const p = productMap.get(it.productId);
        if (!p) return null;
        const tier = detectCalloutTier(p.name);
        if (!tier) return null;
        return { item: it, product: p, tier };
      })
      .filter((x): x is { item: { productId: string; quantity: number }; product: ProductRow; tier: CalloutTier } => Boolean(x));

    const uniqueCalloutTiers = [...new Set(selectedCalloutProducts.map((x) => x.tier))];
    if (uniqueCalloutTiers.length > 1) {
      return NextResponse.json({ error: "Select only one dancer callout size." }, { status: 400 });
    }

    const activeCalloutTier = uniqueCalloutTiers.length === 1 ? uniqueCalloutTiers[0] : null;

    if (activeCalloutTier) {
      const calloutLine = selectedCalloutProducts[0];
      if (calloutLine.item.quantity !== 1) {
        return NextResponse.json({ error: "Dancer callout quantity must be 1." }, { status: 400 });
      }

      if (calloutTierRaw && calloutTierRaw !== activeCalloutTier) {
        return NextResponse.json({ error: "Callout tier mismatch in submission." }, { status: 400 });
      }

      const maxChars = CALL_OUT_CHAR_LIMITS[activeCalloutTier];
      const maxPhotos = CALL_OUT_PHOTO_LIMITS[activeCalloutTier];

      if (!calloutMessage) {
        return NextResponse.json({ error: "Callout message is required." }, { status: 400 });
      }

      if (calloutMessage.length > maxChars) {
        return NextResponse.json(
          { error: `Callout message must be ${maxChars} characters or less.` },
          { status: 400 }
        );
      }

      if (calloutPhotos.length > maxPhotos) {
        return NextResponse.json(
          { error: `You can upload up to ${maxPhotos} photo${maxPhotos === 1 ? "" : "s"} for this callout.` },
          { status: 400 }
        );
      }

      const totalBytes = calloutPhotos.reduce((sum, f) => sum + f.size, 0);
      if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "Total upload size is too large. Please use smaller photos (about 4MB total max)." },
          { status: 400 }
        );
      }
    } else if (calloutMessage || calloutPhotos.length > 0) {
      return NextResponse.json(
        { error: "Callout message/photos were provided without selecting a dancer callout product." },
        { status: 400 }
      );
    }

    const taxRate = parseTaxRate();

    const orderLines: Array<{
      productId: string;
      productName: string;
      productDescription: string | null;
      quantity: number;
      unitPriceCents: number;
      taxable: boolean;
      xeroAccountCode: string;
      xeroTaxType: string;
      lineSubtotalCents: number;
      lineTaxCents: number;
      lineTotalCents: number;
    }> = [];

    for (const selected of items) {
      const product = productMap.get(selected.productId);
      if (!product) {
        return NextResponse.json({ error: "One or more selected products are unavailable." }, { status: 400 });
      }

      const lineSubtotalCents = product.price_cents * selected.quantity;
      const lineTaxCents = product.taxable ? Math.round(lineSubtotalCents * taxRate) : 0;
      const lineTotalCents = lineSubtotalCents + lineTaxCents;

      orderLines.push({
        productId: product.id,
        productName: product.name,
        productDescription: product.description,
        quantity: selected.quantity,
        unitPriceCents: product.price_cents,
        taxable: product.taxable,
        xeroAccountCode: product.xero_account_code,
        xeroTaxType: product.xero_tax_type,
        lineSubtotalCents,
        lineTaxCents,
        lineTotalCents,
      });
    }

    const subtotalCents = orderLines.reduce((sum, l) => sum + l.lineSubtotalCents, 0);
    const taxCents = orderLines.reduce((sum, l) => sum + l.lineTaxCents, 0);
    const totalCents = subtotalCents + taxCents;

    await client.query("BEGIN");
    inTransaction = true;

    const insertOrder = await client.query<{ id: string; created_at: string }>(
      `
      INSERT INTO public.recital_checkout_orders (
        customer_type,
        payment_option,
        akada_charge_authorized,
        parent_first_name,
        parent_last_name,
        parent_email,
        parent_phone,
        subtotal_cents,
        tax_cents,
        total_cents,
        sales_tax_rate,
        callout_tier,
        callout_message,
        payment_status,
        xero_sync_status
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13,
        CASE WHEN $2 = 'pay_now' THEN 'queued_for_xero' ELSE 'pending' END,
        CASE WHEN $2 = 'pay_now' THEN 'pending' ELSE 'not_configured' END
      )
      RETURNING id, created_at
      `,
      [
        customerType,
        paymentOption,
        akadaChargeAuthorized,
        parentFirstName,
        parentLastName,
        parentEmail,
        parentPhone,
        subtotalCents,
        taxCents,
        totalCents,
        taxRate,
        activeCalloutTier,
        activeCalloutTier ? calloutMessage : null,
      ]
    );

    const orderId = insertOrder.rows[0].id;
    const createdAt = insertOrder.rows[0].created_at;

    for (const line of orderLines) {
      await client.query(
        `
        INSERT INTO public.recital_checkout_order_items (
          order_id,
          product_id,
          product_name,
          product_description,
          quantity,
          unit_price_cents,
          taxable,
          xero_account_code,
          xero_tax_type,
          line_subtotal_cents,
          line_tax_cents,
          line_total_cents
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `,
        [
          orderId,
          line.productId,
          line.productName,
          line.productDescription,
          line.quantity,
          line.unitPriceCents,
          line.taxable,
          line.xeroAccountCode,
          line.xeroTaxType,
          line.lineSubtotalCents,
          line.lineTaxCents,
          line.lineTotalCents,
        ]
      );
    }

    if (activeCalloutTier) {
      for (let i = 0; i < calloutPhotos.length; i += 1) {
        const file = calloutPhotos[i];
        const url = await uploadImage(file, `recital-callouts/${orderId}/photo-${i + 1}-${Date.now()}`);

        await client.query(
          `
          INSERT INTO public.recital_checkout_order_assets (
            order_id,
            file_url,
            file_name,
            file_size_bytes,
            mime_type,
            sort_order
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [orderId, url, file.name, file.size, file.type, i + 1]
        );
      }
    }

    await client.query("COMMIT");
    inTransaction = false;

    let payNowUrl: string | null = null;

    if (paymentOption === "pay_now") {
      try {
        const xeroInvoice = await createXeroInvoiceForPreorder({
          preorderId: orderId,
          parentFirstName,
          parentLastName,
          parentEmail,
          totalAmountCents: totalCents,
          lineItems: orderLines.map((l) => ({
            description: l.productName,
            quantity: l.quantity,
            unitAmountCents: l.unitPriceCents,
            accountCode: l.xeroAccountCode,
            taxType: l.xeroTaxType,
          })),
        });

        payNowUrl = xeroInvoice.onlineInvoiceUrl;

        await client.query(
          `
          UPDATE public.recital_checkout_orders
          SET
            xero_sync_status = 'synced',
            xero_invoice_id = $2,
            xero_payment_url = $3,
            xero_last_error = NULL
          WHERE id = $1
          `,
          [orderId, xeroInvoice.invoiceId, xeroInvoice.onlineInvoiceUrl]
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown Xero sync error";

        await client.query(
          `
          UPDATE public.recital_checkout_orders
          SET
            xero_sync_status = 'failed',
            payment_status = 'failed',
            xero_last_error = $2
          WHERE id = $1
          `,
          [orderId, msg.slice(0, 1000)]
        );
      }
    }

    const studioTimeZone = process.env.STUDIO_TIMEZONE || "America/Chicago";
    const submittedAtLocal = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: studioTimeZone,
    }).format(new Date(createdAt));

    const itemLinesHtml = orderLines
      .map((l) => `<li>${escapeHtml(l.productName)} x${l.quantity} — ${dollars(l.lineTotalCents)}</li>`)
      .join("");

    const calloutHtml = activeCalloutTier
      ? `<h3>Dancer Callout</h3><p><strong>Tier:</strong> ${escapeHtml(activeCalloutTier)}</p><p><strong>Message:</strong> ${escapeHtml(calloutMessage)}</p><p><strong>Photos:</strong> ${calloutPhotos.length}</p>`
      : "";

    const paymentNote =
      paymentOption === "pay_now"
        ? payNowUrl
          ? `Pay online: <a href="${payNowUrl}" target="_blank" rel="noreferrer">${payNowUrl}</a>`
          : "Pay-now selected. We could not generate a payment link automatically; front desk will follow up."
        : "Charge to card on file authorized.";

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:16px;color:#222;line-height:1.4;">
        <h2>PREORDER Received</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Submitted:</strong> ${submittedAtLocal} (${studioTimeZone})</p>
        <p><strong>Payment Option:</strong> ${escapeHtml(paymentOption)}</p>

        <h3>Parent</h3>
        <p>${escapeHtml(parentFirstName)} ${escapeHtml(parentLastName)}</p>
        <p>${escapeHtml(parentEmail)}</p>
        <p>${escapeHtml(parentPhone)}</p>

        <h3>Items</h3>
        <ul>${itemLinesHtml}</ul>

        ${calloutHtml}

        <p><strong>Subtotal:</strong> ${dollars(subtotalCents)}</p>
        <p><strong>Tax:</strong> ${dollars(taxCents)}</p>
        <p style="font-size:18px;"><strong>Total:</strong> ${dollars(totalCents)}</p>

        <p>${paymentNote}</p>
      </div>
    `;

    await resend.emails.send({
      from: `Elite Dance & Music <${extractEmailAddress(EMAIL_FROM)}>`,
      to: [parentEmail, FRONTDESK_EMAIL],
      replyTo: FRONTDESK_EMAIL,
      subject: "PREORDER Received",
      html,
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentOption,
      subtotalCents,
      taxCents,
      totalCents,
      payNowUrl,
    });
  } catch (err: unknown) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }

    const msg = err instanceof Error ? err.message : "Failed to submit order";
    console.error("Preorder checkout failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
