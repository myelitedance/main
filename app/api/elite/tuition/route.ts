// app/api/elite/tuition/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function cleanKey(raw?: string) {
  if (!raw) return "";
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\n/g, "\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  const sheetId = process.env.DANCEWEAR_SHEET_ID || "";
  const tab = process.env.TUITION_TAB_NAME || "Tuition";

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "";
  const privateKey = cleanKey(process.env.GOOGLE_SHEETS_PRIVATE_KEY || "");
  const credsB64 = process.env.GOOGLE_SHEETS_CREDENTIALS_B64 || "";

  if (!sheetId) {
    return NextResponse.json({ ok: false, error: "Missing DANCEWEAR_SHEET_ID." }, { status: 500 });
  }

  try {
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
      range: `${tab}!A:B`, // A: duration, B: price
    });

    const rows = (data.values || []) as string[][];
    if (!rows.length || rows.length === 1) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    // Expect header row like: duration | price
    const header = rows[0].map((h) => String(h || "").toLowerCase().trim());
    const idxDuration = header.findIndex((h) => ["duration", "minutes"].includes(h));
    const idxPrice = header.findIndex((h) => ["price", "amount", "monthly"].includes(h));
    if (idxDuration === -1 || idxPrice === -1) {
      return NextResponse.json(
        { ok: false, error: "Tuition sheet must have headers 'duration' and 'price' in the first row." },
        { status: 500 }
      );
    }

    const body = rows.slice(1);
    const out = body
      .map((r) => ({
        duration: Number(String(r[idxDuration] ?? "").replace(/[^0-9.]/g, "")) || 0,
        price: Number(String(r[idxPrice] ?? "").replace(/[^0-9.]/g, "")) || 0,
      }))
      .filter((x) => Number.isFinite(x.duration) && Number.isFinite(x.price));

    return NextResponse.json({ rows: out }, { status: 200, headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
  } catch (e: any) {
    if (debug) {
      return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "Failed to read Tuition sheet." }, { status: 500 });
  }
}