import { sql } from "@/lib/db";

const XERO_IDENTITY_BASE = "https://identity.xero.com";
const XERO_AUTH_BASE = "https://login.xero.com";
const XERO_API_BASE = "https://api.xero.com";

type XeroTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
};

type XeroConnection = {
  tenantId: string;
  tenantName?: string;
};

type CreateInvoiceInput = {
  preorderId: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  yearbookAmountCents: number;
  congratsAmountCents: number;
  totalAmountCents: number;
};

type CreateInvoiceResult = {
  invoiceId: string;
  onlineInvoiceUrl: string | null;
  debug: {
    invoiceNumber?: string;
    xeroRefreshTokenRotated: boolean;
    tenantId: string;
  };
};

type StoredConfig = {
  tenantId: string;
  refreshToken: string;
  yearbookAccountCode: string;
  calloutsAccountCode: string;
  yearbookTaxType: string;
  calloutsTaxType: string;
};

function needEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

function dollarsFromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function base64BasicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
}

export function getXeroRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/2026recital/preorder/thankyou`;
}

export function getXeroAuthorizeUrl(origin: string, state: string): string {
  const clientId = needEnv("XERO_CLIENT_ID");
  const redirectUri = getXeroRedirectUri(origin);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "offline_access accounting.transactions accounting.contacts",
    state,
  });

  return `${XERO_AUTH_BASE}/identity/connect/authorize?${params.toString()}`;
}

async function exchangeToken(body: URLSearchParams): Promise<XeroTokenResponse> {
  const clientId = needEnv("XERO_CLIENT_ID");
  const clientSecret = needEnv("XERO_CLIENT_SECRET");

  const res = await fetch(`${XERO_IDENTITY_BASE}/connect/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64BasicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await res.json().catch(() => ({}))) as Partial<XeroTokenResponse> & { error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`Xero token request failed (${res.status}) ${data.error || "unknown_error"}`);
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type || "Bearer",
    expires_in: data.expires_in || 1800,
    refresh_token: data.refresh_token,
  };
}

