import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export async function GET() {
  const rows = await sql`
    SELECT
      o.id,
      o.created_at,
      o.customer_type,
      o.payment_option,
      o.payment_status,
      o.parent_first_name,
      o.parent_last_name,
      o.parent_email,
      o.parent_phone,
      o.subtotal_cents,
      o.tax_cents,
      o.total_cents,
      o.sales_tax_rate,
      o.xero_sync_status,
      o.xero_invoice_id,
      o.xero_payment_url,
      o.xero_last_error,
      COUNT(i.id)::int AS item_count,
      COALESCE(string_agg(i.product_name || ' x' || i.quantity::text, ', ' ORDER BY i.product_name), '') AS item_summary
    FROM public.recital_checkout_orders o
    LEFT JOIN public.recital_checkout_order_items i ON i.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  const header = [
    "id",
    "created_at",
    "customer_type",
    "payment_option",
    "payment_status",
    "parent_first_name",
    "parent_last_name",
    "parent_email",
    "parent_phone",
    "item_count",
    "item_summary",
    "subtotal",
    "tax",
    "total",
    "sales_tax_rate",
    "xero_sync_status",
    "xero_invoice_id",
    "xero_payment_url",
    "xero_last_error",
  ];

  const lines = rows.map((r) => {
    const values = [
      r.id,
      r.created_at,
      r.customer_type,
      r.payment_option,
      r.payment_status,
      r.parent_first_name,
      r.parent_last_name,
      r.parent_email,
      r.parent_phone,
      r.item_count,
      r.item_summary,
      Number(r.subtotal_cents ?? 0) / 100,
      Number(r.tax_cents ?? 0) / 100,
      Number(r.total_cents ?? 0) / 100,
      r.sales_tax_rate,
      r.xero_sync_status,
      r.xero_invoice_id,
      r.xero_payment_url,
      r.xero_last_error,
    ];

    return values.map(csvEscape).join(",");
  });

  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recital-preorders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
