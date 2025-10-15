import { NextResponse } from "next/server";
import { google } from "googleapis";

/** ---------- Types ---------- */
type DWItem = { sku: string; name: string; price: number };
type DWPackage = { id: string; name: string; items: DWItem[] };

/** ---------- Helpers ---------- */
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Remove outer quotes, convert escaped newlines (\\n) into real \n, trim
function normalizePrivateKey(raw?: string): string {
  if (!raw) return "";
  let k = raw;
  // strip wrapping quotes if present
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  // Convert escaped sequences to real newlines (works for .env `\n` or JSON-escaped)
  if (k.includes("\\n")) k = k.replace(/\\n/g, "\n");
  if (k.includes("\\r")) k = k.replace(/\\r/g, "\r");
  return k.trim();
}

// Basic PEM sanity checks; return string message if invalid
function validatePem(k: string): string | null {
  if (!k) return "GOOGLE_SHEETS_PRIVATE_KEY is empty.";
  if (!k.includes("BEGIN PRIVATE KEY") || !k.includes("END PRIVATE KEY")) {
    return "Private key is missing BEGIN/END PRIVATE KEY block.";
  }
  // Should have multiple lines
  const lines = k.split("\n").filter(Boolean);
  if (lines.length < 3) {
    return "Private key appears to be single-line. Use \\n in .env or paste multiline value in your host env.";
  }
  return null;
}

// Redact sensitive key details for debug output
function redactKeyPreview(k: string) {
  const lines = k ? k.split("\n") : [];
  const first = lines[0] || "";
  const last = lines[lines.length - 1] || "";
  return {
    firstLine: first,
    lastLine: last,
    lineCount: lines.length,
    hasBegin: k.includes("BEGIN PRIVATE KEY"),
    hasEnd: k.includes("END PRIVATE KEY"),
    length: k.length,
  };
}

/** ---------- Route ---------- */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "";
  const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || "";
  const sheetId = process.env.DANCEWEAR_SHEET_ID || "";
  const tab = process.env.DANCEWEAR_TAB_NAME || "Packages";

  // Normalize key early so we can validate and give helpful messages
  const privateKey = normalizePrivateKey(rawKey);
  const pemErr = validatePem(privateKey);

  // Early env check
  if (!clientEmail || !sheetId || pemErr) {
    const msgParts: string[] = [];
    if (!clientEmail) msgParts.push("Missing GOOGLE_SHEETS_CLIENT_EMAIL.");
    if (!sheetId) msgParts.push("Missing DANCEWEAR_SHEET_ID.");
    if (pemErr) msgParts.push(pemErr);

    const payload: any = { ok: false, error: msgParts.join(" "), where: "env" };
    if (debug) {
      payload.debug = {
        emailPresent: !!clientEmail,
        sheetIdLen: sheetId.length,
        tab,
        keyPreview: redactKeyPreview(privateKey),
        node: process.version,
        now: new Date().toISOString(),
      };
    }
    return NextResponse.json(payload, { status: 500 });
  }

  // Step 1: AUTH TEST (isolated) — this is the bit that throws the OpenSSL error if key is malformed
  let auth;
  try {
    auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    // Force token fetch to validate the PEM before we touch Sheets API
    await auth.authorize();
  } catch (e: any) {
    const message = e?.message || String(e);
    const payload: any = {
      ok: false,
      error: "Google auth failed (likely private key formatting).",
      where: "auth",
    };
    if (debug) {
      payload.debug = {
        message,
        name: e?.name,
        code: e?.code,
        stack: String(e?.stack || "").split("\n").slice(0, 6).join("\n"),
        keyPreview: redactKeyPreview(privateKey),
        emailDomain: clientEmail.split("@")[1] || "",
        node: process.version,
      };
    }
    return NextResponse.json(payload, { status: 502 });
  }

  // Step 2: SHEETS READ
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const range = `${tab}!A:D`; // A:Package, B:SKU, C:Item, D:Price

    const { data } = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    const rows = (data.values || []) as string[][];
    if (!rows || rows.length <= 1) {
      const payload: any = { ok: true, packages: [], note: "No data rows in sheet (only headers or empty)." };
      if (debug) payload.debug = { headerRow: rows?.[0] || [], range, tab, sheetIdLen: sheetId.length };
      return NextResponse.json(payload, { status: 200 });
    }

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

    const headers: Record<string, string> = {
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    };

    if (debug) {
      return NextResponse.json(
        {
          ok: true,
          packages,
          debug: {
            count: packages.length,
            first: packages[0] || null,
            range,
            tab,
            sheetIdLen: sheetId.length,
          },
        },
        { status: 200, headers }
      );
    }

    return NextResponse.json(packages, { status: 200, headers });
  } catch (e: any) {
    const message = e?.message || String(e);
    const payload: any = { ok: false, error: "Sheets read failed.", where: "sheets" };
    if (debug) {
      payload.debug = {
        message,
        name: e?.name,
        code: e?.code,
        stack: String(e?.stack || "").split("\n").slice(0, 6).join("\n"),
        tab,
        sheetIdLen: sheetId.length,
      };
    }
    return NextResponse.json(payload, { status: 502 });
  }
}