async function fetchXeroConnections(accessToken: string): Promise<XeroConnection[]> {
  const res = await fetch(`${XERO_API_BASE}/connections`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = (await res.json().catch(() => [])) as any[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(`Xero connections lookup failed (${res.status})`);
  }

  return data
    .map((item) => ({
      tenantId: String(item?.tenantId || ""),
      tenantName: typeof item?.tenantName === "string" ? item.tenantName : undefined,
    }))
    .filter((x) => x.tenantId.length > 0);
}

async function assertSettingsTableExists(): Promise<void> {
  const rows = await sql`
    SELECT to_regclass('public.xero_integration_settings') AS reg
  `;

  if (!rows[0]?.reg) {
    throw new Error("Missing table public.xero_integration_settings. Run scripts/sql/2026_recital_xero_integration.sql.");
  }
}

async function upsertSettings(values: {
  tenantId: string;
  refreshToken: string;
  salesAccountCode?: string;
  taxType?: string;
  yearbookAccountCode?: string;
  calloutsAccountCode?: string;
  yearbookTaxType?: string;
  calloutsTaxType?: string;
  connectedBy?: string;
}): Promise<void> {
  await assertSettingsTableExists();

  await sql`
    INSERT INTO public.xero_integration_settings (
      id,
      tenant_id,
      refresh_token,
      sales_account_code,
      tax_type,
      yearbook_account_code,
      callouts_account_code,
      yearbook_tax_type,
      callouts_tax_type,
      connected_by_email,
      connected_at,
      updated_at
    )
    VALUES (
      true,
      ${values.tenantId},
      ${values.refreshToken},
      COALESCE(${values.salesAccountCode ?? null}, '200'),
      COALESCE(${values.taxType ?? null}, 'OUTPUT'),
      COALESCE(${values.yearbookAccountCode ?? null}, 'Yearbook'),
      COALESCE(${values.calloutsAccountCode ?? null}, 'Callouts'),
      COALESCE(${values.yearbookTaxType ?? null}, 'OUTPUT'),
      COALESCE(${values.calloutsTaxType ?? null}, 'NONE'),
      ${values.connectedBy ?? null},
      NOW(),
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      tenant_id = EXCLUDED.tenant_id,
      refresh_token = EXCLUDED.refresh_token,
      sales_account_code = COALESCE(EXCLUDED.sales_account_code, public.xero_integration_settings.sales_account_code),
      tax_type = COALESCE(EXCLUDED.tax_type, public.xero_integration_settings.tax_type),
      yearbook_account_code = COALESCE(EXCLUDED.yearbook_account_code, public.xero_integration_settings.yearbook_account_code),
      callouts_account_code = COALESCE(EXCLUDED.callouts_account_code, public.xero_integration_settings.callouts_account_code),
      yearbook_tax_type = COALESCE(EXCLUDED.yearbook_tax_type, public.xero_integration_settings.yearbook_tax_type),
      callouts_tax_type = COALESCE(EXCLUDED.callouts_tax_type, public.xero_integration_settings.callouts_tax_type),
      connected_by_email = COALESCE(EXCLUDED.connected_by_email, public.xero_integration_settings.connected_by_email),
      connected_at = NOW(),
      updated_at = NOW();
  `;
}

async function loadSettings(): Promise<StoredConfig> {
  await assertSettingsTableExists();

  const rows = await sql`
    SELECT
      tenant_id,
      refresh_token,
      sales_account_code,
      tax_type,
      yearbook_account_code,
      callouts_account_code,
      yearbook_tax_type,
      callouts_tax_type
    FROM public.xero_integration_settings
    WHERE id = true
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("Xero not connected. Complete OAuth connection first.");
  }

  const tenantId = String(row.tenant_id || "").trim();
  const refreshToken = String(row.refresh_token || "").trim();
  const legacySalesCode = String(row.sales_account_code || "").trim();
  const legacyTaxType = String(row.tax_type || "").trim();
  const yearbookAccountCode = String(row.yearbook_account_code || "").trim() || legacySalesCode;
  const calloutsAccountCode = String(row.callouts_account_code || "").trim() || legacySalesCode;
  const yearbookTaxType = String(row.yearbook_tax_type || "").trim() || legacyTaxType;
  const calloutsTaxType = String(row.callouts_tax_type || "").trim() || "NONE";

  if (
    !tenantId ||
    !refreshToken ||
    !yearbookAccountCode ||
    !calloutsAccountCode ||
    !yearbookTaxType ||
    !calloutsTaxType
  ) {
    throw new Error(
      "Xero settings incomplete. Verify tenant_id, refresh_token, yearbook_account_code, callouts_account_code, yearbook_tax_type, and callouts_tax_type."
    );
  }

  return {
    tenantId,
    refreshToken,
    yearbookAccountCode,
    calloutsAccountCode,
    yearbookTaxType,
    calloutsTaxType,
  };
}

async function rotateAccessTokenFromStoredRefreshToken(stored: StoredConfig): Promise<{ accessToken: string; refreshTokenRotated: boolean }> {
  const token = await exchangeToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: stored.refreshToken,
    })
  );

  if (token.refresh_token && token.refresh_token !== stored.refreshToken) {
    await sql`
      UPDATE public.xero_integration_settings
      SET refresh_token = ${token.refresh_token}, updated_at = NOW()
      WHERE id = true
    `;
  }

  return {
    accessToken: token.access_token,
    refreshTokenRotated: Boolean(token.refresh_token && token.refresh_token !== stored.refreshToken),
  };
}

function buildLineItems(input: CreateInvoiceInput, config: StoredConfig) {
  const items: Array<{
    Description: string;
    Quantity: number;
    UnitAmount: number;
    AccountCode: string;
    TaxType: string;
  }> = [];

  if (input.yearbookAmountCents > 0) {
    items.push({
      Description: "2026 Recital Yearbook Preorder",
      Quantity: 1,
      UnitAmount: dollarsFromCents(input.yearbookAmountCents),
      AccountCode: config.yearbookAccountCode,
      TaxType: config.yearbookTaxType,
    });
  }

  if (input.congratsAmountCents > 0) {
    items.push({
      Description: "2026 Recital Dancer Congratulations Ad",
      Quantity: 1,
      UnitAmount: dollarsFromCents(input.congratsAmountCents),
      AccountCode: config.calloutsAccountCode,
      TaxType: config.calloutsTaxType,
    });
  }

  if (items.length === 0) {
    items.push({
      Description: "2026 Recital Preorder",
      Quantity: 1,
      UnitAmount: dollarsFromCents(input.totalAmountCents),
      AccountCode: config.yearbookAccountCode,
      TaxType: config.yearbookTaxType,
    });
  }

  return items;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function extractOnlineInvoiceUrl(value: any): string | null {
  const maybeOnline = value?.OnlineInvoices?.[0] || value?.onlineInvoices?.[0];
  if (typeof maybeOnline?.OnlineInvoiceUrl === "string") return maybeOnline.OnlineInvoiceUrl;
  if (typeof maybeOnline?.onlineInvoiceUrl === "string") return maybeOnline.onlineInvoiceUrl;
  if (typeof maybeOnline?.Url === "string") return maybeOnline.Url;
  if (typeof maybeOnline?.url === "string") return maybeOnline.url;

  const maybeInvoice = value?.Invoices?.[0] || value?.invoices?.[0];
  if (typeof maybeInvoice?.Url === "string") return maybeInvoice.Url;
  if (typeof maybeInvoice?.url === "string") return maybeInvoice.url;

  return null;
}

function extractXeroErrorDetails(payload: any): string {
  const direct =
    (typeof payload?.Message === "string" && payload.Message) ||
    (typeof payload?.message === "string" && payload.message) ||
    (typeof payload?.error === "string" && payload.error);
  if (direct) return direct;

  const elements = Array.isArray(payload?.Elements) ? payload.Elements : [];
  const messages: string[] = [];

  for (const el of elements) {
    const validationErrors = Array.isArray(el?.ValidationErrors) ? el.ValidationErrors : [];
    for (const ve of validationErrors) {
      if (typeof ve?.Message === "string" && ve.Message.trim()) {
        messages.push(ve.Message.trim());
      }
    }
  }

  if (messages.length > 0) {
    return messages.join(" | ");
  }

  const compact = JSON.stringify(payload);
  if (compact && compact !== "{}") {
    return compact.length > 800 ? `${compact.slice(0, 800)}...` : compact;
  }

  return "Unknown Xero validation error";
}

export async function completeXeroAuthorization(params: {
  code: string;
  origin: string;
  connectedByEmail?: string;
}): Promise<{ tenantId: string; tenantName?: string }> {
  const redirectUri = getXeroRedirectUri(params.origin);

  const token = await exchangeToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: redirectUri,
    })
  );

  if (!token.refresh_token) {
    throw new Error("Xero did not return refresh token. Ensure offline_access scope is enabled.");
  }

  const connections = await fetchXeroConnections(token.access_token);
  if (connections.length === 0) {
    throw new Error("No Xero tenants found for this authorization.");
  }

  const selected = connections[0];

  await upsertSettings({
    tenantId: selected.tenantId,
    refreshToken: token.refresh_token,
    connectedBy: params.connectedByEmail,
  });

  return selected;
}

export async function createXeroInvoiceForPreorder(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const stored = await loadSettings();
  const { accessToken, refreshTokenRotated } = await rotateAccessTokenFromStoredRefreshToken(stored);

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(now.getDate() + 7);

  const payload = {
    Type: "ACCREC",
    Status: "AUTHORISED",
    Date: toIsoDate(now),
    DueDate: toIsoDate(dueDate),
    LineAmountTypes: "Exclusive",
    Contact: {
      Name: `${input.parentFirstName} ${input.parentLastName}`.trim(),
      EmailAddress: input.parentEmail,
    },
    LineItems: buildLineItems(input, stored),
    Reference: `Recital Preorder ${input.preorderId}`,
  };

  const createRes = await fetch(`${XERO_API_BASE}/api.xro/2.0/Invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": stored.tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const createData = (await createRes.json().catch(() => ({}))) as any;
  if (!createRes.ok) {
    const details = extractXeroErrorDetails(createData);
    throw new Error(`Xero invoice creation failed (${createRes.status}): ${details}`);
  }

  const invoice = createData?.Invoices?.[0] || createData?.invoices?.[0];
  const invoiceId = invoice?.InvoiceID || invoice?.invoiceID || invoice?.invoiceId;
  if (!invoiceId || typeof invoiceId !== "string") {
    throw new Error("Xero invoice creation returned no invoice id");
  }

  let onlineInvoiceUrl = extractOnlineInvoiceUrl(createData);

  if (!onlineInvoiceUrl) {
    const onlineRes = await fetch(`${XERO_API_BASE}/api.xro/2.0/Invoices/${invoiceId}/OnlineInvoice`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": stored.tenantId,
        Accept: "application/json",
      },
    });

    if (onlineRes.ok) {
      const onlineData = (await onlineRes.json().catch(() => ({}))) as any;
      onlineInvoiceUrl = extractOnlineInvoiceUrl(onlineData);
    }
  }

  return {
    invoiceId,
    onlineInvoiceUrl,
    debug: {
      invoiceNumber: invoice?.InvoiceNumber,
      xeroRefreshTokenRotated: refreshTokenRotated,
      tenantId: stored.tenantId,
    },
  };
}
