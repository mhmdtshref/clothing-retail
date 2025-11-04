const BASE_URL = process.env.OPTIMUS_API_URL || '';
const TOKEN = process.env.OPTIMUS_API_TOKEN || '';
const BUSINESS_ID = process.env.OPTIMUS_BUSINESS_ID || '';
const APP_LANG = process.env.OPTIMUS_APP_LANGUAGE || 'ar';
const BUSINESS_ADDRESS_ID = process.env.OPTIMUS_BUSINESS_ADDRESS_ID || '';
const SHIPMENT_TYPE_ID = process.env.OPTIMUS_SHIPMENT_TYPE_ID || '';
const SHIPMENT_TYPE_NAME = process.env.OPTIMUS_SHIPMENT_TYPE_NAME || '';

function baseHeaders() {
  if (!BASE_URL || !TOKEN) {
    const err = new Error('Missing Optimus API configuration');
    err.code = 'CONFIG_MISSING';
    throw err;
  }
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'app-language': APP_LANG,
    'X-Requested-With': 'XMLHttpRequest',
  };
}

function jsonHeaders() {
  return { ...baseHeaders(), 'Content-Type': 'application/json' };
}

export async function createOrder(order) {
  if (!BUSINESS_ID) {
    const err = new Error('Missing Optimus business id');
    err.code = 'CONFIG_MISSING';
    throw err;
  }
  const url = `${BASE_URL.replace(/\/$/, '')}/api/resources/shipments?business_id=${encodeURIComponent(BUSINESS_ID)}`;
  const payload = {
    business: Number(BUSINESS_ID),
    ...(BUSINESS_ADDRESS_ID ? { business_address: Number(BUSINESS_ADDRESS_ID) } : {}),
    consignee: {
      name: String(order?.name || ''),
      city: Number(order?.cityId || 0),
      area: Number(order?.areaId || 0),
      address: String(order?.addressLine || ''),
      phone: String(order?.phone || ''),
    },
    items_description: [String(order?.itemsDescription || ''), String(order?.notes || '')].filter(Boolean).join('\n\n'),
    cod_amount: Number(order?.codAmount ?? 0),
    has_return: Boolean(order?.hasReturn || false),
    width: Number(process.env.OPTIMUS_BOX_WIDTH || 40),
    height: Number(process.env.OPTIMUS_BOX_HEIGHT || 40),
    length: Number(process.env.OPTIMUS_BOX_LENGTH || 40),
    ...(SHIPMENT_TYPE_ID && SHIPMENT_TYPE_NAME
      ? { shipment_types: [{ id: Number(SHIPMENT_TYPE_ID), name: SHIPMENT_TYPE_NAME }] }
      : {}),
    quantity: Number(order?.quantity || 1),
    box_dimensions: false,
    recipient_can_try_product: false,
    consignee_is_foreign: false,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.message || json?.error || 'Optimus create order failed');
    err.code = 'DELIVERY_CREATE_FAILED';
    err.response = json;
    throw err;
  }
  return {
    externalId: String(json?.id || json?.orderId || json?.data?.id || ''),
    trackingNumber: String(json?.trackingNumber || json?.data?.tracking_number || ''),
    trackingUrl: String(json?.trackingUrl || ''),
    providerStatus: String(json?.status || json?.data?.status || ''),
  };
}

export async function getStatus(externalId) {
  const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/orders/${encodeURIComponent(String(externalId))}`, {
    headers: baseHeaders(),
    method: 'GET',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.message || json?.error || 'Optimus get status failed');
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

export async function fetchCities() {
  const url = `${BASE_URL.replace(/\/$/, '')}/api/resources/cities`;
  const res = await fetch(url, {
    headers: baseHeaders(),
    method: 'GET',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.message || json?.error || 'Optimus cities fetch failed');
    err.code = 'DELIVERY_CITIES_FAILED';
    err.response = json;
    throw err;
  }
  // Response example: [ { data: [ { id, name, ... } ] } ]
  let flat = [];
  if (Array.isArray(json)) {
    for (const entry of json) {
      if (Array.isArray(entry?.data)) flat = flat.concat(entry.data);
    }
  } else if (Array.isArray(json?.data)) {
    flat = json.data;
  }
  const items = flat.map((c) => ({ id: String(c?.id ?? ''), name: String(c?.name ?? '') }));
  return { items };
}

export async function fetchAreas(cityId) {
  const url = `${BASE_URL.replace(/\/$/, '')}/api/resources/areas?city=${encodeURIComponent(String(cityId))}`;
  const res = await fetch(url, {
    headers: baseHeaders(),
    method: 'GET',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.message || json?.error || 'Optimus areas fetch failed');
    err.code = 'DELIVERY_AREAS_FAILED';
    err.response = json;
    throw err;
  }
  // Response example: [ { data: [ { id, name, ... } ] } ]
  let flat = [];
  if (Array.isArray(json)) {
    for (const entry of json) {
      if (Array.isArray(entry?.data)) flat = flat.concat(entry.data);
    }
  } else if (Array.isArray(json?.data)) {
    flat = json.data;
  }
  const items = flat.map((a) => ({ id: String(a?.id ?? ''), name: String(a?.name ?? '') }));
  return { items };
}


