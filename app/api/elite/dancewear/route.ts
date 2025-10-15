import { NextResponse } from "next/server";
import { google } from "googleapis";

type DWItem = { sku: string; name: string; price: number };
type DWPackage = { id: string; name: string; items: DWItem[] };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * ENV
 *  GOOGLE_SHEETS_CLIENT_EMAIL
 *  GOOGLE_SHEETS_PRIVATE_KEY  (\\n -> \n)
 *  DANCEWEAR_SHEET_ID
 *  DANCEWEAR_TAB_NAME="Packages"
 *
 * SHEET COLUMNS (headers row 1):
 *  A: Package Name
 *  B: Item SKU
 *  C: Item Name
 *  D: Item Retail Price
 *
 * Example:
 * Starter Combo | shoes-youth | Ballet Shoes (Youth) | 28
 * Starter Combo | tights-youth| Tights (Youth)       | 12
 * Starter Combo | uniform-y   | Uniform (Youth)      | 38
 * Starter Combo | bag         | Drawstring Bag       | 10
 * Starter Combo | bow         | Team Bow             |  6
 */
export async function GET() {
  try {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    let privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const sheetId = process.env.DANCEWEAR_SHEET_ID!;
    const tab = process.env.DANCEWEAR_TAB_NAME || "Packages";

    if (!clientEmail || !privateKey || !sheetId) {
      return NextResponse.json({ ok: false, error: "Missing Sheets env" }, { status: 500 });
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const range = `${tab}!A:D`;
    const { data } = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const rows = (data.values || []) as string[][];
    if (rows.length <= 1) return NextResponse.json([]);

    const [, ...body] = rows;

    // Group rows by package name
    const map = new Map<string, DWPackage>();
    for (const r of body) {
      const pkgName = (r[0] || "").trim();
      const sku = (r[1] || "").trim();
      const itemName = (r[2] || "").trim();
      const rawPrice = (r[3] || "").trim();
      if (!pkgName || !itemName) continue;

      const price = Number(String(rawPrice).replace(/[^0-9.]/g, "")) || 0;
      const id = slugify(pkgName);
      if (!map.has(id)) map.set(id, { id, name: pkgName, items: [] });
      map.get(id)!.items.push({ sku: sku || `${id}-${map.get(id)!.items.length}`, name: itemName, price });
    }

    const packages = Array.from(map.values());
    return NextResponse.json(packages, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("[dancewear] error", err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}