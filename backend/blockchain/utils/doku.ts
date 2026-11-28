import crypto from 'node:crypto';
import https from 'node:https';

export interface DokuConfig {
  baseUrl: string;
  clientId: string;
  secretKey: string;
}

export interface DokuCheckoutResult {
  checkoutUrl: string;
  tokenId: string;
  sessionId?: string | undefined;
  expiredDatetime?: string | undefined;
}

export interface DokuOrderStatusResult {
  status: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  rawStatus: string;
  originalRequestId?: string | undefined;
  amount?: number | undefined;
}

const DEFAULT_DOKU_SANDBOX_URL = 'https://api-sandbox.doku.com';
const DOKU_HTTP_TIMEOUT_MS = 8000;

export const getDokuConfig = (): DokuConfig => ({
  baseUrl: (process.env.DOKU_BASE_URL || DEFAULT_DOKU_SANDBOX_URL).trim().replace(/\/$/, ''),
  clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
  secretKey: (process.env.DOKU_SECRET_KEY || '').trim(),
});

export const isDokuConfigured = (): boolean => {
  const cfg = getDokuConfig();
  return Boolean(cfg.clientId && cfg.secretKey);
};

export const buildDokuDigest = (rawBody: Buffer | string): string =>
  crypto.createHash('sha256').update(rawBody).digest('base64');

export const buildDokuSignature = (params: {
  clientId: string;
  secretKey: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest?: string;
}): string => {
  const lines = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.timestamp}`,
    `Request-Target:${params.requestTarget}`,
  ];
  if (params.digest !== undefined) {
    lines.push(`Digest:${params.digest}`);
  }
  const componentString = lines.join('\n');
  const hmac = crypto.createHmac('sha256', params.secretKey).update(componentString).digest('base64');
  return `HMACSHA256=${hmac}`;
};

export const verifyDokuNotificationSignature = (params: {
  clientIdHeader: string;
  requestIdHeader: string;
  timestampHeader: string;
  signatureHeader: string;
  requestTarget: string;
  rawBody: Buffer;
  secretKey: string;
  expectedClientId?: string | undefined;
}): boolean => {
  if (
    !params.clientIdHeader ||
    !params.requestIdHeader ||
    !params.timestampHeader ||
    !params.signatureHeader ||
    !params.secretKey
  ) {
    return false;
  }
  if (params.expectedClientId && params.clientIdHeader !== params.expectedClientId) {
    return false;
  }

  const digest = buildDokuDigest(params.rawBody);
  const expected = buildDokuSignature({
    clientId: params.clientIdHeader,
    secretKey: params.secretKey,
    requestId: params.requestIdHeader,
    timestamp: params.timestampHeader,
    requestTarget: params.requestTarget,
    digest,
  });

  const a = Buffer.from(params.signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Force IPv4 (`family: 4`) to avoid Happy Eyeballs NAT64 timeouts seen in local Linux sandboxes.
const dokuHttpsRequest = <T>(
  url: string,
  options: {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
  }
): Promise<{ statusCode: number; data: T }> =>
  new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method,
        family: 4,
        timeout: DOKU_HTTP_TIMEOUT_MS,
        headers: options.headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = (raw ? JSON.parse(raw) : {}) as T;
            resolve({ statusCode: res.statusCode ?? 500, data: parsed });
          } catch {
            reject(new Error(`DOKU non-JSON response (${res.statusCode})`));
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('DOKU API request timed out'));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });

export const createDokuQrisCheckout = async (input: {
  invoiceNumber: string;
  amount: number;
  callbackUrl: string;
  customerName?: string | undefined;
  dueMinutes?: number | undefined;
}): Promise<DokuCheckoutResult> => {
  const cfg = getDokuConfig();
  if (!cfg.clientId || !cfg.secretKey) {
    throw new Error('DOKU credentials are not configured');
  }

  const target = '/checkout/v1/payment';
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const bodyObj = {
    order: {
      amount: Math.round(input.amount),
      invoice_number: input.invoiceNumber,
      callback_url: input.callbackUrl,
    },
    payment: {
      payment_due_date: input.dueMinutes ?? 15,
      payment_method_types: ['QRIS'],
    },
    customer: {
      name: (input.customerName || 'Muzakki ZakatChain').slice(0, 60),
      email: 'muzakki@zakatchain.local',
    },
  };
  const bodyStr = JSON.stringify(bodyObj);
  const digest = buildDokuDigest(bodyStr);
  const signature = buildDokuSignature({
    clientId: cfg.clientId,
    secretKey: cfg.secretKey,
    requestId,
    timestamp,
    requestTarget: target,
    digest,
  });

  const { statusCode, data } = await dokuHttpsRequest<{
    error?: { message?: string };
    message?: string[];
    response?: {
      order?: { session_id?: string };
      payment?: { url?: string; token_id?: string; expired_datetime?: string };
    };
  }>(`${cfg.baseUrl}${target}`, {
    method: 'POST',
    body: bodyStr,
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': cfg.clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      Signature: signature,
      'Content-Length': String(Buffer.byteLength(bodyStr)),
    },
  });

  const paymentUrl = data?.response?.payment?.url;
  const tokenId = data?.response?.payment?.token_id;
  if (statusCode < 200 || statusCode >= 300 || !paymentUrl || !tokenId) {
    const errMsg = data?.error?.message || data?.message?.join(', ') || `HTTP ${statusCode}`;
    throw new Error(`DOKU Checkout failed: ${errMsg}`);
  }

  return {
    checkoutUrl: paymentUrl,
    tokenId,
    sessionId: data?.response?.order?.session_id,
    expiredDatetime: data?.response?.payment?.expired_datetime,
  };
};

export const fetchDokuOrderStatus = async (invoiceNumber: string): Promise<DokuOrderStatusResult> => {
  const cfg = getDokuConfig();
  if (!cfg.clientId || !cfg.secretKey) {
    throw new Error('DOKU credentials are not configured');
  }

  const target = `/orders/v1/status/${encodeURIComponent(invoiceNumber)}`;
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const signature = buildDokuSignature({
    clientId: cfg.clientId,
    secretKey: cfg.secretKey,
    requestId,
    timestamp,
    requestTarget: target,
  });

  const { statusCode, data } = await dokuHttpsRequest<{
    order?: { amount?: number | string };
    transaction?: { status?: string; original_request_id?: string };
  }>(`${cfg.baseUrl}${target}`, {
    method: 'GET',
    headers: {
      'Client-Id': cfg.clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      Signature: signature,
    },
  });

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`DOKU status lookup returned HTTP ${statusCode}`);
  }

  const rawStatus = String(data?.transaction?.status || 'PENDING').toUpperCase();
  const rawAmt = data?.order?.amount;
  const parsedAmt =
    rawAmt !== undefined && rawAmt !== null && Number.isFinite(Number(rawAmt))
      ? Number(rawAmt)
      : undefined;
  const mapped: DokuOrderStatusResult['status'] =
    rawStatus === 'SUCCESS' || rawStatus === 'PAID'
      ? 'PAID'
      : rawStatus === 'EXPIRED'
        ? 'EXPIRED'
        : rawStatus === 'FAILED'
          ? 'FAILED'
          : 'PENDING';

  return {
    status: mapped,
    rawStatus,
    originalRequestId: data?.transaction?.original_request_id,
    amount: parsedAmt,
  };
};
