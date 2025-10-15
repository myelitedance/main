import { NextResponse } from "next/server";
import { google } from "googleapis";

type DWItem = { sku: string; name: string; price: number };
type DWPackage = { id: string; name: string; items: DWItem[] };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  try {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    let privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const sheetId = process.env.DANCEWEAR_SHEET_ID!;
    const tab = process.env.DANCEWEAR_TAB_NAME || "Packages";

    if (!clientEmail || !privateKey || !sheetId) {
      const msg = "Missing Google Sheets env (GOOGLE_SHEETS_CLIENT_EMAIL/PRIVATE_KEY/DANCEWEAR_SHEET_ID).";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tab}!A:D`, // A:Package, B:SKU, C:Item, D:Price
    });

    const rows = (data.values || []) as string[][];
    if (rows.length <= 1) return NextResponse.json([], { status: 200 });

    const [, ...body] = rows;
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
      map.get(id)!.items.push({
        sku: sku || `${id}-${map.get(id)!.items.length}`,
        name: itemName,
        price,
      });
    }

    const packages = Array.from(map.values());
    return NextResponse.json(packages, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("[dancewear] error", err);
    const msg = debug ? String(err?.message || err) : "Dance Wear sheet read failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}