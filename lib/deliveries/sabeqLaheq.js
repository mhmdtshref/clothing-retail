const BASE_URL = process.env.SABEQLAHEQ_API_URL || '';
const TOKEN = process.env.SABEQLAHEQ_API_TOKEN || '';

function headers() {
  if (!BASE_URL || !TOKEN) {
    const err = new Error('Missing Sabeq Laheq API configuration');
    err.code = 'CONFIG_MISSING';
    throw err;
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

export async function createOrder(order) {
  const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(order),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error('Sabeq Laheq create order failed');
    err.code = 'DELIVERY_CREATE_FAILED';
    err.response = json;
    throw err;
  }
  return {
    externalId: String(json?.id || json?.orderId || ''),
    trackingNumber: String(json?.trackingNumber || ''),
    trackingUrl: String(json?.trackingUrl || ''),
    providerStatus: String(json?.status || ''),
  };
}

export async function getStatus(externalId) {
  const res = await fetch(
    `${BASE_URL.replace(/\/$/, '')}/orders/${encodeURIComponent(String(externalId))}`,
    {
      headers: headers(),
      method: 'GET',
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error('Sabeq Laheq get status failed');
    err.code = 'DELIVERY_STATUS_FAILED';
    err.response = json;
    throw err;
  }
  return {
    providerStatus: String(json?.status || ''),
    trackingNumber: String(json?.trackingNumber || ''),
    trackingUrl: String(json?.trackingUrl || ''),
    raw: json,
  };
}
