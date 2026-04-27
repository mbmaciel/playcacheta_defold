const { createHmac, timingSafeEqual } = require('crypto');

function getEnvironment() {
  return process.env.TRIO_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
}

function getBaseUrl() {
  if (process.env.TRIO_BASE_URL) return process.env.TRIO_BASE_URL;
  return getEnvironment() === 'production'
    ? 'https://api.trio.com.br'
    : 'https://api.sandbox.trio.com.br';
}

function getConfig() {
  return {
    environment: getEnvironment(),
    baseUrl: getBaseUrl(),
    clientId: process.env.TRIO_CLIENT_ID || '',
    clientSecret: process.env.TRIO_CLIENT_SECRET || '',
    virtualAccountId: process.env.TRIO_VIRTUAL_ACCOUNT_ID || '',
    bankAccountId: process.env.TRIO_BANK_ACCOUNT_ID || '',
    webhookSecret: process.env.TRIO_WEBHOOK_SECRET || '',
    webhookSignatureKey: process.env.TRIO_WEBHOOK_SIGNATURE_KEY || '',
  };
}

function isConfigured() {
  const config = getConfig();
  return Boolean(config.clientId && config.clientSecret && config.virtualAccountId);
}

function getAuthHeader() {
  const { clientId, clientSecret } = getConfig();
  if (!clientId || !clientSecret) {
    throw new Error('Integração Trio não configurada. Defina TRIO_CLIENT_ID e TRIO_CLIENT_SECRET.');
  }
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function trioRequest(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${getBaseUrl()}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: getAuthHeader(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = data?.error;
    const detail = data?.message
      || (typeof err === 'string' ? err : err?.error_message)
      || `HTTP ${response.status}`;
    const error = new Error(`Erro na Trio: ${detail}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function createDynamicQrCode({ amountInCents, counterparty, description, expirationDatetime, externalId }) {
  const { virtualAccountId, bankAccountId } = getConfig();
  if (!virtualAccountId) {
    throw new Error('Integração Trio não configurada. Defina TRIO_VIRTUAL_ACCOUNT_ID.');
  }

  const body = {
    virtual_account_id: virtualAccountId,
    counterparty,
    amount: amountInCents,
    external_id: externalId,
    description,
    expiration_datetime: expirationDatetime,
    options: {
      allow_change_the_amount_on_payment: false,
      show_qrcode_image: false,
    },
  };

  if (bankAccountId) {
    body.bank_account_id = bankAccountId;
  }

  return trioRequest('/banking/cashin/pix/qrcodes', { method: 'POST', body });
}

async function searchCollectingDocument({ externalId, endToEndId, fromDatetime, toDatetime }) {
  const result = await trioRequest('/banking/cashin/documents/search', {
    query: {
      external_id: externalId,
      end_to_end_id: endToEndId,
      from_datetime: fromDatetime,
      to_datetime: toDatetime,
    },
  });
  return result.data || null;
}

function verifyWebhook(req) {
  const { webhookSecret, webhookSignatureKey } = getConfig();
  const secretHeader = req.headers['x-webhook-secret'];
  const signatureHeader = req.headers['x-webhook-signature'];

  if (webhookSecret && secretHeader !== webhookSecret) {
    return false;
  }

  if (webhookSignatureKey) {
    if (!signatureHeader) return false;
    const message = req.rawBody || JSON.stringify(req.body || {});
    const computedSignature = createHmac('sha256', webhookSignatureKey)
      .update(message)
      .digest('hex')
      .toUpperCase();

    if (signatureHeader.length !== computedSignature.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(computedSignature)
    );
  }

  return true;
}

module.exports = {
  getConfig,
  isConfigured,
  createDynamicQrCode,
  searchCollectingDocument,
  verifyWebhook,
};
