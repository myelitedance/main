import { NextResponse } from "next/server";
import { getXeroAuthorizeUrl } from "@/lib/xero";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const isHttps = url.protocol === "https:";
  const state = crypto.randomUUID();

  const authUrl = getXeroAuthorizeUrl(origin, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("xero_oauth_state", state, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  return res;
}
