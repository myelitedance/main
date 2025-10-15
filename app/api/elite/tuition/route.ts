// app/api/elite/tuition/route.ts
import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

function normalizePrivateKey(raw?: string): string {
  if (!raw) return "";
  let k = raw;
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  if (k.includes("\\n")) k = k.replace(/\\n/g, "\n");
  if (k.includes("\\r")) k = k.replace(/\\r/g, "\r");
  return k.trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "";
  const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || "";
  const sheetId = process.env.DANCEWEAR_SHEET_ID || "";
  const tab = process.env.TUITION_TAB_NAME || "Tuition";

  const privateKey = normalizePrivateKey(rawKey);

  if (!clientEmail || !sheetId || !privateKey) {
    const msg = "Missing Google Sheets credentials or sheet ID.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tab}!A:B`, // duration | price
    });

    const rows = (data.values || []) as string[][];
    if (rows.length <= 1) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const idxDur = header.findIndex((h) => ["duration", "minutes"].includes(h));
    const idxPrice = header.findIndex((h) => ["price", "amount"].includes(h));

    if (idxDur === -1 || idxPrice === -1) {
      return NextResponse.json(
        { ok: false, error: "Tuition sheet must have 'duration' and 'price' headers." },
        { status: 500 }
      );
    }

    const result = rows.slice(1).map((r) => ({
      duration: Number(String(r[idxDur] || "").replace(/[^0-9.]/g, "")) || 0,
      price: Number(String(r[idxPrice] || "").replace(/[^0-9.]/g, "")) || 0,
    }));

    return NextResponse.json({ rows: result }, { status: 200 });
  } catch (err: any) {
    console.error("Tuition sheet read failed", err);
    const msg = debug ? String(err?.message || err) : "Failed to read Tuition sheet.";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}