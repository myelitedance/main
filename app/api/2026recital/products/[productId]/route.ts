import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseBool(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  return value === "true" || value === "1" || value === "on";
}

function parseIntSafe(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function PUT(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const formData = await req.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const imageUrlInput = String(formData.get("imageUrl") ?? "").trim();
    const priceCents = parseIntSafe(formData.get("priceCents"));
    const taxable = parseBool(formData.get("taxable"));
    const xeroAccountCode = String(formData.get("xeroAccountCode") ?? "").trim();
    const xeroTaxType = String(formData.get("xeroTaxType") ?? (taxable ? "OUTPUT" : "NONE")).trim();
    const sortOrder = parseIntSafe(formData.get("sortOrder"), 100);
    const isActive = parseBool(formData.get("isActive"));
    const imageFile = formData.get("imageFile");

    if (!name || !xeroAccountCode || priceCents < 0) {
      return NextResponse.json({ error: "Invalid product payload." }, { status: 400 });
    }

    let imageUrl = imageUrlInput || null;

    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrl = await uploadImage(imageFile, `recital-products/${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`);
    }

    const rows = await sql`
      UPDATE public.recital_preorder_products
      SET
        name = ${name},
        description = ${description || null},
        image_url = ${imageUrl},
        price_cents = ${priceCents},
        taxable = ${taxable},
        xero_account_code = ${xeroAccountCode},
        xero_tax_type = ${xeroTaxType || (taxable ? "OUTPUT" : "NONE")},
        is_active = ${isActive},
        sort_order = ${sortOrder}
      WHERE id = ${productId}
      RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: rows[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;

    const rows = await sql`
      UPDATE public.recital_preorder_products
      SET is_active = false
      WHERE id = ${productId}
      RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
