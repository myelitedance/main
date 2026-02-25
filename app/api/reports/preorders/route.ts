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
      rp.id,
      rp.created_at,
      rp.parent_first_name,
      rp.parent_last_name,
      rp.parent_email,
      rp.parent_phone,
      rp.dancer_first_name,
      rp.dancer_last_name,
      rp.yearbook_requested,
      rp.congrats_size,
      rp.congrats_message,
      rp.yearbook_amount_cents,
      rp.congrats_amount_cents,
      rp.total_amount_cents,
      rp.payment_option,
      rp.payment_status,
      rp.xero_sync_status,
      rp.xero_invoice_id,
      rp.xero_payment_url,
      rp.xero_last_error,
      COUNT(rpp.id)::int AS photo_count
    FROM public.recital_preorders rp
    LEFT JOIN public.recital_preorder_photos rpp ON rpp.preorder_id = rp.id
    GROUP BY rp.id
    ORDER BY rp.created_at DESC
  `;

  const header = [
    "id",
    "created_at",
    "parent_first_name",
    "parent_last_name",
    "parent_email",
    "parent_phone",
    "dancer_first_name",
    "dancer_last_name",
    "yearbook_requested",
    "congrats_size",
    "congrats_message",
    "yearbook_amount",
    "congrats_amount",
    "total_amount",
    "payment_option",
    "payment_status",
    "xero_sync_status",
    "xero_invoice_id",
    "xero_payment_url",
    "xero_last_error",
    "photo_count",
  ];

  const lines = rows.map((r) => {
    const values = [
      r.id,
      r.created_at,
      r.parent_first_name,
      r.parent_last_name,
      r.parent_email,
      r.parent_phone,
      r.dancer_first_name,
      r.dancer_last_name,
      r.yearbook_requested,
      r.congrats_size,
      r.congrats_message,
      Number(r.yearbook_amount_cents ?? 0) / 100,
      Number(r.congrats_amount_cents ?? 0) / 100,
      Number(r.total_amount_cents ?? 0) / 100,
      r.payment_option,
      r.payment_status,
      r.xero_sync_status,
      r.xero_invoice_id,
      r.xero_payment_url,
      r.xero_last_error,
      r.photo_count,
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
