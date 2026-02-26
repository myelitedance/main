import Link from "next/link";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

function dollars(cents: unknown): string {
  const value = Number(cents ?? 0);
  return `$${(value / 100).toFixed(2)}`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export default async function RecitalPreorderAdminPage() {
  const studioTimeZone = process.env.STUDIO_TIMEZONE || "America/Chicago";
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: studioTimeZone,
  });

  const tableCheck = await sql`
    SELECT to_regclass('public.xero_integration_settings') AS reg
  `;

  const hasSettingsTable = Boolean(tableCheck[0]?.reg);
  const xeroSettings = hasSettingsTable
    ? await sql`
        SELECT tenant_id, connected_at
        FROM public.xero_integration_settings
        WHERE id = true
        LIMIT 1
      `
    : [];

  const xeroConnected = xeroSettings.length > 0;

  const rows = await sql`
    SELECT
      o.id,
      o.created_at,
      o.parent_first_name,
      o.parent_last_name,
      o.parent_email,
      o.parent_phone,
      o.customer_type,
      o.payment_option,
      o.payment_status,
      o.subtotal_cents,
      o.tax_cents,
      o.total_cents,
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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">2026 Recital Orders</h1>

          <div className="flex items-center gap-2">
            <a
              href="/api/xero/connect/start"
              className="rounded border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Connect Xero
            </a>

            <Link
              href="/2026recital/preorder/admin/products"
              className="rounded border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Manage Products
            </Link>

            <Link
              href="/api/reports/preorders"
              className="rounded border border-purple-600 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
            >
              Download CSV
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded border bg-white p-4 text-sm">
          {!hasSettingsTable && (
            <p className="text-amber-700">
              Xero settings table missing. Run `scripts/sql/2026_recital_xero_integration.sql` on this branch DB.
            </p>
          )}

          {hasSettingsTable && !xeroConnected && (
            <p className="text-amber-700">Xero is not connected yet. Click <strong>Connect Xero</strong>.</p>
          )}

          {hasSettingsTable && xeroConnected && (
            <p className="text-emerald-700">
              Xero connected. Tenant: <strong>{asString(xeroSettings[0]?.tenant_id)}</strong>
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Totals</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Xero</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm">
              {rows.map((r) => {
                const submittedAt = asDate(r.created_at);
                const parentName = `${asString(r.parent_first_name)} ${asString(r.parent_last_name)}`.trim();

                return (
                  <tr key={asString(r.id)} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      <div>{submittedAt ? dateFormatter.format(submittedAt) : "N/A"}</div>
                      <div className="text-xs text-gray-500">{studioTimeZone}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{parentName}</div>
                      <div className="text-xs text-gray-600">{asString(r.parent_email)}</div>
                      <div className="text-xs text-gray-600">{asString(r.parent_phone)}</div>
                      <div className="mt-1 text-xs uppercase text-gray-500">{asString(r.customer_type)}</div>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">{Number(r.item_count ?? 0)} item(s)</div>
                      <div className="text-xs text-gray-600">{asString(r.item_summary)}</div>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      <div>Subtotal: {dollars(r.subtotal_cents)}</div>
                      <div>Tax: {dollars(r.tax_cents)}</div>
                      <div className="font-semibold">Total: {dollars(r.total_cents)}</div>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-xs uppercase text-gray-500">{asString(r.payment_option)}</div>
                      <div className="font-medium">{asString(r.payment_status)}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs uppercase text-gray-500">{asString(r.xero_sync_status)}</div>

                      {asString(r.xero_invoice_id) && (
                        <div className="mt-1 text-xs text-gray-700">Invoice: {asString(r.xero_invoice_id)}</div>
                      )}

                      {asString(r.xero_payment_url) && (
                        <a
                          className="mt-1 inline-block text-xs font-medium text-purple-700 hover:underline"
                          href={asString(r.xero_payment_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open payment link
                        </a>
                      )}

                      {asString(r.xero_last_error) && (
                        <div className="mt-1 text-xs text-red-700">{asString(r.xero_last_error)}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
