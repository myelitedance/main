import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";

function parseBool(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  return value === "true" || value === "1" || value === "on";
}

function parseIntSafe(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: Request) {
  const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "1";

  const rows = includeInactive
    ? await sql`
        SELECT id, name, description, image_url, price_cents, taxable, xero_account_code, xero_tax_type, is_active, sort_order, created_at, updated_at
        FROM public.recital_preorder_products
        ORDER BY sort_order ASC, created_at DESC
      `
    : await sql`
        SELECT id, name, description, image_url, price_cents, taxable, xero_account_code, xero_tax_type, is_active, sort_order, created_at, updated_at
        FROM public.recital_preorder_products
        WHERE is_active = true
        ORDER BY sort_order ASC, created_at DESC
      `;

  return NextResponse.json({ products: rows });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const imageUrlInput = String(formData.get("imageUrl") ?? "").trim();
    const priceCents = parseIntSafe(formData.get("priceCents"));
    const taxable = parseBool(formData.get("taxable"));
    const xeroAccountCode = String(formData.get("xeroAccountCode") ?? "").trim();
    const xeroTaxType = String(formData.get("xeroTaxType") ?? (taxable ? "OUTPUT" : "NONE")).trim();
    const sortOrder = parseIntSafe(formData.get("sortOrder"), 100);
    const isActive = parseBool(formData.get("isActive")) || formData.get("isActive") === null;
    const imageFile = formData.get("imageFile");

    if (!name) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 });
    }

    if (!xeroAccountCode) {
      return NextResponse.json({ error: "Xero account code is required." }, { status: 400 });
    }

    if (!Number.isFinite(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: "Invalid price." }, { status: 400 });
    }

    let imageUrl = imageUrlInput || null;

    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrl = await uploadImage(imageFile, `recital-products/${name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`);
    }

    const rows = await sql`
      INSERT INTO public.recital_preorder_products (
        name,
        description,
        image_url,
        price_cents,
        taxable,
        xero_account_code,
        xero_tax_type,
        is_active,
        sort_order
      )
      VALUES (
        ${name},
        ${description || null},
        ${imageUrl},
        ${priceCents},
        ${taxable},
        ${xeroAccountCode},
        ${xeroTaxType || (taxable ? "OUTPUT" : "NONE")},
        ${isActive},
        ${sortOrder}
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, product: rows[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create product";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
