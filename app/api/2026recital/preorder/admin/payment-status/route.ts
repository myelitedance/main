import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set(["pending", "paid"]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string; paymentStatus?: string };
    const orderId = String(body.orderId ?? "").trim();
    const paymentStatus = String(body.paymentStatus ?? "").trim().toLowerCase();

    if (!isUuid(orderId)) {
      return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.has(paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
    }

    const result = await sql`
      UPDATE public.recital_checkout_orders
      SET payment_status = ${paymentStatus}
      WHERE id = ${orderId}::uuid
      RETURNING id, payment_status
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      orderId: result[0].id,
      paymentStatus: result[0].payment_status,
    });
  } catch (err) {
    console.error("Failed to update payment status:", err);
    return NextResponse.json({ error: "Failed to update payment status." }, { status: 500 });
  }
}
