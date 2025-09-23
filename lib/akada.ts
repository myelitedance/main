// lib/akada.ts
let tokenCache: { token: string; exp: number } | null = null;
let refreshing: Promise<string> | null = null;

const BASE = process.env.AKADA_BASE_URL!;
const API_KEY = process.env.AKADA_API_KEY!;
const USERNAME = process.env.AKADA_USERNAME!;
const PASSWORD = process.env.AKADA_PASSWORD!;
const TOKEN_TTL = Number(process.env.AKADA_TOKEN_TTL_SECONDS || 82800);

function nowSec() { return Math.floor(Date.now() / 1000); }

async function loginForToken(): Promise<string> {
  const res = await fetch(`${BASE}/studio/auth/user-token`, {
    method: "POST",
    headers: { "AkadaApiKey": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      username: USERNAME,
      password: PASSWORD,
      inactivityExpirationTimeHours: 24,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Akada login failed ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const token: string | undefined = j?.returnValue; // per Akada response
  if (!token) throw new Error("Akada login: missing token in response");
  return token;
}

async function refreshToken(): Promise<string> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const token = await loginForToken();
    tokenCache = { token, exp: nowSec() + TOKEN_TTL - 600 /* refresh 10 min early */ };
    refreshing = null;
    return token;
  })();
  return refreshing;
}

export async function getAkadaToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > nowSec()) return tokenCache.token;
  return refreshToken();
}

export async function akadaFetch(
  path: string,
  init: RequestInit = {},
  retryOn401 = true
): Promise<Response> {
  const doFetch = async () => {
    const token = await getAkadaToken();
    return fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "AkadaApiKey": API_KEY,
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
  };

  let res = await doFetch();

  // Retry once on invalid/expired token
  if (res.status === 401 && retryOn401) {
    try { await refreshToken(); } catch { /* fall through */ }
    res = await akadaFetch(path, init, false);
  }
  return res;
}