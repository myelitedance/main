import { NextResponse } from "next/server";
import { completeXeroAuthorization } from "@/lib/xero";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const cookieState = req.cookies.get("xero_oauth_state")?.value;
    const isHttps = url.protocol === "https:";

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    if (!state || !cookieState || state !== cookieState) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
    }

    const result = await completeXeroAuthorization({
      code,
      origin: url.origin,
    });

    const res = NextResponse.json({
      ok: true,
      tenantId: result.tenantId,
      tenantName: result.tenantName || null,
    });

    res.cookies.set("xero_oauth_state", "", {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Xero authorization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
