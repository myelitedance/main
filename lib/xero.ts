const XERO_IDENTITY_BASE = "https://identity.xero.com";
const XERO_API_BASE = "https://api.xero.com";

type XeroTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
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
  };
};

function need(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

function dollarsFromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function base64BasicAuth(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  return Buffer.from(raw, "utf8").toString("base64");
}

async function fetchXeroAccessToken(): Promise<{ accessToken: string; refreshTokenRotated: boolean }> {
  const clientId = need("XERO_CLIENT_ID");
  const clientSecret = need("XERO_CLIENT_SECRET");
  const refreshToken = need("XERO_REFRESH_TOKEN");

  const res = await fetch(`${XERO_IDENTITY_BASE}/connect/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64BasicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<XeroTokenResponse> & { error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`Xero token request failed (${res.status}) ${data.error || "unknown_error"}`);
  }

  return {
    accessToken: data.access_token,
    refreshTokenRotated: Boolean(data.refresh_token && data.refresh_token !== refreshToken),
  };
}

function buildLineItems(input: CreateInvoiceInput, salesAccountCode: string) {
  const items: Array<{ Description: string; Quantity: number; UnitAmount: number; AccountCode: string }> = [];

  if (input.yearbookAmountCents > 0) {
    items.push({
      Description: "2026 Recital Yearbook Preorder",
      Quantity: 1,
      UnitAmount: dollarsFromCents(input.yearbookAmountCents),
      AccountCode: salesAccountCode,
    });
  }

  if (input.congratsAmountCents > 0) {
    items.push({
      Description: "2026 Recital Dancer Congratulations Ad",
      Quantity: 1,
      UnitAmount: dollarsFromCents(input.congratsAmountCents),
      AccountCode: salesAccountCode,
    });
  }

  if (items.length === 0) {
    items.push({
      Description: "2026 Recital Preorder",
      Quantity: 1,
      UnitAmount: dollarsFromCents(input.totalAmountCents),
      AccountCode: salesAccountCode,
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

export async function createXeroInvoiceForPreorder(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const tenantId = need("XERO_TENANT_ID");
  const salesAccountCode = need("XERO_SALES_ACCOUNT_CODE");

  const { accessToken, refreshTokenRotated } = await fetchXeroAccessToken();

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
    LineItems: buildLineItems(input, salesAccountCode),
    Reference: `Recital Preorder ${input.preorderId}`,
  };

  const createRes = await fetch(`${XERO_API_BASE}/api.xro/2.0/Invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const createData = (await createRes.json().catch(() => ({}))) as any;
  if (!createRes.ok) {
    throw new Error(`Xero invoice creation failed (${createRes.status})`);
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
        "xero-tenant-id": tenantId,
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
    },
  };
}
