// app/api/elite/settings/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

// small helper to normalize the private key like your other routes
function cleanKey(raw?: string) {
  if (!raw) return "";
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\n/g, "\n");
}

export async function GET(req: Request) {
  try {
    const sheetId = process.env.DANCEWEAR_SHEET_ID || "";
    const tab = process.env.SETTINGS_TAB_NAME || "Settings";

    if (!sheetId) {
      return NextResponse.json({ ok: false, error: "Missing DANCEWEAR_SHEET_ID." }, { status: 500 });
    }

    // Auth (same pattern you used elsewhere)
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "";
    const privateKey = cleanKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "");
    const credsB64 = process.env.GOOGLE_SHEETS_CREDENTIALS_B64 || "";

    let auth: any;
    if (credsB64) {
      const json = JSON.parse(Buffer.from(credsB64, "base64").toString("utf8"));
      auth = new google.auth.GoogleAuth({
        credentials: { client_email: json.client_email, private_key: json.private_key },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
      await auth.getClient();
    } else {
      if (!clientEmail || !privateKey) {
        return NextResponse.json({ ok: false, error: "Missing Google credentials." }, { status: 500 });
      }
      const jwt = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
      await jwt.authorize();
      auth = jwt;
    }

    const sheets = google.sheets({ version: "v4", auth });
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tab}!A:B`, // A: Key, B: Value
    });

    const rows = (data.values || []) as string[][];
    if (!rows || rows.length <= 1) {
      // no data (just header) — fallback to env
      const envRate = Number(process.env.NEXT_PUBLIC_SALES_TAX_RATE ?? 0) || 0;
      return NextResponse.json({ ok: true, salesTaxRate: envRate }, { status: 200 });
    }

    const header = rows[0].map((x) => String(x || "").toLowerCase().trim());
    const idxKey = header.findIndex((h) => ["key", "name"].includes(h));
    const idxVal = header.findIndex((h) => ["value", "val"].includes(h));
    const body = rows.slice(1);

    const map = new Map<string, string>();
    for (const r of body) {
      const k = String(r[idxKey] ?? "").trim();
      const v = String(r[idxVal] ?? "").trim();
      if (k) map.set(k.toUpperCase(), v);
    }

    let rate = 0;
    const raw = map.get("SALES_TAX_RATE");
    if (raw) {
      // allow "9.75%" or "0.0975" or "9.75"
      const pct = raw.endsWith("%") ? Number(raw.replace("%", "")) / 100 : Number(raw);
      rate = pct > 1 ? pct / 100 : pct;
    } else {
      rate = Number(process.env.NEXT_PUBLIC_SALES_TAX_RATE ?? 0) || 0;
    }

    return NextResponse.json(
      { ok: true, salesTaxRate: rate },
      { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (e: any) {
    // graceful fallback: env or 0
    const envRate = Number(process.env.NEXT_PUBLIC_SALES_TAX_RATE ?? 0) || 0;
    return NextResponse.json({ ok: true, salesTaxRate: envRate, note: "Settings load failed; used fallback." }, { status: 200 });
  }
}