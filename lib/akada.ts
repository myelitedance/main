// lib/akada.ts
const DEBUG = String(process.env.AKADA_DEBUG || "").toLowerCase() === "true";

const rawBase = process.env.AKADA_BASE_URL || "";
const BASE = rawBase.replace(/\/+$/, ""); // strip trailing slash
const API_KEY = process.env.AKADA_API_KEY || "";
const USERNAME = process.env.AKADA_USERNAME || "";
const PASSWORD = process.env.AKADA_PASSWORD || "";
const TOKEN_TTL = Number(process.env.AKADA_TOKEN_TTL_SECONDS || 82800); // default 23h

if (!BASE) throw new Error("Missing env: AKADA_BASE_URL");
if (!API_KEY) throw new Error("Missing env: AKADA_API_KEY");
if (!USERNAME) throw new Error("Missing env: AKADA_USERNAME");
if (!PASSWORD) throw new Error("Missing env: AKADA_PASSWORD");

let tokenCache: { token: string; exp: number } | null = null;
let refreshing: Promise<string> | null = null;

function nowSec() { return Math.floor(Date.now() / 1000); }
function safeTokenPreview(tok: string) {
  return tok.length > 16 ? `${tok.slice(0, 8)}…${tok.slice(-6)}` : tok;
}
function log(...args: any[]) { if (DEBUG) console.log("[Akada]", ...args); }
function warn(...args: any[]) { if (DEBUG) console.warn("[Akada]", ...args); }

async function loginForToken(): Promise<string> {
  const url = `${BASE}/studio/auth/user-token`;
  log("LOGIN →", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "AkadaApiKey": API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      username: USERNAME,
      password: PASSWORD,
      inactivityExpirationTimeHours: 24,
    }),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    warn("LOGIN ◀︎", res.status, text);
    throw new Error(`Akada login failed ${res.status}: ${text}`);
  }

  let j: any;
  try { j = JSON.parse(text); } catch {
    warn("LOGIN JSON parse error ◀︎", text);
    throw new Error(`Akada login parse error: ${text}`);
  }

  const token: string | undefined = 
    (typeof j?.returnValue === "string" ? j?.returnValue : j?.returnValue?.token);
  if (!token) {
    warn("LOGIN missing returnValue ◀︎", j);
    throw new Error("Akada login: missing token (returnValue)");
  }

  log("LOGIN OK, token preview:", safeTokenPreview(token));
  return token;
}

async function refreshToken(): Promise<string> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const token = await loginForToken();
    tokenCache = { token, exp: nowSec() + TOKEN_TTL - 600 /* refresh 10 min early */ };
    log("TOKEN cached, exp in sec:", tokenCache.exp - nowSec());
    refreshing = null;
    return token;
  })();
  return refreshing;
}

export async function getAkadaToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > nowSec()) {
    log("TOKEN reuse:", safeTokenPreview(tokenCache.token), "ttl:", tokenCache.exp - nowSec(), "sec");
    return tokenCache.token;
  }
  log("TOKEN expired/missing → refresh");
  return refreshToken();
}

export async function akadaFetch(
  path: string,                      // e.g. "/studio/classes"
  init: RequestInit = {},
  retryOn401 = true
): Promise<Response> {
  const token = await getAkadaToken();
  const url = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = {
    "AkadaApiKey": API_KEY,
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };

  log("REQ →", url, {
    method: init.method || "GET",
    headers: {
      AkadaApiKey: "<redacted>",
      Authorization: `Bearer ${safeTokenPreview(token)}`,
      Accept: headers.Accept,
      "Content-Type": headers["Content-Type" as keyof typeof headers],
    },
  });

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    const body = await res.text();
    warn("401 ◀︎", body);
    if (retryOn401) {
      warn("401 → refreshing token and retrying once…");
      try { await refreshToken(); } catch (e) { warn("refresh failed:", e); }
      return akadaFetch(path, init, false);
    }
    return new Response(body, { status: res.status, headers: res.headers } );
  }

  log("RES ◀︎", res.status, res.statusText);
  return res;
}

/** Optional: quick endpoint ping to test token without hitting classes heavily */
export async function testAkadaAuth(): Promise<{ ok: boolean; status: number; body?: any }> {
  // If Akada has a light-weight "me" endpoint, use it. Otherwise we ping classes.
  const res = await akadaFetch("/studio/classes", { method: "GET" }, false);
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}