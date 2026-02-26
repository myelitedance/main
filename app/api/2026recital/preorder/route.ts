import { NextResponse } from "next/server";
import { Resend } from "resend";
import { pool } from "@/lib/db";
import { createXeroInvoiceForPreorder } from "@/lib/xero";

export const runtime = "nodejs";

type CustomerType = "akada" | "guest";
type PaymentOption = "charge_account" | "pay_now";

type SubmitBody = {
  customerType: CustomerType;
  paymentOption: PaymentOption;
  akadaChargeAuthorized?: boolean;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  items: Array<{ productId: string; quantity: number }>;
};

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  taxable: boolean;
  xero_account_code: string;
  xero_tax_type: string;
};

const resend = new Resend(process.env.RESEND_API_KEY!);

function needEnv(k: string) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
}

const EMAIL_FROM = needEnv("EMAIL_FROM");

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
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

export async function POST(req: Request) {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const body = (await req.json()) as SubmitBody;

    const customerType = body.customerType;
    const paymentOption = body.paymentOption;
    const akadaChargeAuthorized = body.akadaChargeAuthorized === true;

    const parentFirstName = String(body.parentFirstName ?? "").trim();
    const parentLastName = String(body.parentLastName ?? "").trim();
    const parentEmail = String(body.parentEmail ?? "").trim().toLowerCase();
    const parentPhone = String(body.parentPhone ?? "").trim();

    const items = Array.isArray(body.items)
      ? body.items
          .map((i) => ({ productId: String(i.productId ?? "").trim(), quantity: Number(i.quantity ?? 0) }))
          .filter((i) => i.productId.length > 0 && Number.isFinite(i.quantity) && i.quantity > 0)
      : [];

    if (!parentFirstName || !parentLastName || !parentEmail || !parentPhone) {
      return NextResponse.json({ error: "Missing required contact fields." }, { status: 400 });
    }

    if (!isValidEmail(parentEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!isValidPhone(parentPhone)) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }

    if (customerType !== "akada" && customerType !== "guest") {
      return NextResponse.json({ error: "Invalid customer type." }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Please select at least one product." }, { status: 400 });
    }

    if (customerType === "akada") {
      if (paymentOption !== "charge_account") {
        return NextResponse.json({ error: "Akada checkout must use charge_account." }, { status: 400 });
      }
      if (!akadaChargeAuthorized) {
        return NextResponse.json({ error: "Authorization is required to charge studio account." }, { status: 400 });
      }
    }

    if (customerType === "guest" && paymentOption !== "pay_now") {
      return NextResponse.json({ error: "Guest checkout must use pay_now." }, { status: 400 });
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
        payment_status,
        xero_sync_status
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9, $10, $11,
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

    await client.query("COMMIT");
    inTransaction = false;

    let payNowUrl: string | null = null;
    let payNowIntegrationStatus: "not_needed" | "synced" | "failed" = "not_needed";
    let xeroErrorSummary: string | null = null;

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
        payNowIntegrationStatus = "synced";

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
        xeroErrorSummary = msg;
        payNowIntegrationStatus = "failed";

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
      .map((l) => {
        const name = escapeHtml(l.productName);
        return `<li>${name} x${l.quantity} — ${dollars(l.lineTotalCents)}</li>`;
      })
      .join("");

    const paymentNote =
      paymentOption === "pay_now"
        ? payNowUrl
          ? `Pay online: <a href="${payNowUrl}" target="_blank" rel="noreferrer">${payNowUrl}</a>`
          : "Pay-now selected. We could not generate a payment link automatically; front desk will follow up."
        : "Charge to card on file authorized in Akada flow.";

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:16px;color:#222;line-height:1.4;">
        <h2>PREORDER Received</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Submitted:</strong> ${submittedAtLocal} (${studioTimeZone})</p>
        <p><strong>Customer Type:</strong> ${escapeHtml(customerType)}</p>
        <p><strong>Payment Option:</strong> ${escapeHtml(paymentOption)}</p>

        <h3>Parent</h3>
        <p>${escapeHtml(parentFirstName)} ${escapeHtml(parentLastName)}</p>
        <p>${escapeHtml(parentEmail)}</p>
        <p>${escapeHtml(parentPhone)}</p>

        <h3>Items</h3>
        <ul>${itemLinesHtml}</ul>

        <p><strong>Subtotal:</strong> ${dollars(subtotalCents)}</p>
        <p><strong>Tax:</strong> ${dollars(taxCents)}</p>
        <p style="font-size:18px;"><strong>Total:</strong> ${dollars(totalCents)}</p>

        <p>${paymentNote}</p>
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
      orderId,
      paymentOption,
      subtotalCents,
      taxCents,
      totalCents,
      payNowIntegrationStatus,
      payNowUrl,
      xeroErrorSummary,
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
