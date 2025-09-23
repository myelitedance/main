import { NextResponse } from "next/server";
import { testAkadaAuth } from "@/lib/akada";

export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await testAkadaAuth(); // calls /studio/classes once
    // Do NOT include secrets in response. This only shows status + body.
    return NextResponse.json(
      { ok: r.ok, status: r.status, body: r.body },
      { status: r.ok ? 200 : 500 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}